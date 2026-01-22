/**
 * NameEntryPrompt Component
 * Simple inline prompt for entering display name for leaderboard
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * NameEntryPrompt - Inline prompt for entering display name
 * @param {Object} props
 * @param {string} props.savedName - Previously saved display name
 * @param {Function} props.onSubmit - Called when user submits (name, guessesUsed, won)
 * @param {Function} props.onSkip - Called when user skips
 * @param {number} props.guessesUsed - Number of guesses used
 * @param {boolean} props.won - Whether the user won
 * @param {boolean} props.isSubmitting - Whether submission is in progress
 * @param {boolean} props.hasSubmitted - Whether user has already submitted
 */
export function NameEntryPrompt({
  savedName = '',
  onSubmit,
  onSkip,
  guessesUsed,
  won,
  isSubmitting = false,
  hasSubmitted = false
}) {
  const [name, setName] = useState(savedName);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Focus input on mount if no saved name
  useEffect(() => {
    if (!savedName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [savedName]);

  // Validate name
  const validateName = (value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'Please enter a name';
    }
    if (trimmed.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (trimmed.length > 20) {
      return 'Name must be 20 characters or less';
    }
    // Check for inappropriate content (basic filter)
    const forbidden = ['admin', 'moderator', 'bowldem', 'official'];
    if (forbidden.some(word => trimmed.toLowerCase().includes(word))) {
      return 'This name is not allowed';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit(name.trim(), guessesUsed, won);
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (error) {
      setError('');
    }
  };

  // If already submitted, show confirmation
  if (hasSubmitted) {
    return (
      <div className="name-entry-submitted">
        <span className="submitted-icon">✓</span>
        <span className="submitted-text">Added to leaderboard as <strong>{savedName || name}</strong></span>
      </div>
    );
  }

  return (
    <div className="name-entry-prompt">
      <div className="name-entry-header">
        <span className="name-entry-icon">🏆</span>
        <span className="name-entry-title">Add your name to the leaderboard?</span>
      </div>

      <form onSubmit={handleSubmit} className="name-entry-form">
        <div className="name-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className={`name-entry-input ${error ? 'has-error' : ''}`}
            placeholder="Enter your display name"
            value={name}
            onChange={handleNameChange}
            maxLength={20}
            disabled={isSubmitting}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {name.length > 0 && (
            <span className="char-count">{name.length}/20</span>
          )}
        </div>

        {error && <div className="name-entry-error">{error}</div>}

        <div className="name-entry-actions">
          <button
            type="submit"
            className="btn-enhanced btn-success btn-compact"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            className="btn-enhanced btn-secondary btn-compact"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip
          </button>
        </div>
      </form>

      <p className="name-entry-hint">
        Your name will appear on today's leaderboard
      </p>
    </div>
  );
}

/**
 * QuickNameEntry - More compact version for inline use
 */
export function QuickNameEntry({
  savedName = '',
  onSubmit,
  guessesUsed,
  won,
  isSubmitting = false,
  hasSubmitted = false
}) {
  const [name, setName] = useState(savedName);
  const [showInput, setShowInput] = useState(!savedName);

  // If user has saved name, show quick submit
  if (savedName && !showInput) {
    return (
      <div className="quick-name-entry">
        <span className="quick-name-label">Submit as</span>
        <span className="quick-name-value">{savedName}</span>
        <button
          className="btn-enhanced btn-success btn-small"
          onClick={() => onSubmit(savedName, guessesUsed, won)}
          disabled={isSubmitting || hasSubmitted}
        >
          {hasSubmitted ? 'Submitted!' : isSubmitting ? '...' : 'Submit'}
        </button>
        <button
          className="btn-text btn-small"
          onClick={() => setShowInput(true)}
          disabled={isSubmitting || hasSubmitted}
        >
          Change name
        </button>
      </div>
    );
  }

  // Show input form
  return (
    <div className="quick-name-entry">
      <input
        type="text"
        className="quick-name-input"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        disabled={isSubmitting || hasSubmitted}
      />
      <button
        className="btn-enhanced btn-success btn-small"
        onClick={() => onSubmit(name.trim(), guessesUsed, won)}
        disabled={isSubmitting || hasSubmitted || !name.trim()}
      >
        {hasSubmitted ? 'Submitted!' : isSubmitting ? '...' : 'Submit'}
      </button>
      {savedName && (
        <button
          className="btn-text btn-small"
          onClick={() => setShowInput(false)}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export default NameEntryPrompt;
