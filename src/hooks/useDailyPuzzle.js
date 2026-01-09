/**
 * useDailyPuzzle Hook
 * Manages daily puzzle state with localStorage persistence
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
  isDebugMode,
  getEffectiveDate,
  getPuzzleNumber,
  getDebugDateOffset,
  setDebugDateOffset,
  clearAllData,
  MAX_GUESSES
} from '../utils/dailyPuzzle.js';

/**
 * Custom hook for managing daily puzzle state
 * @param {Array} puzzles - Array of puzzle objects
 * @returns {Object} - Daily puzzle state and actions
 */
export function useDailyPuzzle(puzzles) {
  // Current puzzle data
  const [puzzleData, setPuzzleData] = useState(() => getPuzzleForToday(puzzles));

  // Game state (guesses, status)
  const [gameState, setGameState] = useState(() => {
    const { canPlay, existingState } = canPlayToday();
    if (existingState) return existingState;
    return initializeTodayGame();
  });

  // Stats
  const [stats, setStats] = useState(() => loadStats());

  // Debug mode
  const [debugMode] = useState(() => isDebugMode());
  const [debugOffset, setDebugOffset] = useState(() => getDebugDateOffset());

  // Derived state
  const alreadyCompleted = gameState.gameStatus === 'won' || gameState.gameStatus === 'lost';
  const guessesRemaining = MAX_GUESSES - gameState.guesses.length;

  /**
   * Refresh puzzle data (used after debug date change)
   */
  const refreshPuzzle = useCallback(() => {
    const newPuzzleData = getPuzzleForToday(puzzles);
    setPuzzleData(newPuzzleData);

    // Check if this is a different puzzle than current state
    const { canPlay, existingState } = canPlayToday();
    if (existingState && existingState.lastPuzzleNumber === newPuzzleData.puzzleNumber) {
      setGameState(existingState);
    } else {
      setGameState(initializeTodayGame());
    }

    setStats(loadStats());
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
    }

    return { newState, isGameOver, won };
  }, [gameState, alreadyCompleted]);

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

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return {
    // Puzzle info
    puzzle: puzzleData.puzzle,
    puzzleNumber: puzzleData.puzzleNumber,
    puzzleIndex: puzzleData.puzzleIndex,

    // Game state
    gameState,
    guesses: gameState.guesses,
    guessedPlayers,
    guessesRemaining,
    gameStatus: gameState.gameStatus,
    alreadyCompleted,

    // Stats
    stats,

    // Actions
    recordGuess,
    refreshPuzzle,

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
