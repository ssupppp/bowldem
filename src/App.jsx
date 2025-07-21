/*
 * CricGuess - BUG FIXES + ENHANCED FEEDBACK SYSTEM
 *
 * FIXED ISSUES:
 * =============
 * ✅ 1. React Duplicate Key Warning - Use original playerKey for unique React keys
 * ✅ 2. CSS Scrolling Issues - Fixed player list height compression
 * ✅ 3. "Unknown Player" bug - Enhanced target player resolution
 * ✅ 4. Added nationality feedback (flag matching)
 * ✅ 5. Added role feedback (Batsman/Bowler/All-rounder)
 * ✅ 6. Added total matches comparison (up/down arrows)
 * 
 * NEW FEEDBACK SYSTEM:
 * ===================
 * 🏁 Nationality: Green flag if same country, red if different
 * 🎯 Role: Green if same role, red if different  
 * 📊 Matches: ↑ if guess played fewer, ↓ if guess played more, ✅ if same
 */

import React, { useState, useMemo } from "react";
import playersData from "./data/players.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

// ============================================================================
// STABLE CONFIG - Performance optimized, moved outside component
// ============================================================================

const STABLE_FEATURES = {
  useSquadDiscovery: true,
  useManOfTheMatch: true,
  showDebugInfo: false,
  maxGuesses: 3,
  enhancedMobileLayout: true,
  hidePlayerStats: true,
};

const STABLE_PUZZLE_CONFIG = {
  maxGuesses: STABLE_FEATURES.maxGuesses,
  puzzles: matchPuzzlesData.puzzles || [],
  targetType: STABLE_FEATURES.useManOfTheMatch ? "Man of the Match" : "any player",
};

// ============================================================================
// COMPREHENSIVE PLAYER KEY MAPPING - Complete solution for all puzzles
// ============================================================================
const PLAYER_KEY_MAPPING = {};

// Create comprehensive mapping from short keys to full keys
Object.keys(playersData).forEach((fullKey) => {
  // Try different substring lengths to catch more variations
  for (let i = 1; i <= 4; i++) {
    if (fullKey.length > i) {
      const shortKey = fullKey.substring(i);
      if (!PLAYER_KEY_MAPPING[shortKey]) {
        PLAYER_KEY_MAPPING[shortKey] = fullKey;
      }
    }
  }
});

// CRITICAL: Manual mappings for ALL known problematic cases from puzzle analysis
const MANUAL_MAPPINGS = {
  // Original issues we fixed
  "MCCULLUM": "BBMCCULLUM",
  "GANGULY": "SCGANGULY", 
  "PONTING": "RTPONTING",
  "HUSSEY": "MEKHUSSEY",
  "HAYDEN": "MLHAYDEN",

  // Additional potential issues from common cricket names
  "WATSON": "SRWATSON",          // If SR Watson exists
  "SANGAKKARA": "KCSANGAKKARA",   // If KC Sangakkara exists  
  "DRAVID": "RDRAVID",           // If R Dravid exists
  "TENDULKAR": "SRTENDULKAR",    // If SR Tendulkar exists
  "GILCHRIST": "ACGILCHRIST",    // If AC Gilchrist exists
  "LAXMAN": "VVSLAXMAN",         // If VVS Laxman exists
  "SEHWAG": "VSEHWAG",           // If V Sehwag exists
  "YUVRAJ": "YUVRAJSINGH",       // If Yuvraj Singh exists
  "DHONI": "MSDHONI",            // If MS Dhoni exists
  "KOHLI": "VKOHLI",             // If V Kohli exists
  "ROHIT": "RSHARMA",            // If R Sharma exists
  "RAHUL": "KLRAHUL",            // If KL Rahul exists
  "JADEJA": "RAJADEJA",          // If RA Jadeja exists
  "ASHWIN": "RASHWIN",           // If R Ashwin exists
  "BUMRAH": "JBUMRAH",           // If J Bumrah exists
  "SHAMI": "MSHAMI",             // If M Shami exists
  "WILLIAMSON": "KWILLIAMSON",   // If K Williamson exists
  "BOULT": "TABOULT",            // If TA Boult exists
  "SOUTHEE": "TGSOUTHEE",        // If TG Southee exists
  "TAYLOR": "LRPLTAYLOR",        // If LRPL Taylor exists
  "GUPTILL": "MJGUPTILL",        // If MJ Guptill exists

  // South African players
  "MILLER": "DAMILLER",          // If DA Miller exists
  "MARKRAM": "AEMARKRAM",        // If AE Markram exists
  "KLAASEN": "HKLAASEN",         // If H Klaasen exists
  "BAVUMA": "TBAVUMA",           // If T Bavuma exists

  // West Indies players
  "GAYLE": "CHGAYLE",            // If CH Gayle exists
  "RUSSELL": "ADRUSSELL",        // If AD Russell exists
  "POLLARD": "KAPOLLARD",        // If KA Pollard exists
  "BRAVO": "DJBRAVO",            // If DJ Bravo exists
  "NARINE": "SPNARINE",          // If SP Narine exists
  "HOLDER": "JEHOLDER",          // If JO Holder exists
  "HETMYER": "SHETMYER",         // If S Hetmyer exists
  "POORAN": "NPOORAN",           // If N Pooran exists
  "HOPE": "SDHOPE",              // If SD Hope exists
  "JOSEPH": "ALZJOSEPH",         // If ALZ Joseph exists
};

