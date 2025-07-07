/*
 * CricGuess - Man of the Match Implementation
 * Complete enhanced version with visual squad discovery
 * 
 * VERSION HISTORY & DESIGN DECISIONS:
 * ===========================================
 * 
 * CORE CONCEPT EVOLUTION:
 * - Original: Generic player guessing with text input
 * - v1: Added squad discovery with generic feedback  
 * - v2: Focused on "Man of the Match" concept for cricket nostalgia
 * - v3: Enhanced visual feedback states for better UX
 * 
 * KEY DESIGN DECISIONS MADE:
 * 
 * 1. MAN OF THE MATCH FOCUS:
 *    - Decision: Changed from "guess any player" to "guess Man of the Match"
 *    - Rationale: More cricket nostalgia, clearer objective, authentic cricket context
 *    - Implementation: Golden celebration for correct answer, MOTM-specific messaging
 * 
 * 2. FEEDBACK SYSTEM REFINEMENT:
 *    - Decision: Removed "Team" feedback, kept Batting Order, Runs, Wickets
 *    - Rationale: Team is visible in squads, performance metrics more meaningful
 *    - Implementation: 3-column grid focusing on cricket performance
 * 
 * 3. ATTEMPT LIMIT:
 *    - Decision: 3 tries instead of 5
 *    - Rationale: Increased difficulty, more strategic thinking required
 *    - Implementation: Progress bar reflects 3 attempts max
 * 
 * 4. VISUAL FEEDBACK STATES:
 *    - Decision: Three distinct states (unselected, wrong, correct)
 *    - Rationale: Clear feedback, "super juicy" correct answer celebration
 *    - Implementation: Red for wrong, gold+animations for correct
 * 
 * 5. COMPLETE TEAM LISTS:
 *    - Decision: Show all 11 players, no initial stats
 *    - Rationale: Authentic cricket scorecard feel, clean discovery
 *    - Implementation: Stats only appear when players are guessed
 * 
 * 6. CRICKET NOSTALGIA PRESERVATION:
 *    - Decision: Full broadcast-style scorecard with venue/tournament
 *    - Rationale: Maintains cricket authenticity and emotional connection
 *    - Implementation: Complete match context, proper cricket formatting
 * 
 * DEPLOYMENT: Uses feature flags for easy version switching
 * git checkout squad-discovery-v2 for this enhanced version
 */

import React, { useState, useEffect, useRef } from "react";
import playersData from "./data/players.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

