/*
 * CricGuess - COMPLETE ENHANCED VERSION WITH RESTORED DATA PROCESSING
 * 
 * ENHANCED FEATURES PRESERVED:
 * ============================
 * 🎨 Team-specific colors for authentic cricket branding
 * 📺 Professional TV broadcast scorecard design
 * 🎉 Success/Failure overlays with celebrations and trivia
 * 📤 Native share functionality (Wordle-style)
 * 🔍 Feedback system moved to top for persistent visibility
 * ✨ Enhanced visual feedback and animations
 * 🏏 Authentic cricket team color schemes
 * 
 * CRITICAL FIXES RESTORED:
 * ========================
 * 🔧 Enhanced squad processing using match_puzzles.json playerPerformances data
 * 🎯 Smart feedback generation with Pakistani placeholder player support  
 * 🏏 Format-specific stat comparison logic for ODI vs IPL matches
 * 🔍 Multi-strategy player key resolution with fallback handling
 * 📊 Comprehensive debug logging for troubleshooting
 */

import React, { useState, useMemo } from "react";
import playersData from "./data/updatedplayers.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

// ============================================================================
// STABLE CONFIG - Performance optimized
// ============================================================================
const STABLE_FEATURES = {
  useSquadDiscovery: true,
  useManOfTheMatch: true,
  showDebugInfo: true, // RESTORED: Enable debug logging
  maxGuesses: 3,
  enhancedMobileLayout: true,
  hidePlayerStats: true,
};

const STABLE_PUZZLE_CONFIG = {
  maxGuesses: STABLE_FEATURES.maxGuesses,
  puzzles: matchPuzzlesData.puzzles || [],
  targetType: STABLE_FEATURES.useManOfTheMatch
    ? "Man of the Match"
    : "any player",
};

// ============================================================================
// PUZZLE FORMAT DETECTION - Smart team-based detection
// ============================================================================
const getPuzzleFormat = (puzzle) => {
  if (!puzzle?.matchData?.scorecard?.teams) {
    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: No teams data, defaulting to IPL format");
    }
    return "IPL";
  }

  const teams = puzzle.matchData.scorecard.teams;
  if (STABLE_FEATURES.showDebugInfo) {
    console.log("🔍 DEBUG: Format detection for teams:", teams);
  }

  const internationalTeams = [
    "India", "Pakistan", "Sri Lanka", "Australia", "England", 
    "New Zealand", "South Africa", "West Indies", "Bangladesh", 
    "Zimbabwe", "Afghanistan", "Ireland", "Scotland", "Netherlands"
  ];

  const iplTeams = [
    "Mumbai Indians", "Chennai Super Kings", "Royal Challengers Bangalore",
    "Kolkata Knight Riders", "Delhi Daredevils", "Delhi Capitals", 
    "Rajasthan Royals", "Kings XI Punjab", "Punjab Kings",
    "Sunrisers Hyderabad", "Deccan Chargers", "Gujarat Lions",
    "Rising Pune Supergiant", "Kochi Tuskers Kerala", "Pune Warriors India",
    "Lucknow Super Giants", "Gujarat Titans"
  ];

  const isInternationalMatch = teams.every(team => 
    internationalTeams.some(intlTeam => 
      team.toLowerCase().includes(intlTeam.toLowerCase())
    )
  );

  const isIPLMatch = teams.some(team => 
    iplTeams.some(iplTeam => 
      team.toLowerCase().includes(iplTeam.toLowerCase()) ||
      iplTeam.toLowerCase().includes(team.toLowerCase())
    )
  );

  let detectedFormat;
  if (isInternationalMatch) {
    detectedFormat = "ODI";
  } else if (isIPLMatch) {
    detectedFormat = "IPL";
  } else {
    detectedFormat = "IPL";
  }

  if (STABLE_FEATURES.showDebugInfo) {
    console.log("🔍 DEBUG: Format detected:", detectedFormat, "for teams:", teams);
  }

  return detectedFormat;
};