// Apply manual mappings (these override automatic mappings)
Object.assign(PLAYER_KEY_MAPPING, MANUAL_MAPPINGS);

console.log("🔑 Comprehensive Player Key Mapping initialized:", Object.keys(PLAYER_KEY_MAPPING).length, "mappings");
console.log("📋 Manual mappings applied:", Object.keys(MANUAL_MAPPINGS).length, "overrides");

const CricGuess = () => {
  // ============================================================================
  // GAME STATE MANAGEMENT - Clean and minimal
  // ============================================================================
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameError, setGameError] = useState(null);
  const [squadFeedback, setSquadFeedback] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  // ============================================================================
  // BULLETPROOF PLAYER KEY RESOLUTION - Maximum compatibility
  // ============================================================================
  const resolvePlayerKey = (puzzleKey) => {
    console.log(`🔍 Resolving key: "${puzzleKey}"`);

    // Strategy 1: Direct lookup first
    if (playersData[puzzleKey]) {
      console.log(`✅ Direct match found: ${puzzleKey}`);
      return puzzleKey;
    }

    // Strategy 2: Manual mapping lookup (highest priority)
    if (PLAYER_KEY_MAPPING[puzzleKey]) {
      const mappedKey = PLAYER_KEY_MAPPING[puzzleKey];
      if (playersData[mappedKey]) {
        console.log(`🔑 Manual mapping: ${puzzleKey} -> ${mappedKey}`);
        return mappedKey;
      }
    }

    // Strategy 3: Dynamic substring matching (fallback)
    for (const fullKey of Object.keys(playersData)) {
      for (let i = 1; i <= 4; i++) {
        if (fullKey.length > i && fullKey.substring(i) === puzzleKey) {
          console.log(`🔗 Dynamic mapping: ${puzzleKey} -> ${fullKey}`);
          return fullKey;
        }
      }
    }

    // Strategy 4: Case variations
    const upperKey = puzzleKey.toUpperCase();
    if (playersData[upperKey]) {
      console.log(`📝 Case variation match: ${puzzleKey} -> ${upperKey}`);
      return upperKey;
    }

    // Strategy 5: Fuzzy name matching as last resort
    const fuzzyMatch = Object.keys(playersData).find(key => {
      const player = playersData[key];
      return player.aliases && player.aliases.some(alias => 
        alias.toUpperCase().includes(puzzleKey.toUpperCase()) ||
        puzzleKey.toUpperCase().includes(alias.toUpperCase())
      );
    });

    if (fuzzyMatch) {
      console.log(`🎯 Fuzzy alias match: ${puzzleKey} -> ${fuzzyMatch}`);
      return fuzzyMatch;
    }

    console.log(`❌ UNRESOLVED: "${puzzleKey}" - no mapping found`);
    console.log(`Available keys sample:`, Object.keys(playersData).slice(0, 10));
    return null;
  };

  // ============================================================================
  // MEMOIZED CURRENT PUZZLE - Prevents unnecessary re-processing
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
    console.log("🧩 Loading puzzle:", puzzle.id, "Target:", puzzle.targetPlayer);
    return puzzle;
  }, [currentPuzzleIndex]);

  // ============================================================================
  // MEMOIZED TARGET PLAYER - Enhanced resolution with multiple strategies
  // ============================================================================
  const targetPlayer = useMemo(() => {
    if (!currentPuzzle) return null;

    try {
      let targetPlayerKey = null;

      // Strategy 1: Direct key resolution
      const directKey = resolvePlayerKey(currentPuzzle.targetPlayer);
      if (directKey && playersData[directKey]) {
        targetPlayerKey = directKey;
        console.log(`✅ Direct resolution: ${currentPuzzle.targetPlayer} -> ${targetPlayerKey}`);
      }

      // Strategy 2: Match against Player of the Match name
      if (!targetPlayerKey && currentPuzzle.matchData?.scorecard?.player_of_match) {
        const pomName = currentPuzzle.matchData.scorecard.player_of_match.toUpperCase();
        console.log(`🎯 Searching for MOTM: "${pomName}"`);

        // Try to find player by full name match
        const foundPlayer = Object.entries(playersData).find(([key, player]) => {
          return player.fullName && player.fullName.toUpperCase() === pomName;
        });

        if (foundPlayer) {
          targetPlayerKey = foundPlayer[0];
          console.log(`🎯 MOTM name match: ${pomName} -> ${targetPlayerKey}`);
        }
      }

      // Strategy 3: Use original target player key as fallback
      if (!targetPlayerKey) {
        targetPlayerKey = currentPuzzle.targetPlayer;
        console.log("⚠️ Using original target key as fallback:", targetPlayerKey);
      }

      const targetPlayerData = playersData[targetPlayerKey];
      if (!targetPlayerData) {
        console.error("❌ Target player not found in players.json:", targetPlayerKey);
        console.error("Available keys sample:", Object.keys(playersData).slice(0, 10), "...");
        console.error("Key mapping for target:", PLAYER_KEY_MAPPING[currentPuzzle.targetPlayer]);
        return { key: targetPlayerKey, fullName: "Unknown Player" };
      }

      console.log("✅ Target player resolved:", targetPlayerData.fullName);
      return { ...targetPlayerData, key: targetPlayerKey };
    } catch (error) {
      console.error("❌ Error getting target player:", error);
      return { key: "ERROR", fullName: "Unknown Player" };
    }
  }, [currentPuzzle]);

  // ============================================================================
  // MEMOIZED SQUAD PROCESSING - Enhanced error handling and team assignment
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

      const team1Players = [];
      const team2Players = [];
      let playerIndex = 0;

      Object.entries(performances).forEach(([playerKey, perf]) => {
        const resolvedKey = resolvePlayerKey(playerKey);
        const player = resolvedKey ? playersData[resolvedKey] : null;

        playerIndex++;
        const fallbackBattingOrder = playerIndex;

        if (!player) {
          // Create fallback player with estimated data
          const fallbackPlayer = {
            key: playerKey, // ✅ USE ORIGINAL KEY for uniqueness
            originalKey: playerKey,
            resolvedKey: null,
            name: playerKey.charAt(0).toUpperCase() + playerKey.slice(1).toLowerCase(),
            team: perf.team,
            role: "Player",
            runs: perf.runs_in_match || 0,
            wickets: perf.wickets_in_match || 0,
            battingOrder: fallbackBattingOrder,
            isCaptain: false,
            isWicketkeeper: false,
            // Add missing data for feedback system
            country: "Unknown",
            countryFlag: "🏳️",
            matches: 0,
          };

          // Team assignment logic
          const teamName = perf.team;
          if (teamName === team1Name || teamName.includes(team1Name) || team1Name.includes(teamName)) {
            team1Players.push(fallbackPlayer);
          } else if (teamName === team2Name || teamName.includes(team2Name) || team2Name.includes(teamName)) {
            team2Players.push(fallbackPlayer);
          } else {
            if (team1Players.length <= team2Players.length) {
              team1Players.push(fallbackPlayer);
            } else {
              team2Players.push(fallbackPlayer);
            }
          }
          return;
        }

        // Create enhanced player object with feedback data
        const enhancedPlayer = {
          ...player,
          key: playerKey, // ✅ USE ORIGINAL KEY for React uniqueness
          originalKey: playerKey,
          resolvedKey: resolvedKey,
          name: player.fullName,
          team: perf.team,
          runs: perf.runs_in_match || 0,
          wickets: perf.wickets_in_match || 0,
          battingOrder: fallbackBattingOrder,
          // Ensure we have all required feedback fields
          country: player.country || "Unknown",
          countryFlag: player.countryFlag || "🏳️",
          role: player.role || "Player",
          matches: player.matches || 0,
        };

        // Team assignment
        const teamName = perf.team;
        if (teamName === team1Name || teamName.includes(team1Name) || team1Name.includes(teamName)) {
          team1Players.push(enhancedPlayer);
        } else if (teamName === team2Name || teamName.includes(team2Name) || team2Name.includes(teamName)) {
          team2Players.push(enhancedPlayer);
        } else {
          if (team1Players.length <= team2Players.length) {
            team1Players.push(enhancedPlayer);
          } else {
            team2Players.push(enhancedPlayer);
          }
        }
      });

      console.log("🏏 Squad Processing Results:");
      console.log(`Team 1 (${team1Name}): ${team1Players.length} players`);
      console.log(`Team 2 (${team2Name}): ${team2Players.length} players`);
      console.log("All performance keys:", Object.keys(performances));

      return {
        team1: team1Players,
        team2: team2Players,
        team1Name,
        team2Name,
        error: null,
      };
    } catch (error) {
      console.error("❌ Squad processing error:", error);
      return {
        team1: [],
        team2: [],
        team1Name: "",
        team2Name: "",
        error: error.message,
      };
    }
  }, [currentPuzzle, targetPlayer]);

  // ============================================================================
  // ENHANCED FEEDBACK SYSTEM - Nationality, Role, and Matches comparison (CLEAN)
  // ============================================================================
  const generateEnhancedFeedback = (selectedPlayerKey, targetPlayerKey) => {
    const selectedPlayer = playersData[selectedPlayerKey];
    const targetPlayerData = playersData[targetPlayerKey];

    if (!selectedPlayer || !targetPlayerData) {
      return {
        nationality: "❌",
        role: "❌", 
        matches: "❌"
      };
    }

    // Enhanced feedback - ONLY the 3 new categories
    const nationalityMatch = selectedPlayer.country === targetPlayerData.country;
    const roleMatch = selectedPlayer.role === targetPlayerData.role;

    const selectedMatches = selectedPlayer.matches || 0;
    const targetMatches = targetPlayerData.matches || 0;

    let matchesIndicator = "❌";
    if (selectedMatches === targetMatches) {
      matchesIndicator = "✅";
    } else if (selectedMatches < targetMatches) {
      matchesIndicator = "🔼"; // Target has more matches
    } else {
      matchesIndicator = "🔽"; // Target has fewer matches
    }

    return {
      nationality: nationalityMatch ? "✅" : "❌",
      role: roleMatch ? "✅" : "❌", 
      matches: matchesIndicator
    };
  };

  const handlePlayerSelection = (selectedPlayer) => {
    if (gameOver || gameWon || selectedPlayers.has(selectedPlayer.key)) {
      return;
    }

    console.log(`🎯 Player selected: ${selectedPlayer.name} (${selectedPlayer.key})`);
    console.log(`🎯 Target player: ${targetPlayer?.fullName} (${targetPlayer?.key})`);

    // For feedback comparison, use the resolved key
    const selectedKeyForComparison = selectedPlayer.resolvedKey || selectedPlayer.key;

    // WIN CONDITION CHECK
    if (selectedKeyForComparison === targetPlayer?.key) {
      console.log("🏆 CORRECT! Player wins!");

      const feedback = generateEnhancedFeedback(selectedKeyForComparison, targetPlayer.key);
      const newFeedback = [
        ...squadFeedback,
        {
          playerName: selectedPlayer.name,
          isCorrect: true,
          feedback,
        },
      ];

      setSquadFeedback(newFeedback);
      setSelectedPlayers(new Set([...selectedPlayers, selectedPlayer.key]));
      setGameWon(true);
      setGameOver(true);
      return;
    }

    // INCORRECT GUESS - Generate enhanced feedback clues
    const feedback = generateEnhancedFeedback(selectedKeyForComparison, targetPlayer.key);
    const newFeedback = [
      ...squadFeedback,
      {
        playerName: selectedPlayer.name,
        isCorrect: false,
        feedback,
      },
    ];

    setSquadFeedback(newFeedback);
    setSelectedPlayers(new Set([...selectedPlayers, selectedPlayer.key]));

    // LOSS CONDITION CHECK
    if (newFeedback.length >= STABLE_PUZZLE_CONFIG.maxGuesses) {
      console.log("💀 GAME OVER! Used all guesses.");
      setGameOver(true);
    }
  };

  // ============================================================================
  // GAME CONTROL FUNCTIONS - Puzzle progression and state management
  // ============================================================================
  const resetPuzzleState = () => {
    setSquadFeedback([]);
    setSelectedPlayers(new Set());
    setGameWon(false);
    setGameOver(false);
    setGameError(null);
  };

  const nextPuzzle = () => {
    if (currentPuzzleIndex < STABLE_PUZZLE_CONFIG.puzzles.length - 1) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
      resetPuzzleState();
    } else {
      alert("🏆 Congratulations! You've completed all puzzles!");
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS - UI component rendering
  // ============================================================================
  const renderScorecard = () => {
    if (!currentPuzzle?.matchData?.scorecard) return null;

    const scorecard = currentPuzzle.matchData.scorecard;

    return (
      <div className="scorecard">
        {/* ✅ Main Puzzle Header */}
        <div className="puzzle-main-header">
          Guess the man of the match of this game
        </div>

        {/* ✅ Match Title */}
        <div className="match-title">
          {scorecard.teams?.[0]} vs {scorecard.teams?.[1]}
        </div>

        {/* ✅ Venue and Date */}
        <div className="venue-date">
          {scorecard.venue} • {scorecard.date}
        </div>

        {/* ✅ Team Scores - INLINE FORMAT */}
        <div className="team-scores-inline">
          <div className="team-score-inline">
            <span className="team-name-inline">{scorecard.teams?.[0]}</span>
            <span className="score-inline">
              {scorecard.team_scores?.[scorecard.teams?.[0]]?.runs || 0}/
              {scorecard.team_scores?.[scorecard.teams?.[0]]?.wickets || 0}
            </span>
          </div>
          <div className="vs-inline">vs</div>
          <div className="team-score-inline">
            <span className="team-name-inline">{scorecard.teams?.[1]}</span>
            <span className="score-inline">
              {scorecard.team_scores?.[scorecard.teams?.[1]]?.runs || 0}/
              {scorecard.team_scores?.[scorecard.teams?.[1]]?.wickets || 0}
            </span>
          </div>
        </div>

        {/* ✅ REMOVED: Winner announcement and MOTM question */}
      </div>
    );
  };

  // ============================================================================
  // TABLE-STYLE FEEDBACK DISPLAY - Clean Column Headers (Option 2)
  // ============================================================================
  const renderFeedbackDisplay = () => {
    if (squadFeedback.length === 0) return null;

    return (
      <div className="feedback-container">
        <div className="feedback-header">
          <h3>🔍 Your Guesses ({squadFeedback.length}/{STABLE_PUZZLE_CONFIG.maxGuesses})</h3>
        </div>

        {/* TABLE HEADERS */}
        <div className="feedback-table-header">
          <div className="header-cell-name">Player Name</div>
          <div className="header-cell">NAT</div>
          <div className="header-cell">ROLE</div>
          <div className="header-cell">MATCHES</div>
        </div>

        {/* SEPARATOR LINE */}
        <div className="feedback-separator"></div>

        {/* DATA ROWS */}
        {squadFeedback.map((feedback, index) => (
          <div key={index} className={`feedback-table-row ${feedback.isCorrect ? 'row-correct' : 'row-incorrect'}`}>
            <div className="data-cell-name">Guess {index + 1}: {feedback.playerName}</div>
            <div className="data-cell">{feedback.feedback.nationality}</div>
            <div className="data-cell">{feedback.feedback.role}</div>
            <div className="data-cell">{feedback.feedback.matches}</div>
          </div>
        ))}

        {/* LEGEND */}
        <div className="feedback-legend-table">
          ✅ = Match | ❌ = Different | 🔼 = MOTM had more | 🔽 = MOTM had less
        </div>
      </div>
    );
  };

  const renderGameStatus = () => {
    if (gameWon) {
      return (
        <div className="status-win">
          <div className="text-2xl mb-2">🏆 Congratulations!</div>
          <div className="mb-3">
            You found the Man of the Match: <strong>{targetPlayer?.fullName}</strong>
          </div>
          <div className="text-sm mb-4">
            Solved in {squadFeedback.length} guess{squadFeedback.length !== 1 ? 'es' : ''}!
          </div>
          <button onClick={nextPuzzle} className="btn btn-green">
            Next Puzzle →
          </button>
        </div>
      );
    }

    if (gameOver && !gameWon) {
      return (
        <div className="status-lose">
          <div className="text-2xl mb-2">💀 Game Over!</div>
          <div className="mb-3">
            The Man of the Match was: <strong>{targetPlayer?.fullName}</strong>
          </div>
          <div className="text-sm mb-4">
            Better luck next time!
          </div>
          <button onClick={nextPuzzle} className="btn btn-blue">
            Next Puzzle →
          </button>
        </div>
      );
    }

    return null;
  };

  const renderSquadDisplay = () => {
    if (squadPlayers.error) {
      return (
        <div className="status-error">
          <div className="text-red-600 mb-2">⚠️ Squad Loading Error</div>
          <div className="text-sm">{squadPlayers.error}</div>
        </div>
      );
    }

    const isPlayerSelected = (player) => {
      return selectedPlayers.has(player.key) || 
             (currentPuzzle?.matchData?.playerPerformances && 
              Object.keys(currentPuzzle.matchData.playerPerformances).some(perfKey => 
                selectedPlayers.has(perfKey) && resolvePlayerKey(perfKey) === player.key
              ));
    };

    const isPlayerCorrect = (player) => {
      const keyForComparison = player.resolvedKey || player.key;
      return gameWon && keyForComparison === targetPlayer?.key;
    };

    const getPlayerStateClass = (player) => {
      if (isPlayerCorrect(player)) return "player-item-mobile player-correct";
      if (isPlayerSelected(player)) return "player-item-mobile player-selected";
      if (gameOver) return "player-item-mobile player-disabled";
      return "player-item-mobile player-selectable";
    };

    const shouldShowStats = (player) => {
      return gameOver || isPlayerSelected(player);
    };

    const getPlayerStats = (player) => {
      if (!currentPuzzle?.matchData?.playerPerformances) return "0r 0bf 0w";

      let performance = null;
      const performances = currentPuzzle.matchData.playerPerformances;

      if (performances[player.originalKey || player.key]) {
        performance = performances[player.originalKey || player.key];
      } else {
        for (const [originalKey, perf] of Object.entries(performances)) {
          if (resolvePlayerKey(originalKey) === player.resolvedKey) {
            performance = perf;
            break;
          }
        }
      }

      if (!performance) return "0r 0bf 0w";

      const runs = performance.runs_in_match || 0;
      const ballsFaced = performance.balls_faced || 0;
      const wickets = performance.wickets_in_match || 0;

      return `${runs}r ${ballsFaced}bf ${wickets}w`;
    };

    return (
      <div className="squads-container-mobile">
        {/* Team 1 */}
        <div className="team-squad-mobile">
          <div className="squad-header-mobile">
            <div className="team-name-mobile">{squadPlayers.team1Name}</div>
            <div className="player-count-mobile">({squadPlayers.team1.length} players)</div>
          </div>
          <div className="players-list-mobile">
            {squadPlayers.team1.map((player) => (
              <div
                key={player.key} // ✅ Now using unique original key
                className={getPlayerStateClass(player)}
                onClick={() => !gameOver && handlePlayerSelection(player)}
              >
                <div className="player-info-mobile">
                  <div className="player-name-mobile">{player.name}</div>
                  <div className="player-role-mobile">{player.role}</div>
                </div>
                <div className={shouldShowStats(player) ? "stats-mobile-revealed" : "stats-mobile-hidden"}>
                  {shouldShowStats(player) ? getPlayerStats(player) : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 */}
        <div className="team-squad-mobile">
          <div className="squad-header-mobile">
            <div className="team-name-mobile">{squadPlayers.team2Name}</div>
            <div className="player-count-mobile">({squadPlayers.team2.length} players)</div>
          </div>
          <div className="players-list-mobile">
            {squadPlayers.team2.map((player) => (
              <div
                key={player.key} // ✅ Now using unique original key
                className={getPlayerStateClass(player)}
                onClick={() => !gameOver && handlePlayerSelection(player)}
              >
                <div className="player-info-mobile">
                  <div className="player-name-mobile">{player.name}</div>
                  <div className="player-role-mobile">{player.role}</div>
                </div>
                <div className={shouldShowStats(player) ? "stats-mobile-revealed" : "stats-mobile-hidden"}>
                  {shouldShowStats(player) ? getPlayerStats(player) : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER - Clean production interface
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
      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="popup-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowHowToPlay(false)}>×</button>
            <h2 className="popup-title">How To Play</h2>
            <p className="popup-subtitle">
              Guess the Man of the Match from the cricket scorecard in {STABLE_PUZZLE_CONFIG.maxGuesses} tries.
            </p>
            <div className="popup-text">
              <ul>
                <li>🏏 Study the cricket scorecard above</li>
                <li>🔍 Use the team rosters to identify players</li>
                <li>🎯 Click on players to make your guess</li>
                <li>📊 Get feedback clues: Nationality, Role, Total Matches</li>
                <li>🏆 Find the Man of the Match to win!</li>
              </ul>
            </div>
            <div className="popup-footer">
              Good luck, cricket detective! 🕵️‍♂️
            </div>
          </div>
        </div>
      )}

      <div className="game-container">
        {/* Header */}
        <div className="header-section">
          <h1 className="text-3xl font-bold text-blue-600 text-center mb-4">🏏 CricGuess</h1>
          <button 
            onClick={() => setShowHowToPlay(true)} 
            className="how-to-play-btn"
          >
            How to Play
          </button>
        </div>

        {/* Cricket Scorecard */}
        {renderScorecard()}

        {/* Game Status */}
        {renderGameStatus()}

        {/* Feedback Display */}
        {renderFeedbackDisplay()}

        {/* Squad Display */}
        {renderSquadDisplay()}

        {/* Debug info */}
        {STABLE_FEATURES.showDebugInfo && (
          <div className="mt-6 text-xs text-gray-500 text-center">
            Debug: Puzzle {currentPuzzleIndex + 1}/{STABLE_PUZZLE_CONFIG.puzzles.length} | 
            Target: {targetPlayer?.fullName} ({targetPlayer?.key}) | 
            Guesses: {squadFeedback.length}/{STABLE_PUZZLE_CONFIG.maxGuesses}
          </div>
        )}
      </div>
    </div>
  );
};

export default CricGuess;