import React, { useState, useEffect } from 'react';
import './ThirdUmpireFeedback.css';

/**
 * ThirdUmpireFeedback - Wordle-inspired Feedback Display
 *
 * Key design: All 4 guess slots visible from start
 * - Filled rows show player name + colored boxes
 * - Empty rows show placeholder with empty boxes
 * - Visual tension as slots fill up
 */

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

// Filled feedback row with sequential reveal
function FilledRow({ feedback, isNew, rowNumber }) {
  const [revealedCount, setRevealedCount] = useState(isNew ? 0 : 4);

  useEffect(() => {
    if (!isNew) return;

    const timers = [];
    for (let i = 1; i <= 4; i++) {
      timers.push(
        setTimeout(() => setRevealedCount(i), i * 120)
      );
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [isNew]);

  const attributes = [
    { key: 'played', value: feedback.playedInGame },
    { key: 'team', value: feedback.sameTeam },
    { key: 'role', value: feedback.sameRole },
    { key: 'mvp', value: feedback.isMVP },
  ];

  const isWinner = feedback.isMVP;

  const countryCode = getCountryCode(feedback.country);

  return (
    <div className={`guess-row filled ${isWinner ? 'winner' : ''}`}>
      <div className="row-number">{rowNumber}</div>
      <div className="row-player">
        {feedback.playerName}
        {countryCode && <span className="player-country-code">({countryCode})</span>}
      </div>
      <div className="row-boxes">
        {attributes.map((attr, index) => {
          const isRevealed = index < revealedCount;
          const isCorrect = attr.value;
          const isMVP = attr.key === 'mvp' && isCorrect;

          return (
            <div
              key={attr.key}
              className={`guess-box ${isRevealed ? 'revealed' : 'hidden'} ${isRevealed ? (isCorrect ? 'correct' : 'incorrect') : ''} ${isMVP ? 'mvp' : ''}`}
            >
              {!isRevealed ? '' : (isMVP ? '🏆' : (isCorrect ? '✓' : '✗'))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Empty placeholder row
function EmptyRow({ rowNumber, isNext }) {
  return (
    <div className={`guess-row empty ${isNext ? 'next' : ''}`}>
      <div className="row-number">{rowNumber}</div>
      <div className="row-player empty-player">
        {isNext ? <span className="next-hint">Your guess...</span> : ''}
      </div>
      <div className="row-boxes">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="guess-box empty-box"></div>
        ))}
      </div>
    </div>
  );
}

// Checking state row (3rd umpire animation)
function CheckingRow({ rowNumber }) {
  return (
    <div className="guess-row checking">
      <div className="row-number">{rowNumber}</div>
      <div className="row-player checking-player">
        <span className="checking-icon">🎥</span>
        <span className="checking-text">CHECKING</span>
      </div>
      <div className="row-boxes">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="guess-box checking-box" style={{ animationDelay: `${i * 0.1}s` }}>
            ?
          </div>
        ))}
      </div>
    </div>
  );
}

// Legend popup
function LegendPopup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="legend-overlay" onClick={onClose}>
      <div className="legend-modal" onClick={e => e.stopPropagation()}>
        <div className="legend-header">
          <span>How Feedback Works</span>
          <button className="legend-close" onClick={onClose}>✕</button>
        </div>
        <div className="legend-content">
          <div className="legend-row">
            <div className="legend-box-demo">P</div>
            <div className="legend-info">
              <strong>Played</strong>
              <span>Did this player play in the match?</span>
            </div>
          </div>
          <div className="legend-row">
            <div className="legend-box-demo">T</div>
            <div className="legend-info">
              <strong>Team</strong>
              <span>Same team as the Man of the Match?</span>
            </div>
          </div>
          <div className="legend-row">
            <div className="legend-box-demo">R</div>
            <div className="legend-info">
              <strong>Role</strong>
              <span>Same role (Batsman/Bowler/All-rounder)?</span>
            </div>
          </div>
          <div className="legend-row">
            <div className="legend-box-demo mvp-demo">M</div>
            <div className="legend-info">
              <strong>MOTM</strong>
              <span>Is this the Man of the Match?</span>
            </div>
          </div>
        </div>
        <div className="legend-colors">
          <div className="color-demo">
            <span className="demo-box correct-demo">✓</span>
            <span>Yes</span>
          </div>
          <div className="color-demo">
            <span className="demo-box incorrect-demo">✗</span>
            <span>No</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThirdUmpireFeedback({
  feedbackList = [],
  guessesRemaining,
  maxGuesses = 4,
  isChecking = false,
  newFeedbackIndex = -1
}) {
  const [showLegend, setShowLegend] = useState(false);

  // Build all rows (filled + checking + empty)
  const rows = [];

  for (let i = 0; i < maxGuesses; i++) {
    const rowNumber = i + 1;

    if (i < feedbackList.length) {
      // Filled row
      rows.push(
        <FilledRow
          key={`filled-${i}`}
          feedback={feedbackList[i]}
          isNew={i === newFeedbackIndex}
          rowNumber={rowNumber}
        />
      );
    } else if (isChecking && i === feedbackList.length) {
      // Checking row (current guess being processed)
      rows.push(<CheckingRow key={`checking-${i}`} rowNumber={rowNumber} />);
    } else {
      // Empty row
      const isNext = !isChecking && i === feedbackList.length;
      rows.push(<EmptyRow key={`empty-${i}`} rowNumber={rowNumber} isNext={isNext} />);
    }
  }

  return (
    <div className="feedback-grid">
      {/* Header */}
      <div className="grid-header">
        <div className="header-num">#</div>
        <div className="header-player">PLAYER</div>
        <div className="header-boxes">
          <span className="ptrm-label" data-tooltip="Played in match?">P</span>
          <span className="ptrm-label" data-tooltip="Same Team as MOTM?">T</span>
          <span className="ptrm-label" data-tooltip="Same Role as MOTM?">R</span>
          <span className="ptrm-label" data-tooltip="Is this the MOTM?">M</span>
        </div>
        <button
          className="help-btn help-btn-prominent"
          onClick={() => setShowLegend(true)}
          title="What do these mean?"
          aria-label="Show feedback legend"
        >
          ?
        </button>
      </div>

      {/* All guess rows */}
      <div className="grid-rows">
        {rows}
      </div>

      <LegendPopup isOpen={showLegend} onClose={() => setShowLegend(false)} />
    </div>
  );
}

export default ThirdUmpireFeedback;