// ============================================================================
// ENHANCED PLAYER KEY MAPPING - Multi-strategy resolution
// ============================================================================
const PLAYER_KEY_MAPPING = {};

Object.keys(playersData).forEach((fullKey) => {
  for (let i = 1; i <= 4; i++) {
    if (fullKey.length > i) {
      const shortKey = fullKey.substring(i);
      if (!PLAYER_KEY_MAPPING[shortKey]) {
        PLAYER_KEY_MAPPING[shortKey] = fullKey;
      }
    }
  }
});

const MANUAL_MAPPINGS = {
  MCCULLUM: "BBMCCULLUM",
  VSEHWAG: "VSEHWAG", 
  HUSSEY: "MEHUSSEY",
  SHOAIBMALIK: "SHOAIBMALIK",
};

Object.assign(PLAYER_KEY_MAPPING, MANUAL_MAPPINGS);

// ============================================================================
// TEAM COLOR UTILITY
// ============================================================================
const getTeamColorClass = (teamName) => {
  const teamColors = {
    'Mumbai Indians': 'team-colors-mumbai',
    'Chennai Super Kings': 'team-colors-chennai',
    'Royal Challengers Bangalore': 'team-colors-rcb',
    'Kolkata Knight Riders': 'team-colors-kkr',
    'Delhi Daredevils': 'team-colors-delhi',
    'Delhi Capitals': 'team-colors-delhi',
    'Kings XI Punjab': 'team-colors-punjab',
    'Punjab Kings': 'team-colors-punjab',
    'Rajasthan Royals': 'team-colors-rajasthan',
    'Sunrisers Hyderabad': 'team-colors-sunrisers',
    'Lucknow Super Giants': 'team-colors-lucknow',
    'Gujarat Titans': 'team-colors-gujarat',
    'India': 'team-colors-india',
    'Pakistan': 'team-colors-pakistan',
    'Sri Lanka': 'team-colors-srilanka',
    'Australia': 'team-colors-australia',
    'England': 'team-colors-england',
    'New Zealand': 'team-colors-newzealand'
  };

  return teamColors[teamName] || 'team-colors-rcb';
};

