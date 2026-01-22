/**
 * useLeaderboard Hook
 * Manages leaderboard data fetching and submission
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getLeaderboardForPuzzle,
  getAllTimeLeaderboard,
  submitLeaderboardEntry,
  getUserRanking
} from '../lib/supabase.js';

// Storage keys for local data
const STORAGE_KEYS = {
  DISPLAY_NAME: 'bowldem_display_name',
  DEVICE_ID: 'bowldem_device_id'
};

/**
 * Generate a unique device ID for anonymous tracking
 */
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

/**
 * Custom hook for managing leaderboard data
 * @param {number} puzzleNumber - Current puzzle number
 * @param {string} puzzleDate - Current puzzle date (YYYY-MM-DD)
 * @returns {Object} - Leaderboard state and actions
 */
export function useLeaderboard(puzzleNumber, puzzleDate) {
  // State for puzzle leaderboard
  const [puzzleLeaderboard, setPuzzleLeaderboard] = useState([]);
  const [puzzleLeaderboardLoading, setPuzzleLeaderboardLoading] = useState(false);

  // State for all-time leaderboard
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState([]);
  const [allTimeLoading, setAllTimeLoading] = useState(false);

  // User's display name (stored locally)
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.DISPLAY_NAME) || '';
  });

  // User's ranking for today's puzzle
  const [userRanking, setUserRanking] = useState(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  /**
   * Fetch puzzle leaderboard
   */
  const fetchPuzzleLeaderboard = useCallback(async () => {
    if (!puzzleDate) return;

    setPuzzleLeaderboardLoading(true);
    setError(null);

    try {
      const data = await getLeaderboardForPuzzle(puzzleDate);
      setPuzzleLeaderboard(data || []);
    } catch (err) {
      console.error('Error fetching puzzle leaderboard:', err);
      setError('Failed to load leaderboard');
      setPuzzleLeaderboard([]);
    } finally {
      setPuzzleLeaderboardLoading(false);
    }
  }, [puzzleDate]);

  /**
   * Fetch all-time leaderboard
   */
  const fetchAllTimeLeaderboard = useCallback(async () => {
    setAllTimeLoading(true);
    setError(null);

    try {
      const data = await getAllTimeLeaderboard();
      setAllTimeLeaderboard(data || []);
    } catch (err) {
      console.error('Error fetching all-time leaderboard:', err);
      setError('Failed to load all-time leaderboard');
      setAllTimeLeaderboard([]);
    } finally {
      setAllTimeLoading(false);
    }
  }, []);

  /**
   * Save display name to localStorage
   */
  const saveDisplayName = useCallback((name) => {
    const trimmedName = name.trim().substring(0, 20); // Max 20 chars
    setDisplayName(trimmedName);
    if (trimmedName) {
      localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, trimmedName);
    } else {
      localStorage.removeItem(STORAGE_KEYS.DISPLAY_NAME);
    }
  }, []);

  /**
   * Submit entry to leaderboard
   */
  const submitToLeaderboard = useCallback(async (guessesUsed, won) => {
    if (!displayName || !puzzleDate || isSubmitting || hasSubmitted) {
      return { success: false, error: 'Invalid submission state' };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();

      const entry = {
        display_name: displayName.trim(),
        device_id: deviceId,
        puzzle_date: puzzleDate,
        puzzle_number: puzzleNumber,
        guesses_used: won ? guessesUsed : 5, // 5 represents a loss
        won: won,
        is_seed: false
      };

      const result = await submitLeaderboardEntry(entry);

      if (result.success) {
        setHasSubmitted(true);
        // Refresh leaderboard to show new entry
        await fetchPuzzleLeaderboard();
        // Get user's ranking
        const ranking = await getUserRanking(puzzleDate, deviceId);
        setUserRanking(ranking);
      }

      return result;
    } catch (err) {
      console.error('Error submitting to leaderboard:', err);
      setError('Failed to submit to leaderboard');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, puzzleDate, puzzleNumber, isSubmitting, hasSubmitted, fetchPuzzleLeaderboard]);

  /**
   * Calculate percentile based on leaderboard position
   */
  const calculatePercentile = useCallback((guessesUsed, won) => {
    if (puzzleLeaderboard.length === 0) return null;

    // Count how many did better
    let betterCount = 0;
    for (const entry of puzzleLeaderboard) {
      if (entry.won && !won) {
        betterCount++;
      } else if (entry.won && won && entry.guesses_used < guessesUsed) {
        betterCount++;
      }
    }

    const percentile = Math.round(((puzzleLeaderboard.length - betterCount) / puzzleLeaderboard.length) * 100);
    return percentile;
  }, [puzzleLeaderboard]);

  /**
   * Get top N entries from puzzle leaderboard
   */
  const getTopEntries = useCallback((n = 5) => {
    return puzzleLeaderboard
      .filter(entry => entry.won)
      .sort((a, b) => {
        // Sort by guesses_used (ascending), then by created_at (ascending)
        if (a.guesses_used !== b.guesses_used) {
          return a.guesses_used - b.guesses_used;
        }
        return new Date(a.created_at) - new Date(b.created_at);
      })
      .slice(0, n);
  }, [puzzleLeaderboard]);

  /**
   * Check if user has already submitted for today
   */
  useEffect(() => {
    const deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (deviceId && puzzleLeaderboard.length > 0) {
      const existingEntry = puzzleLeaderboard.find(entry => entry.device_id === deviceId);
      if (existingEntry) {
        setHasSubmitted(true);
        setUserRanking(puzzleLeaderboard.indexOf(existingEntry) + 1);
      }
    }
  }, [puzzleLeaderboard]);

  return {
    // Puzzle leaderboard
    puzzleLeaderboard,
    puzzleLeaderboardLoading,
    fetchPuzzleLeaderboard,
    getTopEntries,

    // All-time leaderboard
    allTimeLeaderboard,
    allTimeLoading,
    fetchAllTimeLeaderboard,

    // User data
    displayName,
    saveDisplayName,
    userRanking,
    calculatePercentile,

    // Submission
    submitToLeaderboard,
    isSubmitting,
    hasSubmitted,

    // Error
    error
  };
}

export default useLeaderboard;
