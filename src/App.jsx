/*
 * CricGuess - SURGICAL FIXES ONLY
 * 
 * FIXES APPLIED:
 * ==============
 * ✅ Modal positioning fix - changed className="overlay" to "game-overlay" (3 places ONLY)
 * ✅ Share format fix - Bowldem branding with proper grid pattern
 * ✅ ALL existing UI/styling preserved exactly as it was
 */

import React, { useState, useMemo, useEffect } from "react";
import playersData from "./data/updatedplayers.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

// ============================================================================
// STABLE CONFIG - Performance optimized
// ============================================================================
const STABLE_FEATURES = {
  useSquadDiscovery: true,
  useManOfTheMatch: true,
  showDebugInfo: true,
  maxGuesses: 3,
  enhancedMobileLayout: true,
  hidePlayerStats: true,
};

const STABLE_PUZZLE_CONFIG = {
  maxGuesses: STABLE_FEATURES.maxGuesses,
  puzzles: matchPuzzlesData.puzzles || [],
  targetType: STABLE_FEATURES.useManOfTheMatch
    ? "Man of the Match"
    : "Target Player",
};

function App() {
  // ============================================================================
  // STATE MANAGEMENT - Enhanced with layout tracking
  // ============================================================================
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [squadFeedback, setSquadFeedback] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // NEW: Sticky feedback tracking for enhanced UX
  const [isSticky, setIsSticky] = useState(false);

  // ============================================================================
  // SCROLL TRACKING FOR STICKY FEEDBACK - SOLUTION FOR SCROLL ISSUE
  // ============================================================================
  useEffect(() => {
    const handleScroll = () => {
      const feedbackElement = document.querySelector('.feedback-container-enhanced');
      if (feedbackElement) {
        const rect = feedbackElement.getBoundingClientRect();
        setIsSticky(rect.top <= 16); // 1rem = 16px
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ============================================================================
  // PUZZLE DATA PROCESSING - Enhanced with error handling
  // ============================================================================
  const currentPuzzle = useMemo(() => {
    const puzzle = STABLE_PUZZLE_CONFIG.puzzles[currentPuzzleIndex];
    if (!puzzle) {
      console.warn("🔍 DEBUG: No puzzle found for index:", currentPuzzleIndex);
      return null;
    }

    console.log("🔍 DEBUG: Loading puzzle:", puzzle.id, "Target:", puzzle.targetPlayer);
    return puzzle;
  }, [currentPuzzleIndex]);

  // ============================================================================
  // ENHANCED PLAYER KEY RESOLUTION - Multi-strategy approach
  // ============================================================================
  const manualMappings = useMemo(() => ({
    // CRITICAL FIXES FOR MISSING PLAYERS
    BBMCCULLUM: "MCCULLUM",      // Puzzle 2 McCullum fix
    SCGANGULY: "GANGULY",        // Puzzle 2 Ganguly fix  
    RDRAVID: "DRAVID",           // Puzzle 2 Dravid fix
    MKAIF: "KAIF",               // Mohammad Kaif mapping

    // Legacy mappings (keep for backwards compatibility)
    MCCULLUM: "MCCULLUM",        // Direct mapping
    VSEHWAG: "VSEHWAG",          // Direct mapping
    VKOHLI: "VKOHLI",            // Direct mapping
    HUSSEY: "MEHUSSEY",          // Mike Hussey mapping
    SHOAIBMALIK: "SHOAIBMALIK"   // Direct mapping
  }), []);

  const resolvePlayerKey = (puzzleKey) => {
    if (!puzzleKey) return null;

    console.log("🔍 DEBUG: Player key resolution:", puzzleKey);

    // Strategy 1: Direct match
    if (playersData[puzzleKey]) {
      console.log("🔍 DEBUG: Direct match found:", puzzleKey);
      return puzzleKey;
    }

    // Strategy 2: Manual mapping (highest priority)
    if (manualMappings[puzzleKey]) {
      const mapped = manualMappings[puzzleKey];
      console.log("🔍 DEBUG: Manual mapping found:", puzzleKey, "→", mapped);
      if (playersData[mapped]) {
        return mapped;
      }
    }

    // Strategy 3: Substring matching (handles prefixes like SCGANGULY → GANGULY)
    for (const fullKey of Object.keys(playersData)) {
      for (let i = 1; i <= 4; i++) {
        if (fullKey.substring(i) === puzzleKey) {
          console.log("🔍 DEBUG: Substring match found:", puzzleKey, "→", fullKey);
          return fullKey;
        }
      }
    }

    console.warn("🔍 DEBUG: Player not found:", puzzleKey);
    return null;
  };

  // ============================================================================
  // FORMAT DETECTION - Enhanced team matching
  // ============================================================================
  const getPuzzleFormat = (puzzle) => {
    if (!puzzle?.matchData?.scorecard?.teams) return "IPL";

    const teams = puzzle.matchData.scorecard.teams;

    // International teams indicate ODI
    const internationalTeams = [
      "India", "Pakistan", "Sri Lanka", "Australia", "England", 
      "New Zealand", "South Africa", "West Indies", "Bangladesh", 
      "Zimbabwe", "Afghanistan", "Ireland", "Scotland", "Netherlands"
    ];

    // IPL franchise teams indicate IPL
    const iplTeams = [
      "Mumbai Indians", "Chennai Super Kings", "Royal Challengers Bangalore",
      "Kolkata Knight Riders", "Delhi Daredevils", "Delhi Capitals", 
      "Rajasthan Royals", "Kings XI Punjab", "Punjab Kings",
      "Sunrisers Hyderabad", "Deccan Chargers", "Pune Warriors India",
      "Rising Pune Supergiant", "Gujarat Lions", "Kochi Tuskers Kerala"
    ];

    const isInternationalMatch = teams.every(team => 
      internationalTeams.some(intlTeam => 
        team.toLowerCase().includes(intlTeam.toLowerCase())
      )
    );

    const format = isInternationalMatch ? "ODI" : "IPL";
    console.log("🔍 DEBUG: Format detection:", teams, "→", format);
    return format;
  };

  // ============================================================================
  // SQUAD PROCESSING - Enhanced with placeholder support
  // ============================================================================
  const squadPlayers = useMemo(() => {
    if (!currentPuzzle?.matchData?.playerPerformances) {
      console.warn("🔍 DEBUG: No player performances found");
      return { team1: [], team2: [], format: "IPL" };
    }

    const performances = currentPuzzle.matchData.playerPerformances;
    const teams = {};

    // Placeholder players for missing squad members
    const placeholderInfo = {};

    // Puzzle-specific placeholders
    if (currentPuzzle?.id === 4) {
      placeholderInfo['INZAMAMULHAQ'] = {
        fullName: 'Inzamam-ul-Haq',
        country: 'Pakistan',
        role: 'Batsman',
        iplMatches: 0, iplRuns: 0, iplWickets: 0,
        odiMatches: 378, odiRuns: 11739, odiWickets: 3
      };
      placeholderInfo['YOUNISKHAN'] = {
        fullName: 'Younis Khan',
        country: 'Pakistan', 
        role: 'Batsman',
        iplMatches: 0, iplRuns: 0, iplWickets: 0,
        odiMatches: 265, odiRuns: 7249, odiWickets: 4
      };
    }

    console.log("🔍 DEBUG: Processing", Object.keys(performances).length, "players");

    Object.entries(performances).forEach(([playerKey, playerData]) => {
      if (!playerData.played_in_match) return;

      const team = playerData.team;
      if (!teams[team]) teams[team] = [];

      // Special handling for Puzzle 5 T Kohli vs Virat Kohli conflict
      let resolvedKey = resolvePlayerKey(playerKey);
      let player = resolvedKey ? playersData[resolvedKey] : null;

      if (currentPuzzle.id === 5 && playerKey === 'KOHLI') {
        console.log("🔍 DEBUG: Puzzle 5 KOHLI conflict - preventing Virat Kohli mapping");
        resolvedKey = null;
        player = null;
      }

      // Check for placeholder
      if (!player && placeholderInfo[playerKey]) {
        player = placeholderInfo[playerKey];
        console.log("🔍 DEBUG: Using placeholder for", playerKey);
      }

      // Fallback to match data
      if (!player) {
        player = {
          fullName: playerData.full_name || "Unknown Player",
          country: "Unknown",
          role: "Player",
          iplMatches: 0, iplRuns: 0, iplWickets: 0,
          odiMatches: 0, odiRuns: 0, odiWickets: 0
        };
        console.log("🔍 DEBUG: Using match data fallback for", playerKey);
      }

      teams[team].push({
        key: playerKey,
        ...player,
        matchStats: {
          runs: playerData.runs_in_match || 0,
          wickets: playerData.wickets_in_match || 0,
          ballsFaced: playerData.balls_faced || 0,
          ballsBowled: playerData.balls_bowled || 0
        }
      });

      console.log("✅ DEBUG:", playerKey, "processed successfully");
    });

    const teamNames = Object.keys(teams);
    console.log("🔍 DEBUG: Final squad composition:");
    teamNames.forEach(team => {
      console.log(`${team} (${teams[team].length}):`, teams[team].map(p => p.key));
    });

    if (teamNames.length === 2) {
      const [team1Name, team2Name] = teamNames;
      if (teams[team1Name].length === 11 && teams[team2Name].length === 11) {
        console.log("✅ DEBUG: Perfect squad balance achieved! 11v11");
      } else {
        console.warn("⚠️ DEBUG: Squad imbalance detected:", 
          teams[team1Name].length, "vs", teams[team2Name].length);
      }
    }

    return {
      team1: teams[teamNames[0]] || [],
      team2: teams[teamNames[1]] || [],
      team1Name: teamNames[0],
      team2Name: teamNames[1],
      format: getPuzzleFormat(currentPuzzle)
    };
  }, [currentPuzzle, manualMappings]);

  // ============================================================================
  // PLAYER INFO RESOLVER - Enhanced with format-specific data
  // ============================================================================
  const getPlayerInfo = (playerKey) => {
    const resolvedKey = resolvePlayerKey(playerKey);
    if (resolvedKey && playersData[resolvedKey]) {
      return playersData[resolvedKey];
    }

    // Check both teams for the player
    const allPlayers = [...(squadPlayers.team1 || []), ...(squadPlayers.team2 || [])];
    const player = allPlayers.find(p => p.key === playerKey);

    if (player) {
      return {
        fullName: player.fullName,
        country: player.country,
        role: player.role,
        iplMatches: player.iplMatches || 0,
        iplRuns: player.iplRuns || 0,
        iplWickets: player.iplWickets || 0,
        odiMatches: player.odiMatches || 0,
        odiRuns: player.odiRuns || 0,
        odiWickets: player.odiWickets || 0
      };
    }

    return {
      fullName: "Unknown Player",
      country: "Unknown",
      role: "Player",
      iplMatches: 0, iplRuns: 0, iplWickets: 0,
      odiMatches: 0, odiRuns: 0, odiWickets: 0
    };
  };

  // ============================================================================
  // OLD FEEDBACK SYSTEM - Format-specific career statistics (Role, Runs, Wickets, Matches)
  // NEW SYSTEM: P (Played in game), M (Same team), R (Same role), T (MOTM)
  // ============================================================================
  const generateEnhancedFeedback = (selectedKey, targetKey) => {
    const selectedInfo = getPlayerInfo(selectedKey);
    const targetPlayerData = playersData[resolvePlayerKey(targetKey)] || {};
    const currentFormat = getPuzzleFormat(currentPuzzle);

    console.log("🔍 DEBUG: Generating feedback for", selectedKey, "vs", targetKey, "format:", currentFormat);

    // Format-specific statistics
    const formatPrefix = currentFormat === 'IPL' ? 'ipl' : 'odi';
    const selectedRuns = selectedInfo[`${formatPrefix}Runs`] || 0;
    const targetRuns = targetPlayerData[`${formatPrefix}Runs`] || 0;
    const selectedWickets = selectedInfo[`${formatPrefix}Wickets`] || 0;
    const targetWickets = targetPlayerData[`${formatPrefix}Wickets`] || 0;
    const selectedMatches = selectedInfo[`${formatPrefix}Matches`] || 0;
    const targetMatches = targetPlayerData[`${formatPrefix}Matches`] || 0;

    return {
      player: selectedInfo.fullName,
      role: selectedInfo.role === targetPlayerData.role ? "✅" : "❌",
      runs: selectedRuns === targetRuns ? "✅" : (selectedRuns < targetRuns ? "🔼" : "🔽"),
      wickets: selectedWickets === targetWickets ? "✅" : (selectedWickets < targetWickets ? "🔼" : "🔽"),
      matches: selectedMatches === targetMatches ? "✅" : (selectedMatches < targetMatches ? "🔼" : "🔽"),
      selectedKey: selectedKey
    };
  };

  // ============================================================================
  // GAME LOGIC - Enhanced win/lose detection
  // ============================================================================
  const handlePlayerSelection = (playerKey) => {
    if (gameWon || gameOver || selectedPlayers.has(playerKey)) return;

    console.log("🔍 DEBUG: Player selected:", playerKey);

    const targetKey = currentPuzzle?.targetPlayer;
    const resolvedTargetKey = resolvePlayerKey(targetKey);
    const resolvedSelectedKey = resolvePlayerKey(playerKey);

    console.log("🔍 DEBUG: Target resolution:", targetKey, "→", resolvedTargetKey);
    console.log("🔍 DEBUG: Selected resolution:", playerKey, "→", resolvedSelectedKey);

    const feedback = generateEnhancedFeedback(playerKey, targetKey);
    const newFeedback = [...squadFeedback, feedback];

    setSquadFeedback(newFeedback);
    setSelectedPlayers(prev => new Set([...prev, playerKey]));

    // Win condition: direct key match OR resolved key match
    const isWin = (
      playerKey === targetKey || 
      resolvedSelectedKey === resolvedTargetKey ||
      resolvedSelectedKey === targetKey ||
      playerKey === resolvedTargetKey
    );

    if (isWin) {
      console.log("🎉 DEBUG: WIN! Player found");
      setGameWon(true);
      setTimeout(() => setShowSuccessModal(true), 500);
    } else if (newFeedback.length >= STABLE_PUZZLE_CONFIG.maxGuesses) {
      console.log("💔 DEBUG: Game over - max guesses reached");
      setGameOver(true);
      setTimeout(() => setShowGameOverModal(true), 500);
    }
  };

  // ============================================================================
  // NAVIGATION - Enhanced puzzle management
  // ============================================================================
  const handleNextPuzzle = () => {
    if (currentPuzzleIndex < STABLE_PUZZLE_CONFIG.puzzles.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
      setGameWon(false);
      setGameOver(false);
      setSquadFeedback([]);
      setSelectedPlayers(new Set());
      setShowSuccessModal(false);
      setShowGameOverModal(false);
      console.log("🔍 DEBUG: Moving to next puzzle");
    }
  };

  // ============================================================================
  // SHARE FUNCTIONALITY - FIXED: GRID PATTERN WITH BOWLDEM BRANDING
  // ============================================================================
  const generateShareText = () => {
    const currentFormat = getPuzzleFormat(currentPuzzle);
    const puzzleNumber = currentPuzzle?.id || currentPuzzleIndex + 1;

    // Generate grid pattern with line breaks (each guess on separate line)
    const feedbackLines = squadFeedback.map(feedback => 
      `${feedback.role}${feedback.runs}${feedback.wickets}${feedback.matches}`
    );

    const gridPattern = feedbackLines.join('\n');

    const resultText = gameWon 
      ? '🎯 Found the Man of the Match!' 
      : '💔 Better luck next time!';

    return `🏏 Bowldem #${puzzleNumber} ${currentFormat} Match\n${gridPattern}\n${resultText}\n\nPlay at: bowldem.com`;
  };

  const handleShare = () => {
    const shareText = generateShareText();

    if (navigator.share) {
      navigator.share({
        title: `Bowldem #${currentPuzzle?.id || currentPuzzleIndex + 1}`,
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  };

  // ============================================================================
  // TV BROADCAST SCORECARD RENDERING
  // ============================================================================
  const renderBroadcastScorecard = () => {
    if (!currentPuzzle) return null;

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

          <div className="vs-separator">vs</div>

          <div className="team-display">
            <div className="team-name-broadcast">{team2Name}</div>
            <div className="team-score-broadcast">
              {team2Score?.runs || "N/A"}/{team2Score?.wickets || "N/A"}
            </div>
          </div>
        </div>

        <div className="match-result">
          <div className="winner-announcement">
            🏆 Winner: {scorecard.winner}
          </div>
          <div className="motm-mystery">
            🎯 Man of the Match: ❓
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // ENHANCED FEEDBACK DISPLAY - SOLUTION FOR PREVIOUS ISSUES
  // ============================================================================
  const renderNewFeedbackDisplay = () => {
    const currentFormat = squadPlayers?.format || getPuzzleFormat(currentPuzzle) || "IPL";

    if (squadFeedback.length === 0) {
      return (
        <div className="feedback-placeholder">
          <div className="feedback-title">🎯 Make your guess!</div>
          <div className="feedback-subtitle">
            Select a player to get clues about role, career {currentFormat.toLowerCase()} stats
          </div>
          <div className="feedback-legend">
            <div className="legend-row">
              <strong>Role</strong> • <strong>{currentFormat} Runs</strong> • <strong>{currentFormat} Wickets</strong> • <strong>{currentFormat} Matches</strong>
            </div>
            <div className="legend-symbols">
              ✅ Match • 🔼 Higher • 🔽 Lower
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="feedback-display">
        <div className="feedback-header">
          <div className="feedback-title">🎯 Your Guesses</div>
          <div className="attempts-counter">
            {squadFeedback.length}/{STABLE_PUZZLE_CONFIG.maxGuesses}
          </div>
        </div>

        <div className="feedback-grid">
          <div className="feedback-grid-header">
            <span>Player</span>
            <span>Role</span>
            <span>{currentFormat} Runs</span>
            <span>{currentFormat} Wickets</span>
            <span>{currentFormat} Matches</span>
          </div>

          {squadFeedback.map((feedback, index) => (
            <div key={index} className="feedback-row">
              <span className="player-name">{feedback.player}</span>
              <span className="feedback-cell">{feedback.role}</span>
              <span className="feedback-cell">{feedback.runs}</span>
              <span className="feedback-cell">{feedback.wickets}</span>
              <span className="feedback-cell">{feedback.matches}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TEAM COLOR MAPPING
  // ============================================================================
  const getTeamColorClass = (teamName) => {
    if (!teamName) return "team-colors-default";

    const team = teamName.toLowerCase();

    // IPL team colors
    if (team.includes("mumbai") || team.includes("mi")) return "team-colors-mumbai";
    if (team.includes("chennai") || team.includes("csk")) return "team-colors-chennai";
    if (team.includes("bangalore") || team.includes("rcb")) return "team-colors-rcb";
    if (team.includes("kolkata") || team.includes("kkr")) return "team-colors-kkr";
    if (team.includes("delhi")) return "team-colors-delhi";
    if (team.includes("punjab") || team.includes("kings xi")) return "team-colors-punjab";
    if (team.includes("rajasthan")) return "team-colors-rajasthan";
    if (team.includes("sunrisers") || team.includes("hyderabad")) return "team-colors-srh";

    // International team colors
    if (team.includes("india")) return "team-colors-india";
    if (team.includes("australia")) return "team-colors-australia";
    if (team.includes("england")) return "team-colors-england";
    if (team.includes("pakistan")) return "team-colors-pakistan";
    if (team.includes("sri lanka")) return "team-colors-sri-lanka";
    if (team.includes("new zealand")) return "team-colors-new-zealand";
    if (team.includes("south africa")) return "team-colors-south-africa";
    if (team.includes("west indies")) return "team-colors-west-indies";

    return "team-colors-default";
  };

  // ============================================================================
  // ENHANCED SQUAD DISPLAY - MOBILE OPTIMIZED WITH SPACIOUS DESIGN
  // ============================================================================
  const renderEnhancedSquadDisplay = () => {
    if (!squadPlayers || squadPlayers.error) {
      return (
        <div className="squad-container">
          <div className="error-message">
            {squadPlayers?.error || "Unable to load squad data"}
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Team 1 - Enhanced with spacious mobile design */}
        <div className="team-squad-enhanced">
          <div className={`squad-header-enhanced ${getTeamColorClass(squadPlayers.team1Name)}`}>
            <div className="team-name-enhanced">{squadPlayers.team1Name}</div>
            <div className="player-count-enhanced">
              {squadPlayers.team1.length} Players
            </div>
          </div>
          <div className="players-grid-enhanced">
            {squadPlayers.team1.map((player, index) => (
              <div
                key={`team1-${index}`}
                className={`player-card-enhanced ${
                  selectedPlayers.has(player.key) ? 'selected' : ''
                } ${gameOver || gameWon ? 'disabled' : ''}`}
                onClick={() => handlePlayerSelection(player.key)}
              >
                <div className="player-name-enhanced">{player.fullName}</div>
                <div className="player-role-enhanced">{player.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team 2 - Enhanced with spacious mobile design */}
        <div className="team-squad-enhanced">
          <div className={`squad-header-enhanced ${getTeamColorClass(squadPlayers.team2Name)}`}>
            <div className="team-name-enhanced">{squadPlayers.team2Name}</div>
            <div className="player-count-enhanced">
              {squadPlayers.team2.length} Players
            </div>
          </div>
          <div className="players-grid-enhanced">
            {squadPlayers.team2.map((player, index) => (
              <div
                key={`team2-${index}`}
                className={`player-card-enhanced ${
                  selectedPlayers.has(player.key) ? 'selected' : ''
                } ${gameOver || gameWon ? 'disabled' : ''}`}
                onClick={() => handlePlayerSelection(player.key)}
              >
                <div className="player-name-enhanced">{player.fullName}</div>
                <div className="player-role-enhanced">{player.role}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  // ============================================================================
  // SUCCESS MODAL - Enhanced with player statistics
  // ============================================================================
  const SuccessModal = () => {
    const targetPlayerKey = currentPuzzle?.targetPlayer;
    const resolvedKey = resolvePlayerKey(targetPlayerKey);
    const targetPlayer = resolvedKey ? playersData[resolvedKey] : null;
    const currentFormat = getPuzzleFormat(currentPuzzle);

    return (
      <div className="success-modal">
        <div className="celebration-emoji">🏆</div>
        <h2 className="overlay-title">Congratulations!</h2>
        <p className="overlay-text">
          You found the Man of the Match in {squadFeedback.length} {squadFeedback.length === 1 ? 'guess' : 'guesses'}!
        </p>

        {targetPlayer && (
          <div className="cricket-trivia">
            <div className="trivia-title">🏏 Player Spotlight</div>
            <div className="trivia-text">
              <strong>{targetPlayer.fullName}</strong> ({targetPlayer.country})<br/>
              Role: {targetPlayer.role}<br/>
              {currentFormat} Career: {targetPlayer[`${currentFormat.toLowerCase()}Matches`] || 0} matches, {' '}
              {targetPlayer[`${currentFormat.toLowerCase()}Runs`] || 0} runs, {' '}
              {targetPlayer[`${currentFormat.toLowerCase()}Wickets`] || 0} wickets
              {targetPlayer.notable && (
                <>
                  <br/><br/>
                  <em>{targetPlayer.notable}</em>
                </>
              )}
            </div>
          </div>
        )}

        <div className="share-section">
          <div className="share-title">Share Your Result</div>
          <div className="share-result">{generateShareText()}</div>
        </div>

        <div className="modal-buttons">
          <button className="btn-enhanced btn-success" onClick={handleShare}>
            📤 Share Result
          </button>
          <button
            className="btn-enhanced btn-primary"
            onClick={() => {
              setShowSuccessModal(false);
              handleNextPuzzle();
            }}
          >
            {currentPuzzleIndex < STABLE_PUZZLE_CONFIG.puzzles.length - 1 
              ? "Next Puzzle 🎯" 
              : "🏆 Game Complete!"}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // GAME OVER MODAL - Enhanced with solution reveal
  // ============================================================================
  const GameOverModal = () => {
    const targetPlayerKey = currentPuzzle?.targetPlayer;
    const resolvedKey = resolvePlayerKey(targetPlayerKey);
    const targetPlayer = resolvedKey ? playersData[resolvedKey] : null;
    const currentFormat = getPuzzleFormat(currentPuzzle);

    // Find target player in match data for fallback info
    const targetMatchData = currentPuzzle?.matchData?.playerPerformances?.[targetPlayerKey];

    return (
      <div className="failure-modal">
        <div className="celebration-emoji">😔</div>
        <h2 className="overlay-title">Game Over!</h2>
        <p className="overlay-text">
          The Man of the Match was <strong>
            {targetPlayer?.fullName || targetMatchData?.full_name || "Unknown Player"}
          </strong>
        </p>

        {targetPlayer && (
          <div className="cricket-trivia">
            <div className="trivia-title">🏏 The Answer</div>
            <div className="trivia-text">
              <strong>{targetPlayer.fullName}</strong> ({targetPlayer.country})<br/>
              Role: {targetPlayer.role}<br/>
              {currentFormat} Career: {targetPlayer[`${currentFormat.toLowerCase()}Matches`] || 0} matches, {' '}
              {targetPlayer[`${currentFormat.toLowerCase()}Runs`] || 0} runs, {' '}
              {targetPlayer[`${currentFormat.toLowerCase()}Wickets`] || 0} wickets
              {targetPlayer.notable && (
                <>
                  <br/><br/>
                  <em>{targetPlayer.notable}</em>
                </>
              )}
            </div>
          </div>
        )}

        <div className="share-section">
          <div className="share-title">Share Your Attempt</div>
          <div className="share-result">{generateShareText()}</div>
        </div>

        <div className="modal-buttons">
          <button className="btn-enhanced btn-success" onClick={handleShare}>
            📤 Share Result
          </button>
          <button
            className="btn-enhanced btn-primary"
            onClick={() => {
              setShowGameOverModal(false);
              handleNextPuzzle();
            }}
          >
            {currentPuzzleIndex < STABLE_PUZZLE_CONFIG.puzzles.length - 1 
              ? "Next Puzzle 🎯" 
              : "🏆 Game Complete!"}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // HOW TO PLAY MODAL - Enhanced with examples
  // ============================================================================
  const HowToPlayModal = () => {
    const currentFormat = squadPlayers?.format || getPuzzleFormat(currentPuzzle) || "IPL";

    return (
      <div className="how-to-play-modal">
        <div className="modal-header">
          <h2 className="overlay-title">🏏 How to Play Bowldem</h2>
          <button className="close-button" onClick={() => setShowHowToPlay(false)}>
            ✕
          </button>
        </div>

        <div className="instructions">
          <div className="instruction-section">
            <h3>🎯 Objective</h3>
            <div className="instruction-item">
              <span className="instruction-icon">🏆</span>
              <div className="instruction-text">
                Find the <strong>Man of the Match</strong> from authentic cricket scorecards in just <strong>3 guesses</strong>!
                Each puzzle features real matches with genuine player statistics.
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>🎮 How to Play</h3>
            <div className="instruction-item">
              <span className="instruction-icon">👆</span>
              <div className="instruction-text">
                <strong>Select any player</strong> from either team by tapping their card. 
                You'll receive statistical clues comparing your guess to the target player.
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>📊 Feedback System</h3>
            <div className="instruction-item">
              <span className="instruction-icon">🔍</span>
              <div className="instruction-text">
                <strong>Role</strong> • <strong>Career Runs</strong> • <strong>Career Wickets</strong> • <strong>Career Matches</strong>
                <br/>
                ✅ Exact Match • 🔼 Target Higher • 🔽 Target Lower
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>📈 Statistics</h3>
            <div className="instruction-item">
              <span className="instruction-icon">🏏</span>
              <div className="instruction-text">
                Compares <strong>{currentFormat}-specific</strong> career statistics including matches played, 
                total runs scored, and wickets taken throughout the player's career.
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>💡 Strategy Tips</h3>
            <div className="instruction-item">
              <span className="instruction-icon">🎯</span>
              <div className="instruction-text">
                • <strong>Man of the Match</strong> usually has outstanding performance in the scorecard<br/>
                • Look for players with significant runs or wickets in the match<br/>
                • Use role feedback to eliminate entire categories of players<br/>
                • Consider the match context and winning team
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>🎯 Good Luck!</h3>
            <div className="instruction-item">
              <span className="instruction-icon">🏆</span>
              <div className="instruction-text">
                Use your cricket knowledge and strategic thinking to find the Man of the Match. 
                Each puzzle celebrates cricket's golden moments and legendary performances!
              </div>
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button 
            className="btn-enhanced btn-primary" 
            onClick={() => setShowHowToPlay(false)}
          >
            🏏 Start Playing!
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER - PRESERVED ALL EXISTING UI WITH ONLY MODAL FIXES
  // ============================================================================
  return (
    <div>
      {/* MAIN GAME CONTAINER */}
      <div className="page-background">
        <div className="game-container">
          {/* Header Section */}
          <div className="header-enhanced">
            <h1 className="title-enhanced">🏏 Bowldem</h1>
            <p className="subtitle-enhanced">Find the Man of the Match</p>
          </div>

          {/* Navigation - Enhanced with better spacing */}
          <div className="navigation-enhanced">
            <div className="puzzle-info">
              Puzzle {currentPuzzle?.id || 1} of {STABLE_PUZZLE_CONFIG.puzzles.length}
            </div>
            <div className="nav-buttons">
              <button 
                className="btn-enhanced btn-secondary" 
                onClick={() => {
                  console.log("🔍 DEBUG: How to Play clicked, setting showHowToPlay to true");
                  setShowHowToPlay(true);
                }}
              >
                ❓ How to Play
              </button>
            </div>
          </div>

          {/* TV Broadcast Scorecard */}
          {renderBroadcastScorecard()}

          {/* STICKY FEEDBACK SYSTEM - SOLUTION FOR SCROLL ISSUE */}
          <div className={`feedback-container-enhanced ${isSticky ? 'feedback-sticky-active' : ''}`}>
            {renderNewFeedbackDisplay()}
          </div>

          {/* OPTIMIZED TEAM LAYOUT - Side-by-side on desktop, spacious on mobile */}
          <div className="squads-container-enhanced">
            {renderEnhancedSquadDisplay()}
          </div>

          {/* Game Controls - Enhanced with better spacing */}
          <div className="game-controls">
            {!gameOver && !gameWon && (
              <div className="attempt-info">
                Attempts: {squadFeedback.length}/{STABLE_PUZZLE_CONFIG.maxGuesses}
              </div>
            )}

            {(gameOver || gameWon) && (
              <div className="game-actions">
                <button
                  className="btn-enhanced btn-primary"
                  onClick={handleNextPuzzle}
                >
                  {currentPuzzleIndex < STABLE_PUZZLE_CONFIG.puzzles.length - 1 
                    ? "Next Puzzle 🎯" 
                    : "🏆 Game Complete!"}
                </button>
              </div>
            )}
          </div>

          {/* DEBUG INFO - Enhanced positioning */}
          {STABLE_FEATURES.showDebugInfo && (
            <div className="debug-info">
              <p>🔍 Debug Mode Active</p>
              <p>Format: {getPuzzleFormat(currentPuzzle)}</p>
              <p>Target: {currentPuzzle?.targetPlayer}</p>
              <p>Squad Size: {squadPlayers?.team1?.length || 0} + {squadPlayers?.team2?.length || 0}</p>
              <p>Sticky: {isSticky ? 'Yes' : 'No'}</p>
              <p>🔍 DEBUG: showHowToPlay = {showHowToPlay ? 'TRUE' : 'FALSE'}</p>
              <p>🔍 DEBUG: showSuccessModal = {showSuccessModal ? 'TRUE' : 'FALSE'}</p>
              <p>🔍 DEBUG: showGameOverModal = {showGameOverModal ? 'TRUE' : 'FALSE'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ FIXED: MODALS WITH PROPER OVERLAY POSITIONING - ONLY CHANGE MADE */}
      {console.log("🔍 DEBUG: Rendering modals - showHowToPlay:", showHowToPlay, "showSuccessModal:", showSuccessModal, "showGameOverModal:", showGameOverModal)}

      {/* How to Play Modal - FIXED: Use game-overlay class */}
      {showHowToPlay && (
        <div className="game-overlay" onClick={() => setShowHowToPlay(false)}>
          <div onClick={e => e.stopPropagation()}>
            <HowToPlayModal />
          </div>
        </div>
      )}

      {/* Success Modal - FIXED: Use game-overlay class */}
      {showSuccessModal && (
        <div className="game-overlay">
          <SuccessModal />
        </div>
      )}

      {/* Game Over Modal - FIXED: Use game-overlay class */}
      {showGameOverModal && (
        <div className="game-overlay">
          <GameOverModal />
        </div>
      )}
    </div>
  );
}

export default App;