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
 */
export function LeaderboardModal({ puzzleNumber, puzzleDate, onClose }) {
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'allTime'

  const {
    puzzleLeaderboard,
    puzzleLeaderboardLoading,
    fetchPuzzleLeaderboard,
    allTimeLeaderboard,
    allTimeLoading,
    fetchAllTimeLeaderboard,
    userRanking,
    hasSubmitted
  } = useLeaderboard(puzzleNumber, puzzleDate);

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
          ) : puzzleLeaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon">🏆</div>
              <p>No entries yet!</p>
              <p className="empty-hint">Be the first to complete today's puzzle</p>
            </div>
          ) : (
            <>
              {/* User's position highlight */}
              {hasSubmitted && userRanking && (
                <div className="user-ranking-banner">
                  <span className="ranking-label">Your Rank</span>
                  <span className="ranking-value">
                    {userRanking}{getRankSuffix(userRanking)}
                  </span>
                  <span className="ranking-total">of {puzzleLeaderboard.length}</span>
                </div>
              )}

              {/* Leaderboard list */}
              <div className="leaderboard-list">
                {puzzleLeaderboard
                  .sort((a, b) => {
                    // Winners first, then sort by guesses (fewer is better), then by time
                    if (a.won !== b.won) return b.won - a.won;
                    if (a.guesses_used !== b.guesses_used) return a.guesses_used - b.guesses_used;
                    return new Date(a.created_at) - new Date(b.created_at);
                  })
                  .slice(0, 20)
                  .map((entry, index) => (
                    <div
                      key={entry.id || index}
                      className={`leaderboard-entry ${index < 3 ? 'top-three' : ''} ${!entry.won ? 'lost' : ''}`}
                    >
                      <span className="entry-rank">
                        {index === 0 && entry.won && '🥇'}
                        {index === 1 && entry.won && '🥈'}
                        {index === 2 && entry.won && '🥉'}
                        {(index > 2 || !entry.won) && `${index + 1}.`}
                      </span>
                      <span className="entry-name">{entry.display_name}</span>
                      <span className="entry-result">
                        {entry.won ? (
                          <span className="guesses-badge win">
                            {entry.guesses_used}/4
                          </span>
                        ) : (
                          <span className="guesses-badge loss">X/4</span>
                        )}
                      </span>
                      <span className="entry-time">{formatTime(entry.created_at)}</span>
                    </div>
                  ))}
              </div>

              {/* Stats summary */}
              <div className="leaderboard-stats">
                <div className="stat-item">
                  <span className="stat-value">{puzzleLeaderboard.length}</span>
                  <span className="stat-label">Players</span>
                </div>
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
          {allTimeLoading ? (
            <div className="leaderboard-loading">Loading...</div>
          ) : allTimeLeaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon">🌟</div>
              <p>No all-time stats yet!</p>
              <p className="empty-hint">Play more puzzles to see rankings</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {allTimeLeaderboard.slice(0, 20).map((entry, index) => (
                <div
                  key={entry.display_name || index}
                  className={`leaderboard-entry ${index < 3 ? 'top-three' : ''}`}
                >
                  <span className="entry-rank">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `${index + 1}.`}
                  </span>
                  <span className="entry-name">{entry.display_name}</span>
                  <span className="entry-stats">
                    <span className="wins-badge">{entry.total_wins}W</span>
                    <span className="games-badge">{entry.games_played}G</span>
                  </span>
                  <span className="entry-winrate">
                    {entry.games_played > 0
                      ? Math.round((entry.total_wins / entry.games_played) * 100)
                      : 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
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
 * @param {Object} props
 * @param {Array} props.entries - Top leaderboard entries
 * @param {number} props.userRanking - User's ranking
 * @param {number} props.totalPlayers - Total players count
 * @param {Function} props.onViewFull - Handler to view full leaderboard
 */
export function LeaderboardPreview({ entries = [], userRanking, totalPlayers, onViewFull }) {
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

  return (
    <div className="leaderboard-preview">
      <div className="preview-header">
        <span className="preview-title">Today's Top Players</span>
        {totalPlayers > 0 && (
          <span className="preview-count">{totalPlayers} playing</span>
        )}
      </div>

      <div className="preview-list">
        {entries.slice(0, 5).map((entry, index) => (
          <div key={entry.id || index} className="preview-entry">
            <span className="preview-rank">
              {index === 0 && '🥇'}
              {index === 1 && '🥈'}
              {index === 2 && '🥉'}
              {index > 2 && `${index + 1}.`}
            </span>
            <span className="preview-name">{entry.display_name}</span>
            <span className="preview-result">{entry.guesses_used}/4</span>
          </div>
        ))}
      </div>

      {userRanking && (
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
