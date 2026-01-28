/**
 * Daily Puzzle System Utilities
 * Wordle-style daily puzzle with localStorage persistence
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Epoch date: First day of Bowldem (puzzle #0)
// Set this to your launch date
export const EPOCH_DATE = '2026-01-15';

export const STORAGE_KEYS = {
  STATS: 'bowldem_stats',
  STATE: 'bowldem_state',
  DEBUG_OFFSET: 'bowldem_debug_offset'
};

// Maximum attempts per puzzle (increased from 4 to 5 for knowledge-based format)
export const MAX_GUESSES = 5;

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get today's date in UTC as YYYY-MM-DD string
 */
export function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get effective date considering debug mode offset
 */
export function getEffectiveDate() {
  const debugOffset = getDebugDateOffset();
  const today = new Date();
  today.setDate(today.getDate() + debugOffset);
  return today.toISOString().split('T')[0];
}

/**
 * Calculate puzzle number based on days since epoch
 * @param {string} dateStr - Date string in YYYY-MM-DD format (defaults to effective date)
 * @returns {number} - Puzzle number (0-indexed)
 */
export function getPuzzleNumber(dateStr = getEffectiveDate()) {
  const date = new Date(dateStr + 'T00:00:00Z');
  const epoch = new Date(EPOCH_DATE + 'T00:00:00Z');
  const diffTime = date.getTime() - epoch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Get puzzle index from puzzle number (wraps around if exceeds total)
 * @param {number} puzzleNumber
 * @param {number} totalPuzzles
 * @returns {number} - Index into puzzles array
 */
export function getPuzzleIndex(puzzleNumber, totalPuzzles) {
  return puzzleNumber % totalPuzzles;
}

/**
 * Get the puzzle for today
 * @param {Array} puzzles - Array of puzzle objects
 * @returns {Object} - { puzzle, puzzleNumber, puzzleIndex }
 */
export function getPuzzleForToday(puzzles) {
  const puzzleNumber = getPuzzleNumber();
  const puzzleIndex = getPuzzleIndex(puzzleNumber, puzzles.length);
  return {
    puzzle: puzzles[puzzleIndex],
    puzzleNumber,
    puzzleIndex
  };
}

// ============================================================================
// LOCALSTORAGE - GAME STATE
// ============================================================================

/**
 * Default game state structure
 */
function getDefaultGameState() {
  return {
    lastPlayedDate: null,
    lastPuzzleNumber: null,
    guesses: [],
    gameStatus: 'not_started', // 'not_started' | 'in_progress' | 'won' | 'lost'
    modalShown: false // Tracks if result modal has been shown (prevents re-trigger on page return)
  };
}

/**
 * Load game state from localStorage
 * @returns {Object} - Game state object
 */
export function loadGameState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STATE);
    if (stored) {
      return { ...getDefaultGameState(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load game state:', e);
  }
  return getDefaultGameState();
}

/**
 * Save game state to localStorage
 * @param {Object} state - Game state to save
 */
export function saveGameState(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

/**
 * Check if user can play today's puzzle
 * @returns {Object} - { canPlay, reason, existingState }
 */
export function canPlayToday() {
  const state = loadGameState();
  const today = getEffectiveDate();
  const todayPuzzleNumber = getPuzzleNumber(today);

  // Never played before
  if (!state.lastPlayedDate) {
    return { canPlay: true, reason: 'new_user', existingState: null };
  }

  // Different day - new puzzle available
  if (state.lastPlayedDate !== today) {
    return { canPlay: true, reason: 'new_day', existingState: null };
  }

  // Same day - check if game completed
  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    return { canPlay: false, reason: 'already_completed', existingState: state };
  }

  // Same day, game in progress - can continue
  return { canPlay: true, reason: 'continue', existingState: state };
}

/**
 * Start or continue today's game
 * @returns {Object} - Initial game state for today
 */
export function initializeTodayGame() {
  const { canPlay, reason, existingState } = canPlayToday();
  const today = getEffectiveDate();
  const puzzleNumber = getPuzzleNumber(today);

  if (reason === 'continue' && existingState) {
    // Continue existing game
    return existingState;
  }

  // Start fresh game
  const newState = {
    lastPlayedDate: today,
    lastPuzzleNumber: puzzleNumber,
    guesses: [],
    gameStatus: 'in_progress'
  };
  saveGameState(newState);
  return newState;
}

/**
 * Record a guess
 * @param {string} playerKey - The guessed player's key
 * @returns {Object} - Updated game state
 */
export function recordGuess(playerKey) {
  const state = loadGameState();

  if (state.gameStatus !== 'in_progress') {
    return state;
  }

  state.guesses.push(playerKey);
  saveGameState(state);
  return state;
}

/**
 * Complete the game (win or lose)
 * @param {boolean} won - Whether the player won
 * @returns {Object} - Final game state
 */
export function completeGame(won) {
  const state = loadGameState();
  state.gameStatus = won ? 'won' : 'lost';
  saveGameState(state);

  // Update stats
  updateStatsOnComplete(won, state.guesses.length);

  return state;
}

/**
 * Mark the result modal as shown (prevents re-trigger on page return)
 */
export function markModalShown() {
  const state = loadGameState();
  state.modalShown = true;
  saveGameState(state);
  return state;
}

// ============================================================================
// LOCALSTORAGE - STATISTICS
// ============================================================================

/**
 * Default stats structure
 */
function getDefaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0], // Index = guesses-1 (for 1, 2, 3, 4, 5 guesses)
    lastWinDate: null
  };
}

