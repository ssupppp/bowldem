/**
 * ArchiveModal Component
 * Displays list of past puzzles that can be replayed
 */

import React, { useState, useEffect } from 'react';
import { getArchivePuzzles } from '../lib/supabase.js';
import { EPOCH_DATE, getPuzzleNumber } from '../utils/dailyPuzzle.js';

// Storage key for archive completion tracking
const ARCHIVE_STORAGE_KEY = 'bowldem_archive_completed';

/**
 * Load completed archive puzzles from localStorage
 */
function loadArchiveCompleted() {
  try {
    const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Generate local archive list based on EPOCH_DATE
 * Used as fallback if Supabase doesn't have puzzle_date data
 */
function generateLocalArchive() {
  const archive = [];
  const today = new Date();
  const epoch = new Date(EPOCH_DATE + 'T00:00:00Z');

  // Start from day after epoch, go up to yesterday
  const current = new Date(epoch);
  current.setDate(current.getDate() + 1);

  while (current < today) {
    const dateStr = current.toISOString().split('T')[0];
    const puzzleNumber = getPuzzleNumber(dateStr);
    archive.push({
      puzzle_date: dateStr,
      puzzle_number: puzzleNumber
    });
    current.setDate(current.getDate() + 1);
  }

  // Return in reverse order (newest first)
  return archive.reverse();
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function ArchiveModal({ onClose, onSelectPuzzle }) {
  const [archivePuzzles, setArchivePuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedPuzzles, setCompletedPuzzles] = useState({});

  useEffect(() => {
    async function loadArchive() {
      setLoading(true);

      // Load completion status from localStorage
      setCompletedPuzzles(loadArchiveCompleted());

      // Try to fetch from Supabase first
      const supabaseData = await getArchivePuzzles();

      if (supabaseData && supabaseData.length > 0) {
        setArchivePuzzles(supabaseData);
      } else {
        // Fallback to local calculation
        setArchivePuzzles(generateLocalArchive());
      }

      setLoading(false);
    }

    loadArchive();
  }, []);

  const handlePuzzleClick = (puzzle) => {
    onSelectPuzzle(puzzle.puzzle_date, puzzle.puzzle_number);
    onClose();
  };

  return (
    <div className="archive-modal">
      <div className="modal-header">
        <h2 className="overlay-title">📚 Puzzle Archive</h2>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="archive-description">
        Replay past puzzles. Archive results don't affect your daily stats or streak.
      </div>

      {loading ? (
        <div className="archive-loading">Loading archive...</div>
      ) : archivePuzzles.length === 0 ? (
        <div className="archive-empty">
          No archive puzzles available yet. Check back tomorrow!
        </div>
      ) : (
        <div className="archive-list">
          {archivePuzzles.map((puzzle) => {
            const isCompleted = completedPuzzles[puzzle.puzzle_date];
            return (
              <button
                key={puzzle.puzzle_date}
                className={`archive-item ${isCompleted ? 'completed' : ''}`}
                onClick={() => handlePuzzleClick(puzzle)}
              >
                <div className="archive-item-left">
                  <span className="archive-puzzle-number">#{puzzle.puzzle_number}</span>
                  <span className="archive-date">{formatDate(puzzle.puzzle_date)}</span>
                </div>
                <div className="archive-item-right">
                  {isCompleted ? (
                    <span className="archive-status completed">
                      {isCompleted === 'won' ? '🏆' : '✓'}
                    </span>
                  ) : (
                    <span className="archive-status play">Play →</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="modal-buttons">
        <button className="btn-enhanced btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Save archive puzzle completion to localStorage
 */
export function saveArchiveCompletion(puzzleDate, result) {
  try {
    const completed = loadArchiveCompleted();
    completed[puzzleDate] = result; // 'won' or 'lost'
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(completed));
  } catch (e) {
    console.warn('Failed to save archive completion:', e);
  }
}

export default ArchiveModal;
