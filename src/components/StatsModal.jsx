/**
 * StatsModal Component
 * Displays player statistics in Wordle-style format
 */

import React from 'react';

export function StatsModal({ stats, onClose }) {
  const winPercentage = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const maxDistribution = Math.max(...stats.guessDistribution, 1);

  return (
    <div className="stats-modal">
      <div className="modal-header">
        <h2 className="overlay-title">Statistics</h2>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-value">{stats.gamesPlayed}</div>
          <div className="stat-label">Played</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{winPercentage}</div>
          <div className="stat-label">Win %</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.maxStreak}</div>
          <div className="stat-label">Max Streak</div>
        </div>
      </div>

      <div className="guess-distribution">
        <h3>Guess Distribution</h3>
        {stats.guessDistribution.map((count, index) => (
          <div key={index} className="distribution-row">
            <div className="distribution-label">{index + 1}</div>
            <div className="distribution-bar-container">
              <div
                className="distribution-bar"
                style={{
                  width: `${Math.max((count / maxDistribution) * 100, count > 0 ? 8 : 0)}%`
                }}
              >
                <span className="distribution-count">{count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="modal-buttons">
        <button className="btn-enhanced btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default StatsModal;