/**
 * Load stats from localStorage
 * @returns {Object} - Stats object
 */
export function loadStats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STATS);
    if (stored) {
      return { ...getDefaultStats(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load stats:', e);
  }
  return getDefaultStats();
}

/**
 * Save stats to localStorage
 * @param {Object} stats - Stats to save
 */
export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to save stats:', e);
  }
}

/**
 * Update stats when game completes
 * @param {boolean} won - Whether player won
 * @param {number} guessCount - Number of guesses used
 */
export function updateStatsOnComplete(won, guessCount) {
  const stats = loadStats();
  const today = getEffectiveDate();

  stats.gamesPlayed += 1;

  if (won) {
    stats.gamesWon += 1;
    stats.guessDistribution[guessCount - 1] = (stats.guessDistribution[guessCount - 1] || 0) + 1;

    // Update streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats.lastWinDate === yesterdayStr) {
      // Consecutive day win - extend streak
      stats.currentStreak += 1;
    } else if (stats.lastWinDate !== today) {
      // Not consecutive - reset streak
      stats.currentStreak = 1;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastWinDate = today;
  } else {
    // Lost - reset streak
    stats.currentStreak = 0;
  }

  saveStats(stats);
  return stats;
}

// ============================================================================
// DEBUG MODE
// ============================================================================

/**
 * Check if debug mode is enabled via URL param
 * @returns {boolean}
 */
export function isDebugMode() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === 'true';
}

/**
 * Check for reset param and clear data if present
 * Call this on app init to auto-reset when ?reset=true is in URL
 */
export function checkAutoReset() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === 'true') {
    clearAllData();
    // Remove reset param from URL to prevent loop
    params.delete('reset');
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
    return true;
  }
  return false;
}

/**
 * Get debug date offset (days to add/subtract)
 * @returns {number}
 */
export function getDebugDateOffset() {
  if (!isDebugMode()) return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEYS.DEBUG_OFFSET) || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Set debug date offset
 * @param {number} offset - Days to offset (can be negative)
 */
export function setDebugDateOffset(offset) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEBUG_OFFSET, String(offset));
  } catch (e) {
    console.warn('Failed to save debug offset:', e);
  }
}

/**
 * Clear all localStorage data (for debugging)
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.STATE);
    localStorage.removeItem(STORAGE_KEYS.DEBUG_OFFSET);
  } catch (e) {
    console.warn('Failed to clear data:', e);
  }
}

// ============================================================================
// COUNTDOWN TIMER
// ============================================================================

/**
 * Get milliseconds until next puzzle (midnight UTC)
 * @returns {number} - Milliseconds until next puzzle
 */
export function getMillisecondsUntilNextPuzzle() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

/**
 * Format milliseconds as HH:MM:SS
 * @param {number} ms - Milliseconds
 * @returns {string} - Formatted time string
 */
export function formatCountdown(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
