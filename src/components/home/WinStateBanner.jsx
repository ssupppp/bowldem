/**
 * WinStateBanner Component
 * Celebratory banner for home page when user has already won today
 */

import React, { useState, useEffect } from 'react';
import { getMillisecondsUntilNextPuzzle, formatCountdown } from '../../utils/dailyPuzzle.js';


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
  onViewFull,
  maxGuesses = 5
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
            <span className="preview-result">{entry.guesses_used}/{maxGuesses}</span>
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
                  <span className="preview-result">{entry.guesses_used}/{maxGuesses}</span>
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
function ResultBanner({ won, guessesUsed, maxGuesses = 5, streak = 0, playerName }) {
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
        {playerName && (
          <span className="result-banner-answer">
            The answer was <strong>{playerName}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * EmailNotifySection - Inline email input for subscribing to daily reminders
 * Shows checkmark if already subscribed
 * Memoized to prevent parent re-renders from causing input focus loss
 */
const EmailNotifySection = React.memo(function EmailNotifySection({ onEmailSubscribe, isSubscribed }) {
  const [emailInput, setEmailInput] = React.useState('');
  const [status, setStatus] = React.useState(isSubscribed ? 'subscribed' : 'idle'); // idle | submitting | subscribed | error
  const [errorMsg, setErrorMsg] = React.useState('');
  const inputRef = React.useRef(null);

  // Sync with parent's isSubscribed prop
  React.useEffect(() => {
    if (isSubscribed) setStatus('subscribed');
  }, [isSubscribed]);

  const handleSubmit = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg('Please enter your email');
      setStatus('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      if (onEmailSubscribe) {
        const result = await onEmailSubscribe(trimmed);
        if (result?.success || result?.alreadySubscribed) {
          setStatus('subscribed');
        } else {
          setErrorMsg(result?.error || 'Something went wrong');
          setStatus('error');
        }
      }
    } catch (e) {
      setErrorMsg('Something went wrong');
      setStatus('error');
    }
  };

  if (status === 'subscribed') {
    return (
      <div className="notify-section notify-section-subscribed">
        <span className="notify-check">✓</span>
        <span className="notify-label">You'll get daily reminders!</span>
      </div>
    );
  }

  return (
    <div className="notify-section">
      <div className="notify-content">
        <span className="notify-bell">🔔</span>
        <span className="notify-label">Get daily reminders</span>
      </div>
      <div className="notify-form">
        <input
          ref={inputRef}
          id="notify-email-input"
          type="email"
          className="notify-input"
          placeholder="your@email.com"
          value={emailInput}
          onChange={(e) => {
            setEmailInput(e.target.value);
            if (status === 'error') { setStatus('idle'); setErrorMsg(''); }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          disabled={status === 'submitting'}
        />
        <button
          className="btn-notify"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? '...' : 'Notify Me'}
        </button>
      </div>
      {errorMsg && <div className="notify-error">{errorMsg}</div>}
    </div>
  );
});

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
 * MatchSummaryCard - Shows full match details after game completion
 * Team names, scores, result, MOTM, and cricinfo link
 */
function MatchSummaryCard({ resolvedScorecard, playerName, targetPlayerTeam, targetPlayerRole, cricinfoUrl }) {
  if (!resolvedScorecard) return null;

  return (
    <div className="reveal-match-card">
      <div className="reveal-match-label">🏏 Match Summary</div>
      <div className="reveal-scores">
        <div className="reveal-team-line">
          <span className="reveal-team-name">{resolvedScorecard.team1Name}</span>
          <span className="reveal-team-score">{resolvedScorecard.team1Score}</span>
        </div>
        <div className="reveal-vs">vs</div>
        <div className="reveal-team-line">
          <span className="reveal-team-name">{resolvedScorecard.team2Name}</span>
          <span className="reveal-team-score">{resolvedScorecard.team2Score}</span>
        </div>
      </div>
      <div className="reveal-result">{resolvedScorecard.result}</div>
      <div className="reveal-venue">📍 {resolvedScorecard.venue}</div>
      {playerName && (
        <div className="reveal-motm" style={{ marginTop: '0.75rem' }}>
          <div className="reveal-motm-label">⭐ Man of the Match</div>
          <div className="reveal-motm-name">{playerName}</div>
          {targetPlayerTeam && (
            <div className="reveal-motm-detail">
              {targetPlayerTeam}{targetPlayerRole ? ` • ${targetPlayerRole}` : ''}
            </div>
          )}
        </div>
      )}
      {cricinfoUrl && (
        <a
          href={cricinfoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="reveal-scorecard-link"
          style={{ marginTop: '0.5rem' }}
        >
          🔗 View Full Scorecard ↗
        </a>
      )}
    </div>
  );
}

/**
 * CompletedStateBanner - Complete redesigned home screen for completed state
 * Combines all sections: Result, Countdown, Leaderboard, Share, Notify, Archive
 */
/**
 * AuthPromptSection - Post-game auth prompt (replaces EmailNotifySection for logged-out users)
 * Shows "Sign in to save your progress" with Google button, or "Signed in" badge
 */
function AuthPromptSection({ isAuthenticated, userName, onSignInClick, onEmailSubscribe, isSubscribed }) {
  if (isAuthenticated) {
    return (
      <div className="auth-signed-in-badge">
        <span>✓</span>
        <span>Signed in as {userName}</span>
      </div>
    );
  }

  // Not authenticated — show sign-in prompt with email fallback
  return (
    <div className="auth-prompt-section">
      <p className="auth-prompt-text">Sign in to save your progress across devices</p>
      <button className="auth-prompt-btn" onClick={onSignInClick}>
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Continue with Google</span>
      </button>
      {/* Fallback to email notify for users who skip auth */}
      <EmailNotifySection onEmailSubscribe={onEmailSubscribe} isSubscribed={isSubscribed} />
    </div>
  );
}

export function CompletedStateBanner({
  won,
  guessesUsed,
  maxGuesses = 5,
  streak = 0,
  playerName,
  displayName,
  hasSubmitted,
  onEmailSubscribe,
  isSubscribed,
  onShareX,
  onShareWhatsApp,
  onCopy,
  copyState,
  leaderboardEntries = [],
  userRanking,
  onViewLeaderboard,
  onOpenArchive,
  matchHighlight = null,
  // Match summary props
  resolvedScorecard,
  targetPlayerTeam,
  targetPlayerRole,
  cricinfoUrl,
  // Email persistence props
  email,
  onLinkEmail,
  onSkipEmail,
  isLinkingEmail,
  showEmailPrompt,
  // Auth props
  isAuthenticated,
  userName,
  onSignInClick
}) {
  return (
    <div className="completed-home-redesign">
      {/* Result Banner */}
      <ResultBanner
        won={won}
        guessesUsed={guessesUsed}
        maxGuesses={maxGuesses}
        streak={streak}
        playerName={!won ? playerName : undefined}
      />

      {/* Match Summary Card - replaces nostalgia for rich reveal */}
      {resolvedScorecard ? (
        <MatchSummaryCard
          resolvedScorecard={resolvedScorecard}
          playerName={playerName}
          targetPlayerTeam={targetPlayerTeam}
          targetPlayerRole={targetPlayerRole}
          cricinfoUrl={cricinfoUrl}
        />
      ) : matchHighlight ? (
        <NostalgiaCard
          matchContext={matchHighlight.matchContext}
          triviaFact={matchHighlight.triviaFact}
          playerHighlight={matchHighlight.playerHighlight}
        />
      ) : null}

      {/* Prominent Countdown */}
      <ProminentCountdown />

      {/* Leaderboard Preview - WIN only and if has submitted */}
      {won && hasSubmitted && (
        <LeaderboardPreviewInline
          entries={leaderboardEntries}
          userRanking={userRanking}
          displayName={displayName}
          onViewFull={onViewLeaderboard}
          maxGuesses={maxGuesses}
        />
      )}

      {/* Share Section */}
      <ShareButtons
        onShareX={onShareX}
        onShareWhatsApp={onShareWhatsApp}
        onCopy={onCopy}
        copyState={copyState}
      />

      {/* Auth Prompt (replaces EmailNotifySection) */}
      <AuthPromptSection
        isAuthenticated={isAuthenticated}
        userName={userName}
        onSignInClick={onSignInClick}
        onEmailSubscribe={onEmailSubscribe}
        isSubscribed={isSubscribed}
      />

      {/* Archive Button */}
      {onOpenArchive && (
        <ArchiveButton onClick={onOpenArchive} />
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
  maxGuesses = 5,
  onSubmit,
  isSubmitting = false,
  onViewFull,
  // Email persistence props
  email,
  onLinkEmail,
  onSkipEmail,
  isLinkingEmail,
  showEmailPrompt
}) {
  const [name, setName] = React.useState(displayName);
  const [emailInput, setEmailInput] = React.useState(email || '');
  const [submitError, setSubmitError] = React.useState('');

  // Update name when displayName changes
  React.useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const handleSubmitWithEmail = async () => {
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
      await onSubmit(trimmedName);
    }
    // Link email if provided
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (trimmedEmail && onLinkEmail) {
      try { await onLinkEmail(trimmedEmail); } catch (e) { /* non-blocking */ }
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
            <input
              type="email"
              className="live-submit-input live-submit-email"
              placeholder="Email (optional)"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              className="live-submit-btn"
              onClick={handleSubmitWithEmail}
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
              <span className="live-entry-result">{entry.guesses_used}/{maxGuesses}</span>
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
  onEmailSubscribe,
  isSubscribed,
  onOpenArchive,
  matchHighlight = null,
  playerName,
  children, // Puzzle content (scorecard + feedback) as children
  // Match summary props
  resolvedScorecard,
  targetPlayerTeam,
  targetPlayerRole,
  cricinfoUrl,
  // Email persistence props
  email,
  onLinkEmail,
  onSkipEmail,
  isLinkingEmail,
  showEmailPrompt,
  // Auth props
  isAuthenticated,
  userName,
  onSignInClick
}) {
  const [showPuzzleDetails, setShowPuzzleDetails] = React.useState(false);
  const [name, setName] = React.useState(displayName || '');
  const [emailInput, setEmailInput] = React.useState(email || '');
  const [submitError, setSubmitError] = React.useState('');

  // Update name when displayName changes
  React.useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const handleSubmitWithEmail = async () => {
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
      await onSubmitToLeaderboard(trimmedName);
    }
    // Link email if provided
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (trimmedEmail && onLinkEmail) {
      try { await onLinkEmail(trimmedEmail); } catch (e) { /* non-blocking */ }
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
            {playerName && (
              <div className="result-hero-answer">
                The answer was <strong>{playerName}</strong>
              </div>
            )}
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
            <input
              type="email"
              className="mobile-submit-input mobile-submit-email"
              placeholder="Email (optional)"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              className="mobile-submit-btn"
              onClick={handleSubmitWithEmail}
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
                  <span className="entry-result">{entry.guesses_used}/{maxGuesses}</span>
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

      {/* Match Summary Card or Nostalgia Card */}
      {resolvedScorecard ? (
        <MatchSummaryCard
          resolvedScorecard={resolvedScorecard}
          playerName={playerName}
          targetPlayerTeam={targetPlayerTeam}
          targetPlayerRole={targetPlayerRole}
          cricinfoUrl={cricinfoUrl}
        />
      ) : matchHighlight ? (
        <NostalgiaCard
          matchContext={matchHighlight.matchContext}
          triviaFact={matchHighlight.triviaFact}
          playerHighlight={matchHighlight.playerHighlight}
        />
      ) : null}

      {/* Auth Prompt (replaces Notify Me) */}
      <AuthPromptSection
        isAuthenticated={isAuthenticated}
        userName={userName}
        onSignInClick={onSignInClick}
        onEmailSubscribe={onEmailSubscribe}
        isSubscribed={isSubscribed}
      />

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
export { ProminentCountdown, ShareButtons, LeaderboardPreviewInline, ResultBanner, EmailNotifySection, AuthPromptSection, LiveLeaderboard, NostalgiaCard };

export default CompletedStateBanner;