const CricGuess = () => {
  // ============================================================================
  // FEATURE FLAGS - Enhanced for Man of the Match system
  // ============================================================================
  const FEATURES = {
    useSquadDiscovery: true,     // NEW: Visual squad selection (vs old text input)
    useManOfTheMatch: true,      // NEW: Focus on MOTM instead of generic player
    showDebugInfo: true,         // Shows current mode (disable for production)
    maxGuesses: 3,               // CHANGED: From 5 to 3 for increased difficulty
  };

  // ============================================================================
  // PUZZLE CONFIGURATION - Enhanced with MOTM focus
  // ============================================================================
  const PUZZLE_CONFIG = {
    maxGuesses: FEATURES.maxGuesses,
    puzzles: matchPuzzlesData.puzzles || [],
    targetType: FEATURES.useManOfTheMatch ? "man_of_the_match" : "any_player",
  };

  // ============================================================================
  // FEEDBACK SYSTEMS - Refined for cricket performance
  // DESIGN DECISION: Removed "Team" (visible in squads), kept performance metrics
  // ============================================================================

  // ENHANCED: Man of the Match specific feedback system
  const MOTM_FEEDBACK_CONFIG = {
    // REMOVED: team (not relevant when squads are visible)
    // KEPT: batting order, runs, wickets (core cricket performance)
    activeFields: ["battingOrder", "runsInMatch", "wicketsInMatch"],
    compareFields: {
      battingOrder: {
        label: "Batting Order",
        icon: "📝",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue ? "🔽" : guessValue < targetValue ? "🔼" : "✅",
      },
      runsInMatch: {
        label: "Runs in Match", // CLARIFIED: Specific to this match
        icon: "🏃",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue ? "🔽" : guessValue < targetValue ? "🔼" : "✅",
      },
      wicketsInMatch: {
        label: "Wickets in Match", // CLARIFIED: Specific to this match
        icon: "🎳",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue ? "🔽" : guessValue < targetValue ? "🔼" : "✅",
      },
    },
  };

  // ============================================================================
  // GAME STATE MANAGEMENT - Enhanced for MOTM
  // ============================================================================
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameError, setGameError] = useState(null);

  // NEW: Squad-based state management
  const [squadFeedback, setSquadFeedback] = useState([]); // Tracks all guesses with feedback
  const [selectedPlayers, setSelectedPlayers] = useState(new Set()); // Tracks which players were tried

  // Enhanced puzzle getter with error handling
  const getCurrentPuzzle = () => {
    try {
      const puzzle = PUZZLE_CONFIG.puzzles[currentPuzzleIndex];
      if (!puzzle) {
        setGameError("Puzzle not found");
        return null;
      }
      return puzzle;
    } catch (error) {
      setGameError(`Puzzle error: ${error.message}`);
      return null;
    }
  };

  const currentPuzzle = getCurrentPuzzle();

  // Enhanced target player getter - ADAPTED FOR MOTM
  const getTargetPlayer = () => {
    if (!currentPuzzle) return null;
    try {
      // DESIGN DECISION: Support both MOTM-specific and fallback targets
      const targetPlayerKey = FEATURES.useManOfTheMatch 
        ? currentPuzzle.manOfTheMatch || currentPuzzle.targetPlayer
        : currentPuzzle.targetPlayer;

      const targetPlayer = playersData[targetPlayerKey];
      if (!targetPlayer) {
        console.error(`Target player not found: ${targetPlayerKey}`);
        return { key: targetPlayerKey, fullName: "Unknown Player" };
      }
      return { ...targetPlayer, key: targetPlayerKey };
    } catch (error) {
      console.error(`Error getting target player:`, error);
      return null;
    }
  };

  // ============================================================================
  // SQUAD DISCOVERY FUNCTIONS - Enhanced for cricket authenticity
  // ============================================================================

  /**
   * Get organized squad data with cricket-authentic formatting
   * DESIGN DECISION: Full 11-player squads with roles, no initial stats
   */
  const getSquadPlayers = () => {
    if (!currentPuzzle?.matchData?.playerPerformances) return { team1: [], team2: [] };

    try {
      const performances = currentPuzzle.matchData.playerPerformances;
      const team1Players = [];
      const team2Players = [];

      Object.entries(performances).forEach(([playerKey, perf]) => {
        const player = playersData[playerKey];
        if (player && perf.played_in_match) {
          const playerData = {
            key: playerKey,
            name: player.fullName,
            team: perf.team,
            runs: perf.runs_in_match || 0,
            wickets: perf.wickets_in_match || 0,
            ballsFaced: perf.balls_faced || 0,
            ballsBowled: perf.balls_bowled || 0,
            boundaries: perf.boundaries || { fours: 0, sixes: 0 },
            role: player.role || "Player",
            battingOrder: getBattingOrder(playerKey, performances),
            isCaptain: player.fullName.includes("(c)") || perf.is_captain,
            isWicketkeeper: player.role === "Wicket-keeper" || player.fullName.includes("(wk)"),
          };

          // DESIGN DECISION: Organize by actual teams from match data
          if (perf.team === currentPuzzle.matchData.scorecard.teams[0]) {
            team1Players.push(playerData);
          } else {
            team2Players.push(playerData);
          }
        }
      });

      // DESIGN DECISION: Sort by batting order for realistic cricket presentation
      team1Players.sort((a, b) => a.battingOrder - b.battingOrder);
      team2Players.sort((a, b) => a.battingOrder - b.battingOrder);

      return { 
        team1: team1Players, 
        team2: team2Players,
        team1Name: currentPuzzle.matchData.scorecard.teams[0],
        team2Name: currentPuzzle.matchData.scorecard.teams[1]
      };
    } catch (error) {
      console.error("Error getting squad players:", error);
      return { team1: [], team2: [] };
    }
  };

  /**
   * Calculate batting order using cricket logic
   * DESIGN DECISION: Use balls faced + runs to estimate batting position
   */
  const getBattingOrder = (playerKey, performances) => {
    const perf = performances[playerKey];
    if (!perf) return 11;

    const ballsFaced = perf.balls_faced || 0;
    const runs = perf.runs_in_match || 0;

    // Cricket heuristic: More balls faced + runs = higher batting order
    if (ballsFaced > 30) return Math.min(Math.floor(runs / 15) + 1, 6); // Top order (1-6)
    if (ballsFaced > 10) return 6 + Math.floor(ballsFaced / 8); // Middle order (6-8)
    if (ballsFaced > 0) return 8 + Math.floor(ballsFaced / 3); // Lower order (8-10)
    return 9 + Math.min(perf.wickets_in_match || 0, 2); // Bowlers (9-11)
  };

  /**
   * Generate MOTM-specific feedback
   * DESIGN DECISION: Focus on performance metrics relevant to MOTM selection
   */
  const generateMOTMFeedback = (guessPlayerKey, targetPlayerKey) => {
    try {
      const performances = currentPuzzle.matchData.playerPerformances;
      const guessPerf = performances[guessPlayerKey];
      const targetPerf = performances[targetPlayerKey];

      if (!guessPerf || !targetPerf) {
        console.error("Performance data not found for feedback generation");
        return null;
      }

      const feedback = {};

      MOTM_FEEDBACK_CONFIG.activeFields.forEach((field) => {
        const fieldConfig = MOTM_FEEDBACK_CONFIG.compareFields[field];
        if (!fieldConfig) return;

        if (field === "battingOrder") {
          const guessBattingOrder = getBattingOrder(guessPlayerKey, performances);
          const targetBattingOrder = getBattingOrder(targetPlayerKey, performances);
          feedback[field] = {
            comparison: fieldConfig.compare(guessBattingOrder, targetBattingOrder),
            value: guessBattingOrder,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "runsInMatch") {
          const guessRuns = guessPerf.runs_in_match || 0;
          const targetRuns = targetPerf.runs_in_match || 0;
          feedback[field] = {
            comparison: fieldConfig.compare(guessRuns, targetRuns),
            value: guessRuns,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "wicketsInMatch") {
          const guessWickets = guessPerf.wickets_in_match || 0;
          const targetWickets = targetPerf.wickets_in_match || 0;
          feedback[field] = {
            comparison: fieldConfig.compare(guessWickets, targetWickets),
            value: guessWickets,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        }
      });

      return feedback;
    } catch (error) {
      console.error("Error generating MOTM feedback:", error);
      return null;
    }
  };

  /**
   * Handle player selection with enhanced feedback
   * DESIGN DECISION: Immediate visual feedback + stats revelation
   */
  const handlePlayerSelect = (playerKey) => {
    if (!currentPuzzle) return;

    const targetPlayer = getTargetPlayer();
    if (!targetPlayer) return;

    // DESIGN DECISION: Prevent duplicate selections
    if (selectedPlayers.has(playerKey)) {
      return; // Silent return - visual state already shows it's selected
    }

    const feedback = generateMOTMFeedback(playerKey, targetPlayer.key);
    const guessPlayer = playersData[playerKey];

    if (!feedback || !guessPlayer) {
      setGameError("Error processing guess!");
      return;
    }

    // DESIGN DECISION: Track both feedback history and selected players separately
    const newFeedback = {
      guessPlayer: playerKey,
      guessPlayerName: guessPlayer.fullName,
      feedback: feedback,
      isCorrect: playerKey === targetPlayer.key,
    };

    const newSquadFeedback = [...squadFeedback, newFeedback];
    const newSelectedPlayers = new Set([...selectedPlayers, playerKey]);

    setSquadFeedback(newSquadFeedback);
    setSelectedPlayers(newSelectedPlayers);

    // DESIGN DECISION: Check win/lose conditions after state update
    if (playerKey === targetPlayer.key) {
      setGameWon(true);
      setGameOver(true);
    } else if (newSquadFeedback.length >= PUZZLE_CONFIG.maxGuesses) {
      setGameOver(true);
    }
  };

  /**
   * Get player selection state for visual feedback
   * DESIGN DECISION: Three distinct states for clear UX
   */
  const getPlayerState = (playerKey) => {
    const targetPlayer = getTargetPlayer();

    if (playerKey === targetPlayer?.key && gameWon) {
      return "correct"; // SUPER JUICY: Gold celebration
    }
    if (selectedPlayers.has(playerKey)) {
      return "incorrect"; // Red with X mark
    }
    return "unselected"; // Clean white with hover
  };

  /**
   * Get revealed stats for a player
   * DESIGN DECISION: Only show stats after player is guessed
   */
  const getPlayerStats = (playerKey) => {
    if (!selectedPlayers.has(playerKey)) {
      return "--"; // Placeholder for unguessed players
    }

    const performances = currentPuzzle.matchData?.playerPerformances;
    const perf = performances?.[playerKey];
    if (!perf) return "--";

    // DESIGN DECISION: Show batting stats primarily, bowling if significant
    const runs = perf.runs_in_match || 0;
    const ballsFaced = perf.balls_faced || 0;
    const wickets = perf.wickets_in_match || 0;
    const boundaries = perf.boundaries || { fours: 0, sixes: 0 };

    let statsString = "";

    if (ballsFaced > 0) {
      statsString = `${runs}${runs === perf.runs_in_match && ballsFaced === runs ? "*" : ""} (${ballsFaced}b`;
      if (boundaries.fours > 0) statsString += `, ${boundaries.fours}×4`;
      if (boundaries.sixes > 0) statsString += `, ${boundaries.sixes}×6`;
      statsString += ")";
    } else if (runs > 0) {
      statsString = `${runs}*`;
    }

    if (wickets > 0) {
      if (statsString) statsString += ", ";
      statsString += `${wickets}w`;
    }

    return statsString || "0";
  };

  // ============================================================================
  // GAME PROGRESSION FUNCTIONS - Enhanced error handling
  // ============================================================================

  const nextPuzzle = () => {
    try {
      if (currentPuzzleIndex < PUZZLE_CONFIG.puzzles.length - 1) {
        setCurrentPuzzleIndex(currentPuzzleIndex + 1);
        resetPuzzleState();
        setGameError(null);
      }
    } catch (error) {
      setGameError(`Error moving to next puzzle: ${error.message}`);
    }
  };

  const resetPuzzleState = () => {
    setSquadFeedback([]);
    setSelectedPlayers(new Set());
    setGameWon(false);
    setGameOver(false);
    setGameError(null);
  };

  // ============================================================================
  // RENDER FUNCTIONS - Enhanced with MOTM focus
  // ============================================================================

  /**
   * Render cricket scorecard with full broadcast styling
   * DESIGN DECISION: Complete cricket context for nostalgia
   */
  const renderScorecard = () => {
    if (!currentPuzzle?.matchData?.scorecard) return null;

    const scorecard = currentPuzzle.matchData.scorecard;

    return (
      <div className="scorecard">
        <div className="match-header">
          {scorecard.tournament || "Cricket Match"} • {scorecard.stage || ""}
        </div>
        <div className="match-title">
          {scorecard.teams?.[0]} vs {scorecard.teams?.[1]}
        </div>

        <div className="score-line">
          <span className="team-name">
            🏏 {scorecard.teams?.[0]}
          </span>
          <span className="score">
            {scorecard.team_scores?.[scorecard.teams[0]]?.runs || 0}/
            {scorecard.team_scores?.[scorecard.teams[0]]?.wickets || 0} 
            ({scorecard.team_scores?.[scorecard.teams[0]]?.overs || "50.0"} ov)
          </span>
        </div>

        <div className="score-line">
          <span className="team-name">
            🏏 {scorecard.teams?.[1]}
          </span>
          <span className="score">
            {scorecard.team_scores?.[scorecard.teams[1]]?.runs || 0}/
            {scorecard.team_scores?.[scorecard.teams[1]]?.wickets || 0} 
            ({scorecard.team_scores?.[scorecard.teams[1]]?.overs || "50.0"} ov)
          </span>
        </div>

        <div className="match-result">
          {scorecard.result || `${scorecard.winner} won`}
        </div>

        <div className="venue-info">
          {scorecard.venue || "Cricket Ground"} • {scorecard.date || "Match Day"}
        </div>
      </div>
    );
  };

  /**
   * Render squad with enhanced visual states
   * DESIGN DECISION: Three distinct visual states for clear feedback
   */
  const renderSquadDiscovery = () => {
    const { team1, team2, team1Name, team2Name } = getSquadPlayers();
    const guessesUsed = squadFeedback.length;

    if (team1.length === 0 && team2.length === 0) {
      return (
        <div className="squad-discovery-error">
          <div className="text-red-600 text-sm">
            Squad data not available for this match
          </div>
        </div>
      );
    }

    return (
      <div className="squad-discovery">
        <div className="discovery-header">
          <h3 className="text-lg font-bold mb-2">
            🏆 Select the Man of the Match from the Playing XIs
          </h3>
          <div className="text-sm text-gray-600 mb-4">
            Guess {guessesUsed + 1} of {PUZZLE_CONFIG.maxGuesses} • 
            Any player can be MOTM - batsmen, bowlers, all-rounders, wicket-keepers!
          </div>
        </div>

        <div className="squads-container">
          {/* Team 1 Squad */}
          <div className="team-squad">
            <div className="squad-header">🏏 {team1Name} Playing XI</div>
            <div className="player-list">
              {team1.map((player) => {
                const playerState = getPlayerState(player.key);
                const stats = getPlayerStats(player.key);

                return (
                  <div
                    key={player.key}
                    className={`player-item ${playerState === 'correct' ? 'correct' : ''} ${playerState === 'incorrect' ? 'guessed' : ''}`}
                    onClick={() => !gameOver && playerState === 'unselected' && handlePlayerSelect(player.key)}
                    style={{ 
                      cursor: gameOver || playerState !== 'unselected' ? 'not-allowed' : 'pointer',
                      // DESIGN DECISION: Extra spacing for MOTM celebration banner
                      marginTop: playerState === 'correct' ? '25px' : '0',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div className="player-name">
                        {player.name}
                        {player.isCaptain && <span className="captain-badge">C</span>}
                        {player.isWicketkeeper && <span className="wicketkeeper-badge">WK</span>}
                      </div>
                      <div className="player-role">{player.role}</div>
                    </div>
                    <div className={`stats-${stats === '--' ? 'placeholder' : 'filled'}`}>
                      {stats}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team 2 Squad */}
          <div className="team-squad">
            <div className="squad-header">🏏 {team2Name} Playing XI</div>
            <div className="player-list">
              {team2.map((player) => {
                const playerState = getPlayerState(player.key);
                const stats = getPlayerStats(player.key);

                return (
                  <div
                    key={player.key}
                    className={`player-item ${playerState === 'correct' ? 'correct' : ''} ${playerState === 'incorrect' ? 'guessed' : ''}`}
                    onClick={() => !gameOver && playerState === 'unselected' && handlePlayerSelect(player.key)}
                    style={{ 
                      cursor: gameOver || playerState !== 'unselected' ? 'not-allowed' : 'pointer',
                      marginTop: playerState === 'correct' ? '25px' : '0',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div className="player-name">
                        {player.name}
                        {player.isCaptain && <span className="captain-badge">C</span>}
                        {player.isWicketkeeper && <span className="wicketkeeper-badge">WK</span>}
                      </div>
                      <div className="player-role">{player.role}</div>
                    </div>
                    <div className={`stats-${stats === '--' ? 'placeholder' : 'filled'}`}>
                      {stats}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render feedback history with MOTM context
   * DESIGN DECISION: Show progression of clues toward MOTM
   */
  const renderFeedbackHistory = () => {
    if (squadFeedback.length === 0) return null;

    return (
      <div className="feedback-section">
        <div className="feedback-header">
          🧩 Your Guesses ({squadFeedback.length}/{PUZZLE_CONFIG.maxGuesses})
        </div>

        {squadFeedback.map((feedback, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              #{index + 1} {feedback.guessPlayerName} 
              {feedback.isCorrect && <span style={{ color: '#16a34a' }}> ✅ MOTM!</span>}
            </div>

            <div className="clue-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {MOTM_FEEDBACK_CONFIG.activeFields.map((field) => {
                const fb = feedback.feedback[field];
                if (!fb) return null;

                return (
                  <div key={field} className="clue-box">
                    <div className="clue-icon">{fb.icon}</div>
                    <div className="clue-label">{fb.label}</div>
                    <div className="clue-value">
                      {fb.comparison}
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                        ({fb.value})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="clue-legend">
          🔼 = Man of the Match had more | 🔽 = Man of the Match had less | ✅ = Same amount<br>
          <strong>Remember:</strong> Any player can be Man of the Match - batsmen, bowlers, all-rounders, even wicket-keepers!
        </div>
      </div>
    );
  };

  /**
   * Render game status with MOTM celebration
   * DESIGN DECISION: Enhanced messaging for MOTM context
   */
  const renderGameStatus = () => {
    const targetPlayer = getTargetPlayer();
    const targetPlayerName = targetPlayer?.fullName || "Unknown Player";

    if (gameError) {
      return (
        <div className="status-error">
          <div className="text-red-800 font-bold text-xl">⚠️ Game Error</div>
          <div className="text-sm mt-2">{gameError}</div>
          <div className="mt-4">
            <button onClick={resetPuzzleState} className="btn btn-blue">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (gameWon) {
      return (
        <div className="status-win">
          <div className="text-green-800 font-bold text-xl">🏆 Brilliant!</div>
          <div className="text-sm mt-2">
            You found the Man of the Match <strong>{targetPlayerName}</strong> in{" "}
            {squadFeedback.length} {squadFeedback.length === 1 ? 'try' : 'tries'}!
          </div>
          {currentPuzzle?.trivia && (
            <div className="mt-3 p-3 bg-green-50 rounded text-sm text-left">
              <strong>Cricket Trivia:</strong> {currentPuzzle.trivia}
            </div>
          )}
          <div className="mt-4 space-x-3">
            <button onClick={resetPuzzleState} className="btn btn-blue">
              Try Again
            </button>
            {currentPuzzleIndex < PUZZLE_CONFIG.puzzles.length - 1 && (
              <button onClick={nextPuzzle} className="btn btn-green">
                Next Puzzle →
              </button>
            )}
          </div>
        </div>
      );
    }

    if (gameOver && !gameWon) {
      return (
        <div className="status-lose">
          <div className="text-red-800 font-bold text-xl">🎯 Close One!</div>
          <div className="text-sm mt-2">
            The Man of the Match was: <strong>{targetPlayerName}</strong>
          </div>
          {currentPuzzle?.trivia && (
            <div className="mt-3 p-3 bg-red-50 rounded text-sm text-left">
              <strong>Cricket Trivia:</strong> {currentPuzzle.trivia}
            </div>
          )}
          <div className="mt-4 space-x-3">
            <button onClick={resetPuzzleState} className="btn btn-blue">
              Try Again
            </button>
            {currentPuzzleIndex < PUZZLE_CONFIG.puzzles.length - 1 && (
              <button onClick={nextPuzzle} className="btn btn-orange">
                Next Puzzle →
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================================================
  // MAIN RENDER - Complete MOTM game interface
  // ============================================================================

  if (!currentPuzzle) {
    return (
      <div className="page-background">
        <div className="game-container">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-4">🏏 CricGuess</h1>
            <div className="text-red-600 mb-4">
              {gameError || "No puzzles available. Please check match_puzzles.json"}
            </div>
            <button onClick={() => window.location.reload()} className="btn btn-blue">
              Reload Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      {/* How to Play Popup - ENHANCED for MOTM */}
      {showHowToPlay && (
        <div className="popup-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowHowToPlay(false)}>×</button>
            <h2 className="popup-title">How To Play</h2>
            <p className="popup-subtitle">
              Guess the Man of the Match from the cricket scorecard in {PUZZLE_CONFIG.maxGuesses} tries.
            </p>
            <div className="popup-rules">
              <ul>
                <li>🏆 Look at the match scorecard and team squads</li>
                <li>🎯 Select players from either team to get performance clues</li>
                <li>📊 Use batting order, runs, and wickets clues to narrow down the MOTM</li>
                <li>🔼 = MOTM had more | 🔽 = MOTM had less | ✅ = Same amount</li>
                <li>⚡ Any player can be MOTM - batsmen, bowlers, all-rounders, wicket-keepers!</li>
                <li>🎪 Find the MOTM in {PUZZLE_CONFIG.maxGuesses} tries for maximum points!</li>
              </ul>
            </div>
            <div className="popup-footer">
              <p>Experience the nostalgia of cricket's greatest moments! 🏏</p>
            </div>
          </div>
        </div>
      )}

      <div className="game-container">
        {/* Header */}
        <div className="header-section">
          <h1 className="text-3xl font-bold text-center text-blue-600">🏏 CricGuess</h1>
          <button className="how-to-play-btn" onClick={() => setShowHowToPlay(true)}>
            How to Play
          </button>
        </div>

        {/* Debug Info - ENHANCED for MOTM mode */}
        {FEATURES.showDebugInfo && (
          <div className="debug-info">
            <div className="text-xs text-gray-500 text-center mb-2">
              🔧 Mode: {FEATURES.useManOfTheMatch ? "Man of the Match" : "Any Player"} | 
              Puzzle {currentPuzzleIndex + 1}/{PUZZLE_CONFIG.puzzles.length} | 
              Max Guesses: {PUZZLE_CONFIG.maxGuesses}
            </div>
          </div>
        )}

        {/* Puzzle Header with MOTM Focus */}
        <div className="text-center mb-4">
          <div className="puzzle-hint">🏆 Guess the Man of the Match!</div>
          <div className="text-sm text-gray-600">
            Puzzle {currentPuzzleIndex + 1} of {PUZZLE_CONFIG.puzzles.length}
          </div>
          {!gameOver && (
            <div className="guess-counter">
              Guess {squadFeedback.length + 1} of {PUZZLE_CONFIG.maxGuesses}
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(squadFeedback.length / PUZZLE_CONFIG.maxGuesses) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Cricket Scorecard - Full broadcast style */}
        {renderScorecard()}

        {/* Game Status */}
        {renderGameStatus()}

        {/* Squad Discovery Interface */}
        {!gameOver && renderSquadDiscovery()}

        {/* Feedback History */}
        {renderFeedbackHistory()}

        {/* Footer with version info */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <div>Players in database: {Object.keys(playersData).length}</div>
          <div>Match puzzles: {PUZZLE_CONFIG.puzzles.length}</div>
          <div className="mt-1">🏏 Built for cricket lovers</div>
          <div className="mt-1 text-xs">
            Version: Man of the Match Discovery v3.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default CricGuess;