/**
 * EmailPersistence Component
 * Allows users to optionally link an email to their leaderboard entry
 * for persistence across devices and historical tracking
 */

import React, { useState } from 'react';
import { trackFeature } from '../../lib/analytics.js';

/**
 * EmailPersistence - Email collection prompt after leaderboard submission
 * @param {string} entryId - The leaderboard entry ID to link
 * @param {function} onLinkEmail - Callback when email is linked successfully
 * @param {function} onSkip - Callback when user skips email linking
 * @param {function} onViewHistory - Callback to view historical entries
 * @param {string} existingEmail - If user already has email linked, show different UI
 */
export function EmailPersistence({
  entryId,
  onLinkEmail,
  onSkip,
  onViewHistory,
  existingEmail = null,
  isLinking = false
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If user already has email linked, show "View History" option
  if (existingEmail) {
    return (
      <div className="email-persistence email-persistence-linked">
        <div className="email-linked-info">
          <span className="linked-icon">✓</span>
          <span className="linked-text">
            Results saved to <strong>{existingEmail}</strong>
          </span>
        </div>
        {onViewHistory && (
          <button
            className="btn-view-history"
            onClick={() => {
              trackFeature.historicalEntriesViewed();
              onViewHistory();
            }}
          >
            View Your History
          </button>
        )}
      </div>
    );
  }

  // Success state after linking
  if (success) {
    return (
      <div className="email-persistence email-persistence-success">
        <div className="email-success-message">
          <span className="success-icon">🎉</span>
          <span>Email linked! Your results are now saved.</span>
        </div>
      </div>
    );
  }

  // Validate email format
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');

    if (onLinkEmail) {
      try {
        await onLinkEmail(trimmedEmail);
        setSuccess(true);
        trackFeature.emailLinked();
      } catch (err) {
        setError(err.message || 'Failed to link email');
      }
    }
  };

  const handleSkip = () => {
    trackFeature.emailSkipped();
    if (onSkip) onSkip();
  };

  // Track when prompt is shown
  React.useEffect(() => {
    trackFeature.emailPromptShown();
  }, []);

  return (
    <div className="email-persistence">
      <div className="email-prompt-header">
        <span className="email-icon">📧</span>
        <span className="email-prompt-title">Make it permanent?</span>
      </div>

      <p className="email-prompt-description">
        Link your email to save your leaderboard history across devices.
      </p>

      <div className="email-form">
        <input
          type="email"
          className={`email-input ${error ? 'has-error' : ''}`}
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          disabled={isLinking}
        />
        {error && <div className="email-error">{error}</div>}
      </div>

      <div className="email-actions">
        <button
          className="btn-link-email"
          onClick={handleSubmit}
          disabled={isLinking || !email.trim()}
        >
          {isLinking ? 'Linking...' : 'Link Email'}
        </button>
        <button
          className="btn-skip-email"
          onClick={handleSkip}
          disabled={isLinking}
        >
          Skip
        </button>
      </div>

      <p className="email-privacy-note">
        We'll never spam you. Email is only for result tracking.
      </p>
    </div>
  );
}

/**
 * HistoricalEntries - Display user's past puzzle results
 * @param {Array} entries - Array of historical leaderboard entries
 * @param {function} onClose - Callback to close the history view
 */
export function HistoricalEntries({ entries = [], onClose, loading = false }) {
  if (loading) {
    return (
      <div className="historical-entries">
        <div className="historical-header">
          <h3>Your History</h3>
          <button className="btn-close-history" onClick={onClose}>×</button>
        </div>
        <div className="historical-loading">Loading your results...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="historical-entries">
        <div className="historical-header">
          <h3>Your History</h3>
          <button className="btn-close-history" onClick={onClose}>×</button>
        </div>
        <div className="historical-empty">
          No past results found. Keep playing!
        </div>
      </div>
    );
  }

  return (
    <div className="historical-entries">
      <div className="historical-header">
        <h3>Your History</h3>
        <button className="btn-close-history" onClick={onClose}>×</button>
      </div>

      <div className="historical-stats">
        <div className="stat-item">
          <span className="stat-value">{entries.length}</span>
          <span className="stat-label">Games</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{entries.filter(e => e.won).length}</span>
          <span className="stat-label">Wins</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {entries.filter(e => e.won).length > 0
              ? (entries.filter(e => e.won).reduce((sum, e) => sum + e.guesses_used, 0) / entries.filter(e => e.won).length).toFixed(1)
              : '-'}
          </span>
          <span className="stat-label">Avg Guesses</span>
        </div>
      </div>

      <div className="historical-list">
        {entries.slice(0, 10).map((entry, index) => (
          <div key={entry.id || index} className={`historical-entry ${entry.won ? 'won' : 'lost'}`}>
            <div className="entry-date">
              {new Date(entry.puzzle_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="entry-puzzle">#{entry.puzzle_number}</div>
            <div className="entry-result">
              {entry.won ? (
                <span className="result-win">{entry.guesses_used}/4 🏆</span>
              ) : (
                <span className="result-loss">X/4</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {entries.length > 10 && (
        <div className="historical-more">
          Showing 10 of {entries.length} games
        </div>
      )}
    </div>
  );
}

export default EmailPersistence;
