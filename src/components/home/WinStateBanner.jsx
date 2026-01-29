/**
 * WinStateBanner Component
 * Celebratory banner for home page when user has already won today
 */

import React, { useState, useEffect } from 'react';
import { getMillisecondsUntilNextPuzzle, formatCountdown } from '../../utils/dailyPuzzle.js';
import { MatchRevealCard } from './MatchRevealCard.jsx';
import { EmailPersistence, HistoricalEntries } from '../community/EmailPersistence.jsx';

/**
 * ProminentCountdown - Large countdown timer for next puzzle
 */
function ProminentCountdown() {
  const [timeLeft, setTimeLeft] = useState(getMillisecondsUntilNextPuzzle());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getMillisecondsUntilNextPuzzle());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate hours, minutes, seconds
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const pad = (n) => n.toString().padStart(2, '0');

  return (
    <div className="prominent-countdown">
      <div className="countdown-title">NEXT PUZZLE IN</div>
      <div className="countdown-digits">
        <div className="digit-group">
          <span className="digit">{pad(hours)}</span>
          <span className="digit-label">hrs</span>
        </div>
        <span className="digit-separator">:</span>
        <div className="digit-group">
          <span className="digit">{pad(minutes)}</span>
          <span className="digit-label">min</span>
        </div>
        <span className="digit-separator">:</span>
        <div className="digit-group">
          <span className="digit">{pad(seconds)}</span>
          <span className="digit-label">sec</span>
        </div>
      </div>
    </div>
  );
}

/**
 * ShareButtons - X, WhatsApp, and Copy buttons with platform icons
 */
