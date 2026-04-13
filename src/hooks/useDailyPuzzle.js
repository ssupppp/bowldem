/**
 * useDailyPuzzle Hook
 * Manages daily puzzle state with localStorage persistence
 *
 * Puzzle selection priority:
 * 1. Check Supabase puzzle_schedule table for manual override
 * 2. Fall back to default modulo-based rotation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPuzzleForToday,
  canPlayToday,
  initializeTodayGame,
  loadGameState,
  saveGameState,
  loadStats,
  completeGame,
  markModalShown,
  markAnswerRevealed,
  isDebugMode,
  getEffectiveDate,
  getPuzzleNumber,
  getDebugDateOffset,
  setDebugDateOffset,
  clearAllData,
  MAX_GUESSES
} from '../utils/dailyPuzzle.js';
import { getScheduledPuzzleId } from '../lib/supabase.js';
import {
  TUTORIAL_PUZZLE_ID,
  TUTORIAL_SENTINEL,
  hasPlayedTutorialPuzzle,
  markTutorialPuzzleDone,
  migratePreExistingUsers
} from '../lib/tutorialPuzzle.js';

migratePreExistingUsers();

/**
 * Get puzzle by ID from puzzles array
 * @param {Array} puzzles - Array of puzzle objects
 * @param {number} puzzleId - The puzzle ID to find
 * @returns {Object|null} - Puzzle object or null if not found
 */
function getPuzzleById(puzzles, puzzleId) {
  return puzzles.find(p => p.id === puzzleId) || null;
}

/**
 * Custom hook for managing daily puzzle state
 * @param {Array} puzzles - Array of puzzle objects
 * @returns {Object} - Daily puzzle state and actions
 */
