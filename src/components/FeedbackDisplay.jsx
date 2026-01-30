import React from 'react';

// 3-letter country code mapping
const COUNTRY_CODES = {
  'India': 'IND',
  'Australia': 'AUS',
  'England': 'ENG',
  'Pakistan': 'PAK',
  'South Africa': 'RSA',
  'New Zealand': 'NZL',
  'Sri Lanka': 'SRL',
  'Bangladesh': 'BAN',
  'West Indies': 'WIN',
  'Afghanistan': 'AFG',
  'Ireland': 'IRE',
  'Zimbabwe': 'ZIM',
  'Scotland': 'SCO',
  'Netherlands': 'NED',
  'Namibia': 'NAM',
  'UAE': 'UAE',
  'USA': 'USA',
  'Oman': 'OMA',
  'Nepal': 'NEP',
  'Canada': 'CAN',
  'Uganda': 'UGA',
  'Papua New Guinea': 'PNG',
};

function getCountryCode(country) {
  return COUNTRY_CODES[country] || country?.slice(0, 3).toUpperCase() || '';
}

/**
 * FeedbackDisplay - Wordle-Style Grid
 *
 * Clean, minimal feedback display inspired by Wordle.
 * Shows colored boxes for each attribute:
 * - Green: Correct match
 * - Red/Dark: Incorrect
 * - Gold: MOTM found (win)
 */
export function FeedbackDisplay({
  feedbackList = [],
  guessesRemaining,
  maxGuesses = 5
}) {
  const guessCount = maxGuesses - guessesRemaining;

  // Empty state
  if (feedbackList.length === 0) {
    return (
      <div className="wordle-feedback">
        <div className="wordle-empty">
          <div className="wordle-empty-title">Guess the MOTM</div>
          <div className="wordle-empty-hint">
            Type a player name to start
          </div>
          <div className="wordle-legend">
            <div className="legend-row">
              <span className="legend-box correct"></span>
              <span>= Match</span>
            </div>
            <div className="legend-row">
              <span className="legend-box incorrect"></span>
              <span>= No match</span>
            </div>
          </div>
          <div className="wordle-attributes">
            <span>PLAYED</span>
            <span>TEAM</span>
            <span>ROLE</span>
            <span>MOTM</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wordle-feedback">
      <div className="wordle-header">
        <span className="wordle-title">Guesses</span>
        <span className="wordle-count">{guessCount}/{maxGuesses}</span>
      </div>

      <div className="wordle-grid">
        {feedbackList.map((feedback, index) => (
          <div key={index} className={`wordle-row ${feedback.isMVP ? 'winner' : ''}`}>
            <div className="wordle-player">
              {feedback.playerName}
              {feedback.country && (
                <span className="player-country-code"> ({getCountryCode(feedback.country)})</span>
              )}
            </div>
            <div className="wordle-boxes">
              <div
                className={`wordle-box has-tooltip ${feedback.playedInGame ? 'correct' : 'incorrect'}`}
                data-tooltip={`Played: ${feedback.playedInGame ? 'Yes' : 'No'}`}
              >
                <span className="box-label">P</span>
              </div>
              <div
                className={`wordle-box has-tooltip ${feedback.sameTeam ? 'correct' : 'incorrect'}`}
                data-tooltip={`Team: ${feedback.sameTeam ? 'Match' : 'No match'}`}
              >
                <span className="box-label">T</span>
              </div>
              <div
                className={`wordle-box has-tooltip ${feedback.sameRole ? 'correct' : 'incorrect'}`}
                data-tooltip={`Role: ${feedback.sameRole ? 'Match' : 'No match'}`}
              >
                <span className="box-label">R</span>
              </div>
              <div
                className={`wordle-box has-tooltip ${feedback.isMVP ? 'mvp' : 'incorrect'}`}
                data-tooltip={`MOTM: ${feedback.isMVP ? 'Yes!' : 'No'}`}
              >
                <span className="box-label">{feedback.isMVP ? '🏆' : 'M'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Column labels */}
      <div className="wordle-labels">
        <span></span>
        <div className="label-row">
          <span>PLAYED</span>
          <span>TEAM</span>
          <span>ROLE</span>
          <span>MOTM</span>
        </div>
      </div>
    </div>
  );
}

export default FeedbackDisplay;
