import React from 'react';

/**
 * FeedbackDisplay - Shows Y/N feedback for each guess
 * Displays 4 attributes: Played in Game, Same Team, Same Role, Is MVP
 */
export function FeedbackDisplay({
  feedbackList = [],
  guessesRemaining,
  maxGuesses
}) {
  const guessCount = maxGuesses - guessesRemaining;

  // Empty state - no guesses yet
  if (feedbackList.length === 0) {
    return (
      <div className="feedback-container-new feedback-empty">
        <div className="feedback-empty-content">
          <div className="feedback-empty-icon">🎯</div>
          <div className="feedback-empty-title">Make your guess!</div>
          <div className="feedback-empty-subtitle">
            Type a player name to get clues
          </div>
          <div className="feedback-legend-preview">
            <div className="legend-item">
              <span className="legend-label">Played</span>
              <span className="legend-desc">In this match?</span>
            </div>
            <div className="legend-item">
              <span className="legend-label">Team</span>
              <span className="legend-desc">Same team?</span>
            </div>
            <div className="legend-item">
              <span className="legend-label">Role</span>
              <span className="legend-desc">Same role?</span>
            </div>
            <div className="legend-item">
              <span className="legend-label">MVP</span>
              <span className="legend-desc">Man of Match?</span>
            </div>
          </div>
          <div className="feedback-hint">
            <span className="indicator-sample yes">Y</span> = Yes
            <span className="indicator-sample no">N</span> = No
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-container-new">
      <div className="feedback-header">
        <span className="feedback-title">Your Guesses</span>
        <span className="guesses-counter">{guessCount}/{maxGuesses}</span>
      </div>

      {/* Column headers */}
      <div className="feedback-legend">
        <span className="legend-player">Player</span>
        <span className="legend-attr">Played</span>
        <span className="legend-attr">Team</span>
        <span className="legend-attr">Role</span>
        <span className="legend-attr">MVP</span>
      </div>

      {/* Feedback rows */}
      <div className="feedback-rows">
        {feedbackList.map((feedback, index) => (
          <div
            key={index}
            className={`feedback-row-new ${feedback.isMVP ? 'winner' : ''}`}
          >
            <span className="feedback-player-name">{feedback.playerName}</span>
            <div className="feedback-indicators">
              <span
                className={`indicator ${feedback.playedInGame ? 'yes' : 'no'}`}
                title={feedback.playedInGame ? 'Played in this match' : 'Did not play in this match'}
              >
                {feedback.playedInGame ? 'Y' : 'N'}
              </span>
              <span
                className={`indicator ${feedback.sameTeam ? 'yes' : 'no'}`}
                title={feedback.sameTeam ? 'Same team as MVP' : 'Different team'}
              >
                {feedback.sameTeam ? 'Y' : 'N'}
              </span>
              <span
                className={`indicator ${feedback.sameRole ? 'yes' : 'no'}`}
                title={feedback.sameRole ? 'Same role as MVP' : 'Different role'}
              >
                {feedback.sameRole ? 'Y' : 'N'}
              </span>
              <span
                className={`indicator ${feedback.isMVP ? 'mvp' : 'no'}`}
                title={feedback.isMVP ? 'This is the MVP!' : 'Not the MVP'}
              >
                {feedback.isMVP ? '🏆' : 'N'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeedbackDisplay;
