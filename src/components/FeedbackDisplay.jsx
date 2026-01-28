import React, { useState, useEffect } from 'react';

/**
 * FeedbackDisplay - Wordle-Style Animated Feedback Grid
 *
 * A clean, minimal feedback display inspired by Wordle with flip animations.
 * Shows colored boxes for each attribute:
 * - Green: Correct match
 * - Dark gray: Incorrect
 * - Gold: MOTM found (win)
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
  return COUNTRY_CODES[country] || country.slice(0, 3).toUpperCase();
}

// Individual feedback box with flip animation
function FeedbackBox({ value, label, tooltip, isNew, delay = 0 }) {
  const [isFlipped, setIsFlipped] = useState(!isNew);
  const [showContent, setShowContent] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      // Start flip animation after delay
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
      }, delay);

      // Show content halfway through flip
      const contentTimer = setTimeout(() => {
        setShowContent(true);
      }, delay + 150);

      return () => {
        clearTimeout(flipTimer);
        clearTimeout(contentTimer);
      };
    }
  }, [isNew, delay]);

  const bgColor = !showContent
    ? 'bg-slate-300'
    : value === 'mvp'
    ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
    : value
    ? 'bg-gradient-to-br from-green-500 to-green-600'
    : 'bg-gradient-to-br from-slate-600 to-slate-700';

  return (
    <div className="perspective-1000 group relative" title={tooltip}>
      <div
        className={`
          w-11 h-11 sm:w-12 sm:h-12
          rounded-lg flex items-center justify-center
          font-bold text-white text-sm
          shadow-md
          transition-all duration-300 ease-out
          ${bgColor}
          ${isFlipped ? 'scale-100' : 'scale-95'}
          ${isNew && !isFlipped ? 'animate-pulse' : ''}
        `}
        style={{
          transform: isFlipped ? 'rotateX(0deg)' : 'rotateX(90deg)',
          transition: `transform 0.3s ease-out ${delay}ms, background-color 0.15s ease-out ${delay + 150}ms`,
        }}
      >
        <span className={`transition-opacity duration-150 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          {label}
        </span>
      </div>

      {/* Tooltip on hover */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1
                      bg-slate-800 text-white text-xs rounded shadow-lg
                      opacity-0 group-hover:opacity-100 transition-opacity
                      pointer-events-none whitespace-nowrap z-10">
        {tooltip}
      </div>
    </div>
  );
}

// Single guess row
function GuessRow({ feedback, isNew = false, index = 0 }) {
  const isWinner = feedback.isMVP;
  const baseDelay = isNew ? index * 50 : 0;

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl
        transition-all duration-300
        ${isWinner
          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-md'
          : 'bg-slate-50 border border-slate-200'
        }
        ${isNew ? 'animate-slide-up' : ''}
      `}
      style={{ animationDelay: `${baseDelay}ms` }}
    >
      {/* Player name with country code */}
      <div className={`
        flex-1 min-w-0 font-semibold truncate
        ${isWinner ? 'text-amber-700' : 'text-slate-700'}
      `}>
        {isWinner && <span className="mr-1">🏆</span>}
        {feedback.playerName}
        <span className="text-xs text-slate-400 ml-1.5 font-normal">
          ({getCountryCode(feedback.country)})
        </span>
      </div>

      {/* Feedback boxes */}
      <div className="flex gap-1.5 sm:gap-2">
        <FeedbackBox
          value={feedback.playedInGame}
          label="P"
          tooltip={`Played: ${feedback.playedInGame ? 'Yes' : 'No'}`}
          isNew={isNew}
          delay={baseDelay + 100}
        />
        <FeedbackBox
          value={feedback.sameTeam}
          label="T"
          tooltip={`Team: ${feedback.sameTeam ? 'Match' : 'No match'}`}
          isNew={isNew}
          delay={baseDelay + 200}
        />
        <FeedbackBox
          value={feedback.sameRole}
          label="R"
          tooltip={`Role: ${feedback.sameRole ? 'Match' : 'No match'}`}
          isNew={isNew}
          delay={baseDelay + 300}
        />
        <FeedbackBox
          value={feedback.isMVP ? 'mvp' : false}
          label={feedback.isMVP ? '🏆' : 'M'}
          tooltip={`MOTM: ${feedback.isMVP ? 'Yes!' : 'No'}`}
          isNew={isNew}
          delay={baseDelay + 400}
        />
      </div>
    </div>
  );
}

export function FeedbackDisplay({
  feedbackList = [],
  guessesRemaining,
  maxGuesses
}) {
  const guessCount = maxGuesses - guessesRemaining;
  const [previousLength, setPreviousLength] = useState(feedbackList.length);

  // Track which guess is new for animation
  useEffect(() => {
    setPreviousLength(feedbackList.length);
  }, [feedbackList.length]);

  // Empty state
  if (feedbackList.length === 0) {
    return (
      <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-6 border border-slate-200">
        <div className="text-center space-y-4">
          <div className="text-xl font-bold text-slate-800">
            Guess the MOTM
          </div>
          <p className="text-slate-500 text-sm">
            Type a player name to start
          </p>

          {/* Legend */}
          <div className="flex justify-center gap-6 py-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-600 shadow-sm" />
              <span className="text-sm text-slate-600">= Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-slate-600 to-slate-700 shadow-sm" />
              <span className="text-sm text-slate-600">= No match</span>
            </div>
          </div>

          {/* Attribute labels */}
          <div className="flex justify-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Played</span>
            <span>Team</span>
            <span>Role</span>
            <span>MOTM</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-4 sm:p-5 border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-700">Guesses</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold text-slate-800">{guessCount}</span>
          <span className="text-slate-400">/</span>
          <span className="text-lg text-slate-500">{maxGuesses}</span>
        </div>
      </div>

      {/* Feedback rows */}
      <div className="space-y-2">
        {feedbackList.map((feedback, index) => (
          <GuessRow
            key={index}
            feedback={feedback}
            isNew={index === feedbackList.length - 1 && feedbackList.length > previousLength}
            index={index}
          />
        ))}
      </div>

      {/* Column labels */}
      <div className="flex items-center justify-end gap-4 mt-4 pr-1">
        <div className="flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span className="w-11 sm:w-12 text-center">Played</span>
          <span className="w-11 sm:w-12 text-center">Team</span>
          <span className="w-11 sm:w-12 text-center">Role</span>
          <span className="w-11 sm:w-12 text-center">MOTM</span>
        </div>
      </div>
    </div>
  );
}

export default FeedbackDisplay;
