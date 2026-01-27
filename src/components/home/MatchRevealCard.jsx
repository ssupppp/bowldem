/**
 * MatchRevealCard Component
 * Rich match reveal display shown when player wins
 * Reveals full match details including actual team names, scores, and trivia
 */

import React from 'react';

/**
 * MatchRevealCard - Displays complete match information on win
 * @param {Object} scorecard - Match scorecard data (venue, team1Score, team2Score, result, team1Name, team2Name)
 * @param {string} matchContext - Match context (e.g., "T20 World Cup 2016 Final")
 * @param {string} triviaFact - Fun fact about the match
 * @param {string} playerHighlight - MVP's performance highlight
 * @param {string} targetPlayerTeam - The winning player's team name
 * @param {string} mvpName - Name of the Man of the Match
 * @param {string} cricinfoUrl - Optional ESPN Cricinfo URL for full scorecard
 */
export function MatchRevealCard({
  scorecard = {},
  matchContext,
  triviaFact,
  playerHighlight,
  targetPlayerTeam,
  mvpName,
  cricinfoUrl
}) {
  const { venue, team1Score, team2Score, result, team1Name, team2Name } = scorecard;

  // Determine display team names - use actual names if available
  const displayTeam1 = team1Name || 'Team 1';
  const displayTeam2 = team2Name || 'Team 2';

  return (
    <div className="match-reveal-card">
      {/* Match Context Header */}
      {matchContext && (
        <div className="match-reveal-header">
          <span className="match-reveal-badge">THE MATCH</span>
          <h3 className="match-reveal-context">{matchContext}</h3>
        </div>
      )}

      {/* Venue */}
      {venue && (
        <div className="match-reveal-venue">
          <span className="venue-icon-reveal">🏟️</span>
          <span className="venue-text-reveal">{venue}</span>
        </div>
      )}

      {/* Scorecard with actual team names */}
      {team1Score && team2Score && (
        <div className="match-reveal-scores">
          <div className="reveal-team">
            <span className="reveal-team-name">{displayTeam1}</span>
            <span className="reveal-team-score">{team1Score}</span>
          </div>
          <div className="reveal-vs">vs</div>
          <div className="reveal-team">
            <span className="reveal-team-name">{displayTeam2}</span>
            <span className="reveal-team-score">{team2Score}</span>
          </div>
        </div>
      )}

      {/* Match Result */}
      {result && (
        <div className="match-reveal-result">
          {result}
        </div>
      )}

      {/* MVP Highlight */}
      {mvpName && (
        <div className="match-reveal-mvp">
          <span className="mvp-trophy">🏆</span>
          <div className="mvp-details">
            <span className="mvp-label">Man of the Match</span>
            <span className="mvp-name">{mvpName}</span>
            {targetPlayerTeam && (
              <span className="mvp-team">({targetPlayerTeam})</span>
            )}
          </div>
        </div>
      )}

      {/* Trivia Fact */}
      {triviaFact && (
        <div className="match-reveal-trivia">
          <span className="trivia-icon">💡</span>
          <span className="trivia-text">{triviaFact}</span>
        </div>
      )}

      {/* Player Performance Highlight */}
      {playerHighlight && (
        <div className="match-reveal-highlight">
          <span className="highlight-icon">⭐</span>
          <span className="highlight-text">{playerHighlight}</span>
        </div>
      )}

      {/* Cricinfo Link */}
      {cricinfoUrl && (
        <a
          href={cricinfoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="match-reveal-cricinfo-link"
        >
          <span className="cricinfo-icon">📊</span>
          <span className="cricinfo-text">View Full Scorecard on ESPN Cricinfo</span>
          <span className="cricinfo-arrow">→</span>
        </a>
      )}
    </div>
  );
}

export default MatchRevealCard;
