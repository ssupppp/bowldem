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

import React, { useState, useMemo, useEffect } from "react";
import allPlayersData from "./data/all_players.json";
import matchPuzzlesData from "./data/match_puzzles_t20wc.json";
import { useDailyPuzzle } from "./hooks/useDailyPuzzle.js";
import { checkAutoReset } from "./utils/dailyPuzzle.js";
import { PlayerAutocomplete } from "./components/PlayerAutocomplete.jsx";
import { FeedbackDisplay } from "./components/FeedbackDisplay.jsx";
import { ThirdUmpireFeedback } from "./components/ThirdUmpireFeedback.jsx";
import { StatsModal } from "./components/StatsModal.jsx";
import { DebugPanel } from "./components/DebugPanel.jsx";
import { CountdownTimer } from "./components/CountdownTimer.jsx";
import "./App.css";

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
  const [isChecking, setIsChecking] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [newFeedbackIndex, setNewFeedbackIndex] = useState(-1);

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
  const generateNewFeedback = (guessedPlayerKey) => {
    const guessedPlayer = findPlayer(guessedPlayerKey);
    if (!guessedPlayer || !currentPuzzle) return null;

    const matchData = currentPuzzle.matchData;
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
      isMVP: guessedPlayerKey === currentPuzzle.targetPlayer
    };
  };

  useEffect(() => {
    if (guesses.length > 0 && currentPuzzle) {
      const rebuiltFeedback = guesses.map(playerKey => {
        return generateNewFeedback(playerKey);
      }).filter(Boolean);

      setFeedbackList(rebuiltFeedback);
      setUsedPlayers(new Set(guesses));

      if (gameStatus === 'won') {
        setGameWon(true);
        setShowSuccessModal(true);
      } else if (gameStatus === 'lost') {
        setGameOver(true);
        setShowGameOverModal(true);
      }
    }
  }, [gameStatus, guesses.length, currentPuzzle]);

  const handlePlayerGuess = (playerKey) => {
    if (gameWon || gameOver || usedPlayers.has(playerKey) || alreadyCompleted || isChecking) return;

    const feedback = generateNewFeedback(playerKey);
    if (!feedback) {
      console.warn('Player not found:', playerKey);
      return;
    }

    // Start 3rd Umpire checking state
    setIsChecking(true);
    setPendingFeedback(feedback);
    setUsedPlayers(prev => new Set([...prev, playerKey]));

    // Checking delay (~700ms), then reveal with sequential animation
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

      // Show modal after sequential reveal animation (~700ms)
      if (isWin) {
        setGameWon(true);
        setTimeout(() => setShowSuccessModal(true), 700);
      } else if (newFeedbackList.length >= maxGuesses) {
        setGameOver(true);
        setTimeout(() => setShowGameOverModal(true), 700);
      }
    }, 700);
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
    const resultText = gameWon
      ? '✅ Found in ' + feedbackList.length + '/' + maxGuesses
      : '❌ ' + feedbackList.length + '/' + maxGuesses;

    return '🏏 Bowldem #' + puzzleNumber + '\n\n' + gridPattern + '\n\n' + resultText + '\n\nbowldem.com';
  };

  const handleShare = () => {
    const shareText = generateShareText();

    if (navigator.share) {
      navigator.share({
        title: 'Bowldem #' + puzzleNumber,
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  };

  const renderSimplifiedScorecard = () => {
    if (!currentPuzzle) return null;

    const scorecard = currentPuzzle.matchData?.scorecard || {};
    const venue = scorecard.venue || "Unknown Venue";
    const team1Score = scorecard.team1Score;
    const team2Score = scorecard.team2Score;
    const result = scorecard.result;

    return (
      <div className="scorecard-simplified">
        <div className="scorecard-header">
          <span className="puzzle-badge">Puzzle #{puzzleNumber}</span>
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
    const targetPlayerKey = currentPuzzle?.targetPlayer;
    const targetPlayer = findPlayer(targetPlayerKey);

    return (
      <div className="success-modal">
        <div className="celebration-emoji">🏆</div>
        <h2 className="overlay-title">Congratulations!</h2>
        <p className="overlay-text">
          You found the Man of the Match in {feedbackList.length} {feedbackList.length === 1 ? 'guess' : 'guesses'}!
        </p>

        {targetPlayer && (
          <div className="cricket-trivia">
            <div className="trivia-title">Player Spotlight</div>
            <div className="trivia-text">
              <strong>{targetPlayer.fullName}</strong><br/>
              {targetPlayer.country} - {targetPlayer.role}
            </div>
          </div>
        )}

        <div className="share-section">
          <div className="share-title">Share Your Result</div>
          <pre className="share-result">{generateShareText()}</pre>
        </div>

        <CountdownTimer />

        <div className="modal-buttons">
          <button className="btn-enhanced btn-success" onClick={handleShare}>
            Share Result
          </button>
          <button
            className="btn-enhanced btn-secondary"
            onClick={() => {
              setShowSuccessModal(false);
              setShowStatsModal(true);
            }}
          >
            View Stats
          </button>
          <button className="btn-enhanced btn-primary" onClick={handleCloseModal}>
            Close
          </button>
        </div>
      </div>
    );
  };

  const GameOverModal = () => {
    const targetPlayerKey = currentPuzzle?.targetPlayer;
    const targetPlayer = findPlayer(targetPlayerKey);

    return (
      <div className="failure-modal">
        <div className="celebration-emoji">😔</div>
        <h2 className="overlay-title">Game Over!</h2>
        <p className="overlay-text">
          The Man of the Match was <strong>
            {targetPlayer?.fullName || "Unknown Player"}
          </strong>
        </p>

        {targetPlayer && (
          <div className="cricket-trivia">
            <div className="trivia-title">The Answer</div>
            <div className="trivia-text">
              <strong>{targetPlayer.fullName}</strong><br/>
              {targetPlayer.country} - {targetPlayer.role}
            </div>
          </div>
        )}

        <div className="share-section">
          <div className="share-title">Share Your Attempt</div>
          <pre className="share-result">{generateShareText()}</pre>
        </div>

        <CountdownTimer />

        <div className="modal-buttons">
          <button className="btn-enhanced btn-success" onClick={handleShare}>
            Share Result
          </button>
          <button
            className="btn-enhanced btn-secondary"
            onClick={() => {
              setShowGameOverModal(false);
              setShowStatsModal(true);
            }}
          >
            View Stats
          </button>
          <button className="btn-enhanced btn-primary" onClick={handleCloseModal}>
            Close
          </button>
        </div>
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
            </div>
            <div className="header-right">
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
          {!gameWon && !gameOver && !alreadyCompleted && (
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
          )}

          {/* Completed State */}
          {alreadyCompleted && (
            <div className="completed-banner">
              <span className="completed-icon">{gameStatus === 'won' ? '🏆' : '😔'}</span>
              <span className="completed-text">
                {gameStatus === 'won' ? 'Solved!' : 'Better luck tomorrow'}
              </span>
            </div>
          )}

          {/* Feedback */}
          <ThirdUmpireFeedback
            feedbackList={feedbackList}
            guessesRemaining={guessesRemaining}
            maxGuesses={maxGuesses}
            isChecking={isChecking}
            newFeedbackIndex={newFeedbackIndex}
          />

          <div className="game-controls">
            {(gameOver || gameWon || alreadyCompleted) && (
              <div className="game-actions">
                <CountdownTimer />
                <button
                  className="btn-enhanced btn-success"
                  onClick={handleShare}
                >
                  Share Result
                </button>
                <button
                  className="btn-enhanced btn-secondary"
                  onClick={() => setShowStatsModal(true)}
                >
                  View Stats
                </button>
              </div>
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
