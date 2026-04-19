/**
 * Tutorial Puzzle — first-visit onboarding via a known-famous puzzle.
 *
 * Every first-time visitor gets puzzle id 112 (2011 ODI World Cup Final,
 * India v Sri Lanka, Wankhede — MS Dhoni MOTM) as their first puzzle.
 * After they finish it (win or lose), they graduate to the normal daily
 * rotation on their next visit.
 *
 * This replaces the old TutorialOverlay modal, which was gating first
 * interaction for cold paid traffic (264 landings → 0 plays).
 *
 * State isolation: tutorial puzzle state is written to `bowldem_state`
 * (same key as daily) but with `lastPuzzleNumber = TUTORIAL_SENTINEL`.
 * The daily flow uses puzzle numbers >= 0 so there's no collision.
 * On graduation, stale tutorial state is detected and cleared.
 */

export const TUTORIAL_PUZZLE_ID = 112;
export const TUTORIAL_SENTINEL = -1;

const DONE_KEY = 'bowldem_tutorial_puzzle_done';

export function hasPlayedTutorialPuzzle() {
  // ?tutorial in URL forces tutorial mode (for testing)
  if (typeof window !== 'undefined' && window.location.search.includes('tutorial')) {
    localStorage.removeItem(DONE_KEY);
    return false;
  }
  try {
    return localStorage.getItem(DONE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markTutorialPuzzleDone() {
  try {
    localStorage.setItem(DONE_KEY, 'true');
  } catch (e) {
    console.warn('[TutorialPuzzle] Failed to mark done:', e);
  }
}

export function resetTutorialPuzzle() {
  try {
    localStorage.removeItem(DONE_KEY);
  } catch (e) {
    console.warn('[TutorialPuzzle] Failed to reset:', e);
  }
}

/**
 * One-time migration for users who already had daily puzzle history
 * from before this change — don't force them into the tutorial puzzle.
 *
 * Runs once on module import. Idempotent (only sets the flag if unset).
 */
export function migratePreExistingUsers() {
  try {
    if (localStorage.getItem(DONE_KEY) !== null) return;

    const state = localStorage.getItem('bowldem_state');
    if (state) {
      try {
        const parsed = JSON.parse(state);
        if (parsed.lastPlayedDate) {
          localStorage.setItem(DONE_KEY, 'true');
          return;
        }
      } catch {
        // fall through
      }
    }

    const stats = localStorage.getItem('bowldem_stats');
    if (stats) {
      try {
        const parsed = JSON.parse(stats);
        if (parsed.gamesPlayed && parsed.gamesPlayed > 0) {
          localStorage.setItem(DONE_KEY, 'true');
        }
      } catch {
        // fall through
      }
    }
  } catch (e) {
    console.warn('[TutorialPuzzle] Migration check failed:', e);
  }
}
