import React, { useState, useEffect, useRef } from "react";
import playersData from "./data/players.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

const CricGuess = () => {
  // ============================================================================
  // FEATURE FLAGS - Toggle between discovery systems
  // ============================================================================
  const FEATURES = {
    useSquadDiscovery: true,  // Set to false for current system
    showDebugInfo: true,      // Set to false for production
  };

  // ============================================================================
  // PART 1: PUZZLE SYSTEM - Enhanced with better error handling
  // ============================================================================

  const PUZZLE_CONFIG = {
    maxGuesses: 5,
    puzzles: matchPuzzlesData.puzzles || [],
  };

  // ============================================================================
  // PART 2: FEEDBACK SYSTEMS - Both Current + Squad Discovery
  // ============================================================================

  // Current feedback system (unchanged)
  const FEEDBACK_CONFIG = {
    activeFields: ["country", "playedInMatch", "runsInMatch", "wicketsInMatch"],
    compareFields: {
      country: {
        label: "Country",
        icon: "🌍",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "🎯" : "❌",
      },
      playedInMatch: {
        label: "Played in Match",
        icon: "🏟️",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "🎯" : "❌",
      },
      runsInMatch: {
        label: "Runs in Match",
        icon: "🏃",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "⬇️"
            : guessValue < targetValue
              ? "⬆️"
              : "🎯",
      },
      wicketsInMatch: {
        label: "Wickets in Match",
        icon: "🎳",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "⬇️"
            : guessValue < targetValue
              ? "⬆️"
              : "🎯",
      },
    },
  };

  // NEW: Squad Discovery feedback system
  const SQUAD_FEEDBACK_CONFIG = {
    activeFields: ["team", "battingOrder", "runsScored", "role"],
    compareFields: {
      team: {
        label: "Team",
        icon: "👥",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "✅" : "❌",
      },
      battingOrder: {
        label: "Batting Order",
        icon: "📝",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "🔽"
            : guessValue < targetValue
              ? "🔼"
              : "✅",
      },
      runsScored: {
        label: "Runs Scored",
        icon: "🏃",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "🔽"
            : guessValue < targetValue
              ? "🔼"
              : "✅",
      },
      role: {
        label: "Role",
        icon: "🎭",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "✅" : "❌",
      },
    },
  };

  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameError, setGameError] = useState(null); // NEW: Error handling

  // Autocomplete state (for current system)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // NEW: Squad discovery state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [squadFeedback, setSquadFeedback] = useState([]);

  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

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

  // Enhanced target player getter with error handling
  const getTargetPlayer = () => {
    if (!currentPuzzle) return null;
    try {
      const targetPlayerKey = currentPuzzle.targetPlayer;
      const targetPlayer = playersData[targetPlayerKey];
      if (!targetPlayer) {
        console.error(`Target player not found: ${targetPlayerKey}`);
        return null;
      }
      return targetPlayer;
    } catch (error) {
      console.error(`Error getting target player:`, error);
      return null;
    }
  };

  // ============================================================================
  // SQUAD DISCOVERY FUNCTIONS
  // ============================================================================

  /**
   * Get squad players for current puzzle
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
            role: player.role || "Player",
            battingOrder: getBattingOrder(playerKey, performances),
          };

          if (perf.team === currentPuzzle.matchData.scorecard.teams[0]) {
            team1Players.push(playerData);
          } else {
            team2Players.push(playerData);
          }
        }
      });

      // Sort by batting order
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
   * Get batting order for a player (simplified logic)
   */
  const getBattingOrder = (playerKey, performances) => {
    const perf = performances[playerKey];
    if (!perf) return 11;

    // Simple heuristic: higher runs/balls faced = higher batting order
    const ballsFaced = perf.balls_faced || 0;
    const runs = perf.runs_in_match || 0;

    if (ballsFaced > 20) return Math.floor(runs / 10) + 1; // Top order
    if (ballsFaced > 0) return 6 + Math.floor(ballsFaced / 5); // Middle order
    return 9 + (perf.wickets_in_match || 0); // Bowlers/tailenders
  };

  /**
   * Generate squad-based feedback
   */
  const generateSquadFeedback = (guessPlayerKey, targetPlayerKey) => {
    try {
      const performances = currentPuzzle.matchData.playerPerformances;
      const guessPerf = performances[guessPlayerKey];
      const targetPerf = performances[targetPlayerKey];
      const guessPlayer = playersData[guessPlayerKey];
      const targetPlayer = playersData[targetPlayerKey];

      if (!guessPerf || !targetPerf || !guessPlayer || !targetPlayer) {
        return null;
      }

      const feedback = {};

      SQUAD_FEEDBACK_CONFIG.activeFields.forEach((field) => {
        const fieldConfig = SQUAD_FEEDBACK_CONFIG.compareFields[field];
        if (!fieldConfig) return;

        if (field === "team") {
          feedback[field] = {
            comparison: fieldConfig.compare(guessPerf.team, targetPerf.team),
            value: guessPerf.team,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "battingOrder") {
          const guessBattingOrder = getBattingOrder(guessPlayerKey, performances);
          const targetBattingOrder = getBattingOrder(targetPlayerKey, performances);
          feedback[field] = {
            comparison: fieldConfig.compare(guessBattingOrder, targetBattingOrder),
            value: guessBattingOrder,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "runsScored") {
          const guessRuns = guessPerf.runs_in_match || 0;
          const targetRuns = targetPerf.runs_in_match || 0;
          feedback[field] = {
            comparison: fieldConfig.compare(guessRuns, targetRuns),
            value: guessRuns,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "role") {
          feedback[field] = {
            comparison: fieldConfig.compare(guessPlayer.role, targetPlayer.role),
            value: guessPlayer.role,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        }
      });

      return feedback;
    } catch (error) {
      console.error("Error generating squad feedback:", error);
      return null;
    }
  };

  /**
   * Handle squad player selection
   */
  const handleSquadPlayerSelect = (playerKey) => {
    if (!currentPuzzle) return;

    const targetPlayerKey = currentPuzzle.targetPlayer;

    // Check if already guessed
    if (squadFeedback.some(f => f.guessPlayer === playerKey)) {
      alert("You already tried this player!");
      return;
    }

    const feedback = generateSquadFeedback(playerKey, targetPlayerKey);
    const guessPlayer = playersData[playerKey];

    if (!feedback || !guessPlayer) {
      alert("Error processing guess!");
      return;
    }

    const newFeedback = {
      guessPlayer: playerKey,
      guessPlayerName: guessPlayer.fullName,
      feedback: feedback,
      isCorrect: playerKey === targetPlayerKey,
    };

    const newSquadFeedback = [...squadFeedback, newFeedback];
    setSquadFeedback(newSquadFeedback);

    // Check win/lose conditions
    if (playerKey === targetPlayerKey) {
      setGameWon(true);
      setGameOver(true);
    } else if (newSquadFeedback.length >= PUZZLE_CONFIG.maxGuesses) {
      setGameOver(true);
    }
  };

  // ============================================================================
  // ORIGINAL AUTOCOMPLETE FUNCTIONS (unchanged for current system)
  // ============================================================================

  const searchPlayers = (query) => {
    if (query.length < 3) return [];

    const searchTerm = query.toLowerCase();
    const results = [];

    Object.entries(playersData).forEach(([key, player]) => {
      const fullName = player.fullName.toLowerCase();
      const aliases = player.aliases || [];

      if (fullName.includes(searchTerm) || 
          aliases.some(alias => alias.toLowerCase().includes(searchTerm))) {
        results.push({
          key: key,
          player: player,
          relevance: fullName.startsWith(searchTerm) ? 2 : 1
        });
      }
    });

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCurrentGuess(value);

    if (value.length >= 3) {
      setIsLoadingSuggestions(true);
      setTimeout(() => {
        const results = searchPlayers(value);
        setSuggestions(results);
        setShowSuggestions(true);
        setIsLoadingSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // ============================================================================
  // ENHANCED ERROR HANDLING & PROGRESSION
  // ============================================================================

  /**
   * Enhanced next puzzle function with error handling
   */
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

  /**
   * Enhanced reset with error clearing
   */
  const resetPuzzleState = () => {
    setGuesses([]);
    setSquadFeedback([]);
    setGameWon(false);
    setGameOver(false);
    setCurrentGuess("");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setSelectedPlayer(null);
    setGameError(null);
  };

  /**
   * ENHANCED: Game status with proper error handling and answer reveal
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
          <div className="text-green-800 font-bold text-xl">🎉 Brilliant!</div>
          <div className="text-sm mt-2">
            You found <strong>{targetPlayerName}</strong> in{" "}
            {FEATURES.useSquadDiscovery ? squadFeedback.length : guesses.length} tries!
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
            The answer was: <strong>{targetPlayerName}</strong>
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
  // RENDER FUNCTIONS - Squad Discovery UI
  // ============================================================================

  /**
   * Render squad-based discovery interface
   */
  const renderSquadDiscovery = () => {
    const { team1, team2, team1Name, team2Name } = getSquadPlayers();
    const targetPlayer = getTargetPlayer();
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
          <h3 className="text-lg font-bold mb-2">🎯 Select a Player from the Squads</h3>
          <div className="text-sm text-gray-600 mb-4">
            Guess {guessesUsed + 1} of {PUZZLE_CONFIG.maxGuesses} • Tap a player to get clues!
          </div>
        </div>

        <div className="squads-container">
          {/* Team 1 */}
          <div className="team-squad">
            <h4 className="team-name">{team1Name}</h4>
            <div className="players-grid">
              {team1.map((player) => {
                const isGuessed = squadFeedback.some(f => f.guessPlayer === player.key);
                const isCorrect = player.key === currentPuzzle?.targetPlayer;

                return (
                  <button
                    key={player.key}
                    className={`player-card ${isGuessed ? 'guessed' : ''} ${isCorrect && gameWon ? 'correct' : ''}`}
                    onClick={() => !gameOver && !isGuessed && handleSquadPlayerSelect(player.key)}
                    disabled={gameOver || isGuessed}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-stats">
                      {player.runs}* ({player.wickets}w)
                    </div>
                    <div className="player-role">{player.role}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team 2 */}
          <div className="team-squad">
            <h4 className="team-name">{team2Name}</h4>
            <div className="players-grid">
              {team2.map((player) => {
                const isGuessed = squadFeedback.some(f => f.guessPlayer === player.key);
                const isCorrect = player.key === currentPuzzle?.targetPlayer;

                return (
                  <button
                    key={player.key}
                    className={`player-card ${isGuessed ? 'guessed' : ''} ${isCorrect && gameWon ? 'correct' : ''}`}
                    onClick={() => !gameOver && !isGuessed && handleSquadPlayerSelect(player.key)}
                    disabled={gameOver || isGuessed}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-stats">
                      {player.runs}* ({player.wickets}w)
                    </div>
                    <div className="player-role">{player.role}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render squad feedback history
   */
  const renderSquadFeedbackHistory = () => {
    if (squadFeedback.length === 0) return null;

    return (
      <div className="squad-feedback-history">
        <h4 className="text-md font-bold mb-3">🧩 Your Clues</h4>
        <div className="space-y-3">
          {squadFeedback.map((feedback, index) => (
            <div key={index} className="feedback-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">
                  #{index + 1} {feedback.guessPlayerName}
                </span>
                {feedback.isCorrect && (
                  <span className="text-green-600 text-xl">🎯</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                {SQUAD_FEEDBACK_CONFIG.activeFields.map((field) => {
                  const fb = feedback.feedback[field];
                  if (!fb) return null;

                  return (
                    <div key={field} className="text-center">
                      <div className="text-xs text-gray-600">{fb.label}</div>
                      <div className="font-mono text-sm">
                        <div>{fb.icon}</div>
                        <div>{fb.comparison}</div>
                        <div className="text-xs">{fb.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render squad feedback legend
   */
  const renderSquadFeedbackLegend = () => (
    <div className="squad-feedback-legend">
      <div className="font-semibold mb-2">🔍 How to Read the Clues:</div>
      <div className="space-y-1 text-sm">
        <div>👥 <strong>Team:</strong> ✅ Same team | ❌ Different team</div>
        <div>📝 <strong>Batting Order:</strong> 🔼 Target bats higher | 🔽 Target bats lower | ✅ Same position</div>
        <div>🏃 <strong>Runs:</strong> 🔼 Target scored more | 🔽 Target scored less | ✅ Same runs</div>
        <div>🎭 <strong>Role:</strong> ✅ Same role | ❌ Different role</div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER - Error boundaries and feature switching
  // ============================================================================

  // Error boundary for missing puzzle
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
      {/* How to Play Popup */}
      {showHowToPlay && (
        <div className="popup-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowHowToPlay(false)}>×</button>
            <h2 className="popup-title">How To Play</h2>
            <p className="popup-subtitle">
              Guess the Cricket Player from the match scorecard in {PUZZLE_CONFIG.maxGuesses} tries.
            </p>
            <div className="popup-rules">
              <ul>
                {FEATURES.useSquadDiscovery ? (
                  <>
                    <li>Select players from the squad lists to get clues.</li>
                    <li>Use team, batting order, runs, and role clues to find the target player.</li>
                    <li>✅ means your guess matches the target player's attribute.</li>
                    <li>🔼/🔽 means the target player has higher/lower values.</li>
                    <li>Each selection counts as one guess!</li>
                  </>
                ) : (
                  <>
                    <li>Each guess must be a valid cricket player name.</li>
                    <li>The arrows show how your guess's match performance compares to the target player.</li>
                    <li>The flag shows if your guess is from the same country as the target player.</li>
                    <li>🏟️ Shows if your guess played in this specific match.</li>
                    <li>Use the scorecard clues to deduce who the target player might be!</li>
                  </>
                )}
              </ul>
            </div>
            <div className="popup-footer">
              <p>A new puzzle is released daily at midnight. Good luck! 🏏</p>
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

        {/* Debug Info */}
        {FEATURES.showDebugInfo && (
          <div className="debug-info">
            <div className="text-xs text-gray-500 text-center mb-2">
              🔧 Mode: {FEATURES.useSquadDiscovery ? "Squad Discovery" : "Current System"} | 
              Puzzle {currentPuzzleIndex + 1}/{PUZZLE_CONFIG.puzzles.length}
            </div>
          </div>
        )}

        {/* Puzzle Counter */}
        <div className="text-center mb-4">
          <span className="text-sm text-gray-600">
            Puzzle {currentPuzzleIndex + 1} of {PUZZLE_CONFIG.puzzles.length}
          </span>
          {currentPuzzleIndex < PUZZLE_CONFIG.puzzles.length - 1 && (
            <span className="text-xs text-gray-400 block">
              More puzzles unlocked after solving!
            </span>
          )}
        </div>

        {/* Game Status */}
        {renderGameStatus()}

        {/* Feature-based UI */}
        {!gameOver && FEATURES.useSquadDiscovery ? (
          <>
            {/* Squad Discovery Interface */}
            {renderSquadDiscovery()}
            {renderSquadFeedbackLegend()}
            {renderSquadFeedbackHistory()}
          </>
        ) : !gameOver ? (
          <>
            {/* Original Input Interface */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">
                Guess {guesses.length + 1} of {PUZZLE_CONFIG.maxGuesses}
              </div>
              <div className="autocomplete-container" style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentGuess}
                  onChange={handleInputChange}
                  placeholder="Type player name (e.g., Kohli, Dhoni, Gayle)..."
                  className="game-input"
                  autoComplete="off"
                />
              </div>
              <button onClick={() => {}} className="btn btn-green w-full mt-3">
                Submit Guess
              </button>
            </div>
          </>
        ) : null}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <div>Players in database: {Object.keys(playersData).length}</div>
          <div>Match puzzles: {PUZZLE_CONFIG.puzzles.length}</div>
          <div className="mt-1">🏏 Built for cricket lovers</div>
        </div>
      </div>
    </div>
  );
};

export default CricGuess;import React, { useState, useEffect, useRef } from "react";
import playersData from "./data/players.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

const CricGuess = () => {
  // ============================================================================
  // FEATURE FLAGS - Toggle between discovery systems
  // ============================================================================
  const FEATURES = {
    useSquadDiscovery: true,  // Set to false for current system
    showDebugInfo: true,      // Set to false for production
  };

  // ============================================================================
  // PART 1: PUZZLE SYSTEM - Enhanced with better error handling
  // ============================================================================

  const PUZZLE_CONFIG = {
    maxGuesses: 5,
    puzzles: matchPuzzlesData.puzzles || [],
  };

  // ============================================================================
  // PART 2: FEEDBACK SYSTEMS - Both Current + Squad Discovery
  // ============================================================================

  // Current feedback system (unchanged)
  const FEEDBACK_CONFIG = {
    activeFields: ["country", "playedInMatch", "runsInMatch", "wicketsInMatch"],
    compareFields: {
      country: {
        label: "Country",
        icon: "🌍",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "🎯" : "❌",
      },
      playedInMatch: {
        label: "Played in Match",
        icon: "🏟️",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "🎯" : "❌",
      },
      runsInMatch: {
        label: "Runs in Match",
        icon: "🏃",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "⬇️"
            : guessValue < targetValue
              ? "⬆️"
              : "🎯",
      },
      wicketsInMatch: {
        label: "Wickets in Match",
        icon: "🎳",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "⬇️"
            : guessValue < targetValue
              ? "⬆️"
              : "🎯",
      },
    },
  };

  // NEW: Squad Discovery feedback system
  const SQUAD_FEEDBACK_CONFIG = {
    activeFields: ["team", "battingOrder", "runsScored", "role"],
    compareFields: {
      team: {
        label: "Team",
        icon: "👥",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "✅" : "❌",
      },
      battingOrder: {
        label: "Batting Order",
        icon: "📝",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "🔽"
            : guessValue < targetValue
              ? "🔼"
              : "✅",
      },
      runsScored: {
        label: "Runs Scored",
        icon: "🏃",
        compare: (guessValue, targetValue) =>
          guessValue > targetValue
            ? "🔽"
            : guessValue < targetValue
              ? "🔼"
              : "✅",
      },
      role: {
        label: "Role",
        icon: "🎭",
        compare: (guessValue, targetValue) =>
          guessValue === targetValue ? "✅" : "❌",
      },
    },
  };

  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameError, setGameError] = useState(null); // NEW: Error handling

  // Autocomplete state (for current system)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // NEW: Squad discovery state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [squadFeedback, setSquadFeedback] = useState([]);

  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

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

  // Enhanced target player getter with error handling
  const getTargetPlayer = () => {
    if (!currentPuzzle) return null;
    try {
      const targetPlayerKey = currentPuzzle.targetPlayer;
      const targetPlayer = playersData[targetPlayerKey];
      if (!targetPlayer) {
        console.error(`Target player not found: ${targetPlayerKey}`);
        return null;
      }
      return targetPlayer;
    } catch (error) {
      console.error(`Error getting target player:`, error);
      return null;
    }
  };

  // ============================================================================
  // SQUAD DISCOVERY FUNCTIONS
  // ============================================================================

  /**
   * Get squad players for current puzzle
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
            role: player.role || "Player",
            battingOrder: getBattingOrder(playerKey, performances),
          };
          
          if (perf.team === currentPuzzle.matchData.scorecard.teams[0]) {
            team1Players.push(playerData);
          } else {
            team2Players.push(playerData);
          }
        }
      });
      
      // Sort by batting order
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
   * Get batting order for a player (simplified logic)
   */
  const getBattingOrder = (playerKey, performances) => {
    const perf = performances[playerKey];
    if (!perf) return 11;
    
    // Simple heuristic: higher runs/balls faced = higher batting order
    const ballsFaced = perf.balls_faced || 0;
    const runs = perf.runs_in_match || 0;
    
    if (ballsFaced > 20) return Math.floor(runs / 10) + 1; // Top order
    if (ballsFaced > 0) return 6 + Math.floor(ballsFaced / 5); // Middle order
    return 9 + (perf.wickets_in_match || 0); // Bowlers/tailenders
  };

  /**
   * Generate squad-based feedback
   */
  const generateSquadFeedback = (guessPlayerKey, targetPlayerKey) => {
    try {
      const performances = currentPuzzle.matchData.playerPerformances;
      const guessPerf = performances[guessPlayerKey];
      const targetPerf = performances[targetPlayerKey];
      const guessPlayer = playersData[guessPlayerKey];
      const targetPlayer = playersData[targetPlayerKey];
      
      if (!guessPerf || !targetPerf || !guessPlayer || !targetPlayer) {
        return null;
      }

      const feedback = {};
      
      SQUAD_FEEDBACK_CONFIG.activeFields.forEach((field) => {
        const fieldConfig = SQUAD_FEEDBACK_CONFIG.compareFields[field];
        if (!fieldConfig) return;

        if (field === "team") {
          feedback[field] = {
            comparison: fieldConfig.compare(guessPerf.team, targetPerf.team),
            value: guessPerf.team,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "battingOrder") {
          const guessBattingOrder = getBattingOrder(guessPlayerKey, performances);
          const targetBattingOrder = getBattingOrder(targetPlayerKey, performances);
          feedback[field] = {
            comparison: fieldConfig.compare(guessBattingOrder, targetBattingOrder),
            value: guessBattingOrder,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "runsScored") {
          const guessRuns = guessPerf.runs_in_match || 0;
          const targetRuns = targetPerf.runs_in_match || 0;
          feedback[field] = {
            comparison: fieldConfig.compare(guessRuns, targetRuns),
            value: guessRuns,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "role") {
          feedback[field] = {
            comparison: fieldConfig.compare(guessPlayer.role, targetPlayer.role),
            value: guessPlayer.role,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        }
      });

      return feedback;
    } catch (error) {
      console.error("Error generating squad feedback:", error);
      return null;
    }
  };

  /**
   * Handle squad player selection
   */
  const handleSquadPlayerSelect = (playerKey) => {
    if (!currentPuzzle) return;
    
    const targetPlayerKey = currentPuzzle.targetPlayer;
    
    // Check if already guessed
    if (squadFeedback.some(f => f.guessPlayer === playerKey)) {
      alert("You already tried this player!");
      return;
    }

    const feedback = generateSquadFeedback(playerKey, targetPlayerKey);
    const guessPlayer = playersData[playerKey];
    
    if (!feedback || !guessPlayer) {
      alert("Error processing guess!");
      return;
    }

    const newFeedback = {
      guessPlayer: playerKey,
      guessPlayerName: guessPlayer.fullName,
      feedback: feedback,
      isCorrect: playerKey === targetPlayerKey,
    };

    const newSquadFeedback = [...squadFeedback, newFeedback];
    setSquadFeedback(newSquadFeedback);

    // Check win/lose conditions
    if (playerKey === targetPlayerKey) {
      setGameWon(true);
      setGameOver(true);
    } else if (newSquadFeedback.length >= PUZZLE_CONFIG.maxGuesses) {
      setGameOver(true);
    }
  };

  // ============================================================================
  // ORIGINAL AUTOCOMPLETE FUNCTIONS (unchanged for current system)
  // ============================================================================

  const searchPlayers = (query) => {
    if (query.length < 3) return [];
    
    const searchTerm = query.toLowerCase();
    const results = [];
    
    Object.entries(playersData).forEach(([key, player]) => {
      const fullName = player.fullName.toLowerCase();
      const aliases = player.aliases || [];
      
      if (fullName.includes(searchTerm) || 
          aliases.some(alias => alias.toLowerCase().includes(searchTerm))) {
        results.push({
          key: key,
          player: player,
          relevance: fullName.startsWith(searchTerm) ? 2 : 1
        });
      }
    });
    
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCurrentGuess(value);
    
    if (value.length >= 3) {
      setIsLoadingSuggestions(true);
      setTimeout(() => {
        const results = searchPlayers(value);
        setSuggestions(results);
        setShowSuggestions(true);
        setIsLoadingSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // ============================================================================
  // ENHANCED ERROR HANDLING & PROGRESSION
  // ============================================================================

  /**
   * Enhanced next puzzle function with error handling
   */
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

  /**
   * Enhanced reset with error clearing
   */
  const resetPuzzleState = () => {
    setGuesses([]);
    setSquadFeedback([]);
    setGameWon(false);
    setGameOver(false);
    setCurrentGuess("");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setSelectedPlayer(null);
    setGameError(null);
  };

  /**
   * ENHANCED: Game status with proper error handling and answer reveal
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
          <div className="text-green-800 font-bold text-xl">🎉 Brilliant!</div>
          <div className="text-sm mt-2">
            You found <strong>{targetPlayerName}</strong> in{" "}
            {FEATURES.useSquadDiscovery ? squadFeedback.length : guesses.length} tries!
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
            The answer was: <strong>{targetPlayerName}</strong>
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
  // RENDER FUNCTIONS - Squad Discovery UI
  // ============================================================================

  /**
   * Render squad-based discovery interface
   */
  const renderSquadDiscovery = () => {
    const { team1, team2, team1Name, team2Name } = getSquadPlayers();
    const targetPlayer = getTargetPlayer();
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
          <h3 className="text-lg font-bold mb-2">🎯 Select a Player from the Squads</h3>
          <div className="text-sm text-gray-600 mb-4">
            Guess {guessesUsed + 1} of {PUZZLE_CONFIG.maxGuesses} • Tap a player to get clues!
          </div>
        </div>

        <div className="squads-container">
          {/* Team 1 */}
          <div className="team-squad">
            <h4 className="team-name">{team1Name}</h4>
            <div className="players-grid">
              {team1.map((player) => {
                const isGuessed = squadFeedback.some(f => f.guessPlayer === player.key);
                const isCorrect = player.key === currentPuzzle?.targetPlayer;
                
                return (
                  <button
                    key={player.key}
                    className={`player-card ${isGuessed ? 'guessed' : ''} ${isCorrect && gameWon ? 'correct' : ''}`}
                    onClick={() => !gameOver && !isGuessed && handleSquadPlayerSelect(player.key)}
                    disabled={gameOver || isGuessed}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-stats">
                      {player.runs}* ({player.wickets}w)
                    </div>
                    <div className="player-role">{player.role}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team 2 */}
          <div className="team-squad">
            <h4 className="team-name">{team2Name}</h4>
            <div className="players-grid">
              {team2.map((player) => {
                const isGuessed = squadFeedback.some(f => f.guessPlayer === player.key);
                const isCorrect = player.key === currentPuzzle?.targetPlayer;
                
                return (
                  <button
                    key={player.key}
                    className={`player-card ${isGuessed ? 'guessed' : ''} ${isCorrect && gameWon ? 'correct' : ''}`}
                    onClick={() => !gameOver && !isGuessed && handleSquadPlayerSelect(player.key)}
                    disabled={gameOver || isGuessed}
                  >
                    <div className="player-name">{player.name}</div>
                    <div className="player-stats">
                      {player.runs}* ({player.wickets}w)
                    </div>
                    <div className="player-role">{player.role}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render squad feedback history
   */
  const renderSquadFeedbackHistory = () => {
    if (squadFeedback.length === 0) return null;

    return (
      <div className="squad-feedback-history">
        <h4 className="text-md font-bold mb-3">🧩 Your Clues</h4>
        <div className="space-y-3">
          {squadFeedback.map((feedback, index) => (
            <div key={index} className="feedback-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">
                  #{index + 1} {feedback.guessPlayerName}
                </span>
                {feedback.isCorrect && (
                  <span className="text-green-600 text-xl">🎯</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                {SQUAD_FEEDBACK_CONFIG.activeFields.map((field) => {
                  const fb = feedback.feedback[field];
                  if (!fb) return null;

                  return (
                    <div key={field} className="text-center">
                      <div className="text-xs text-gray-600">{fb.label}</div>
                      <div className="font-mono text-sm">
                        <div>{fb.icon}</div>
                        <div>{fb.comparison}</div>
                        <div className="text-xs">{fb.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render squad feedback legend
   */
  const renderSquadFeedbackLegend = () => (
    <div className="squad-feedback-legend">
      <div className="font-semibold mb-2">🔍 How to Read the Clues:</div>
      <div className="space-y-1 text-sm">
        <div>👥 <strong>Team:</strong> ✅ Same team | ❌ Different team</div>
        <div>📝 <strong>Batting Order:</strong> 🔼 Target bats higher | 🔽 Target bats lower | ✅ Same position</div>
        <div>🏃 <strong>Runs:</strong> 🔼 Target scored more | 🔽 Target scored less | ✅ Same runs</div>
        <div>🎭 <strong>Role:</strong> ✅ Same role | ❌ Different role</div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER - Error boundaries and feature switching
  // ============================================================================

  // Error boundary for missing puzzle
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
      {/* How to Play Popup */}
      {showHowToPlay && (
        <div className="popup-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowHowToPlay(false)}>×</button>
            <h2 className="popup-title">How To Play</h2>
            <p className="popup-subtitle">
              Guess the Cricket Player from the match scorecard in {PUZZLE_CONFIG.maxGuesses} tries.
            </p>
            <div className="popup-rules">
              <ul>
                {FEATURES.useSquadDiscovery ? (
                  <>
                    <li>Select players from the squad lists to get clues.</li>
                    <li>Use team, batting order, runs, and role clues to find the target player.</li>
                    <li>✅ means your guess matches the target player's attribute.</li>
                    <li>🔼/🔽 means the target player has higher/lower values.</li>
                    <li>Each selection counts as one guess!</li>
                  </>
                ) : (
                  <>
                    <li>Each guess must be a valid cricket player name.</li>
                    <li>The arrows show how your guess's match performance compares to the target player.</li>
                    <li>The flag shows if your guess is from the same country as the target player.</li>
                    <li>🏟️ Shows if your guess played in this specific match.</li>
                    <li>Use the scorecard clues to deduce who the target player might be!</li>
                  </>
                )}
              </ul>
            </div>
            <div className="popup-footer">
              <p>A new puzzle is released daily at midnight. Good luck! 🏏</p>
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

        {/* Debug Info */}
        {FEATURES.showDebugInfo && (
          <div className="debug-info">
            <div className="text-xs text-gray-500 text-center mb-2">
              🔧 Mode: {FEATURES.useSquadDiscovery ? "Squad Discovery" : "Current System"} | 
              Puzzle {currentPuzzleIndex + 1}/{PUZZLE_CONFIG.puzzles.length}
            </div>
          </div>
        )}

        {/* Puzzle Counter */}
        <div className="text-center mb-4">
          <span className="text-sm text-gray-600">
            Puzzle {currentPuzzleIndex + 1} of {PUZZLE_CONFIG.puzzles.length}
          </span>
          {currentPuzzleIndex < PUZZLE_CONFIG.puzzles.length - 1 && (
            <span className="text-xs text-gray-400 block">
              More puzzles unlocked after solving!
            </span>
          )}
        </div>

        {/* Game Status */}
        {renderGameStatus()}

        {/* Feature-based UI */}
        {!gameOver && FEATURES.useSquadDiscovery ? (
          <>
            {/* Squad Discovery Interface */}
            {renderSquadDiscovery()}
            {renderSquadFeedbackLegend()}
            {renderSquadFeedbackHistory()}
          </>
        ) : !gameOver ? (
          <>
            {/* Original Input Interface */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">
                Guess {guesses.length + 1} of {PUZZLE_CONFIG.maxGuesses}
              </div>
              <div className="autocomplete-container" style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentGuess}
                  onChange={handleInputChange}
                  placeholder="Type player name (e.g., Kohli, Dhoni, Gayle)..."
                  className="game-input"
                  autoComplete="off"
                />
              </div>
              <button onClick={() => {}} className="btn btn-green w-full mt-3">
                Submit Guess
              </button>
            </div>
          </>
        ) : null}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <div>Players in database: {Object.keys(playersData).length}</div>
          <div>Match puzzles: {PUZZLE_CONFIG.puzzles.length}</div>
          <div className="mt-1">🏏 Built for cricket lovers</div>
        </div>
      </div>
    </div>
  );
};

export default CricGuess;