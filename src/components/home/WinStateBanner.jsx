/**
 * WinStateBanner Component
 * Celebratory banner for home page when user has already won today
 */

import React from 'react';

/**
 * WinStateBanner - Celebratory banner replacing simple "Solved!" text
 * @param {Object} props
 * @param {number} props.guessesUsed - Number of guesses used to solve
 * @param {number} props.maxGuesses - Maximum allowed guesses
 * @param {number} props.streak - Current win streak
 * @param {string} props.playerName - Target player's name
 */
export function WinStateBanner({ guessesUsed, maxGuesses = 4, streak = 0, playerName }) {
  // Determine the message based on guesses used
  const getMessage = () => {
    if (guessesUsed === 1) return "Perfect!";
    if (guessesUsed === 2) return "Excellent!";
    if (guessesUsed === 3) return "Great job!";
    return "Well done!";
  };

  // Get trophy animation class based on performance
  const getTrophyClass = () => {
    if (guessesUsed === 1) return 'trophy-perfect';
    if (guessesUsed === 2) return 'trophy-excellent';
    return 'trophy-good';
  };

  return (
    <div className="win-state-banner">
      <div className="win-banner-content">
        {/* Trophy icon with animation */}
        <div className={`win-trophy ${getTrophyClass()}`}>
          <span className="trophy-emoji">🏆</span>
        </div>

        {/* Main message */}
        <div className="win-message">
          <h3 className="win-title">{getMessage()}</h3>
          <p className="win-subtitle">
            Solved in <strong>{guessesUsed}/{maxGuesses}</strong>
            {guessesUsed === 1 && " guess!"}
            {guessesUsed > 1 && " guesses!"}
          </p>
        </div>

        {/* Streak indicator */}
        {streak > 1 && (
          <div className="win-streak-badge">
            <span className="streak-flame">🔥</span>
            <span className="streak-count">{streak}</span>
            <span className="streak-label">day streak</span>
          </div>
        )}

        {/* Answer reveal (optional) */}
        {playerName && (
          <div className="win-answer">
            <span className="answer-label">The Man of the Match was</span>
            <span className="answer-name">{playerName}</span>
          </div>
        )}

        {/* Return message */}
        <div className="win-return-message">
          <span className="calendar-icon">📅</span>
          <span>Come back tomorrow for a new puzzle!</span>
        </div>
      </div>
    </div>
  );
}

/**
 * LossStateBanner - Banner for when user lost but already completed
 * @param {Object} props
 * @param {string} props.playerName - The correct player's name
 */
export function LossStateBanner({ playerName }) {
  return (
    <div className="loss-state-banner">
      <div className="loss-banner-content">
        <div className="loss-icon">
          <span className="loss-emoji">😔</span>
        </div>

        <div className="loss-message">
          <h3 className="loss-title">Better luck tomorrow!</h3>
          {playerName && (
            <p className="loss-subtitle">
              The answer was <strong>{playerName}</strong>
            </p>
          )}
        </div>

        <div className="loss-return-message">
          <span className="calendar-icon">📅</span>
          <span>A new puzzle awaits tomorrow!</span>
        </div>
      </div>
    </div>
  );
}

/**
 * CompletedStateBanner - Generic completed state (win or loss)
 * @param {Object} props
 * @param {boolean} props.won - Whether user won
 * @param {number} props.guessesUsed - Guesses used
 * @param {number} props.maxGuesses - Max guesses
 * @param {number} props.streak - Current streak (only for wins)
 * @param {string} props.playerName - Target player name
 */
export function CompletedStateBanner({ won, guessesUsed, maxGuesses = 4, streak = 0, playerName }) {
  if (won) {
    return (
      <WinStateBanner
        guessesUsed={guessesUsed}
        maxGuesses={maxGuesses}
        streak={streak}
        playerName={playerName}
      />
    );
  }

  return <LossStateBanner playerName={playerName} />;
}

export default WinStateBanner;