const CricGuess = () => {
  // ============================================================================
  // GAME STATE MANAGEMENT
  // ============================================================================
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameError, setGameError] = useState(null);
  const [squadFeedback, setSquadFeedback] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  // ============================================================================
  // ENHANCED PLAYER KEY RESOLUTION - Multi-strategy with debug logging
  // ============================================================================
  const resolvePlayerKey = (puzzleKey) => {
    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Player key resolution:", puzzleKey);
    }

    // Strategy 1: Direct match
    if (playersData[puzzleKey]) {
      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Direct match found:", puzzleKey);
      }
      return puzzleKey;
    }

    // Strategy 2: Manual mapping
    if (PLAYER_KEY_MAPPING[puzzleKey]) {
      const mappedKey = PLAYER_KEY_MAPPING[puzzleKey];
      if (playersData[mappedKey]) {
        if (STABLE_FEATURES.showDebugInfo) {
          console.log("🔍 DEBUG: Manual mapping found:", puzzleKey, "→", mappedKey);
        }
        return mappedKey;
      }
    }

    // Strategy 3: Substring matching
    for (const fullKey of Object.keys(playersData)) {
      for (let i = 1; i <= 4; i++) {
        if (fullKey.length > i && fullKey.substring(i) === puzzleKey) {
          if (STABLE_FEATURES.showDebugInfo) {
            console.log("🔍 DEBUG: Substring match found:", puzzleKey, "→", fullKey);
          }
          return fullKey;
        }
      }
    }

    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: No player key resolution found for:", puzzleKey);
    }
    return null;
  };

  // ============================================================================
  // MEMOIZED CURRENT PUZZLE
  // ============================================================================
  const currentPuzzle = useMemo(() => {
    if (!STABLE_PUZZLE_CONFIG.puzzles || STABLE_PUZZLE_CONFIG.puzzles.length === 0) {
      setGameError("No puzzles found in match_puzzles.json");
      return null;
    }

    if (currentPuzzleIndex >= STABLE_PUZZLE_CONFIG.puzzles.length) {
      setGameError("Puzzle index out of range");
      return null;
    }

    const puzzle = STABLE_PUZZLE_CONFIG.puzzles[currentPuzzleIndex];
    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Current puzzle loaded:", puzzle.id, "Target:", puzzle.targetPlayer);
    }
    return puzzle;
  }, [currentPuzzleIndex]);

  // ============================================================================
  // MEMOIZED TARGET PLAYER
  // ============================================================================
  const targetPlayer = useMemo(() => {
    if (!currentPuzzle) return null;

    try {
      let targetPlayerKey = null;

      // Strategy 1: Direct resolution
      const directKey = resolvePlayerKey(currentPuzzle.targetPlayer);
      if (directKey && playersData[directKey]) {
        targetPlayerKey = directKey;
      }

      // Strategy 2: Player of the Match lookup
      if (!targetPlayerKey && currentPuzzle.matchData?.scorecard?.player_of_match) {
        const pomName = currentPuzzle.matchData.scorecard.player_of_match.toUpperCase();
        const foundPlayer = Object.entries(playersData).find(
          ([key, player]) => {
            return player.fullName && player.fullName.toUpperCase() === pomName;
          }
        );

        if (foundPlayer) {
          targetPlayerKey = foundPlayer[0];
        }
      }

      // Strategy 3: Fallback to puzzle target
      if (!targetPlayerKey) {
        targetPlayerKey = currentPuzzle.targetPlayer;
      }

      const targetPlayerData = playersData[targetPlayerKey];
      if (!targetPlayerData) {
        if (STABLE_FEATURES.showDebugInfo) {
          console.log("🔍 DEBUG: Target player not found:", targetPlayerKey);
        }
        return { key: targetPlayerKey, fullName: "Unknown Player" };
      }

      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Target player resolved:", targetPlayerKey, "→", targetPlayerData.fullName);
      }

      return { ...targetPlayerData, key: targetPlayerKey };
    } catch (error) {
      console.error("Error getting target player:", error);
      return { key: "ERROR", fullName: "Unknown Player" };
    }
  }, [currentPuzzle]);

  // ============================================================================
  // ENHANCED SQUAD PROCESSING - Using match_puzzles.json playerPerformances for accurate team assignment
  // ============================================================================
  const squadPlayers = useMemo(() => {
    if (!currentPuzzle || !targetPlayer) {
      return {
        team1: [],
        team2: [],
        team1Name: "",
        team2Name: "",
        error: "Loading...",
      };
    }

    if (!currentPuzzle.matchData?.playerPerformances) {
      return {
        team1: [],
        team2: [],
        team1Name: "",
        team2Name: "",
        error: "No player performance data available",
      };
    }

    try {
      const performances = currentPuzzle.matchData.playerPerformances;
      const scorecard = currentPuzzle.matchData.scorecard;
      const team1Name = scorecard?.teams?.[0] || "Team 1";
      const team2Name = scorecard?.teams?.[1] || "Team 2";
      const currentFormat = getPuzzleFormat(currentPuzzle);

      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Squad processing - Teams:", team1Name, "vs", team2Name);
        console.log("🔍 DEBUG: Performance data entries:", Object.keys(performances).length);
      }

      const team1Players = [];
      const team2Players = [];

      // Enhanced squad processing using match_puzzles.json playerPerformances for accurate team assignment
      Object.entries(performances).forEach(([playerKey, perf]) => {
        let resolvedKey = null;
        let player = null;

        // Puzzle 5 special case: Don't resolve KOHLI to Virat Kohli, use T Kohli from match data
        if (currentPuzzle.id === 5 && playerKey === 'KOHLI') {
          resolvedKey = null; // Force use of match data
          player = null;
          if (STABLE_FEATURES.showDebugInfo) {
            console.log("🔍 DEBUG: Puzzle 5 - Using T Kohli from match data, not resolving to Virat Kohli");
          }
        } else {
          resolvedKey = resolvePlayerKey(playerKey);
          player = resolvedKey ? playersData[resolvedKey] : null;
        }

        const playerData = {
          key: playerKey,
          name: player?.fullName || perf.full_name || playerKey,
          role: player?.role || "Player",
          team: perf.team,
          played_in_match: perf.played_in_match || false,
        };

        if (STABLE_FEATURES.showDebugInfo) {
          console.log("🔍 DEBUG: Player assignment:", playerKey, "→", perf.team, 
                     player ? `(resolved: ${player.fullName})` : "(unresolved)");
        }

        // Using match_puzzles.json playerPerformances for accurate team assignment
        if (perf.team === team1Name) {
          team1Players.push(playerData);
        } else if (perf.team === team2Name) {
          team2Players.push(playerData);
        } else {
          if (STABLE_FEATURES.showDebugInfo) {
            console.log("🔍 DEBUG: Player team mismatch:", playerKey, "team:", perf.team, 
                       "expected:", team1Name, "or", team2Name);
          }
        }
      });

      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Final squad assignment:", {
          team1: `${team1Name} (${team1Players.length} players)`,
          team2: `${team2Name} (${team2Players.length} players)`
        });
      }

      return {
        team1: team1Players,
        team2: team2Players,
        team1Name,
        team2Name,
        format: currentFormat,
        error: null,
      };
    } catch (error) {
      console.error("Squad processing error:", error);
      return {
        team1: [],
        team2: [],
        team1Name: "",
        team2Name: "",
        format: "IPL",
        error: error.message,
      };
    }
  }, [currentPuzzle, targetPlayer]);

  // ============================================================================
  // ENHANCED FEEDBACK GENERATION - Smart feedback with placeholder support and format-specific comparisons
  // ============================================================================
  const generateEnhancedFeedback = (selectedPlayerKey, targetPlayerKey) => {
    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Feedback generation:", selectedPlayerKey, "vs", targetPlayerKey);
    }

    // Enhanced feedback with placeholder support and format-specific comparisons
    const selectedPlayer = playersData[selectedPlayerKey];
    const targetPlayerData = playersData[targetPlayerKey];

    // CRITICAL: Puzzle-specific placeholder logic
    const placeholderInfo = {};

    // Puzzle 4: Pakistani placeholder players
    if (currentPuzzle?.id === 4) {
      placeholderInfo['INZAMAMULHAQ'] = { country: 'Pakistan', role: 'Batsman' };
      placeholderInfo['YOUNISKHAN'] = { country: 'Pakistan', role: 'Batsman' };
      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Puzzle 4 detected - Pakistani placeholder players enabled");
      }
    }

    // Puzzle 5: KOHLI refers to Taruwar Kohli, not Virat Kohli
    if (currentPuzzle?.id === 5 && selectedPlayerKey === 'KOHLI') {
      placeholderInfo['KOHLI'] = { country: 'India', role: 'Batsman', matchesAlwaysUp: true };
      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Puzzle 5 detected - KOHLI treated as Taruwar Kohli placeholder");
      }
    }

    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Placeholder player detected:", 
                 placeholderInfo[selectedPlayerKey] ? "Yes" : "No");
    }

    // Smart feedback generation with placeholder handling
    if (!selectedPlayer && !placeholderInfo[selectedPlayerKey]) {
      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Selected player not found and no placeholder:", selectedPlayerKey);
      }
      return {
        nationality: "❓",
        role: "❓",
        matches: "❓",
      };
    }

    if (!targetPlayerData) {
      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Target player not found:", targetPlayerKey);
      }
      return {
        nationality: "❓",
        role: "❓",
        matches: "❓",
      };
    }

    // Intelligent format detection based on team types (franchise vs international)
    const currentFormat = getPuzzleFormat(currentPuzzle);
    const formatPrefix = currentFormat === "ODI" ? "odi" : "ipl";

    // Enhanced feedback with placeholder support and format-specific comparisons
    const selectedInfo = selectedPlayer || placeholderInfo[selectedPlayerKey];

    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Using player info:", selectedInfo, "for format:", currentFormat);
    }

    // Format-specific stat comparison logic for ODI vs IPL matches
    let selectedMatches, targetMatches;

    // Special handling for Taruwar Kohli placeholder - always show up arrow for matches
    if (placeholderInfo[selectedPlayerKey]?.matchesAlwaysUp) {
      selectedMatches = 0; // Always lower than target to show up arrow
      targetMatches = 1;
      if (STABLE_FEATURES.showDebugInfo) {
        console.log("🔍 DEBUG: Taruwar Kohli placeholder - forcing matches up arrow");
      }
    } else {
      selectedMatches = selectedPlayer ? (selectedPlayer[`${formatPrefix}Matches`] || 0) : 0;
      targetMatches = targetPlayerData[`${formatPrefix}Matches`] || 0;
    }

    const getComparison = (selected, target) => {
      if (selected === target) return "✅";
      return selected < target ? "🔼" : "🔽";
    };

    const feedback = {
      nationality: selectedInfo.country === targetPlayerData.country ? "✅" : "❌",
      role: selectedInfo.role === targetPlayerData.role ? "✅" : "❌",
      matches: getComparison(selectedMatches, targetMatches),
    };

    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Generated feedback:", feedback);
    }

    return feedback;
  };

  // ============================================================================
  // GAME EVENT HANDLERS
  // ============================================================================
  const handlePlayerSelection = (player) => {
    if (gameOver || gameWon || selectedPlayers.has(player.key)) return;

    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Player selected:", player.key, player.name);
    }

    const newSelectedPlayers = new Set(selectedPlayers);
    newSelectedPlayers.add(player.key);
    setSelectedPlayers(newSelectedPlayers);

    const isCorrect = player.key === targetPlayer?.key;
    const feedback = generateEnhancedFeedback(player.key, targetPlayer?.key);

    const newFeedback = {
      playerName: player.name,
      playerKey: player.key,
      isCorrect,
      ...feedback,
    };

    const updatedFeedback = [...squadFeedback, newFeedback];
    setSquadFeedback(updatedFeedback);

    if (STABLE_FEATURES.showDebugInfo) {
      console.log("🔍 DEBUG: Feedback created:", newFeedback);
    }

    if (isCorrect) {
      setGameWon(true);
      setTimeout(() => setShowSuccessModal(true), 800);
    } else if (updatedFeedback.length >= STABLE_PUZZLE_CONFIG.maxGuesses) {
      setGameOver(true);
      setTimeout(() => setShowGameOverModal(true), 1000);
    }
  };

  const nextPuzzle = () => {
    if (currentPuzzleIndex + 1 >= STABLE_PUZZLE_CONFIG.puzzles.length) {
      alert("You've completed all puzzles!");
      return;
    }

    setCurrentPuzzleIndex(currentPuzzleIndex + 1);
    setGameWon(false);
    setGameOver(false);
    setShowSuccessModal(false);
    setShowGameOverModal(false);
    setSquadFeedback([]);
    setSelectedPlayers(new Set());
  };

  // ============================================================================
  // ENHANCED SCORECARD RENDER
  // ============================================================================
  const renderEnhancedScorecard = () => {
    if (!currentPuzzle?.matchData?.scorecard) {
      return (
        <div className="scorecard-broadcast">
          <div className="error-message">
            No scorecard data available for this puzzle
          </div>
        </div>
      );
    }

    const scorecard = currentPuzzle.matchData.scorecard;
    const currentFormat = getPuzzleFormat(currentPuzzle);
    const team1Name = scorecard.teams?.[0];
    const team2Name = scorecard.teams?.[1];
    const team1Score = scorecard.team_scores?.[team1Name];
    const team2Score = scorecard.team_scores?.[team2Name];

    return (
      <div className="scorecard-broadcast">
        <div className="broadcast-header">
          <div className="broadcast-title">
            🏏 {currentFormat} Match - Puzzle {currentPuzzle.id}
          </div>
          <div className="live-indicator">● PUZZLE</div>
        </div>

        <div className="match-summary">
          <div className="match-title-broadcast">
            🏆 Find the Man of the Match
          </div>
          {scorecard.venue && (
            <div className="venue-info-broadcast">
              📍 {scorecard.venue} • {scorecard.date || "Date not available"}
            </div>
          )}
        </div>

        <div className="teams-score-display">
          <div className="team-display">
            <div className="team-name-broadcast">{team1Name}</div>
            <div className="team-score-broadcast">
              {team1Score?.runs || "N/A"}/{team1Score?.wickets || "N/A"}
            </div>
          </div>

          <div className="vs-separator">VS</div>

          <div className="team-display">
            <div className="team-name-broadcast">{team2Name}</div>
            <div className="team-score-broadcast">
              {team2Score?.runs || "N/A"}/{team2Score?.wickets || "N/A"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // ENHANCED FEEDBACK DISPLAY
  // ============================================================================
  const renderEnhancedFeedbackDisplay = () => {
    if (squadFeedback.length === 0) return null;

    const currentFormat = squadPlayers.format || getPuzzleFormat(currentPuzzle);

    return (
      <div className="feedback-container-enhanced">
        <div className="feedback-header-enhanced">
          <div className="feedback-title">
            🔍 Your Guesses ({squadFeedback.length}/{STABLE_PUZZLE_CONFIG.maxGuesses})
          </div>
          <div className="feedback-subtitle">Green = Correct, Red = Incorrect</div>
        </div>

        <div className="feedback-table">
          <div className="feedback-row header">
            <div className="feedback-cell name">Player Name</div>
            <div className="feedback-cell">COUNTRY</div>
            <div className="feedback-cell">ROLE</div>
            <div className="feedback-cell">{currentFormat} MATCHES</div>
          </div>

          {squadFeedback.map((feedback, index) => (
            <div
              key={index}
              className={`feedback-row ${feedback.isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div className="feedback-cell name">{feedback.playerName}</div>
              <div className="feedback-cell">
                <span className="feedback-icon">{feedback.nationality}</span>
              </div>
              <div className="feedback-cell">
                <span className="feedback-icon">{feedback.role}</span>
              </div>
              <div className="feedback-cell">
                <span className="feedback-icon">{feedback.matches}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // ENHANCED SQUAD DISPLAY
  // ============================================================================
  const getEnhancedPlayerStateClass = (player) => {
    let baseClass = "player-card-enhanced";

    if (selectedPlayers.has(player.key)) {
      if (player.key === targetPlayer?.key) {
        baseClass += " correct";
      } else {
        baseClass += " incorrect";
      }
      baseClass += " disabled";
    } else if (gameOver && !gameWon) {
      baseClass += " disabled";
    }

    return baseClass;
  };

  const renderEnhancedSquadDisplay = () => {
    if (squadPlayers.error) {
      return (
        <div className="error-container">
          <p className="error-message">
            Error loading squad: {squadPlayers.error}
          </p>
        </div>
      );
    }

    return (
      <div className="squads-container-enhanced">
        {/* Team 1 */}
        <div className="team-squad-enhanced">
          <div className={`squad-header-enhanced ${getTeamColorClass(squadPlayers.team1Name)}`}>
            <div className="team-name-enhanced">{squadPlayers.team1Name}</div>
            <div className="player-count-enhanced">
              ({squadPlayers.team1.length} players)
            </div>
          </div>
          <div className="players-grid-enhanced">
            {squadPlayers.team1.map((player) => (
              <div
                key={player.key}
                className={getEnhancedPlayerStateClass(player)}
                onClick={() => handlePlayerSelection(player)}
              >
                <div className="player-info-enhanced">
                  <div className="player-details">
                    <div className="player-name-enhanced">{player.name}</div>
                    <div className="player-role-enhanced">{player.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 */}
        <div className="team-squad-enhanced">
          <div className={`squad-header-enhanced ${getTeamColorClass(squadPlayers.team2Name)}`}>
            <div className="team-name-enhanced">{squadPlayers.team2Name}</div>
            <div className="player-count-enhanced">
              ({squadPlayers.team2.length} players)
            </div>
          </div>
          <div className="players-grid-enhanced">
            {squadPlayers.team2.map((player) => (
              <div
                key={player.key}
                className={getEnhancedPlayerStateClass(player)}
                onClick={() => handlePlayerSelection(player)}
              >
                <div className="player-info-enhanced">
                  <div className="player-details">
                    <div className="player-name-enhanced">{player.name}</div>
                    <div className="player-role-enhanced">{player.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // GAME STATUS DISPLAY
  // ============================================================================
  const renderGameStatus = () => {
    const currentFormat = squadPlayers.format || getPuzzleFormat(currentPuzzle);

    if (gameWon) {
      return (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
            border: '2px solid #10b981',
            padding: '1rem',
            borderRadius: '0.75rem',
            color: '#059669',
            fontWeight: '600'
          }}>
            🏆 Congratulations! You found the Man of the Match!
          </div>
        </div>
      );
    }

    if (gameOver) {
      return (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
            border: '2px solid #ef4444',
            padding: '1rem',
            borderRadius: '0.75rem',
            color: '#dc2626',
            fontWeight: '600'
          }}>
            💀 Game Over! The Man of the Match was {targetPlayer?.fullName}
          </div>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          background: '#f0f9ff',
          border: '2px solid #0ea5e9',
          padding: '1rem',
          borderRadius: '0.75rem',
          color: '#0369a1',
          fontWeight: '600'
        }}>
          🔍 Guesses: {squadFeedback.length}/{STABLE_PUZZLE_CONFIG.maxGuesses} | Format: {currentFormat}
        </div>
      </div>
    );
  };

  // ============================================================================
  // SHARE FUNCTIONALITY
  // ============================================================================
  const generateShareText = () => {
    const attemptCount = squadFeedback.length;
    const result = gameWon ? '✅' : '❌';
    const emojis = gameWon ? 
      '🏆🎉🏏'.repeat(attemptCount) : 
      '💀😞🏏'.repeat(attemptCount);

    return `🏏 CricGuess Puzzle ${currentPuzzle?.id || '?'}\n${result} ${attemptCount}/${STABLE_PUZZLE_CONFIG.maxGuesses}\n${emojis}`;
  };

  const handleShare = async () => {
    const shareText = generateShareText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CricGuess',
          text: shareText,
        });
      } catch (err) {
        navigator.clipboard.writeText(shareText);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  };

  // ============================================================================
  // SUCCESS/FAILURE MODALS - Centered overlay system
  // ============================================================================
  const renderSuccessModal = () => (
    showSuccessModal && (
      <div className="game-overlay">
        <div className="success-modal">
          <div className="celebration-emoji">🏆</div>
          <div className="overlay-title">Brilliant!</div>
          <div className="overlay-subtitle">
            You found {targetPlayer?.fullName} as the Man of the Match!
          </div>

          <div className="trivia-section">
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🏏 Cricket Trivia:</div>
            <div className="trivia-text">
              {currentPuzzle?.trivia || "Another classic cricket moment to remember!"}
            </div>
          </div>

          <div className="share-section">
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Share your success:</div>
            <div className="share-result">{generateShareText()}</div>

            <div className="modal-buttons">
              <button className="btn-enhanced btn-secondary" onClick={handleShare}>
                📤 Share
              </button>
              <button className="btn-enhanced btn-primary" onClick={nextPuzzle}>
                ➡️ Next Puzzle
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderGameOverModal = () => (
    showGameOverModal && (
      <div className="game-overlay">
        <div className="failure-modal">
          <div className="celebration-emoji">💀</div>
          <div className="overlay-title">So Close!</div>
          <div className="overlay-subtitle">
            The Man of the Match was {targetPlayer?.fullName}
          </div>

          <div className="trivia-section">
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🏏 Cricket Trivia:</div>
            <div className="trivia-text">
              {currentPuzzle?.trivia || "Every cricket legend has missed a few catches!"}
            </div>
          </div>

          <div className="share-section">
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Share your attempt:</div>
            <div className="share-result">{generateShareText()}</div>

            <div className="modal-buttons">
              <button className="btn-enhanced btn-secondary" onClick={handleShare}>
                📤 Share
              </button>
              <button className="btn-enhanced btn-primary" onClick={nextPuzzle}>
                ➡️ Next Puzzle
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // ============================================================================
  // HOW TO PLAY MODAL - Centered overlay system
  // ============================================================================
  const renderHowToPlayModal = () => (
    showHowToPlay && (
      <div className="game-overlay">
        <div className="how-to-play-modal">
          <div className="modal-header">
            <h2>🏏 How to Play CricGuess</h2>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="close-button"
            >
              ✕
            </button>
          </div>

          <div className="instructions">
            <div className="instruction-item">
              <div className="instruction-icon">🎯</div>
              <div>
                <strong>Objective:</strong> Guess the "Man of the Match" from the cricket scorecard
              </div>
            </div>

            <div className="instruction-item">
              <div className="instruction-icon">🔍</div>
              <div>
                <strong>Clues:</strong> You get feedback on country, role, and career stats for each guess
              </div>
            </div>

            <div className="instruction-item">
              <div className="instruction-icon">⚡</div>
              <div>
                <strong>Attempts:</strong> You have only 3 guesses to find the correct player
              </div>
            </div>

            <div className="instruction-item">
              <div className="instruction-icon">🏆</div>
              <div>
                <strong>Feedback:</strong>
                <br />✅ = Correct match
                <br />❌ = Wrong match  
                <br />🔼 = Target has more career matches
                <br />🔽 = Target has fewer career matches
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowHowToPlay(false)}
            className="btn-enhanced btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Start Playing! 🏏
          </button>
        </div>
      </div>
    )
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (!currentPuzzle) {
    return (
      <div className="page-background">
        <div className="game-container">
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb', marginBottom: '1rem' }}>
              🏏 CricGuess
            </h1>
            <div style={{ color: '#dc2626', marginBottom: '1rem' }}>
              {gameError || "No puzzles available."}
            </div>
            <p style={{ color: '#6b7280' }}>Please check your data files.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      {/* Centered Modal Overlays */}
      {renderHowToPlayModal()}
      {renderSuccessModal()}
      {renderGameOverModal()}

      <div className="game-container">
        {/* Header Section */}
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: '#1f2937', 
            textAlign: 'center', 
            marginBottom: '0.5rem' 
          }}>
            🏏 CricGuess
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '0.9rem', 
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            Cricket Nostalgia Puzzle Game
          </p>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="btn-enhanced btn-secondary"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem'
            }}
          >
            📖 How to Play
          </button>
        </div>

        {/* Enhanced TV Broadcast Scorecard */}
        {renderEnhancedScorecard()}

        {/* Game Status */}
        {renderGameStatus()}

        {/* Enhanced Feedback Display - TOP POSITION */}
        {renderEnhancedFeedbackDisplay()}

        {/* Enhanced Squad Display with Team Colors */}
        {renderEnhancedSquadDisplay()}
      </div>
    </div>
  );
};

export default CricGuess;