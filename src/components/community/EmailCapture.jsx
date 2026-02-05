/**
 * EmailCapture Component
 * Unified email collection for notifications AND leaderboard persistence
 *
 * Features:
 * - Email only (no phone/WhatsApp complexity)
 * - Compelling value props
 * - Smart timing (not shown on first game)
 * - Inline or modal variants
 */

import React, { useState, useEffect } from 'react';
import { subscribeForNotifications } from '../../lib/supabase.js';
import { trackFeature, trackFunnel } from '../../lib/analytics.js';

// Storage keys
const EMAIL_CAPTURE_KEY = 'bowldem_email_capture';
const GAMES_PLAYED_KEY = 'bowldem_games_played_count';

/**
 * Get number of games user has played (for timing logic)
 */
export function getGamesPlayedCount() {
  return parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0', 10);
}

/**
 * Increment games played count
 */
export function incrementGamesPlayed() {
  const current = getGamesPlayedCount();
  localStorage.setItem(GAMES_PLAYED_KEY, String(current + 1));
  return current + 1;
}

/**
 * Check if email capture has been handled
 */
export function hasHandledEmailCapture() {
  const stored = localStorage.getItem(EMAIL_CAPTURE_KEY);
  if (!stored) return false;

  try {
    const data = JSON.parse(stored);
    // If dismissed, check if it was more than 3 days ago (allow re-prompt)
    if (data.status === 'dismissed') {
      const dismissedAt = new Date(data.timestamp);
      const daysSinceDismiss = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceDismiss < 3; // Re-show after 3 days
    }
    return true; // Subscribed or other status
  } catch {
    return false;
  }
}

/**
 * Check if user has already provided email
 */
export function hasProvidedEmail() {
  const stored = localStorage.getItem(EMAIL_CAPTURE_KEY);
  if (!stored) return false;
  try {
    const data = JSON.parse(stored);
    return data.status === 'subscribed' || data.status === 'subscribed_local';
  } catch {
    return false;
  }
}

/**
 * Should we show the email prompt?
 * Logic: Show after 2+ games, not immediately handled
 */
export function shouldShowEmailPrompt() {
  if (hasProvidedEmail()) return false;
  if (hasHandledEmailCapture()) return false;
  return getGamesPlayedCount() >= 2;
}

/**
 * Mark email capture as handled
 */
function markEmailCaptureHandled(status, email = null) {
  localStorage.setItem(EMAIL_CAPTURE_KEY, JSON.stringify({
    status, // 'subscribed' | 'dismissed'
    email,
    timestamp: new Date().toISOString()
  }));
}

/**
 * Value propositions for email capture
 */
const VALUE_PROPS = [
  { icon: '🔥', text: 'Track your winning streak' },
  { icon: '🏆', text: 'Appear on all-time leaderboard' },
  { icon: '📱', text: 'Sync progress across devices' },
  { icon: '🔔', text: 'Get daily puzzle reminders' }
];

/**
 * EmailCapture - Main component
 * @param {string} variant - 'modal' | 'inline' | 'compact'
 * @param {function} onClose - Close handler
 * @param {function} onSuccess - Success handler with email
 * @param {function} linkEmail - Function to link email (from useLeaderboard)
 */