export function useDailyPuzzle(puzzles) {
  // Tutorial puzzle override: first-time visitors see puzzle 112 (2011 WC Final)
  // as their first experience instead of the rotating daily puzzle.
  const [isTutorial] = useState(() => !hasPlayedTutorialPuzzle());

  // Current puzzle data (tutorial puzzle if first-time, else daily rotation)
  const [puzzleData, setPuzzleData] = useState(() => {
    if (isTutorial) {
      const tutorialPuzzle = puzzles.find(p => p.id === TUTORIAL_PUZZLE_ID);
      if (tutorialPuzzle) {
        return {
          puzzle: tutorialPuzzle,
          puzzleNumber: TUTORIAL_SENTINEL,
          puzzleIndex: puzzles.indexOf(tutorialPuzzle)
        };
      }
    }
    return getPuzzleForToday(puzzles);
  });

  // Track if we're checking the schedule (skip for tutorial)
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(!isTutorial);

  // Game state (guesses, status)
  const [gameState, setGameState] = useState(() => {
    if (isTutorial) {
      const existing = loadGameState();
      // Resume in-progress tutorial if sentinel matches
      if (existing.lastPuzzleNumber === TUTORIAL_SENTINEL && existing.gameStatus === 'in_progress') {
        return existing;
      }
      // Start fresh tutorial state
      const fresh = {
        lastPlayedDate: getEffectiveDate(),
        lastPuzzleNumber: TUTORIAL_SENTINEL,
        guesses: [],
        gameStatus: 'in_progress',
        modalShown: false,
        answerRevealed: false
      };
      saveGameState(fresh);
      return fresh;
    }

    // Not tutorial: defensive cleanup if stale tutorial state exists
    const existing = loadGameState();
    if (existing.lastPuzzleNumber === TUTORIAL_SENTINEL) {
      return initializeTodayGame();
    }

    const { canPlay, existingState } = canPlayToday();
    if (existingState) return existingState;
    return initializeTodayGame();
  });

  // Stats
  const [stats, setStats] = useState(() => loadStats());

  // Debug mode
  const [debugMode] = useState(() => isDebugMode());
  const [debugOffset, setDebugOffset] = useState(() => getDebugDateOffset());

  // Check Supabase for scheduled puzzle override on mount (skip for tutorial)
  useEffect(() => {
    if (isTutorial) {
      setIsLoadingSchedule(false);
      return;
    }
    async function checkScheduledPuzzle() {
      try {
        const today = getEffectiveDate();
        const scheduledId = await getScheduledPuzzleId(today);

        if (scheduledId !== null) {
          const scheduledPuzzle = getPuzzleById(puzzles, scheduledId);
          if (scheduledPuzzle) {
            const puzzleIndex = puzzles.indexOf(scheduledPuzzle);
            const puzzleNumber = getPuzzleNumber(today);

            // Only update if different from current puzzle
            if (puzzleData.puzzle?.id !== scheduledId) {
              console.log(`[useDailyPuzzle] Using scheduled puzzle #${scheduledId} for ${today}`);
              setPuzzleData({
                puzzle: scheduledPuzzle,
                puzzleNumber, // Keep day-based number for state tracking
                puzzleIndex
              });
            }
          }
        }
      } catch (error) {
        console.warn('[useDailyPuzzle] Failed to check puzzle schedule:', error);
        // Continue with fallback puzzle
      } finally {
        setIsLoadingSchedule(false);
      }
    }

    checkScheduledPuzzle();
  }, [puzzles, isTutorial]); // Only run on mount

  // Derived state
  const alreadyCompleted = gameState.gameStatus === 'won' || gameState.gameStatus === 'lost';
  const guessesRemaining = MAX_GUESSES - gameState.guesses.length;

  /**
   * Refresh puzzle data (used after debug date change)
   * Checks Supabase schedule first, falls back to default rotation
   */
  const refreshPuzzle = useCallback(async () => {
    setIsLoadingSchedule(true);

    try {
      const today = getEffectiveDate();
      let newPuzzleData = getPuzzleForToday(puzzles);

      // Check for scheduled override
      const scheduledId = await getScheduledPuzzleId(today);
      if (scheduledId !== null) {
        const scheduledPuzzle = getPuzzleById(puzzles, scheduledId);
        if (scheduledPuzzle) {
          const puzzleIndex = puzzles.indexOf(scheduledPuzzle);
          newPuzzleData = {
            puzzle: scheduledPuzzle,
            puzzleNumber: getPuzzleNumber(today),
            puzzleIndex
          };
          console.log(`[useDailyPuzzle] Refreshed to scheduled puzzle #${scheduledId}`);
        }
      }

      setPuzzleData(newPuzzleData);

      // Check if this is a different puzzle than current state
      const { canPlay, existingState } = canPlayToday();
      if (existingState && existingState.lastPuzzleNumber === newPuzzleData.puzzleNumber) {
        setGameState(existingState);
      } else {
        setGameState(initializeTodayGame());
      }

      setStats(loadStats());
    } catch (error) {
      console.warn('[useDailyPuzzle] Error refreshing puzzle:', error);
      // Fall back to default
      const newPuzzleData = getPuzzleForToday(puzzles);
      setPuzzleData(newPuzzleData);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, [puzzles]);

  /**
   * Record a player guess
   * @param {string} playerKey - The guessed player's key
   * @param {boolean} isCorrect - Whether the guess was correct
   * @returns {Object} - { newState, isGameOver, won }
   */
  const recordGuess = useCallback((playerKey, isCorrect) => {
    if (alreadyCompleted) {
      return { newState: gameState, isGameOver: true, won: gameState.gameStatus === 'won' };
    }

    const newGuesses = [...gameState.guesses, playerKey];
    const isLastGuess = newGuesses.length >= MAX_GUESSES;
    const won = isCorrect;
    const lost = !isCorrect && isLastGuess;
    const isGameOver = won || lost;

    let newStatus = 'in_progress';
    if (won) newStatus = 'won';
    else if (lost) newStatus = 'lost';

    const newState = {
      ...gameState,
      guesses: newGuesses,
      gameStatus: newStatus
    };

    saveGameState(newState);
    setGameState(newState);

    // Update stats if game over
    if (isGameOver) {
      const newStats = completeGame(won);
      setStats(newStats);

      // Graduate from tutorial puzzle on game end (win or loss)
      if (isTutorial) {
        markTutorialPuzzleDone();
      }
    }

    return { newState, isGameOver, won };
  }, [gameState, alreadyCompleted, isTutorial]);

  /**
   * Get guessed player keys
   */
  const guessedPlayers = useMemo(() => {
    return new Set(gameState.guesses);
  }, [gameState.guesses]);

  // ============================================================================
  // DEBUG FUNCTIONS
  // ============================================================================

  /**
   * Change debug date offset
   * @param {number} delta - Days to add (can be negative)
   */
  const changeDebugDate = useCallback((delta) => {
    if (!debugMode) return;

    const newOffset = debugOffset + delta;
    setDebugDateOffset(newOffset);
    setDebugOffset(newOffset);

    // Refresh puzzle for new date
    setTimeout(() => refreshPuzzle(), 0);
  }, [debugMode, debugOffset, refreshPuzzle]);

  /**
   * Reset debug date to today
   */
  const resetDebugDate = useCallback(() => {
    if (!debugMode) return;

    setDebugDateOffset(0);
    setDebugOffset(0);
    setTimeout(() => refreshPuzzle(), 0);
  }, [debugMode, refreshPuzzle]);

  /**
   * Clear all data and reset
   */
  const resetAllData = useCallback(() => {
    clearAllData();
    setDebugOffset(0);
    setStats(loadStats());
    refreshPuzzle();
  }, [refreshPuzzle]);

  /**
   * Mark the result modal as shown (prevents re-trigger on page return)
   */
  const setModalShown = useCallback(() => {
    const updatedState = markModalShown();
    setGameState(updatedState);
  }, []);

  /**
   * Mark the answer as revealed (persists for returning users)
   */
  const setAnswerRevealed = useCallback(() => {
    const updatedState = markAnswerRevealed();
    setGameState(updatedState);
  }, []);

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return {
    // Puzzle info
    puzzle: puzzleData.puzzle,
    puzzleNumber: puzzleData.puzzleNumber,
    puzzleIndex: puzzleData.puzzleIndex,
    isTutorialPuzzle: isTutorial,

    // Game state
    gameState,
    guesses: gameState.guesses,
    guessedPlayers,
    guessesRemaining,
    gameStatus: gameState.gameStatus,
    alreadyCompleted,
    modalShown: gameState.modalShown,
    answerRevealed: gameState.answerRevealed || false,

    // Loading state (for schedule check)
    isLoadingSchedule,

    // Stats
    stats,

    // Actions
    recordGuess,
    refreshPuzzle,
    setModalShown,
    setAnswerRevealed,

    // Debug
    debugMode,
    debugOffset,
    effectiveDate: getEffectiveDate(),
    changeDebugDate,
    resetDebugDate,
    resetAllData,

    // Constants
    maxGuesses: MAX_GUESSES
  };
}

export default useDailyPuzzle;
