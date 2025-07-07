import React, { useState, useEffect, useRef } from "react";
import playersData from "./data/players.json";
import matchPuzzlesData from "./data/match_puzzles.json";
import "./App.css";

const CricGuess = () => {
  // ============================================================================
  // PART 1: PUZZLE SYSTEM - Using Match Puzzles from JSON
  // ============================================================================

  // Puzzle configuration - Now uses match puzzles from extracted data
  const PUZZLE_CONFIG = {
    maxGuesses: 5,
    puzzles: matchPuzzlesData.puzzles || [], // Load from match_puzzles.json
  };

  // ============================================================================
  // PART 2: FEEDBACK SYSTEM - Match-Specific Performance
  // ============================================================================

  // Feedback configuration - NEW MATCH-SPECIFIC FEEDBACK
  const FEEDBACK_CONFIG = {
    // New match-specific feedback fields - REORDERED
    activeFields: ["country", "playedInMatch", "runsInMatch", "wicketsInMatch"],

    // Comparison logic for match-specific fields
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

  // ============================================================================
  // GAME STATE MANAGEMENT + AUTOCOMPLETE STATE
  // ============================================================================

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // NEW: Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Refs for autocomplete
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

  // Get current puzzle
  const currentPuzzle = PUZZLE_CONFIG.puzzles[currentPuzzleIndex];

  // ============================================================================
  // AUTOCOMPLETE FUNCTIONS
  // ============================================================================

  /**
   * Advanced player search with fuzzy matching and scoring
   * @param {string} input - Search query
   * @returns {Array} - Sorted array of matching players
   */
  const searchPlayers = (input) => {
    if (!input || input.length < 3) return [];

    const query = input.toLowerCase();
    const matches = [];

    Object.entries(playersData).forEach(([key, player]) => {
      let score = 0;
      let matchType = "";

      // Exact name match (highest priority)
      if (player.fullName.toLowerCase().includes(query)) {
        score = 1000;
        matchType = "name";
      }

      // Surname match
      const surnames = player.fullName.split(" ");
      surnames.forEach((surname) => {
        if (surname.toLowerCase().includes(query)) {
          score = Math.max(score, 800);
          matchType = "surname";
        }
      });

      // Alias matching
      if (player.aliases) {
        player.aliases.forEach((alias) => {
          if (alias.toLowerCase().includes(query)) {
            score = Math.max(score, 500);
            matchType = "alias";
          }
        });
      }

      if (score > 0) {
        matches.push({
          key,
          player,
          score,
          matchType,
          displayText: player.fullName,
        });
      }
    });

    // Sort by score (descending) and return top 8
    return matches.sort((a, b) => b.score - a.score).slice(0, 8);
  };

  /**
   * Handles input change and triggers autocomplete
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setCurrentGuess(value);
    setSelectedSuggestionIndex(-1);

    if (value.length >= 3) {
      setIsLoadingSuggestions(true);

      // Debounce search for better performance
      setTimeout(() => {
        const results = searchPlayers(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setIsLoadingSuggestions(false);
      }, 150);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
    }
  };

  /**
   * Handles keyboard navigation in autocomplete
   */
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        processGuess();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;

      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          processGuess();
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;

      case "Tab":
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
    }
  };

  /**
   * Selects a suggestion from autocomplete
   */
  const selectSuggestion = (suggestion) => {
    setCurrentGuess(suggestion.player.fullName);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  /**
   * Handles clicking outside autocomplete to close it
   */
  const handleClickOutside = (e) => {
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      const suggestionContainer = document.querySelector(
        ".autocomplete-suggestions",
      );
      if (!suggestionContainer || !suggestionContainer.contains(e.target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }
  };

  // Set up click outside listener
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (
      selectedSuggestionIndex >= 0 &&
      suggestionRefs.current[selectedSuggestionIndex]
    ) {
      suggestionRefs.current[selectedSuggestionIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedSuggestionIndex]);

  // ============================================================================
  // PART 2: PLAYER MATCHING AND FEEDBACK FUNCTIONS - UPDATED SYSTEM
  // ============================================================================

  /**
   * Matches player input to database key with flexible matching
   * @param {string} input - Player name input
   * @returns {string|null} - Player key or null if not found
   */
  const matchPlayerName = (input) => {
    const inputUpper = input.toUpperCase().trim();

    // Direct key match
    if (playersData[inputUpper]) return inputUpper;

    // Search through all players for surname or alias matching
    for (const [key, player] of Object.entries(playersData)) {
      const fullName = player.fullName.toLowerCase();
      const inputLower = input.toLowerCase();

      // Check if input matches surname
      const surnames = player.fullName.split(" ");
      const lastSurname = surnames[surnames.length - 1].toLowerCase();

      if (
        inputLower === lastSurname ||
        inputLower.includes(lastSurname) ||
        lastSurname.includes(inputLower) ||
        fullName.includes(inputLower)
      ) {
        return key;
      }

      // Check aliases if they exist
      if (player.aliases) {
        for (const alias of player.aliases) {
          if (alias.toLowerCase() === inputLower) {
            return key;
          }
        }
      }
    }

    return null;
  };

  /**
   * UPDATED: Generates feedback for a guess - handles both in-match and not-in-match players
   * @param {string} guessPlayerKey - Database key for guessed player
   * @param {string} targetPlayerKey - Database key for target player
   * @returns {Object} - Feedback object with match-specific comparisons
   */
  const generateFeedback = (guessPlayerKey, targetPlayerKey) => {
    const guessPlayerData = playersData[guessPlayerKey];
    const targetPlayerData = playersData[targetPlayerKey];

    // Get match-specific performance data
    const matchData = currentPuzzle.matchData;
    const guessMatchPerf = matchData?.playerPerformances?.[guessPlayerKey];
    const targetMatchPerf = matchData?.playerPerformances?.[targetPlayerKey];

    const feedback = {};

    // Generate feedback for active fields
    FEEDBACK_CONFIG.activeFields.forEach((field) => {
      const fieldConfig = FEEDBACK_CONFIG.compareFields[field];
      if (fieldConfig) {
        if (field === "country") {
          // Country comparison using players.json data (always available)
          feedback[field] = {
            comparison: fieldConfig.compare(
              guessPlayerData?.country,
              targetPlayerData?.country,
            ),
            value: guessPlayerData?.country,
            flag: guessPlayerData?.countryFlag,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "playedInMatch") {
          // Whether they played in this match
          const guessPlayed = guessMatchPerf?.played_in_match || false;
          const targetPlayed = targetMatchPerf?.played_in_match || false;
          feedback[field] = {
            comparison: fieldConfig.compare(guessPlayed, targetPlayed),
            value: guessPlayed ? "Yes" : "No",
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "runsInMatch") {
          // Match-specific runs (0 if didn't play)
          const guessRuns = guessMatchPerf?.runs_in_match || 0;
          const targetRuns = targetMatchPerf?.runs_in_match || 0;
          feedback[field] = {
            comparison: fieldConfig.compare(guessRuns, targetRuns),
            value: guessRuns,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        } else if (field === "wicketsInMatch") {
          // Match-specific wickets (0 if didn't play)
          const guessWickets = guessMatchPerf?.wickets_in_match || 0;
          const targetWickets = targetMatchPerf?.wickets_in_match || 0;
          feedback[field] = {
            comparison: fieldConfig.compare(guessWickets, targetWickets),
            value: guessWickets,
            label: fieldConfig.label,
            icon: fieldConfig.icon,
          };
        }
      }
    });

    return feedback;
  };

  /**
   * UPDATED: Processes a player guess with improved feedback system
   * 1. Only popup if player not in database
   * 2. If player in database but not in match - count as guess with feedback
   */
  const processGuess = () => {
    // Basic validation
    if (!currentGuess.trim()) {
      alert("Please enter a player name!");
      return;
    }

    const matchedPlayer = matchPlayerName(currentGuess);

    // CASE 1: Player not found in database at all - SHOW POPUP
    if (!matchedPlayer) {
      const matchPlayers = currentPuzzle.matchData?.playerPerformances
        ? Object.keys(currentPuzzle.matchData.playerPerformances)
        : [];

      if (matchPlayers.length > 0) {
        const suggestions = matchPlayers
          .slice(0, 5)
          .map((key) => playersData[key]?.fullName || key)
          .join(", ");
        alert(
          `Player not found in database! Try players from this match like: ${suggestions}`,
        );
      } else {
        alert("Player not found in database! Try another name.");
      }
      return;
    }

    // CASE 2: Check if already guessed
    if (guesses.some((g) => g.guessPlayer === matchedPlayer)) {
      alert("You already guessed this player!");
      return;
    }

    // CASE 3: Player exists in database - ALWAYS COUNT AS GUESS (whether in match or not)

    // Generate feedback (this will handle both in-match and not-in-match cases)
    const feedback = generateFeedback(
      matchedPlayer,
      currentPuzzle.targetPlayer,
    );

    const newGuess = {
      guessPlayer: matchedPlayer,
      guessPlayerName: playersData[matchedPlayer].fullName,
      feedback: feedback,
      isCorrect: matchedPlayer === currentPuzzle.targetPlayer,
    };

    // Update game state
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess("");
    setShowSuggestions(false);

    // Check win/lose conditions
    if (matchedPlayer === currentPuzzle.targetPlayer) {
      setGameWon(true);
      setGameOver(true);
    } else if (newGuesses.length >= PUZZLE_CONFIG.maxGuesses) {
      setGameOver(true);
    }
  };

  // ============================================================================
  // PART 3: COMPLETION FUNCTIONS - Game end states and sharing
  // ============================================================================

  /**
   * Generates shareable text for social media
   * @returns {string} - Formatted share text
   */
  const generateShareText = () => {
    const guessCount = guesses.length;
    const result = gameWon
      ? `${guessCount}/${PUZZLE_CONFIG.maxGuesses}`
      : `X/${PUZZLE_CONFIG.maxGuesses}`;

    let shareText = `🏏 CricGuess #${currentPuzzleIndex + 1} ${result}\n`;

    // Use match details for sharing
    if (currentPuzzle.matchData?.scorecard) {
      const scorecard = currentPuzzle.matchData.scorecard;
      shareText += `${scorecard.teams[0]} vs ${scorecard.teams[1]}\n`;
      shareText += `${scorecard.venue}, ${scorecard.date}\n\n`;
    }

    guesses.forEach((guess) => {
      const feedbackEmojis = FEEDBACK_CONFIG.activeFields
        .map((field) => guess.feedback[field]?.comparison || "❓")
        .join("");
      shareText += feedbackEmojis;
      if (guess.isCorrect) shareText += " ✅";
      shareText += "\n";
    });

    shareText += "\nPlay at cricguess.com 🏏";
    return shareText;
  };

  /**
   * Handles sharing results to clipboard
   */
  const handleShare = () => {
    const shareText = generateShareText();
    navigator.clipboard.writeText(shareText);
    alert("Results copied to clipboard! 📋");
  };

  /**
   * Progresses to next puzzle
   */
  const nextPuzzle = () => {
    if (currentPuzzleIndex < PUZZLE_CONFIG.puzzles.length - 1) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
      resetPuzzleState();
    }
  };

  /**
   * Resets current puzzle state
   */
  const resetPuzzleState = () => {
    setGuesses([]);
    setGameWon(false);
    setGameOver(false);
    setCurrentGuess("");
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  /**
   * Get puzzle type label
   */
  const getPuzzleTypeLabel = (puzzleType) => {
    return puzzleType === "scorecard" ? "Match Scorecard" : "Unknown";
  };

  /**
   * Renders game completion status
   * @returns {JSX.Element|null} - Status component or null
   */
  const renderGameStatus = () => {
    if (gameWon) {
      return (
        <div className="status-win">
          <div className="text-green-800 font-bold text-xl">🎉 Brilliant!</div>
          <div className="text-sm mt-2">
            You found{" "}
            <strong>{playersData[currentPuzzle.targetPlayer].fullName}</strong>{" "}
            in {guesses.length} guesses!
          </div>
          <div className="mt-3 p-3 bg-green-50 rounded text-sm text-left">
            <strong>Cricket Trivia:</strong> {currentPuzzle.trivia}
          </div>
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
          <div className="text-red-800 font-bold text-xl">Close One!</div>
          <div className="text-sm mt-2">
            The answer was:{" "}
            <strong>{playersData[currentPuzzle.targetPlayer].fullName}</strong>
          </div>
          <div className="mt-3 p-3 bg-red-50 rounded text-sm text-left">
            <strong>Cricket Trivia:</strong> {currentPuzzle.trivia}
          </div>
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
  // PART 1: PUZZLE FUNCTIONS - Match Scorecard Display
  // ============================================================================

  /**
   * Renders the match scorecard puzzle content - FORMATTED LIKE CRICKET BROADCAST
   * @param {Object} puzzle - Current puzzle object
   * @returns {JSX.Element} - Rendered puzzle display
   */
  const renderPuzzleContent = (puzzle) => {
    if (!puzzle || puzzle.puzzleType !== "scorecard") {
      return (
        <div className="puzzle-display">
          <div className="text-sm text-gray-600 mb-3">Puzzle not available</div>
        </div>
      );
    }

    const scorecard = puzzle.matchData?.scorecard;
    if (!scorecard) {
      return (
        <div className="puzzle-display">
          <div className="text-sm text-gray-600 mb-3">
            Scorecard not available
          </div>
        </div>
      );
    }

    const team1 = scorecard.teams[0];
    const team2 = scorecard.teams[1];
    const team1Score = scorecard.team_scores[team1];
    const team2Score = scorecard.team_scores[team2];
    const winner = scorecard.winner;

    // Format team names to abbreviations
    const formatTeamName = (name) => {
      const abbreviations = {
        "Royal Challengers Bangalore": "RCB",
        "Kolkata Knight Riders": "KKR",
        "Chennai Super Kings": "CSK",
        "Mumbai Indians": "MI",
        "Kings XI Punjab": "KXIP",
        "Delhi Daredevils": "DD",
        "Rajasthan Royals": "RR",
        "Deccan Chargers": "DC",
      };
      return (
        abbreviations[name] ||
        name
          .split(" ")
          .map((word) => word[0])
          .join("")
      );
    };

    // Determine batting order and victory margin correctly
    const getBattingOrderAndMargin = () => {
      const team1Runs = team1Score?.runs || 0;
      const team2Runs = team2Score?.runs || 0;
      const team1Wickets = team1Score?.wickets || 0;
      const team2Wickets = team2Score?.wickets || 0;

      // Determine which team batted first (lower score usually batted first in successful chases)
      const firstInnings = team1Runs < team2Runs ? team1 : team2;
      const secondInnings = team1Runs < team2Runs ? team2 : team1;
      const firstScore = team1Runs < team2Runs ? team1Score : team2Score;
      const secondScore = team1Runs < team2Runs ? team2Score : team1Score;

      let marginText = "";
      if (winner === secondInnings) {
        // Successful chase
        const wicketsLeft = 10 - (secondScore?.wickets || 0);
        marginText = `${winner} won by ${wicketsLeft} wickets`;
      } else {
        // Defend successfully
        const runMargin = (firstScore?.runs || 0) - (secondScore?.runs || 0);
        marginText = `${winner} won by ${runMargin} runs`;
      }

      return {
        firstInnings,
        secondInnings,
        firstScore,
        secondScore,
        marginText,
      };
    };

    const { marginText } = getBattingOrderAndMargin();

    return (
      <div className="puzzle-display">
        <div className="text-center space-y-3">
          {/* Match Header */}
          <div className="text-lg font-bold text-blue-800">
            🏏 {formatTeamName(team1)} vs {formatTeamName(team2)}
          </div>

          {/* Venue and Date */}
          <div className="text-sm text-gray-600">
            <div>{scorecard.venue}</div>
            <div>{scorecard.date}</div>
          </div>

          {/* Team Scores */}
          <div className="space-y-2 py-4">
            <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
              <span className="font-semibold">{formatTeamName(team1)}</span>
              <span className="font-mono text-lg">
                {team1Score?.runs || 0}/{team1Score?.wickets || 0}
              </span>
            </div>
            <div className="flex justify-between items-center bg-green-50 p-2 rounded">
              <span className="font-semibold">{formatTeamName(team2)}</span>
              <span className="font-mono text-lg">
                {team2Score?.runs || 0}/{team2Score?.wickets || 0}
              </span>
            </div>
          </div>

          {/* Result */}
          <div className="border-t pt-3 space-y-2">
            <div className="text-green-700 font-semibold">{marginText}</div>
            <div className="text-xl font-bold text-purple-600">
              Player of the Match: ?
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER FUNCTIONS - Updated UI for Match-Specific Feedback
  // ============================================================================

  /**
   * Renders the feedback legend explaining symbols - UPDATED FOR MATCH-SPECIFIC
   * @returns {JSX.Element} - Legend component
   */
  const renderFeedbackLegend = () => (
    <div className="feedback-legend">
      <div className="font-semibold mb-2">How to Read the Clues:</div>
      <div className="space-y-1">
        {FEEDBACK_CONFIG.activeFields.map((field) => {
          const fieldConfig = FEEDBACK_CONFIG.compareFields[field];
          if (!fieldConfig) return null;

          return (
            <div key={field}>
              {fieldConfig.icon} <strong>{fieldConfig.label}:</strong>{" "}
              {field === "country"
                ? "🎯 Same country | ❌ Different country"
                : field === "playedInMatch"
                  ? "🎯 Played in match | ❌ Did not play in match"
                  : "⬆️ Target scored/took more | ⬇️ Target scored/took fewer | 🎯 Same"}
            </div>
          );
        })}
      </div>
    </div>
  );

  /**
   * Renders guess history with feedback - UPDATED FOR 4-COLUMN GRID
   * @returns {JSX.Element} - Guess history component
   */
  const renderGuessHistory = () => (
    <div className="space-y-3 mb-6">
      {guesses.map((guess, index) => (
        <div key={index} className="guess-card">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">
              #{index + 1} {guess.guessPlayerName}
            </span>
            {guess.isCorrect && (
              <span className="text-green-600 text-xl">✅</span>
            )}
          </div>
          {/* Updated to 4-column grid for new feedback fields */}
          <div className="grid grid-cols-4 gap-2 text-sm">
            {FEEDBACK_CONFIG.activeFields.map((field) => {
              const feedback = guess.feedback[field];
              if (!feedback) return null;

              return (
                <div key={field} className="text-center">
                  <div className="text-xs text-gray-600">{feedback.label}</div>
                  <div className="font-mono">
                    {/* Special handling for different field types */}
                    {field === "country" ? (
                      <div className="flex flex-col items-center">
                        <div className="text-lg">{feedback.flag || "🏳️"}</div>
                        <div className="text-xs">{feedback.comparison}</div>
                      </div>
                    ) : field === "playedInMatch" ? (
                      <div className="flex flex-col items-center">
                        <div className="text-xs">{feedback.value}</div>
                        <div className="text-lg">{feedback.comparison}</div>
                      </div>
                    ) : (
                      <>
                        {feedback.value} {feedback.comparison}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  /**
   * Renders autocomplete suggestions dropdown
   * @returns {JSX.Element|null} - Autocomplete component or null
   */
  const renderAutocompleteSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className="autocomplete-suggestions">
        {isLoadingSuggestions ? (
          <div className="autocomplete-loading">
            <span>🔍 Searching players...</span>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <div
              key={suggestion.key}
              ref={(el) => (suggestionRefs.current[index] = el)}
              className={`autocomplete-suggestion ${
                index === selectedSuggestionIndex ? "selected" : ""
              }`}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
            >
              <div className="suggestion-main">
                <span className="suggestion-name">
                  {suggestion.player.fullName}
                </span>
                <span className="suggestion-flag">
                  {suggestion.player.countryFlag}
                </span>
              </div>
              <div className="suggestion-details">
                <span className="suggestion-country">
                  {suggestion.player.country}
                </span>
                <span className="suggestion-teams">
                  {suggestion.player.teams?.slice(0, 2).join(", ") ||
                    "No team info"}
                </span>
              </div>
            </div>
          ))
        )}
        <div className="autocomplete-footer">
          Use ↑↓ keys to navigate, Enter to select
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER - Complete game interface
  // ============================================================================

  // Check if we have valid puzzle data
  if (!currentPuzzle) {
    return (
      <div className="page-background">
        <div className="game-container">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 mb-4">
              🏏 CricGuess
            </h1>
            <div className="text-red-600">
              No puzzles available. Please check match_puzzles.json
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-background">
      {/* How to Play Popup - UPDATED WITH MATCH-SPECIFIC INFO */}
      {showHowToPlay && (
        <div className="popup-overlay" onClick={() => setShowHowToPlay(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="popup-close"
              onClick={() => setShowHowToPlay(false)}
            >
              ×
            </button>
            <h2 className="popup-title">How To Play</h2>
            <p className="popup-subtitle">
              Guess the Cricket Player from the match scorecard in{" "}
              {PUZZLE_CONFIG.maxGuesses} tries.
            </p>
            <div className="popup-rules">
              <ul>
                <li>Each guess must be a valid cricket player name.</li>
                <li>
                  The arrows will show how your guess's match performance
                  compares to the target player.
                </li>
                <li>
                  The flag shows if your guess is from the same country as the
                  target player.
                </li>
                <li>🏟️ Shows if your guess played in this specific match.</li>
                <li>
                  Use the scorecard clues to deduce who the target player might
                  be!
                </li>
                <li>Type 3+ letters to see autocomplete suggestions.</li>
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
          <h1 className="text-3xl font-bold text-center text-blue-600">
            🏏 CricGuess
          </h1>
          <button
            className="how-to-play-btn"
            onClick={() => setShowHowToPlay(true)}
          >
            How to Play
          </button>
        </div>

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

        {/* Puzzle Type Badge */}
        <div className="mb-4 text-center">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {getPuzzleTypeLabel(currentPuzzle.puzzleType)}
          </span>
        </div>

        {/* PART 1: PUZZLE DISPLAY */}
        {renderPuzzleContent(currentPuzzle)}

        {/* PART 3: COMPLETION STATUS */}
        {renderGameStatus()}

        {/* Input Area with Autocomplete */}
        {!gameOver && (
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">
              Guess {guesses.length + 1} of {PUZZLE_CONFIG.maxGuesses}
            </div>
            <div
              className="autocomplete-container"
              style={{ position: "relative" }}
            >
              <input
                ref={inputRef}
                type="text"
                value={currentGuess}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type player name (e.g., Kohli, Dhoni, Gayle)..."
                className="game-input"
                autoComplete="off"
              />
              {renderAutocompleteSuggestions()}
            </div>
            <button
              onClick={processGuess}
              className="btn btn-green w-full mt-3"
            >
              Submit Guess
            </button>
          </div>
        )}

        {/* PART 2: FEEDBACK LEGEND - UPDATED */}
        {renderFeedbackLegend()}

        {/* PART 2: GUESS HISTORY WITH FEEDBACK - UPDATED */}
        {renderGuessHistory()}

        {/* PART 3: SHARE RESULTS */}
        {gameOver && (
          <div className="mt-6">
            <button onClick={handleShare} className="btn btn-blue w-full">
              📋 Share Your Results
            </button>
          </div>
        )}

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
