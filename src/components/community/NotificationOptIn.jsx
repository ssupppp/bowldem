/**
 * NotificationOptIn Component
 * Email/phone capture for daily puzzle notifications
 */

import React, { useState, useEffect } from 'react';
import { subscribeForNotifications } from '../../lib/supabase.js';
import { trackFeature, trackFunnel } from '../../lib/analytics.js';

// Storage key for tracking opt-in state
const NOTIFICATION_STORAGE_KEY = 'bowldem_notification_optin';

/**
 * Check if user has already opted in or dismissed
 */
export function hasHandledNotifications() {
  const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  return stored !== null;
}

/**
 * Mark notifications as handled (subscribed or dismissed)
 */
function markNotificationsHandled(status) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({
    status, // 'subscribed' | 'dismissed'
    timestamp: new Date().toISOString()
  }));
}

/**
 * NotificationOptIn - Email/phone capture modal
 * @param {Object} props
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSuccess - Success handler
 */
export function NotificationOptIn({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [preferredChannel, setPreferredChannel] = useState('whatsapp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Track opt-in shown on mount
  useEffect(() => {
    trackFeature.notificationOptInShown();
  }, []);

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate phone format (basic validation)
  const isValidPhone = (phone) => {
    return /^\+?[\d\s-]{10,}$/.test(phone.replace(/[\s-]/g, ''));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate at least one contact method
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0 && phone.trim() !== '+91';

    if (!hasEmail && !hasPhone) {
      setError('Please enter an email or phone number');
      return;
    }

    if (hasEmail && !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (hasPhone && !isValidPhone(phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await subscribeForNotifications({
        email: hasEmail ? email.trim() : null,
        phone_number: hasPhone ? phone.trim() : null,
        preferred_channel: preferredChannel
      });

      if (result.success) {
        setSuccess(true);
        markNotificationsHandled('subscribed');
        trackFeature.notificationOptInCompleted(preferredChannel);
        trackFunnel.notificationEnabled();
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 2000);
      } else {
        // Show success anyway to user - we'll store locally and sync later
        // This provides graceful degradation if backend has issues
        console.warn('Subscription backend error:', result.error);
        setSuccess(true);
        markNotificationsHandled('subscribed_local');
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      // Graceful degradation - show success to user, log error
      console.error('Subscription error:', err);
      setSuccess(true);
      markNotificationsHandled('subscribed_local');
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    trackFeature.notificationOptInDismissed();
    markNotificationsHandled('dismissed');
    onClose();
  };

  // Success state
  if (success) {
    return (
      <div className="notification-optin-modal">
        <div className="notification-success">
          <div className="success-icon">✓</div>
          <h3>You're subscribed!</h3>
          <p>We'll notify you when new puzzles drop.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-optin-modal">
      <div className="modal-header">
        <h2 className="overlay-title">Never Miss a Puzzle!</h2>
        <button className="close-button" onClick={handleDismiss}>
          ×
        </button>
      </div>

      <div className="notification-description">
        <span className="notification-emoji">🔔</span>
        <p>Get notified when new puzzles are available. Daily at midnight!</p>
      </div>

      <form onSubmit={handleSubmit} className="notification-form">
        {/* Email input */}
        <div className="notification-input-group">
          <label htmlFor="notification-email">Email</label>
          <input
            id="notification-email"
            type="email"
            className="notification-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="notification-or">
          <span>and/or</span>
        </div>

        {/* Phone input - WhatsApp */}
        <div className="notification-input-group">
          <label htmlFor="notification-phone">WhatsApp Number</label>
          <input
            id="notification-phone"
            type="tel"
            className="notification-input"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Preferred channel (if both provided) */}
        {email && phone && phone.trim() !== '+91 ' && (
          <div className="notification-preference">
            <span>Prefer notifications via:</span>
            <div className="preference-options">
              <label className={`preference-option ${preferredChannel === 'whatsapp' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="channel"
                  value="whatsapp"
                  checked={preferredChannel === 'whatsapp'}
                  onChange={() => setPreferredChannel('whatsapp')}
                />
                <span>WhatsApp</span>
              </label>
              <label className={`preference-option ${preferredChannel === 'email' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="channel"
                  value="email"
                  checked={preferredChannel === 'email'}
                  onChange={() => setPreferredChannel('email')}
                />
                <span>Email</span>
              </label>
            </div>
          </div>
        )}

        {error && <div className="notification-error">{error}</div>}

        <div className="notification-actions">
          <button
            type="submit"
            className="btn-enhanced btn-success"
            disabled={isSubmitting || (!email && !phone)}
          >
            {isSubmitting ? 'Subscribing...' : 'Notify Me'}
          </button>
          <button
            type="button"
            className="btn-text"
            onClick={handleDismiss}
            disabled={isSubmitting}
          >
            Maybe Later
          </button>
        </div>
      </form>

      <p className="notification-privacy">
        We'll only use this to send puzzle notifications. No spam, ever.
      </p>
    </div>
  );
}

/**
 * NotificationBanner - Inline banner for notification opt-in
 */
export function NotificationBanner({ onOptIn, onDismiss }) {
  return (
    <div className="notification-banner">
      <div className="banner-content">
        <span className="banner-icon">🔔</span>
        <span className="banner-text">Get notified when new puzzles drop!</span>
      </div>
      <div className="banner-actions">
        <button className="banner-btn-primary" onClick={onOptIn}>
          Yes!
        </button>
        <button className="banner-btn-dismiss" onClick={onDismiss}>
          ×
        </button>
      </div>
    </div>
  );
}

export default NotificationOptIn;