function ShareButtons({ onShareX, onShareWhatsApp, onCopy, copyState }) {
  return (
    <div className="share-section">
      <div className="share-section-title">SHARE YOUR RESULT</div>
      <div className="share-buttons">
        <button className="share-btn share-btn-x" onClick={onShareX}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>X</span>
        </button>
        <button className="share-btn share-btn-whatsapp" onClick={onShareWhatsApp}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>WhatsApp</span>
        </button>
        <button
          className={`share-btn share-btn-copy ${copyState === 'copied' ? 'copied' : ''}`}
          onClick={onCopy}
        >
          {copyState === 'copied' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * LeaderboardPreviewInline - Compact leaderboard preview for completed state
 * Shows Top 3 + 2 entries surrounding user's rank
 */
function LeaderboardPreviewInline({
  entries = [],
  userRanking,
  displayName,
  onViewFull
}) {
  if (entries.length === 0) {
    return null;
  }

  // Filter to only show winners and sort
  const winners = entries
    .filter(e => e.won)
    .sort((a, b) => {
      if (a.guesses_used !== b.guesses_used) return a.guesses_used - b.guesses_used;
      return new Date(a.created_at) - new Date(b.created_at);
    });

  if (winners.length === 0) {
    return null;
  }

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
    <div className="leaderboard-preview-inline">
      <div className="preview-inline-header">
        <span className="preview-inline-title">TODAY'S LEADERBOARD</span>
      </div>

      <div className="preview-inline-list">
        {top3.map((entry, index) => (
          <div
            key={entry.id || index}
            className={`preview-entry ${entry.display_name === displayName ? 'is-user' : ''}`}
          >
            <span className="preview-rank">{getRankEmoji(index)}</span>
            <span className="preview-name">{entry.display_name}</span>
            <span className="preview-result">{entry.guesses_used}/5</span>
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
                  <span className="preview-result">{entry.guesses_used}/5</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {onViewFull && (
        <button className="preview-view-full" onClick={onViewFull}>
          View Full Leaderboard
        </button>
      )}
    </div>
  );
}

/**
 * ResultBanner - Compact result banner for completed state
 */
function ResultBanner({ won, guessesUsed, maxGuesses = 5, streak = 0 }) {
  if (won) {
    return (
      <div className="result-banner result-banner-win">
        <div className="result-banner-icon">🏆</div>
        <div className="result-banner-content">
          <span className="result-banner-text">
            Solved in <strong>{guessesUsed}/{maxGuesses}!</strong>
          </span>
          {streak > 1 && (
            <span className="result-banner-streak">
              🔥 {streak} day streak
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="result-banner result-banner-loss">
      <div className="result-banner-icon">😔</div>
      <div className="result-banner-content">
        <span className="result-banner-text">
          Better luck tomorrow!
        </span>
      </div>
    </div>
  );
}

/**
 * NotifySection - Email/WhatsApp subscription input
 * Allows users to subscribe for daily puzzle notifications
 */
function NotifySection({ onSubscribe }) {
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(() => {
    return localStorage.getItem('bowldem_notification_subscribed') === 'true';
  });
  const [error, setError] = useState('');

  // If already subscribed, show success state
  if (isSubscribed) {
    return (
      <div className="notify-section notify-section-subscribed">
        <div className="notify-success">
          <span className="notify-check">✓</span>
          <span className="notify-success-text">You're subscribed!</span>
        </div>
      </div>
    );
  }

  const validateContact = (value) => {
    const trimmed = value.trim();
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) {
      return { valid: true, type: 'email' };
    }
    // Phone validation (starts with + and has 10-15 digits)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    const cleanPhone = trimmed.replace(/[\s\-()]/g, '');
    if (phoneRegex.test(cleanPhone)) {
      return { valid: true, type: 'whatsapp' };
    }
    return { valid: false, type: null };
  };

  const handleSubmit = async () => {
    const trimmed = contact.trim();
    if (!trimmed) {
      setError('Please enter email or phone');
      return;
    }

    const validation = validateContact(trimmed);
    if (!validation.valid) {
      setError('Enter valid email or phone (+country code)');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (onSubscribe) {
        await onSubscribe(trimmed, validation.type);
      }
      // Save to localStorage
      localStorage.setItem('bowldem_notification_subscribed', 'true');
      localStorage.setItem('bowldem_notification_contact', trimmed);
      setIsSubscribed(true);
    } catch (err) {
      setError('Failed to subscribe. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <div className="notify-section">
      <div className="notify-header">
        <span className="notify-bell">🔔</span>
        <span className="notify-label">Get notified for new puzzles</span>
      </div>
      <div className="notify-form">
        <input
          type="text"
          className={`notify-input ${error ? 'has-error' : ''}`}
          placeholder="Email or WhatsApp number"
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
        />
        <button
          className="btn-notify"
          onClick={handleSubmit}
          disabled={isSubmitting || !contact.trim()}
        >
          {isSubmitting ? '...' : 'Notify Me'}
        </button>
      </div>
      {error && <div className="notify-error">{error}</div>}
    </div>
  );
}

/**
 * ArchiveButton - Button to play past puzzles
 */
function ArchiveButton({ onClick }) {
  return (
    <button className="archive-button" onClick={onClick}>
      📚 Play Past Puzzles
    </button>
  );
}

/**
 * NostalgiaCard - Displays match context and trivia after puzzle completion
 * Shows fun facts and highlights to enhance the post-game experience
 */
function NostalgiaCard({ matchContext, triviaFact, playerHighlight }) {
  // Don't render if no meaningful content
  if (!matchContext && !triviaFact && !playerHighlight) {
    return null;
  }

  return (
    <div className="nostalgia-card">
      {matchContext && (
        <div className="nostalgia-context">
          <span className="nostalgia-icon">🏏</span>
          <span className="nostalgia-context-text">{matchContext}</span>
        </div>
      )}

      {triviaFact && (
        <div className="nostalgia-fact">
          <span className="nostalgia-icon">💡</span>
          <span className="nostalgia-fact-text">{triviaFact}</span>
        </div>
      )}

      {playerHighlight && (
        <div className="nostalgia-highlight">
          <span className="nostalgia-icon">⭐</span>
          <span className="nostalgia-highlight-text">{playerHighlight}</span>
        </div>
      )}
    </div>
  );
}

/**
 * CompletedStateBanner - Complete redesigned home screen for completed state
 * Combines all sections: Result, Countdown, Leaderboard, Share, Notify, Archive
 */
export function CompletedStateBanner({
  won,
  guessesUsed,
  maxGuesses = 5,
  streak = 0,
  playerName,
  displayName,
  hasSubmitted,
  onSubscribe,
  onShareX,
  onShareWhatsApp,
  onCopy,
  copyState,
  leaderboardEntries = [],
  userRanking,
  onViewLeaderboard,
  onOpenArchive,
  matchHighlight = null,
  // New props for rich match reveal
  scorecard = null,
  targetPlayerTeam = null,
  cricinfoUrl = null,
  // Email persistence props
  email = null,
  onLinkEmail = null,
  onSkipEmail = null,
  isLinkingEmail = false,
  historicalEntries = [],
  onViewHistory = null,
  showEmailPrompt = false
}) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  return (
    <div className="completed-home-redesign">
      {/* Result Banner */}
      <ResultBanner
        won={won}
        guessesUsed={guessesUsed}
        maxGuesses={maxGuesses}
        streak={streak}
      />

      {/* Match Reveal Card - shown on WIN with full match details */}
      {won && matchHighlight && (
        <MatchRevealCard
          scorecard={scorecard}
          matchContext={matchHighlight.matchContext}
          triviaFact={matchHighlight.triviaFact}
          playerHighlight={matchHighlight.playerHighlight}
          targetPlayerTeam={targetPlayerTeam}
          mvpName={playerName}
          cricinfoUrl={cricinfoUrl}
        />
      )}

      {/* Nostalgia Card - shown on LOSS (simpler version, NO playerHighlight to avoid revealing answer) */}
      {!won && matchHighlight && (
        <NostalgiaCard
          matchContext={matchHighlight.matchContext}
          triviaFact={matchHighlight.triviaFact}
          playerHighlight={null}
        />
      )}

      {/* Prominent Countdown */}
      <ProminentCountdown />

      {/* Leaderboard Preview - WIN only and if has submitted */}
      {won && hasSubmitted && (
        <LeaderboardPreviewInline
          entries={leaderboardEntries}
          userRanking={userRanking}
          displayName={displayName}
          onViewFull={onViewLeaderboard}
        />
      )}

      {/* Share Section */}
      <ShareButtons
        onShareX={onShareX}
        onShareWhatsApp={onShareWhatsApp}
        onCopy={onCopy}
        copyState={copyState}
      />

      {/* Notify Me Section */}
      <NotifySection onSubscribe={onSubscribe} />

      {/* Archive Button */}
      {onOpenArchive && (
        <ArchiveButton onClick={onOpenArchive} />
      )}

      {/* Historical Entries Modal */}
      {showHistoryModal && (
        <div className="history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <HistoricalEntries
              entries={historicalEntries}
              onClose={() => setShowHistoryModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * LiveLeaderboard - Permanent leaderboard visible on main page
 * Shows social proof that others are playing + inline submit form
 */
function LiveLeaderboard({
  entries = [],
  loading = false,
  gameCompleted = false,
  won = false,
  hasSubmitted = false,
  displayName = '',
  userRanking,
  guessesUsed,
  onSubmit,
  isSubmitting = false,
  onViewFull,
  // Email persistence props
  email = null,
  onLinkEmail = null,
  onSkipEmail = null,
  isLinkingEmail = false,
  showEmailPrompt = false
}) {
  const [name, setName] = React.useState(displayName);
  const [submitError, setSubmitError] = React.useState('');

  // Update name when displayName changes
  React.useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const handleSubmit = () => {
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
    if (onSubmit) {
      onSubmit(trimmedName);
    }
  };

  // Filter to only show winners and sort
  const winners = entries
    .filter(e => e.won)
    .sort((a, b) => {
      if (a.guesses_used !== b.guesses_used) return a.guesses_used - b.guesses_used;
      return new Date(a.created_at) - new Date(b.created_at);
    });

  const getRankEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <div className="live-leaderboard">
      <div className="live-leaderboard-header">
        <span className="live-leaderboard-title">
          🏆 Today's Leaderboard
        </span>
        {winners.length > 0 && (
          <span className="live-leaderboard-count">{winners.length} solved</span>
        )}
      </div>

      {/* Submit Section - shown if game completed, WON, and not yet submitted */}
      {gameCompleted && won && !hasSubmitted && (
        <div className="live-submit-section">
          <div className="live-submit-prompt">
            Add your name to the leaderboard!
          </div>
          <div className="live-submit-form">
            <input
              type="text"
              className={`live-submit-input ${submitError ? 'has-error' : ''}`}
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSubmitError('');
              }}
              maxLength={20}
              disabled={isSubmitting}
            />
            <button
              className="live-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? '...' : 'Submit'}
            </button>
          </div>
          {submitError && <div className="live-submit-error">{submitError}</div>}
        </div>
      )}

      {/* Success message after submission */}
      {gameCompleted && hasSubmitted && userRanking && (
        <div className="live-submit-success">
          <span className="success-check">✓</span>
          <span>You're #{userRanking}!</span>
        </div>
      )}

      {/* Email Persistence - show in sidebar after submission */}
      {gameCompleted && won && hasSubmitted && showEmailPrompt && (
        <EmailPersistence
          onLinkEmail={onLinkEmail}
          onSkip={onSkipEmail}
          existingEmail={email}
          isLinking={isLinkingEmail}
        />
      )}

      {/* Leaderboard entries */}
      <div className="live-leaderboard-list">
        {loading ? (
          <div className="live-leaderboard-loading">Loading...</div>
        ) : winners.length === 0 ? (
          <div className="live-leaderboard-empty">
            No winners yet - be the first!
          </div>
        ) : (
          winners.slice(0, 5).map((entry, index) => (
            <div
              key={entry.id || index}
              className={`live-entry ${entry.display_name === displayName ? 'is-user' : ''}`}
            >
              <span className="live-entry-rank">{getRankEmoji(index)}</span>
              <span className="live-entry-name">{entry.display_name}</span>
              <span className="live-entry-result">{entry.guesses_used}/5</span>
            </div>
          ))
        )}
      </div>

      {/* View full leaderboard link */}
      {winners.length > 5 && onViewFull && (
        <button className="live-view-full" onClick={onViewFull}>
          View all {winners.length} →
        </button>
      )}
    </div>
  );
}

/**
 * CompletedMobileView - Mobile-optimized completed state
 * Shows leaderboard as hero section with collapsible puzzle details
 *
 * Layout:
 * 1. Your Rank (hero - if won and submitted)
 * 2. Leaderboard preview
 * 3. Countdown
 * 4. Share buttons
 * 5. Collapsible puzzle details
 */
export function CompletedMobileView({
  won,
  guessesUsed,
  maxGuesses = 5,
  streak = 0,
  displayName,
  hasSubmitted,
  userRanking,
  leaderboardEntries = [],
  leaderboardLoading = false,
  onSubmitToLeaderboard,
  isSubmitting = false,
  onViewLeaderboard,
  onShareX,
  onShareWhatsApp,
  onCopy,
  copyState,
  onSubscribe,
  onOpenArchive,
  matchHighlight = null,
  children, // Puzzle content (scorecard + feedback) as children
  // New props for rich match reveal
  scorecard = null,
  targetPlayerTeam = null,
  playerName = null,
  cricinfoUrl = null,
  // Email persistence props
  email = null,
  onLinkEmail = null,
  onSkipEmail = null,
  isLinkingEmail = false,
  historicalEntries = [],
  showEmailPrompt = false
}) {
  const [showPuzzleDetails, setShowPuzzleDetails] = React.useState(false);
  const [name, setName] = React.useState(displayName || '');
  const [submitError, setSubmitError] = React.useState('');

  // Update name when displayName changes
  React.useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const handleSubmit = () => {
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
    if (onSubmitToLeaderboard) {
      onSubmitToLeaderboard(trimmedName);
    }
  };

  // Filter to only show winners and sort
  const winners = leaderboardEntries
    .filter(e => e.won)
    .sort((a, b) => {
      if (a.guesses_used !== b.guesses_used) return a.guesses_used - b.guesses_used;
      return new Date(a.created_at) - new Date(b.created_at);
    });

  const getRankEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <div className="completed-mobile-view">
      {/* Hero Section - Rank or Result */}
      <div className="mobile-hero-section">
        {won ? (
          hasSubmitted && userRanking ? (
            <div className="mobile-rank-hero">
              <div className="rank-hero-emoji">🎉</div>
              <div className="rank-hero-title">You're #{userRanking}!</div>
              <div className="rank-hero-subtitle">
                Solved in {guessesUsed}/{maxGuesses} guesses
                {streak > 1 && <span className="rank-hero-streak"> • 🔥 {streak} streak</span>}
              </div>
            </div>
          ) : (
            <div className="mobile-result-hero result-hero-win">
              <div className="result-hero-emoji">🏆</div>
              <div className="result-hero-title">You Won!</div>
              <div className="result-hero-subtitle">
                Solved in {guessesUsed}/{maxGuesses}
                {streak > 1 && <span className="result-hero-streak"> • 🔥 {streak}</span>}
              </div>
            </div>
          )
        ) : (
          <div className="mobile-result-hero result-hero-loss">
            <div className="result-hero-emoji">😔</div>
            <div className="result-hero-title">Game Over</div>
            <div className="result-hero-subtitle">Better luck tomorrow!</div>
          </div>
        )}
      </div>

      {/* Submit Form - if won but not submitted */}
      {won && !hasSubmitted && (
        <div className="mobile-submit-section">
          <div className="mobile-submit-prompt">Join the leaderboard!</div>
          <div className="mobile-submit-form">
            <input
              type="text"
              className={`mobile-submit-input ${submitError ? 'has-error' : ''}`}
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSubmitError('');
              }}
              maxLength={20}
              disabled={isSubmitting}
            />
            <button
              className="mobile-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
          {submitError && <div className="mobile-submit-error">{submitError}</div>}
        </div>
      )}

      {/* Leaderboard Preview - Top 3 */}
      {won && winners.length > 0 && (
        <div className="mobile-leaderboard-section">
          <div className="mobile-leaderboard-header">
            <span className="mobile-leaderboard-title">Today's Leaderboard</span>
            <span className="mobile-leaderboard-count">{winners.length} solved</span>
          </div>
          <div className="mobile-leaderboard-list">
            {leaderboardLoading ? (
              <div className="mobile-leaderboard-loading">Loading...</div>
            ) : (
              winners.slice(0, 3).map((entry, index) => (
                <div
                  key={entry.id || index}
                  className={`mobile-leaderboard-entry ${entry.display_name === displayName ? 'is-user' : ''}`}
                >
                  <span className="entry-rank">{getRankEmoji(index)}</span>
                  <span className="entry-name">{entry.display_name}</span>
                  <span className="entry-result">{entry.guesses_used}/5</span>
                </div>
              ))
            )}
          </div>
          {winners.length > 3 && onViewLeaderboard && (
            <button className="mobile-view-full-btn" onClick={onViewLeaderboard}>
              View all {winners.length} →
            </button>
          )}
        </div>
      )}

      {/* Countdown */}
      <ProminentCountdown />

      {/* Share Buttons */}
      <ShareButtons
        onShareX={onShareX}
        onShareWhatsApp={onShareWhatsApp}
        onCopy={onCopy}
        copyState={copyState}
      />

      {/* Match Reveal Card - shown on WIN */}
      {won && matchHighlight && (
        <MatchRevealCard
          scorecard={scorecard}
          matchContext={matchHighlight.matchContext}
          triviaFact={matchHighlight.triviaFact}
          playerHighlight={matchHighlight.playerHighlight}
          targetPlayerTeam={targetPlayerTeam}
          mvpName={playerName}
          cricinfoUrl={cricinfoUrl}
        />
      )}

      {/* Nostalgia Card - shown on LOSS (NO playerHighlight to avoid revealing answer) */}
      {!won && matchHighlight && (
        <NostalgiaCard
          matchContext={matchHighlight.matchContext}
          triviaFact={matchHighlight.triviaFact}
          playerHighlight={null}
        />
      )}

      {/* Email Persistence - show after leaderboard submission */}
      {won && hasSubmitted && showEmailPrompt && (
        <EmailPersistence
          onLinkEmail={onLinkEmail}
          onSkip={onSkipEmail}
          existingEmail={email}
          isLinking={isLinkingEmail}
        />
      )}

      {/* Notify Me */}
      <NotifySection onSubscribe={onSubscribe} />

      {/* Collapsible Puzzle Details */}
      <div className="mobile-puzzle-details">
        <button
          className={`mobile-puzzle-toggle ${showPuzzleDetails ? 'expanded' : ''}`}
          onClick={() => setShowPuzzleDetails(!showPuzzleDetails)}
        >
          <span>{showPuzzleDetails ? '▼' : '▶'}</span>
          <span>{showPuzzleDetails ? 'Hide Puzzle Details' : 'View Your Puzzle'}</span>
        </button>
        {showPuzzleDetails && (
          <div className="mobile-puzzle-content">
            {children}
          </div>
        )}
      </div>

      {/* Archive Button */}
      {onOpenArchive && (
        <ArchiveButton onClick={onOpenArchive} />
      )}
    </div>
  );
}

// Export individual components for flexibility
export { ProminentCountdown, ShareButtons, LeaderboardPreviewInline, ResultBanner, NotifySection, LiveLeaderboard, NostalgiaCard };

export default CompletedStateBanner;
