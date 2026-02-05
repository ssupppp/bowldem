/**
 * LeaderboardModal Component
 * Displays puzzle leaderboard and all-time leaderboard
 */

import React, { useState, useEffect } from 'react';
import { useLeaderboard } from '../../hooks/useLeaderboard.js';

/**
 * LeaderboardModal - Shows puzzle + all-time leaderboards
 * @param {Object} props
 * @param {number} props.puzzleNumber - Current puzzle number
 * @param {string} props.puzzleDate - Current puzzle date (YYYY-MM-DD)
 * @param {Function} props.onClose - Close handler
 * @param {number} props.guessesUsed - Number of guesses used (for submission)
 * @param {boolean} props.won - Whether user won (for submission)
 * @param {boolean} props.gameCompleted - Whether game is completed
 */
export function LeaderboardModal({ puzzleNumber, puzzleDate, onClose, guessesUsed, won, gameCompleted }) {
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'allTime'
  const [name, setName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [allTimeSortBy, setAllTimeSortBy] = useState('wins'); // 'wins', 'win_rate', 'streak', 'avg_guesses'

  const {
    puzzleLeaderboard,
    puzzleLeaderboardLoading,
    fetchPuzzleLeaderboard,
    allTimeLeaderboard,
    allTimeLoading,
    fetchAllTimeLeaderboard,
    userRanking,
    hasSubmitted,
    displayName,
    saveDisplayName,
    submitToLeaderboard,
    isSubmitting,
    playerProfile
  } = useLeaderboard(puzzleNumber, puzzleDate);

  // Initialize name from saved displayName
  React.useEffect(() => {
    if (displayName) {
      setName(displayName);
    }
  }, [displayName]);

  // Handle leaderboard submission
  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setSubmitError('Name must be at least 2 characters');
      return;
    }
    if (trimmedName.length > 20) {
      setSubmitError('Name must be 20 characters or less');
      return;
    }
    setSubmitError('');
    saveDisplayName(trimmedName);
    await submitToLeaderboard(guessesUsed, won);
    fetchPuzzleLeaderboard(); // Refresh leaderboard
  };

  // Fetch leaderboards on mount
  useEffect(() => {
    fetchPuzzleLeaderboard();
    fetchAllTimeLeaderboard();
  }, [fetchPuzzleLeaderboard, fetchAllTimeLeaderboard]);

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get rank suffix (1st, 2nd, 3rd, etc.)
  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  return (
    <div className="leaderboard-modal">
      <div className="modal-header">
        <h2 className="overlay-title">Leaderboard</h2>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Success State - shown after submission */}
      {gameCompleted && hasSubmitted && (
        <div className="leaderboard-success-section">
          <div className="success-content">
            <span className="success-icon">✓</span>
            <span className="success-text">
              You're #{userRanking || '?'} of {puzzleLeaderboard.length}!
            </span>
          </div>
          <div className="success-details">
            as "{displayName}" ({guessesUsed}/4)
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="leaderboard-tabs">
        <button
          className={`leaderboard-tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today #{puzzleNumber}
        </button>
        <button
          className={`leaderboard-tab ${activeTab === 'allTime' ? 'active' : ''}`}
          onClick={() => setActiveTab('allTime')}
        >
          All Time
        </button>
      </div>

      {/* Today's Leaderboard */}
      {activeTab === 'today' && (
        <div className="leaderboard-content">
          {puzzleLeaderboardLoading ? (
            <div className="leaderboard-loading">Loading...</div>
          ) : puzzleLeaderboard.filter(e => e.won).length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon">🏆</div>
              <p>No winners yet!</p>
              <p className="empty-hint">Be the first to solve today's puzzle</p>
            </div>
          ) : (
            <>
              {/* Leaderboard list - WINNERS ONLY */}
              <div className="leaderboard-list">
                {puzzleLeaderboard
                  .filter(entry => entry.won) // Only show winners
                  .sort((a, b) => {
                    // Sort by guesses (fewer is better), then by time
                    if (a.guesses_used !== b.guesses_used) return a.guesses_used - b.guesses_used;
                    return new Date(a.created_at) - new Date(b.created_at);
                  })
                  .slice(0, 20)
                  .map((entry, index) => (
                    <div
                      key={entry.id || index}
                      className={`leaderboard-entry ${index < 3 ? 'top-three' : ''}`}
                    >
                      <span className="entry-rank">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && `${index + 1}.`}
                      </span>
                      <span className="entry-name">{entry.display_name}</span>
                      <span className="entry-result">
                        <span className="guesses-badge win">
                          {entry.guesses_used}/4
                        </span>
                      </span>
                      <span className="entry-time">{formatTime(entry.created_at)}</span>
                    </div>
                  ))}
              </div>

              {/* Stats summary - winners only */}
              <div className="leaderboard-stats">
                <div className="stat-item">
                  <span className="stat-value">
                    {puzzleLeaderboard.filter(e => e.won).length}
                  </span>
                  <span className="stat-label">Winners</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {puzzleLeaderboard.filter(e => e.won).length > 0
                      ? (puzzleLeaderboard.filter(e => e.won).reduce((sum, e) => sum + e.guesses_used, 0) /
                          puzzleLeaderboard.filter(e => e.won).length).toFixed(1)
                      : '-'}
                  </span>
                  <span className="stat-label">Avg Guesses</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* All-Time Leaderboard */}
      {activeTab === 'allTime' && (
        <div className="leaderboard-content">
          {/* Sort options */}
          <div className="leaderboard-sort-options">
            <button
              className={`sort-btn ${allTimeSortBy === 'wins' ? 'active' : ''}`}
              onClick={() => { setAllTimeSortBy('wins'); fetchAllTimeLeaderboard('wins'); }}
            >
              Wins
            </button>
            <button
              className={`sort-btn ${allTimeSortBy === 'win_rate' ? 'active' : ''}`}
              onClick={() => { setAllTimeSortBy('win_rate'); fetchAllTimeLeaderboard('win_rate'); }}
            >
              Win %
            </button>
            <button
              className={`sort-btn ${allTimeSortBy === 'streak' ? 'active' : ''}`}
              onClick={() => { setAllTimeSortBy('streak'); fetchAllTimeLeaderboard('streak'); }}
            >
              Streak
            </button>
            <button
              className={`sort-btn ${allTimeSortBy === 'avg_guesses' ? 'active' : ''}`}
              onClick={() => { setAllTimeSortBy('avg_guesses'); fetchAllTimeLeaderboard('avg_guesses'); }}
            >
              Avg
            </button>
          </div>

          {allTimeLoading ? (
            <div className="leaderboard-loading">Loading...</div>
          ) : allTimeLeaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon">🌟</div>
              <p>No all-time stats yet!</p>
              <p className="empty-hint">Link your email to track your stats</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {allTimeLeaderboard.slice(0, 20).map((entry, index) => (
                <div
                  key={entry.email || entry.display_name || index}
                  className={`leaderboard-entry ${index < 3 ? 'top-three' : ''} ${entry.email === playerProfile?.email ? 'is-user' : ''}`}
                >
                  <span className="entry-rank">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `${index + 1}.`}
                  </span>
                  <span className="entry-name">{entry.display_name}</span>
                  <span className="entry-stats">
                    {allTimeSortBy === 'wins' && (
                      <>
                        <span className="wins-badge">{entry.total_wins}W</span>
                        <span className="games-badge">{entry.games_played}G</span>
                      </>
                    )}
                    {allTimeSortBy === 'win_rate' && (
                      <span className="winrate-badge">{Math.round(entry.win_rate || 0)}%</span>
                    )}
                    {allTimeSortBy === 'streak' && (
                      <>
                        <span className="streak-badge">🔥{entry.best_streak}</span>
                        {entry.current_streak > 0 && (
                          <span className="current-streak">(now: {entry.current_streak})</span>
                        )}
                      </>
                    )}
                    {allTimeSortBy === 'avg_guesses' && (
                      <span className="avg-badge">{(entry.avg_guesses || 0).toFixed(1)} avg</span>
                    )}
                  </span>
                  <span className="entry-secondary">
                    {allTimeSortBy === 'wins' && `${Math.round(entry.win_rate || 0)}%`}
                    {allTimeSortBy === 'win_rate' && `${entry.total_wins}W`}
                    {allTimeSortBy === 'streak' && `${entry.total_wins}W`}
                    {allTimeSortBy === 'avg_guesses' && `${entry.total_wins}W`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Player's own stats if they have a profile */}
          {playerProfile && (
            <div className="player-stats-summary">
              <div className="stats-header">Your Stats</div>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">{playerProfile.total_wins}</span>
                  <span className="stat-label">Wins</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{playerProfile.total_games}</span>
                  <span className="stat-label">Played</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{Math.round(playerProfile.win_rate || 0)}%</span>
                  <span className="stat-label">Win Rate</span>
                </div>
                <div className="stat">
                  <span className="stat-value">🔥{playerProfile.best_streak}</span>
                  <span className="stat-label">Best Streak</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Score Section - at bottom, shown if game completed, WON, and not yet submitted */}
      {gameCompleted && won && !hasSubmitted && (
        <div className="leaderboard-submit-section">
          <div className="submit-header">
            <span className="submit-icon">🏆</span>
            <span className="submit-title">Add your score!</span>
          </div>
          <div className="submit-form">
            <input
              type="text"
              className={`submit-name-input ${submitError ? 'has-error' : ''}`}
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSubmitError('');
              }}
              maxLength={20}
              disabled={isSubmitting}
            />
            <button
              className="btn-submit-score"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
          {submitError && <div className="submit-error">{submitError}</div>}
          <div className="submit-result-preview">
            Your result: <strong>{guessesUsed}/4</strong>
          </div>
        </div>
      )}

      <div className="modal-buttons">
        <button className="btn-enhanced btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * LeaderboardPreview - Compact view for end-game modal
 * Shows Top 3 + 2 entries surrounding user's rank
 * @param {Object} props
 * @param {Array} props.entries - Top leaderboard entries
 * @param {number} props.userRanking - User's ranking
 * @param {number} props.totalPlayers - Total players count
 * @param {string} props.displayName - User's display name
 * @param {Function} props.onViewFull - Handler to view full leaderboard
 */
export function LeaderboardPreview({ entries = [], userRanking, totalPlayers, displayName, onViewFull }) {
  if (entries.length === 0) {
    return (
      <div className="leaderboard-preview">
        <div className="preview-header">
          <span className="preview-title">Today's Top Players</span>
        </div>
        <div className="preview-empty">Be the first on the leaderboard!</div>
        {onViewFull && (
          <button className="preview-view-all" onClick={onViewFull}>
            View Leaderboard
          </button>
        )}
      </div>
    );
  }

  // Filter to only show winners and sort
  const winners = entries
    .filter(e => e.won)
    .sort((a, b) => {
      if (a.guesses_used !== b.guesses_used) return a.guesses_used - b.guesses_used;
      return new Date(a.created_at) - new Date(b.created_at);
    });

  // Get top 3
  const top3 = winners.slice(0, 3);

  // Get surrounding entries if user is ranked > 5
  let surrounding = [];
  let showDivider = false;

  if (userRanking && userRanking > 3) {
    showDivider = true;
    const startIdx = Math.max(3, userRanking - 2);
    const endIdx = Math.min(winners.length, userRanking + 1);
    surrounding = winners.slice(startIdx - 1, endIdx);
  }

  const getRankEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <div className="leaderboard-preview">
      <div className="preview-header">
        <span className="preview-title">Today's Top Players</span>
        {totalPlayers > 0 && (
          <span className="preview-count">{totalPlayers} playing</span>
        )}
      </div>

      <div className="preview-list">
        {top3.map((entry, index) => (
          <div
            key={entry.id || index}
            className={`preview-entry ${entry.display_name === displayName ? 'is-user' : ''}`}
          >
            <span className="preview-rank">{getRankEmoji(index)}</span>
            <span className="preview-name">{entry.display_name}</span>
            <span className="preview-result">{entry.guesses_used}/4</span>
          </div>
        ))}

        {showDivider && surrounding.length > 0 && (
          <>
            <div className="preview-divider">• • •</div>
            {surrounding.map((entry, idx) => {
              const actualRank = winners.indexOf(entry);
              return (
                <div
                  key={entry.id || `surrounding-${idx}`}
                  className={`preview-entry ${entry.display_name === displayName ? 'is-user' : ''}`}
                >
                  <span className="preview-rank">{actualRank + 1}.</span>
                  <span className="preview-name">{entry.display_name}</span>
                  <span className="preview-result">{entry.guesses_used}/4</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {userRanking && !showDivider && (
        <div className="preview-user-rank">
          You're #{userRanking} of {totalPlayers}
        </div>
      )}

      {onViewFull && (
        <button className="preview-view-all" onClick={onViewFull}>
          View Full Leaderboard
        </button>
      )}
    </div>
  );
}

export default LeaderboardModal;
