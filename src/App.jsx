/*
 * Bowldem - Daily Cricket Puzzle Game (v2.0)
 * ==========================================
 *
 * A Wordle-style daily puzzle game where players guess the Man of the Match
 * from historic cricket matches based on venue and scorecard clues.
 *
 * Game Flow:
 * 1. Player sees venue + match scores (team names hidden)
 * 2. Player types a cricketer's name (autocomplete after 3 chars)
 * 3. System provides Y/N feedback on 4 attributes:
 *    - Played: Did this player play in this match?
 *    - Team: Is this player on the same team as the MVP?
 *    - Role: Does this player have the same role (Batsman/Bowler/etc)?
 *    - MVP: Is this the Man of the Match? (Win condition)
 * 4. Player has 5 guesses to find the MVP
 *
 * Data Structure:
 * - all_players.json: Comprehensive player database (id, fullName, country, role)
 * - match_puzzles_t20wc.json: Puzzle data with scorecard, playersInMatch, target
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import allPlayersData from "./data/all_players.json";
import matchPuzzlesData from "./data/match_puzzles_t20wc.json";
import matchHighlightsData from "./data/match_highlights.json";
import { useDailyPuzzle } from "./hooks/useDailyPuzzle.js";
import { useLeaderboard } from "./hooks/useLeaderboard.js";
import { checkAutoReset, getEffectiveDate } from "./utils/dailyPuzzle.js";
import { PlayerAutocomplete } from "./components/PlayerAutocomplete.jsx";
import { FeedbackDisplay } from "./components/FeedbackDisplay.jsx";
import { ThirdUmpireFeedback } from "./components/ThirdUmpireFeedback.jsx";
import { StatsModal } from "./components/StatsModal.jsx";
import { DebugPanel } from "./components/DebugPanel.jsx";
import { CountdownTimer } from "./components/CountdownTimer.jsx";
import { ArchiveModal, saveArchiveCompletion } from "./components/ArchiveModal.jsx";
import { LeaderboardModal, LeaderboardPreview } from "./components/community/LeaderboardModal.jsx";
import { NameEntryPrompt } from "./components/community/NameEntryPrompt.jsx";
import { NotificationOptIn, hasHandledNotifications } from "./components/community/NotificationOptIn.jsx";
import { CompletedStateBanner, LiveLeaderboard, CompletedMobileView } from "./components/home/WinStateBanner.jsx";
import { TutorialOverlay, hasTutorialBeenSeen } from "./components/onboarding/TutorialOverlay.jsx";
import { Icon } from "./components/ui/Icon.jsx";
import { validateGuess, saveNotificationSubscription } from "./lib/supabase.js";
import { getPuzzleIndex } from "./utils/dailyPuzzle.js";
import { initAnalytics, trackGame, trackFeature, trackFunnel, trackButtonTap } from "./lib/analytics.js";
import { Confetti } from "./components/effects/Confetti.jsx";
import "./App.css";

// Initialize analytics on app load
initAnalytics();

// Feature flag for Supabase validation (set to true to enable server-side validation)
const USE_SUPABASE_VALIDATION = true;

// Auto-reset if ?reset=true is in URL
checkAutoReset();

// Load puzzle data - each puzzle represents one historic match
const PUZZLES = matchPuzzlesData.puzzles || [];

function App() {
  const {
    puzzle: currentPuzzle,
    puzzleNumber,
    gameState,
    guesses,
    guessedPlayers,
    guessesRemaining,
    gameStatus,
    alreadyCompleted,
    modalShown,
    stats,
    recordGuess,
    setModalShown,
    setAnswerRevealed: persistAnswerRevealed,
    answerRevealed: answerRevealedPersisted,
    debugMode,
    debugOffset,
    effectiveDate,
    changeDebugDate,
    resetDebugDate,
    resetAllData,
    maxGuesses
  } = useDailyPuzzle(PUZZLES);

  const [feedbackList, setFeedbackList] = useState([]);
  const [usedPlayers, setUsedPlayers] = useState(new Set());
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showNotificationOptIn, setShowNotificationOptIn] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !hasTutorialBeenSeen());
  const [isChecking, setIsChecking] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [newFeedbackIndex, setNewFeedbackIndex] = useState(-1);
  const [modalMinimized, setModalMinimized] = useState(false);
  const [copyButtonState, setCopyButtonState] = useState('idle'); // 'idle' | 'copied'
  const [answerRevealedSession, setAnswerRevealedSession] = useState(false);
  const answerRevealed = answerRevealedPersisted || answerRevealedSession;
  const setAnswerRevealed = useCallback((val) => {
    setAnswerRevealedSession(true);
    persistAnswerRevealed(); // persist to localStorage
  }, [persistAnswerRevealed]);
  const [revealAnswerEmail, setRevealAnswerEmail] = useState('');
  const [revealEmailError, setRevealEmailError] = useState('');

  // Get puzzle date for leaderboard
  const puzzleDate = getEffectiveDate();

  // Archive mode state (must be before useLeaderboard and matchHighlight)
  const [archiveMode, setArchiveMode] = useState(false);
  const [archivePuzzleDate, setArchivePuzzleDate] = useState(null);
  const [archivePuzzleNumber, setArchivePuzzleNumber] = useState(null);
  const [archivePuzzle, setArchivePuzzle] = useState(null);
  const [archiveFeedbackList, setArchiveFeedbackList] = useState([]);
  const [archiveUsedPlayers, setArchiveUsedPlayers] = useState(new Set());
  const [archiveGameWon, setArchiveGameWon] = useState(false);
  const [archiveGameOver, setArchiveGameOver] = useState(false);

  // Initialize leaderboard hook
  const {
    puzzleLeaderboard,
    puzzleLeaderboardLoading,
    fetchPuzzleLeaderboard,
    getTopEntries,
    displayName,
    saveDisplayName,
    userRanking,
    calculatePercentile,
    submitToLeaderboard,
    isSubmitting: isLeaderboardSubmitting,
    hasSubmitted: hasLeaderboardSubmitted,
    // Email persistence
    email: savedEmail,
    linkEmail,
    isLinkingEmail,
    historicalEntries,
    fetchHistoricalEntries
  } = useLeaderboard(puzzleNumber, puzzleDate);

  // State to control email prompt visibility
  const [showEmailPrompt, setShowEmailPrompt] = useState(true);
  const handleSkipEmail = () => setShowEmailPrompt(false);

  // Fetch leaderboard on mount and when game ends (for live updates)
  useEffect(() => {
    fetchPuzzleLeaderboard();
  }, [fetchPuzzleLeaderboard]);

  // Refresh leaderboard when game status changes
  useEffect(() => {
    if (gameWon || gameOver || alreadyCompleted) {
      fetchPuzzleLeaderboard();
    }
  }, [gameWon, gameOver, alreadyCompleted, fetchPuzzleLeaderboard]);

  // Get match highlights for current puzzle
  const matchHighlight = useMemo(() => {
    const puzzle = archiveMode ? archivePuzzle : currentPuzzle;
    if (!puzzle) return matchHighlightsData.defaultHighlight;

    const highlight = matchHighlightsData.highlights.find(h => h.puzzleId === puzzle.id);
    return highlight || matchHighlightsData.defaultHighlight;
  }, [currentPuzzle, archivePuzzle, archiveMode]);

  // Handle leaderboard submission
  const handleLeaderboardSubmit = useCallback(async (name, guessCount, won) => {
    saveDisplayName(name);
    await submitToLeaderboard(guessCount, won);
    // Minimize modal after successful submission
    setModalMinimized(true);
  }, [saveDisplayName, submitToLeaderboard]);

  // Create a lookup map for O(1) player access by ID
  const playersLookup = useMemo(() => {
    const map = {};
    allPlayersData.players.forEach(player => {
      map[player.id] = player;
    });
    return map;
  }, []);

  // Create a Set of all player IDs that appear in puzzles (active T20 players)
  // These players are prioritized in autocomplete results
  const priorityPlayerIds = useMemo(() => {
    const ids = new Set();
    PUZZLES.forEach(puzzle => {
      const playersInMatch = puzzle.matchData?.playersInMatch || [];
      playersInMatch.forEach(id => ids.add(id));
      // Also add the target player
      if (puzzle.targetPlayer) {
        ids.add(puzzle.targetPlayer);
      }
    });
    return ids;
  }, []);

  // Helper to find player by ID from the lookup map
  const findPlayer = (playerId) => {
    return playersLookup[playerId] || null;
  };

  /**
   * Derive real team names from puzzle data when team1Name/team2Name are missing.
   * Uses playersInMatch to determine teams from player countries.
   * Also fixes result text that says "Team 1"/"Team 2".
   */
  const getResolvedScorecard = useCallback((puzzle) => {
    if (!puzzle) return null;
    const scorecard = puzzle.matchData?.scorecard || {};
    let team1Name = scorecard.team1Name;
    let team2Name = scorecard.team2Name;

    if (!team1Name || !team2Name) {
      const players = puzzle.matchData?.playersInMatch || [];
      // First player's country = team1, find a different country = team2
      if (players.length > 0) {
        const firstPlayer = findPlayer(players[0]);
        team1Name = firstPlayer?.country || 'Team 1';
        for (let i = 1; i < players.length; i++) {
          const p = findPlayer(players[i]);
          if (p && p.country !== team1Name) {
            team2Name = p.country || 'Team 2';
            break;
          }
        }
        if (!team2Name) team2Name = 'Team 2';
      }
    }

    // Fix result text: replace "Team 1"/"Team 2" with real names
    let result = scorecard.result || '';
    if (team1Name && result.includes('Team 1')) {
      result = result.replace('Team 1', team1Name);
    }
    if (team2Name && result.includes('Team 2')) {
      result = result.replace('Team 2', team2Name);
    }

    return {
      ...scorecard,
      team1Name,
      team2Name,
      result
    };
  }, [findPlayer]);

  /**
   * Generate Y/N feedback for a guessed player
   * Compares guessed player against the target MVP across 4 attributes:
   * - playedInGame: Was this player in the match squad?
   * - sameTeam: Does player's country match MVP's team?
   * - sameRole: Does player's role match MVP's role?
   * - isMVP: Is this the correct answer?
   */
  const generateNewFeedback = (guessedPlayerKey, puzzleToUse = null) => {
    const guessedPlayer = findPlayer(guessedPlayerKey);
    const puzzle = puzzleToUse || currentPuzzle;
    if (!guessedPlayer || !puzzle) return null;

    const matchData = puzzle.matchData;
    const playersInMatch = matchData.playersInMatch || [];
    const targetPlayerTeam = matchData.targetPlayerTeam;
    const targetPlayerRole = matchData.targetPlayerRole;

    return {
      playerName: guessedPlayer.fullName,
      country: guessedPlayer.country,
      role: guessedPlayer.role,
      playedInGame: playersInMatch.includes(guessedPlayerKey),
      sameTeam: guessedPlayer.country === targetPlayerTeam,
      sameRole: guessedPlayer.role === targetPlayerRole,
      isMVP: guessedPlayerKey === puzzle.targetPlayer
    };
  };

  /**
   * Handle selecting an archive puzzle to play
   */
  const handleSelectArchivePuzzle = (puzzleDate, puzzleNum) => {
    // Calculate the puzzle index from the puzzle number
    const puzzleIndex = getPuzzleIndex(puzzleNum, PUZZLES.length);
    const puzzle = PUZZLES[puzzleIndex];

    // Reset archive game state
    setArchiveMode(true);
    setArchivePuzzleDate(puzzleDate);
    setArchivePuzzleNumber(puzzleNum);
    setArchivePuzzle(puzzle);
    setArchiveFeedbackList([]);
    setArchiveUsedPlayers(new Set());
    setArchiveGameWon(false);
    setArchiveGameOver(false);
  };

  /**
   * Exit archive mode and return to daily puzzle
   */
  const handleExitArchiveMode = () => {
    setArchiveMode(false);
    setArchivePuzzle(null);
    setArchivePuzzleDate(null);
    setArchivePuzzleNumber(null);
    setArchiveFeedbackList([]);
    setArchiveUsedPlayers(new Set());
    setArchiveGameWon(false);
    setArchiveGameOver(false);
  };

  /**
   * Handle player guess in archive mode
   */
  const handleArchiveGuess = async (playerKey) => {
    if (archiveGameWon || archiveGameOver || archiveUsedPlayers.has(playerKey) || isChecking) return;

    setIsChecking(true);
    setArchiveUsedPlayers(prev => new Set([...prev, playerKey]));

    // Generate feedback (client-side for archive - no server validation needed)
    const feedback = generateNewFeedback(playerKey, archivePuzzle);

    if (!feedback) {
      setIsChecking(false);
      return;
    }

    setPendingFeedback(feedback);

    setTimeout(() => {
      const isWin = feedback.isMVP;
      const newFeedback = [...archiveFeedbackList, feedback];
      const isLastGuess = newFeedback.length >= maxGuesses;

      setNewFeedbackIndex(newFeedback.length - 1);
      setArchiveFeedbackList(newFeedback);
      setIsChecking(false);
      setPendingFeedback(null);

      setTimeout(() => setNewFeedbackIndex(-1), 600);

      if (isWin) {
        setArchiveGameWon(true);
        saveArchiveCompletion(archivePuzzleDate, 'won');
        setTimeout(() => setShowSuccessModal(true), 2500);
      } else if (isLastGuess) {
        setArchiveGameOver(true);
        saveArchiveCompletion(archivePuzzleDate, 'lost');
        setTimeout(() => setShowGameOverModal(true), 2500);
      }
    }, 300);
  };

  // Track if this is initial load to prevent duplicate modal opening
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (guesses.length > 0 && currentPuzzle) {
      const rebuiltFeedback = guesses.map(playerKey => {
        return generateNewFeedback(playerKey);
      }).filter(Boolean);

      setFeedbackList(rebuiltFeedback);
      setUsedPlayers(new Set(guesses));

      // Only show modals on initial load (restoring from localStorage)
      // AND only if modal hasn't been shown before (prevents re-trigger on return)
      // Live game completion shows modals via handlePlayerGuess
      if (isInitialLoad && alreadyCompleted && !modalShown) {
        if (gameStatus === 'won') {
          setGameWon(true);
          setShowSuccessModal(true);
          setModalShown(); // Mark modal as shown to prevent re-trigger
        } else if (gameStatus === 'lost') {
          setGameOver(true);
          setShowGameOverModal(true);
          setModalShown(); // Mark modal as shown to prevent re-trigger
        }
      }
    }
    setIsInitialLoad(false);
  }, [gameStatus, guesses.length, currentPuzzle, alreadyCompleted, modalShown, setModalShown]);

  const handlePlayerGuess = async (playerKey) => {
    if (gameWon || gameOver || usedPlayers.has(playerKey) || alreadyCompleted || isChecking) return;

    // Track first guess for funnel
    if (feedbackList.length === 0) {
      trackFunnel.firstGuess();
    }

    // Start 3rd Umpire checking state
    setIsChecking(true);
    setUsedPlayers(prev => new Set([...prev, playerKey]));

    let feedback;

    if (USE_SUPABASE_VALIDATION && currentPuzzle?.id) {
      // Server-side validation (anti-cheat)
      try {
        feedback = await validateGuess(currentPuzzle.id, playerKey);
        if (!feedback || feedback.error) {
          console.error('Server validation error:', feedback?.error);
          // Fallback to client-side
          feedback = generateNewFeedback(playerKey);
        }
      } catch (err) {
        console.error('Supabase error:', err);
        // Fallback to client-side
        feedback = generateNewFeedback(playerKey);
      }
    } else {
      // Client-side validation (fallback)
      feedback = generateNewFeedback(playerKey);
    }

    if (!feedback) {
      console.warn('Player not found:', playerKey);
      setIsChecking(false);
      return;
    }

    setPendingFeedback(feedback);

    // Small delay for UX, then reveal with sequential animation
    setTimeout(() => {
      const isWin = feedback.isMVP;
      const { newState, isGameOver } = recordGuess(playerKey, isWin);

      const newFeedbackList = [...feedbackList, feedback];
      setNewFeedbackIndex(newFeedbackList.length - 1);
      setFeedbackList(newFeedbackList);
      setIsChecking(false);
      setPendingFeedback(null);

      // Track guess
      trackGame.guess(newFeedbackList.length, feedback.playerName, feedback);

      // Reset newFeedbackIndex after animation completes (~600ms)
      setTimeout(() => setNewFeedbackIndex(-1), 600);

      // Show modal after feedback is fully visible (2500ms gives time to see result)
      if (isWin) {
        setGameWon(true);
        trackGame.win(puzzleNumber, newFeedbackList.length);
        trackFunnel.gameCompleted(true);
        setTimeout(() => setShowSuccessModal(true), 2500);
      } else if (newFeedbackList.length >= maxGuesses) {
        setGameOver(true);
        trackGame.lose(puzzleNumber, newFeedbackList.length);
        trackFunnel.gameCompleted(false);
        setTimeout(() => setShowGameOverModal(true), 3000); // Increased from 2500ms to give user time to process final feedback
      }
    }, 300); // Shorter delay since server call adds latency
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setShowGameOverModal(false);
    // Don't reset answerRevealed — it's persisted
    setRevealAnswerEmail('');
    setRevealEmailError('');
  };

  const generateShareText = () => {
    const feedbackLines = feedbackList.map(feedback => {
      const played = feedback.playedInGame ? '🟢' : '🔴';
      const team = feedback.sameTeam ? '🟢' : '🔴';
      const role = feedback.sameRole ? '🟢' : '🔴';
      const motm = feedback.isMVP ? '🏆' : '🔴';
      return played + team + role + motm;
    });

    const gridPattern = feedbackLines.join('\n');

    // Get match context from current puzzle
    const scorecard = currentPuzzle?.matchData?.scorecard || {};
    // IMPORTANT: Always use "Team 1" and "Team 2" to avoid spoilers
    const team1Name = 'Team 1';
    const team2Name = 'Team 2';

    // Parse scores to show just runs/wickets (strip overs)
    const parseScore = (score) => {
      if (!score) return '?';
      // "155/9 (19.1 overs)" -> "155/9"
      const match = score.match(/^(\d+\/\d+)/);
      return match ? match[1] : score.split(' ')[0];
    };
    const team1Score = parseScore(scorecard.team1Score);
    const team2Score = parseScore(scorecard.team2Score);

    // Get venue (strip country if too long)
    const venue = scorecard.venue || '';
    const shortVenue = venue.split(',').slice(0, 2).join(',').trim();

    // Result indicator
    const won = feedbackList.some(f => f.isMVP);
    const resultEmoji = won ? '✅' : '❌';
    const resultText = `${resultEmoji} ${feedbackList.length}/${maxGuesses}`;

    // Build share text
    let shareText = `🏏 Bowldem #${puzzleNumber}\n\n`;
    shareText += `${team1Name} ${team1Score}\n`;
    shareText += `${team2Name} ${team2Score}\n`;
    if (shortVenue) {
      shareText += `📍 ${shortVenue}\n`;
    }
    shareText += `\n${gridPattern}\n\n`;
    shareText += `${resultText}\n\n`;
    shareText += `bowldem.com`;

    return shareText;
  };

  // GameRadar component - renders emoji feedback grid in modals
  const GameRadar = ({ feedback }) => {
    if (!feedback || feedback.length === 0) return null;

    const feedbackLines = feedback.map(fb => {
      const played = fb.playedInGame ? '🟢' : '🔴';
      const team = fb.sameTeam ? '🟢' : '🔴';
      const role = fb.sameRole ? '🟢' : '🔴';
      const motm = fb.isMVP ? '🏆' : '🔴';
      return played + team + role + motm;
    });

    return (
      <div className="game-radar">
        {feedbackLines.map((line, index) => (
          <div key={index} className="game-radar-row">{line}</div>
        ))}
      </div>
    );
  };

  const handleShare = () => {
    const shareText = generateShareText();

    // Track share
    trackFeature.shareCopy();
    trackFunnel.shareCompleted();

    // Always use clipboard (Wordle-style) - no native share dialog
    navigator.clipboard.writeText(shareText).then(() => {
      setCopyButtonState('copied');
      // Reset button after 2 seconds
      setTimeout(() => setCopyButtonState('idle'), 2000);
    }).catch(() => {
      // Fallback for older browsers
      setCopyButtonState('copied');
      setTimeout(() => setCopyButtonState('idle'), 2000);
    });
  };

  const handleShareX = () => {
    trackFeature.shareX();
    trackFunnel.shareCompleted();

    const shareText = generateShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareWhatsApp = () => {
    trackFeature.shareWhatsApp();
    trackFunnel.shareCompleted();

    const shareText = generateShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  // Handle notification subscription
  const handleNotificationSubscribe = async (contact, contactType) => {
    trackFeature.notificationSubscribed?.();
    await saveNotificationSubscription(contact, contactType);
  };

  const renderSimplifiedScorecard = () => {
    const puzzle = archiveMode ? archivePuzzle : currentPuzzle;
    const displayPuzzleNumber = archiveMode ? archivePuzzleNumber : puzzleNumber;

    if (!puzzle) return null;

    const resolved = getResolvedScorecard(puzzle);
    const scorecard = puzzle.matchData?.scorecard || {};
    const venue = scorecard.venue || "Unknown Venue";
    const team1Score = scorecard.team1Score;
    const team2Score = scorecard.team2Score;

    // Determine if we should reveal team names (won, or answer revealed after loss)
    const shouldReveal = archiveMode
      ? (archiveGameWon || archiveGameOver)
      : (gameWon || (alreadyCompleted && (gameStatus === 'won' || answerRevealed)));

    const team1Label = shouldReveal ? (resolved?.team1Name || 'Team 1') : 'Team 1';
    const team2Label = shouldReveal ? (resolved?.team2Name || 'Team 2') : 'Team 2';
    const result = shouldReveal ? resolved?.result : null;

    // Get match context (includes year) from highlights
    const puzzleHighlight = matchHighlightsData.highlights.find(h => h.puzzleId === puzzle.id);
    const matchContext = puzzleHighlight?.matchContext;

    return (
      <div className="scorecard-simplified">
        <div className="scorecard-header">
          <span className={`puzzle-badge ${archiveMode ? 'archive' : ''}`}>
            {archiveMode ? `Archive #${displayPuzzleNumber}` : `Puzzle #${displayPuzzleNumber}`}
          </span>
          {matchContext && (
            <span className="match-context-badge">{matchContext}</span>
          )}
        </div>
        <div className="venue-display">
          <span className="venue-icon">📍</span>
          <span className="venue-name">{venue}</span>
        </div>
        {team1Score && team2Score && (
          <div className="match-scores">
            <div className="team-score">
              <span className="team-label">{team1Label}</span>
              <span className="score-value">{team1Score}</span>
            </div>
            <div className="vs-divider">vs</div>
            <div className="team-score">
              <span className="team-label">{team2Label}</span>
              <span className="score-value">{team2Score}</span>
            </div>
          </div>
        )}
        {result && (
          <div className="match-result">{result}</div>
        )}
      </div>
    );
  };

  const SuccessModal = () => {
    const puzzle = archiveMode ? archivePuzzle : currentPuzzle;
    const currentFeedbackList = archiveMode ? archiveFeedbackList : feedbackList;
    const displayPuzzleNumber = archiveMode ? archivePuzzleNumber : puzzleNumber;
    const targetPlayerKey = puzzle?.targetPlayer;
    const targetPlayer = findPlayer(targetPlayerKey);

    // Archive mode - different layout
    if (archiveMode) {
      return (
        <div className="result-modal result-modal-success">
          <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
          <div className="result-emoji">🏆</div>
          <h2 className="result-title">Archive Complete!</h2>
          <p className="result-subtitle">
            Found <strong>{targetPlayer?.fullName}</strong> in {currentFeedbackList.length}/{maxGuesses}
          </p>
          <div className="result-actions">
            <button className="btn-result-secondary" onClick={() => {
              setShowSuccessModal(false);
              setShowArchiveModal(true);
            }}>
              More Archives
            </button>
            <button className="btn-result-primary" onClick={() => {
              setShowSuccessModal(false);
              handleExitArchiveMode();
            }}>
              Back to Today
            </button>
          </div>
        </div>
      );
    }

    // Daily mode - Grand Reveal with match summary
    const resolved = getResolvedScorecard(puzzle);
    const cricinfoUrl = puzzle?.cricinfoUrl;

    return (
      <div className="result-modal result-modal-success result-modal-reveal">
        <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">
          <Icon name="close" size={20} />
        </button>

        {/* Header */}
        <div className="reveal-header">
          <span className="reveal-trophy">🏆</span>
          <span className="reveal-title">Bowldem #{displayPuzzleNumber}</span>
          <span className="reveal-solved">Solved in {currentFeedbackList.length}/{maxGuesses}</span>
        </div>

        {/* Match Summary Card */}
        <div className="reveal-match-card">
          <div className="reveal-match-label">🏏 Match Summary</div>
          <div className="reveal-scores">
            <div className="reveal-team-line">
              <span className="reveal-team-name">{resolved?.team1Name}</span>
              <span className="reveal-team-score">{resolved?.team1Score}</span>
            </div>
            <div className="reveal-vs">vs</div>
            <div className="reveal-team-line">
              <span className="reveal-team-name">{resolved?.team2Name}</span>
              <span className="reveal-team-score">{resolved?.team2Score}</span>
            </div>
          </div>
          <div className="reveal-result">{resolved?.result}</div>
          <div className="reveal-venue">📍 {resolved?.venue}</div>
        </div>

        {/* MOTM Section */}
        <div className="reveal-motm">
          <div className="reveal-motm-label">⭐ Man of the Match</div>
          <div className="reveal-motm-name">{targetPlayer?.fullName}</div>
          <div className="reveal-motm-detail">
            {puzzle?.matchData?.targetPlayerTeam} • {puzzle?.matchData?.targetPlayerRole}
          </div>
        </div>

        {/* Cricinfo Link */}
        {cricinfoUrl && (
          <a
            href={cricinfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal-scorecard-link"
          >
            🔗 View Full Scorecard ↗
          </a>
        )}

        {/* Share buttons row */}
        <div className="modal-share-buttons">
          <button className="modal-share-btn share-btn-x" onClick={handleShareX} title="Share on X">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>
          <button className="modal-share-btn share-btn-whatsapp" onClick={handleShareWhatsApp} title="Share on WhatsApp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
          <button
            className={`modal-share-btn share-btn-copy ${copyButtonState === 'copied' ? 'copied' : ''}`}
            onClick={handleShare}
            title="Copy to clipboard"
          >
            {copyButtonState === 'copied' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Secondary CTA - View Leaderboard (text link) */}
        <button
          className="btn-view-leaderboard-link"
          onClick={() => {
            setShowSuccessModal(false);
            setShowLeaderboardModal(true);
          }}
        >
          View Leaderboard →
        </button>
      </div>
    );
  };

  const GameOverModal = () => {
    const puzzle = archiveMode ? archivePuzzle : currentPuzzle;
    const currentFeedbackList = archiveMode ? archiveFeedbackList : feedbackList;
    const displayPuzzleNumber = archiveMode ? archivePuzzleNumber : puzzleNumber;
    const targetPlayerKey = puzzle?.targetPlayer;
    const targetPlayer = findPlayer(targetPlayerKey);

    // Archive mode - different layout (still shows answer for archives)
    if (archiveMode) {
      return (
        <div className="result-modal result-modal-failure">
          <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
          <div className="result-emoji">😔</div>
          <h2 className="result-title">Game Over</h2>
          <p className="result-subtitle">
            The answer was <strong>{targetPlayer?.fullName || "Unknown"}</strong>
          </p>
          <div className="result-actions">
            <button className="btn-result-secondary" onClick={() => {
              setShowGameOverModal(false);
              setShowArchiveModal(true);
            }}>
              More Archives
            </button>
            <button className="btn-result-primary" onClick={() => {
              setShowGameOverModal(false);
              handleExitArchiveMode();
            }}>
              Back to Today
            </button>
          </div>
        </div>
      );
    }

    // Daily mode - with reveal answer flow + match summary
    const resolved = getResolvedScorecard(puzzle);
    const cricinfoUrl = puzzle?.cricinfoUrl;

    return (
      <div className={`result-modal result-modal-failure ${answerRevealed ? 'result-modal-reveal' : 'result-modal-compact'}`}>
        <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">
          <Icon name="close" size={20} />
        </button>

        {/* Header with emoji and puzzle number */}
        <div className={answerRevealed ? "reveal-header" : "result-header"}>
          <span className={answerRevealed ? "reveal-trophy" : "result-emoji-inline"}>😔</span>
          <span className={answerRevealed ? "reveal-title" : "result-puzzle-title"}>Bowldem #{displayPuzzleNumber}</span>
          {answerRevealed && (
            <span className="reveal-solved" style={{ color: '#dc2626' }}>
              {currentFeedbackList.length}/{maxGuesses} guesses used
            </span>
          )}
        </div>

        {/* Game Radar - only show before reveal */}
        {!answerRevealed && <GameRadar feedback={currentFeedbackList} />}

        {/* Result text - only before reveal */}
        {!answerRevealed && <p className="result-text">Better luck tomorrow!</p>}

        {/* Reveal Answer Section */}
        {answerRevealed ? (
          <>
            {/* Match Summary Card - same as win */}
            <div className="reveal-match-card">
              <div className="reveal-match-label">🏏 Match Summary</div>
              <div className="reveal-scores">
                <div className="reveal-team-line">
                  <span className="reveal-team-name">{resolved?.team1Name}</span>
                  <span className="reveal-team-score">{resolved?.team1Score}</span>
                </div>
                <div className="reveal-vs">vs</div>
                <div className="reveal-team-line">
                  <span className="reveal-team-name">{resolved?.team2Name}</span>
                  <span className="reveal-team-score">{resolved?.team2Score}</span>
                </div>
              </div>
              <div className="reveal-result">{resolved?.result}</div>
              <div className="reveal-venue">📍 {resolved?.venue}</div>
            </div>

            {/* MOTM Section */}
            <div className="reveal-motm">
              <div className="reveal-motm-label">⭐ Man of the Match</div>
              <div className="reveal-motm-name">{targetPlayer?.fullName || "Unknown"}</div>
              <div className="reveal-motm-detail">
                {puzzle?.matchData?.targetPlayerTeam} • {puzzle?.matchData?.targetPlayerRole}
              </div>
            </div>

            {/* Cricinfo Link */}
            {cricinfoUrl && (
              <a
                href={cricinfoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="reveal-scorecard-link"
              >
                🔗 View Full Scorecard ↗
              </a>
            )}
          </>
        ) : (
          <div className="reveal-answer-section">
            <div className="reveal-answer-prompt">Want to know the answer?</div>
            <div className="reveal-answer-form">
              <input
                type="email"
                className={`reveal-answer-input ${revealEmailError ? 'has-error' : ''}`}
                placeholder="your@email.com"
                value={revealAnswerEmail}
                onChange={(e) => {
                  setRevealAnswerEmail(e.target.value);
                  setRevealEmailError('');
                }}
              />
              {revealEmailError && <div className="reveal-answer-error">{revealEmailError}</div>}
            </div>
            <div className="reveal-answer-actions">
              <button
                className="btn-reveal-answer"
                onClick={async () => {
                  const trimmed = revealAnswerEmail.trim().toLowerCase();
                  if (!trimmed) {
                    setRevealEmailError('Please enter your email');
                    return;
                  }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    setRevealEmailError('Please enter a valid email');
                    return;
                  }
                  try { await linkEmail(trimmed); } catch (e) { /* non-blocking */ }
                  setAnswerRevealed(true);
                }}
              >
                Reveal Answer
              </button>
            </div>
          </div>
        )}

        {/* Copy Result */}
        <button
          className={`btn-copy-result ${copyButtonState === 'copied' ? 'copied' : ''}`}
          onClick={handleShare}
        >
          {copyButtonState === 'copied' ? 'Copied ✓' : 'Copy Result'}
        </button>
      </div>
    );
  };

  const HowToPlayModal = () => {
    return (
      <div className="how-to-play-modal">
        <div className="modal-header">
          <h2 className="overlay-title">How to Play Bowldem</h2>
          <button className="close-button" onClick={() => setShowHowToPlay(false)} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="instructions">
          <div className="instruction-section">
            <h3>Objective</h3>
            <div className="instruction-item">
              <div className="instruction-text">
                Find the <strong>Man of the Match</strong> in <strong>{maxGuesses} guesses</strong>!
                You'll see only the venue - use your cricket knowledge to identify the Man of the Match.
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>How to Play</h3>
            <div className="instruction-item">
              <div className="instruction-text">
                <strong>Type a player's name</strong> (minimum 3 characters) and select from the suggestions.
                You'll receive Y/N clues for each guess.
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>Feedback Clues</h3>
            <div className="instruction-item">
              <div className="instruction-text">
                <strong>Played</strong> - Did this player play in this match?<br/>
                <strong>Team</strong> - Is this player on the same team as the MOTM?<br/>
                <strong>Role</strong> - Does this player have the same role as the MOTM?<br/>
                <strong>MOTM</strong> - Is this player the Man of the Match?
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>Tips</h3>
            <div className="instruction-item">
              <div className="instruction-text">
                • The venue can hint at which teams played<br/>
                • Y on "Played" means you're getting closer<br/>
                • Y on "Team" narrows it to 11 players<br/>
                • Y on "Role" narrows it by position
              </div>
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button
            className="btn-enhanced btn-secondary"
            onClick={() => {
              setShowHowToPlay(false);
              setShowTutorial(true);
            }}
          >
            Watch Tutorial
          </button>
          <button
            className="btn-enhanced btn-primary"
            onClick={() => setShowHowToPlay(false)}
          >
            Start Playing!
          </button>
        </div>
      </div>
    );
  };

  // Track confetti trigger
  const shouldShowConfetti = gameWon && !archiveMode;

  // Track confetti for analytics
  useEffect(() => {
    if (shouldShowConfetti) {
      trackFeature.confettiTriggered();
    }
  }, [shouldShowConfetti]);

  return (
    <div className={shouldShowConfetti ? 'page-celebrating' : ''}>
      {/* Confetti celebration on win */}
      <Confetti trigger={shouldShowConfetti} duration={3500} />

      <div className="page-background">
        <div className="game-layout">
          <div className="game-container">
            {/* Minimal Header */}
            <div className="header-minimal">
            <div className="header-left">
              <span className="brand-icon">🏏</span>
              <h1 className="brand-title">Bowldem</h1>
              {archiveMode && (
                <span className="archive-badge">Archive</span>
              )}
            </div>
            <div className="header-right">
              {archiveMode ? (
                <button
                  className="icon-btn back-btn"
                  onClick={handleExitArchiveMode}
                  title="Back to Today"
                  aria-label="Back to Today"
                >
                  <Icon name="arrowLeft" size={20} />
                </button>
              ) : (
                <>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      trackFeature.leaderboardOpened();
                      trackButtonTap('header_leaderboard');
                      setShowLeaderboardModal(true);
                    }}
                    title="Leaderboard"
                    aria-label="Leaderboard"
                  >
                    <Icon name="trophy" size={20} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      trackFeature.archiveOpened();
                      trackButtonTap('header_archive');
                      setShowArchiveModal(true);
                    }}
                    title="Archive"
                    aria-label="Archive"
                  >
                    <Icon name="archive" size={20} />
                  </button>
                </>
              )}
              <button
                className="icon-btn"
                onClick={() => {
                  trackFeature.howToPlayOpened();
                  trackButtonTap('header_how_to_play');
                  setShowHowToPlay(true);
                }}
                title="How to Play"
                aria-label="How to Play"
              >
                <Icon name="helpCircle" size={20} />
              </button>
              <button
                className="icon-btn"
                onClick={() => {
                  trackFeature.statsOpened();
                  trackButtonTap('header_stats');
                  setShowStatsModal(true);
                }}
                title="Stats"
                aria-label="Stats"
              >
                <Icon name="stats" size={20} />
              </button>
            </div>
          </div>

          {/* Clue Card - At Top */}
          {renderSimplifiedScorecard()}

          {/* Hero Section - Input */}
          {archiveMode ? (
            // Archive mode input
            !archiveGameWon && !archiveGameOver && (
              <div className="hero-section">
                <div className="hero-prompt">
                  <span className="hero-text">Who's the Man of the Match?</span>
                </div>
                <PlayerAutocomplete
                  players={allPlayersData.players}
                  onSelectPlayer={handleArchiveGuess}
                  disabled={archiveGameWon || archiveGameOver}
                  usedPlayers={archiveUsedPlayers}
                  priorityPlayerIds={priorityPlayerIds}
                  feedbackList={archiveFeedbackList}
                />
              </div>
            )
          ) : (
            // Daily mode input
            !gameWon && !gameOver && !alreadyCompleted && (
              <div className="hero-section">
                <div className="hero-prompt">
                  <span className="hero-text">Who's the Man of the Match?</span>
                </div>
                <PlayerAutocomplete
                  players={allPlayersData.players}
                  onSelectPlayer={handlePlayerGuess}
                  disabled={gameWon || gameOver}
                  usedPlayers={usedPlayers}
                  priorityPlayerIds={priorityPlayerIds}
                  feedbackList={feedbackList}
                />
              </div>
            )
          )}

          {/* Completed State - Daily only - Redesigned */}
          {!archiveMode && alreadyCompleted && (
            <CompletedStateBanner
              won={gameStatus === 'won'}
              guessesUsed={feedbackList.length}
              maxGuesses={maxGuesses}
              streak={stats.currentStreak}
              playerName={(gameStatus === 'won' || answerRevealed) ? findPlayer(currentPuzzle?.targetPlayer)?.fullName : undefined}
              displayName={displayName}
              hasSubmitted={hasLeaderboardSubmitted}
              onSubscribe={handleNotificationSubscribe}
              onShareX={handleShareX}
              onShareWhatsApp={handleShareWhatsApp}
              onCopy={handleShare}
              copyState={copyButtonState}
              leaderboardEntries={puzzleLeaderboard}
              userRanking={userRanking}
              onViewLeaderboard={() => setShowLeaderboardModal(true)}
              onOpenArchive={() => setShowArchiveModal(true)}
              matchHighlight={(gameStatus === 'won' || answerRevealed) ? matchHighlight : null}
              // Match summary reveal props
              resolvedScorecard={(gameStatus === 'won' || answerRevealed) ? getResolvedScorecard(currentPuzzle) : null}
              targetPlayerTeam={(gameStatus === 'won' || answerRevealed) ? currentPuzzle?.matchData?.targetPlayerTeam : undefined}
              targetPlayerRole={(gameStatus === 'won' || answerRevealed) ? currentPuzzle?.matchData?.targetPlayerRole : undefined}
              cricinfoUrl={(gameStatus === 'won' || answerRevealed) ? currentPuzzle?.cricinfoUrl : undefined}
              // Email persistence props
              email={savedEmail}
              onLinkEmail={linkEmail}
              onSkipEmail={handleSkipEmail}
              isLinkingEmail={isLinkingEmail}
              historicalEntries={historicalEntries}
              showEmailPrompt={showEmailPrompt && !savedEmail}
            />
          )}

          {/* Feedback */}
          <ThirdUmpireFeedback
            feedbackList={archiveMode ? archiveFeedbackList : feedbackList}
            guessesRemaining={archiveMode ? (maxGuesses - archiveFeedbackList.length) : guessesRemaining}
            maxGuesses={maxGuesses}
            isChecking={isChecking}
            newFeedbackIndex={newFeedbackIndex}
          />

          {/* Mobile-only section (hidden on desktop where sidebar shows) */}
          {!archiveMode && (
            <div className="mobile-leaderboard">
              {alreadyCompleted ? (
                /* Mobile Completed View - shows leaderboard as hero */
                <CompletedMobileView
                  won={gameStatus === 'won'}
                  guessesUsed={feedbackList.length}
                  maxGuesses={maxGuesses}
                  streak={stats.currentStreak}
                  displayName={displayName}
                  hasSubmitted={hasLeaderboardSubmitted}
                  userRanking={userRanking}
                  leaderboardEntries={puzzleLeaderboard}
                  leaderboardLoading={puzzleLeaderboardLoading}
                  onSubmitToLeaderboard={async (name) => {
                    saveDisplayName(name);
                    await submitToLeaderboard(feedbackList.length, gameStatus === 'won');
                    fetchPuzzleLeaderboard();
                  }}
                  isSubmitting={isLeaderboardSubmitting}
                  onViewLeaderboard={() => setShowLeaderboardModal(true)}
                  onShareX={handleShareX}
                  onShareWhatsApp={handleShareWhatsApp}
                  onCopy={handleShare}
                  copyState={copyButtonState}
                  onSubscribe={handleNotificationSubscribe}
                  onOpenArchive={() => setShowArchiveModal(true)}
                  matchHighlight={(gameStatus === 'won' || answerRevealed) ? matchHighlight : null}
                  // Match summary reveal props
                  resolvedScorecard={(gameStatus === 'won' || answerRevealed) ? getResolvedScorecard(currentPuzzle) : null}
                  targetPlayerTeam={(gameStatus === 'won' || answerRevealed) ? currentPuzzle?.matchData?.targetPlayerTeam : undefined}
                  targetPlayerRole={(gameStatus === 'won' || answerRevealed) ? currentPuzzle?.matchData?.targetPlayerRole : undefined}
                  playerName={(gameStatus === 'won' || answerRevealed) ? findPlayer(currentPuzzle?.targetPlayer)?.fullName : undefined}
                  cricinfoUrl={(gameStatus === 'won' || answerRevealed) ? currentPuzzle?.cricinfoUrl : undefined}
                  // Email persistence props
                  email={savedEmail}
                  onLinkEmail={linkEmail}
                  onSkipEmail={handleSkipEmail}
                  isLinkingEmail={isLinkingEmail}
                  historicalEntries={historicalEntries}
                  showEmailPrompt={showEmailPrompt && !savedEmail}
                >
                  {/* Collapsible puzzle content */}
                  {renderSimplifiedScorecard()}
                  <ThirdUmpireFeedback
                    feedbackList={feedbackList}
                    guessesRemaining={guessesRemaining}
                    maxGuesses={maxGuesses}
                    isChecking={false}
                    newFeedbackIndex={-1}
                  />
                </CompletedMobileView>
              ) : (
                /* Regular leaderboard for active game */
                <LiveLeaderboard
                  entries={puzzleLeaderboard}
                  loading={puzzleLeaderboardLoading}
                  gameCompleted={gameWon || gameOver}
                  won={gameWon}
                  hasSubmitted={hasLeaderboardSubmitted}
                  displayName={displayName}
                  userRanking={userRanking}
                  guessesUsed={feedbackList.length}
                  onSubmit={async (name) => {
                    saveDisplayName(name);
                    await submitToLeaderboard(feedbackList.length, gameWon);
                    fetchPuzzleLeaderboard();
                  }}
                  isSubmitting={isLeaderboardSubmitting}
                  onViewFull={() => setShowLeaderboardModal(true)}
                  // Email persistence props
                  email={savedEmail}
                  onLinkEmail={linkEmail}
                  onSkipEmail={handleSkipEmail}
                  isLinkingEmail={isLinkingEmail}
                  showEmailPrompt={showEmailPrompt && !savedEmail}
                />
              )}
            </div>
          )}

          <div className="game-controls">
            {archiveMode ? (
              // Archive mode controls
              (archiveGameOver || archiveGameWon) && (
                <div className="game-actions">
                  <button
                    className="btn-enhanced btn-primary"
                    onClick={handleExitArchiveMode}
                  >
                    ← Back to Today
                  </button>
                  <button
                    className="btn-enhanced btn-secondary"
                    onClick={() => setShowArchiveModal(true)}
                  >
                    More Archives
                  </button>
                </div>
              )
            ) : (
              // Daily mode controls - only show for just-completed games (not alreadyCompleted)
              // alreadyCompleted uses the new CompletedStateBanner with integrated controls
              !alreadyCompleted && (gameOver || gameWon) && (
                <div className="game-actions">
                  <CountdownTimer />
                  <button
                    className="btn-enhanced btn-success"
                    onClick={handleShare}
                  >
                    Share Result
                  </button>
                </div>
              )
            )}
          </div>
        </div>

          {/* Sidebar - Live Leaderboard (desktop: right side, mobile: below) */}
          {!archiveMode && (
            <div className="game-sidebar">
              <LiveLeaderboard
                entries={puzzleLeaderboard}
                loading={puzzleLeaderboardLoading}
                gameCompleted={gameWon || gameOver || alreadyCompleted}
                won={gameWon || gameStatus === 'won'}
                hasSubmitted={hasLeaderboardSubmitted}
                displayName={displayName}
                userRanking={userRanking}
                guessesUsed={feedbackList.length}
                onSubmit={async (name) => {
                  saveDisplayName(name);
                  await submitToLeaderboard(feedbackList.length, gameWon || gameStatus === 'won');
                  fetchPuzzleLeaderboard();
                }}
                isSubmitting={isLeaderboardSubmitting}
                onViewFull={() => setShowLeaderboardModal(true)}
                // Email persistence props
                email={savedEmail}
                onLinkEmail={linkEmail}
                onSkipEmail={handleSkipEmail}
                isLinkingEmail={isLinkingEmail}
                showEmailPrompt={showEmailPrompt && !savedEmail}
              />
            </div>
          )}
        </div>
      </div>

      {showHowToPlay && (
        <div className="game-overlay" onClick={() => setShowHowToPlay(false)}>
          <div onClick={e => e.stopPropagation()}>
            <HowToPlayModal />
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="game-overlay">
          <SuccessModal />
        </div>
      )}

      {showGameOverModal && (
        <div className="game-overlay">
          <GameOverModal />
        </div>
      )}

      {showStatsModal && (
        <div className="game-overlay" onClick={() => setShowStatsModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <StatsModal stats={stats} onClose={() => setShowStatsModal(false)} />
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div className="game-overlay" onClick={() => setShowArchiveModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <ArchiveModal
              onClose={() => setShowArchiveModal(false)}
              onSelectPuzzle={handleSelectArchivePuzzle}
            />
          </div>
        </div>
      )}

      {showLeaderboardModal && (
        <div className="game-overlay" onClick={() => {
          setShowLeaderboardModal(false);
          fetchPuzzleLeaderboard(); // Refresh to sync hasSubmitted state
        }}>
          <div onClick={e => e.stopPropagation()}>
            <LeaderboardModal
              puzzleNumber={puzzleNumber}
              puzzleDate={puzzleDate}
              onClose={() => {
                setShowLeaderboardModal(false);
                fetchPuzzleLeaderboard(); // Refresh to sync hasSubmitted state
              }}
              guessesUsed={feedbackList.length}
              won={gameWon || gameStatus === 'won'}
              gameCompleted={gameWon || gameOver || alreadyCompleted}
            />
          </div>
        </div>
      )}

      {showNotificationOptIn && (
        <div className="game-overlay" onClick={() => setShowNotificationOptIn(false)}>
          <div onClick={e => e.stopPropagation()}>
            <NotificationOptIn
              onClose={() => setShowNotificationOptIn(false)}
              onSuccess={() => setShowNotificationOptIn(false)}
            />
          </div>
        </div>
      )}

      {debugMode && (
        <DebugPanel
          effectiveDate={effectiveDate}
          puzzleNumber={puzzleNumber}
          debugOffset={debugOffset}
          gameStatus={gameStatus}
          guesses={guesses}
          onPrevDay={() => changeDebugDate(-1)}
          onNextDay={() => changeDebugDate(1)}
          onResetDate={resetDebugDate}
          onClearData={resetAllData}
        />
      )}

      {showTutorial && (
        <TutorialOverlay onComplete={() => setShowTutorial(false)} />
      )}
    </div>
  );
}

export default App;
