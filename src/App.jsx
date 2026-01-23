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
 * 4. Player has 4 guesses to find the MVP
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
import { CompletedStateBanner, LiveLeaderboard } from "./components/home/WinStateBanner.jsx";
import { validateGuess } from "./lib/supabase.js";
import { getPuzzleIndex } from "./utils/dailyPuzzle.js";
import "./App.css";

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
    stats,
    recordGuess,
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
  const [isChecking, setIsChecking] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [newFeedbackIndex, setNewFeedbackIndex] = useState(-1);
  const [modalMinimized, setModalMinimized] = useState(false);
  const [copyButtonState, setCopyButtonState] = useState('idle'); // 'idle' | 'copied'

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
    hasSubmitted: hasLeaderboardSubmitted
  } = useLeaderboard(puzzleNumber, puzzleDate);

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

  // Helper to find player by ID from the lookup map
  const findPlayer = (playerId) => {
    return playersLookup[playerId] || null;
  };

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
        setTimeout(() => setShowSuccessModal(true), 850);
      } else if (isLastGuess) {
        setArchiveGameOver(true);
        saveArchiveCompletion(archivePuzzleDate, 'lost');
        setTimeout(() => setShowGameOverModal(true), 850);
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
      // Live game completion shows modals via handlePlayerGuess
      if (isInitialLoad && alreadyCompleted) {
        if (gameStatus === 'won') {
          setGameWon(true);
          setShowSuccessModal(true);
        } else if (gameStatus === 'lost') {
          setGameOver(true);
          setShowGameOverModal(true);
        }
      }
    }
    setIsInitialLoad(false);
  }, [gameStatus, guesses.length, currentPuzzle, alreadyCompleted]);

  const handlePlayerGuess = async (playerKey) => {
    if (gameWon || gameOver || usedPlayers.has(playerKey) || alreadyCompleted || isChecking) return;

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

      // Reset newFeedbackIndex after animation completes (~600ms)
      setTimeout(() => setNewFeedbackIndex(-1), 600);

      // Show modal after sequential reveal animation (~850ms)
      if (isWin) {
        setGameWon(true);
        setTimeout(() => setShowSuccessModal(true), 850);
      } else if (newFeedbackList.length >= maxGuesses) {
        setGameOver(true);
        setTimeout(() => setShowGameOverModal(true), 850);
      }
    }, 300); // Shorter delay since server call adds latency
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setShowGameOverModal(false);
  };

  const generateShareText = () => {
    const feedbackLines = feedbackList.map(feedback => {
      const played = feedback.playedInGame ? '🟢' : '🔴';
      const team = feedback.sameTeam ? '🟢' : '🔴';
      const role = feedback.sameRole ? '🟢' : '🔴';
      const mvp = feedback.isMVP ? '🏆' : '🔴';
      return played + team + role + mvp;
    });

    const gridPattern = feedbackLines.join('\n');

    // Result line with streak indicator (streak only shown if > 1)
    const guessText = gameWon ? feedbackList.length + '/' + maxGuesses : 'X/' + maxGuesses;
    const streakText = stats.currentStreak > 1 ? ' 🔥' + stats.currentStreak : '';

    return '🏏 Bowldem #' + puzzleNumber + '\n\n' + gridPattern + '\n\n' + guessText + streakText + '\n\nbowldem.com';
  };

  // GameRadar component - renders emoji feedback grid in modals
  const GameRadar = ({ feedback }) => {
    if (!feedback || feedback.length === 0) return null;

    const feedbackLines = feedback.map(fb => {
      const played = fb.playedInGame ? '🟢' : '🔴';
      const team = fb.sameTeam ? '🟢' : '🔴';
      const role = fb.sameRole ? '🟢' : '🔴';
      const mvp = fb.isMVP ? '🏆' : '🔴';
      return played + team + role + mvp;
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
    const shareText = generateShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const handleShareWhatsApp = () => {
    const shareText = generateShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const renderSimplifiedScorecard = () => {
    const puzzle = archiveMode ? archivePuzzle : currentPuzzle;
    const displayPuzzleNumber = archiveMode ? archivePuzzleNumber : puzzleNumber;

    if (!puzzle) return null;

    const scorecard = puzzle.matchData?.scorecard || {};
    const venue = scorecard.venue || "Unknown Venue";
    const team1Score = scorecard.team1Score;
    const team2Score = scorecard.team2Score;
    const result = scorecard.result;

    return (
      <div className="scorecard-simplified">
        <div className="scorecard-header">
          <span className={`puzzle-badge ${archiveMode ? 'archive' : ''}`}>
            {archiveMode ? `Archive #${displayPuzzleNumber}` : `Puzzle #${displayPuzzleNumber}`}
          </span>
        </div>
        <div className="venue-display">
          <span className="venue-icon">📍</span>
          <span className="venue-name">{venue}</span>
        </div>
        {team1Score && team2Score && (
          <div className="match-scores">
            <div className="team-score">
              <span className="team-label">Team 1</span>
              <span className="score-value">{team1Score}</span>
            </div>
            <div className="vs-divider">vs</div>
            <div className="team-score">
              <span className="team-label">Team 2</span>
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
          <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
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

    // Daily mode - NEW compact design with game radar
    return (
      <div className="result-modal result-modal-success result-modal-compact">
        <button className="modal-close-btn" onClick={handleCloseModal}>×</button>

        {/* Header with emoji and puzzle number */}
        <div className="result-header">
          <span className="result-emoji-inline">🏆</span>
          <span className="result-puzzle-title">Bowldem #{displayPuzzleNumber}</span>
        </div>

        {/* Game Radar - emoji feedback grid */}
        <GameRadar feedback={currentFeedbackList} />

        {/* Result text */}
        <p className="result-text">Solved in {currentFeedbackList.length}/{maxGuesses}!</p>

        {/* Primary CTA - Copy Result */}
        <button
          className={`btn-copy-result ${copyButtonState === 'copied' ? 'copied' : ''}`}
          onClick={handleShare}
        >
          {copyButtonState === 'copied' ? 'Copied ✓' : 'Copy Result'}
        </button>

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
          <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
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

    // Daily mode - NEW compact design with game radar, NO answer reveal
    return (
      <div className="result-modal result-modal-failure result-modal-compact">
        <button className="modal-close-btn" onClick={handleCloseModal}>×</button>

        {/* Header with emoji and puzzle number */}
        <div className="result-header">
          <span className="result-emoji-inline">😔</span>
          <span className="result-puzzle-title">Bowldem #{displayPuzzleNumber}</span>
        </div>

        {/* Game Radar - emoji feedback grid */}
        <GameRadar feedback={currentFeedbackList} />

        {/* Result text - NO answer revealed */}
        <p className="result-text">Better luck tomorrow!</p>

        {/* Primary CTA - Copy Result */}
        <button
          className={`btn-copy-result ${copyButtonState === 'copied' ? 'copied' : ''}`}
          onClick={handleShare}
        >
          {copyButtonState === 'copied' ? 'Copied ✓' : 'Copy Result'}
        </button>

        {/* NO leaderboard link for losses - winners only */}
      </div>
    );
  };

  const HowToPlayModal = () => {
    return (
      <div className="how-to-play-modal">
        <div className="modal-header">
          <h2 className="overlay-title">How to Play Bowldem</h2>
          <button className="close-button" onClick={() => setShowHowToPlay(false)}>
            ✕
          </button>
        </div>

        <div className="instructions">
          <div className="instruction-section">
            <h3>Objective</h3>
            <div className="instruction-item">
              <div className="instruction-text">
                Find the <strong>Man of the Match</strong> in <strong>{maxGuesses} guesses</strong>!
                You'll see only the venue - use your cricket knowledge to identify the MVP.
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
                <strong>Team</strong> - Is this player on the same team as the MVP?<br/>
                <strong>Role</strong> - Does this player have the same role as the MVP?<br/>
                <strong>MVP</strong> - Is this player the Man of the Match?
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
            className="btn-enhanced btn-primary"
            onClick={() => setShowHowToPlay(false)}
          >
            Start Playing!
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-background">
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
                >
                  ←
                </button>
              ) : (
                <>
                  <button
                    className="icon-btn"
                    onClick={() => setShowLeaderboardModal(true)}
                    title="Leaderboard"
                  >
                    🏆
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => setShowArchiveModal(true)}
                    title="Archive"
                  >
                    📚
                  </button>
                </>
              )}
              <button
                className="icon-btn"
                onClick={() => setShowHowToPlay(true)}
                title="How to Play"
              >
                ?
              </button>
              <button
                className="icon-btn"
                onClick={() => setShowStatsModal(true)}
                title="Stats"
              >
                📊
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
              playerName={findPlayer(currentPuzzle?.targetPlayer)?.fullName}
              displayName={displayName}
              hasSubmitted={hasLeaderboardSubmitted}
              onNotifyMe={!hasHandledNotifications() ? () => setShowNotificationOptIn(true) : null}
              onShareX={handleShareX}
              onShareWhatsApp={handleShareWhatsApp}
              onCopy={handleShare}
              copyState={copyButtonState}
              leaderboardEntries={puzzleLeaderboard}
              userRanking={userRanking}
              onViewLeaderboard={() => setShowLeaderboardModal(true)}
              onOpenArchive={() => setShowArchiveModal(true)}
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

          {/* Live Leaderboard - Always visible for social proof (daily mode only) */}
          {!archiveMode && (
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
            />
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
        <div className="game-overlay" onClick={() => setShowLeaderboardModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <LeaderboardModal
              puzzleNumber={puzzleNumber}
              puzzleDate={puzzleDate}
              onClose={() => setShowLeaderboardModal(false)}
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
    </div>
  );
}

export default App;