export function EmailCapture({
  variant = 'inline',
  onClose,
  onSuccess,
  linkEmail
}) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Track prompt shown
  useEffect(() => {
    trackFeature.emailPromptShown();
  }, []);

  // Validate email
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Handle submit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);

    try {
      // Subscribe for notifications
      await subscribeForNotifications({
        email: trimmedEmail,
        phone_number: null,
        preferred_channel: 'email'
      });

      // Link email to leaderboard entries
      if (linkEmail) {
        await linkEmail(trimmedEmail);
      }

      setSuccess(true);
      markEmailCaptureHandled('subscribed', trimmedEmail);
      trackFeature.emailLinked();
      trackFunnel.notificationEnabled();

      setTimeout(() => {
        onSuccess?.(trimmedEmail);
        onClose?.();
      }, 1500);

    } catch (err) {
      // Graceful degradation - still mark as success for UX
      console.warn('Email capture error:', err);
      setSuccess(true);
      markEmailCaptureHandled('subscribed_local', trimmedEmail);

      setTimeout(() => {
        onSuccess?.(trimmedEmail);
        onClose?.();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    trackFeature.emailSkipped();
    markEmailCaptureHandled('dismissed');
    onClose?.();
  };

  // Success state
  if (success) {
    return (
      <div className={`email-capture email-capture-${variant} email-capture-success`}>
        <div className="capture-success-content">
          <span className="success-check">✓</span>
          <span className="success-text">You're all set!</span>
        </div>
      </div>
    );
  }

  // Compact variant (single line)
  if (variant === 'compact') {
    return (
      <div className="email-capture email-capture-compact">
        <div className="compact-content">
          <span className="compact-icon">📧</span>
          <span className="compact-text">Save your stats</span>
        </div>
        <form className="compact-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className={`compact-input ${error ? 'has-error' : ''}`}
            placeholder="your@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="compact-btn"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? '...' : 'Save'}
          </button>
        </form>
        <button className="compact-dismiss" onClick={handleDismiss}>×</button>
      </div>
    );
  }

  // Inline variant (card style)
  if (variant === 'inline') {
    return (
      <div className="email-capture email-capture-inline">
        <div className="capture-header">
          <span className="capture-emoji">🎯</span>
          <h3 className="capture-title">Level up your game</h3>
        </div>

        <div className="capture-benefits">
          {VALUE_PROPS.slice(0, 2).map((prop, i) => (
            <div key={i} className="benefit-item">
              <span className="benefit-icon">{prop.icon}</span>
              <span className="benefit-text">{prop.text}</span>
            </div>
          ))}
        </div>

        <form className="capture-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className={`capture-input ${error ? 'has-error' : ''}`}
            placeholder="Enter your email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={isSubmitting}
          />
          {error && <div className="capture-error">{error}</div>}
          <div className="capture-buttons">
            <button
              type="submit"
              className="btn-capture-submit"
              disabled={isSubmitting || !email.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save My Progress'}
            </button>
            <button
              type="button"
              className="btn-capture-skip"
              onClick={handleDismiss}
              disabled={isSubmitting}
            >
              Not now
            </button>
          </div>
        </form>

        <p className="capture-privacy">No spam, ever. Just puzzle love.</p>
      </div>
    );
  }

  // Modal variant (full featured)
  return (
    <div className="email-capture email-capture-modal">
      <div className="modal-header">
        <h2 className="capture-title">Don't lose your progress!</h2>
        <button className="close-button" onClick={handleDismiss}>×</button>
      </div>

      <div className="capture-hero">
        <div className="hero-emoji">🎮</div>
        <p className="hero-text">
          Add your email to track stats, save your streak, and appear on the leaderboard.
        </p>
      </div>

      <div className="capture-benefits-grid">
        {VALUE_PROPS.map((prop, i) => (
          <div key={i} className="benefit-card">
            <span className="benefit-icon">{prop.icon}</span>
            <span className="benefit-text">{prop.text}</span>
          </div>
        ))}
      </div>

      <form className="capture-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <input
            type="email"
            className={`capture-input ${error ? 'has-error' : ''}`}
            placeholder="your@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={isSubmitting}
          />
          {error && <div className="capture-error">{error}</div>}
        </div>

        <button
          type="submit"
          className="btn-enhanced btn-success btn-capture-main"
          disabled={isSubmitting || !email.trim()}
        >
          {isSubmitting ? 'Setting up...' : 'Save My Progress'}
        </button>
      </form>

      <button
        className="btn-capture-later"
        onClick={handleDismiss}
        disabled={isSubmitting}
      >
        Maybe later
      </button>

      <p className="capture-privacy">
        We'll only send daily puzzle reminders. No spam, unsubscribe anytime.
      </p>
    </div>
  );
}

export default EmailCapture;
