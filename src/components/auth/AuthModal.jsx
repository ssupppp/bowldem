/**
 * AuthModal Component
 * Login modal with Google OAuth + Magic Link options
 */

import React, { useState } from 'react';

export function AuthModal({ isOpen, onClose, signInWithGoogle, signInWithMagicLink }) {
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    }
    // Redirect happens automatically
  };

  const handleMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const { error } = await signInWithMagicLink(trimmed);
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className="auth-modal-header">
          <span className="auth-modal-icon">🏏</span>
          <h2 className="auth-modal-title">Sign in to Bowldem</h2>
          <p className="auth-modal-subtitle">Save your progress across devices</p>
        </div>

        <div className="auth-modal-body">
          {/* Google Sign In */}
          <button className="auth-btn auth-btn-google" onClick={handleGoogleSignIn}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span>or</span>
          </div>

          {/* Magic Link */}
          {!showMagicLink ? (
            <button
              className="auth-btn auth-btn-magic"
              onClick={() => setShowMagicLink(true)}
            >
              <span className="auth-btn-emoji">✉️</span>
              <span>Sign in with email</span>
            </button>
          ) : status === 'sent' ? (
            <div className="auth-magic-sent">
              <span className="auth-sent-icon">✓</span>
              <p className="auth-sent-text">Check your email!</p>
              <p className="auth-sent-detail">We sent a sign-in link to <strong>{email}</strong></p>
            </div>
          ) : (
            <div className="auth-magic-form">
              <input
                type="email"
                className="auth-magic-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') { setStatus('idle'); setErrorMsg(''); }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMagicLink(); }}
                disabled={status === 'sending'}
                autoFocus
              />
              <button
                className="auth-btn auth-btn-send"
                onClick={handleMagicLink}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending...' : 'Send magic link'}
              </button>
            </div>
          )}

          {errorMsg && <div className="auth-error">{errorMsg}</div>}
        </div>

        <div className="auth-modal-footer">
          <p className="auth-footer-note">No password needed. Your anonymous progress will be saved.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
