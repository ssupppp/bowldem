import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Conditionally create client - only if env vars exist
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase disabled - missing environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
}

export { supabase };

/**
 * Get today's puzzle (safe - doesn't expose answer)
 */
export async function getTodaysPuzzle() {
  if (!supabase) return null;

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('public_puzzles')
    .select('*')
    .eq('puzzle_date', today)
    .single();

  if (error) {
    console.error('Error fetching puzzle:', error);
    return null;
  }

  return data;
}

/**
 * Get puzzle by date (safe - doesn't expose answer)
 */
export async function getPuzzleByDate(date) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('public_puzzles')
    .select('*')
    .eq('puzzle_date', date)
    .single();

  if (error) {
    console.error('Error fetching puzzle:', error);
    return null;
  }

  return data;
}

/**
 * Get all players (for autocomplete)
 */
export async function getAllPlayers() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('players')
    .select('id, full_name, country, role')
    .order('full_name');

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  return data;
}

/**
 * Validate a guess (server-side validation via RPC)
 * Returns feedback without exposing the answer
 */
export async function validateGuess(puzzleId, guessedPlayerId) {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('validate_guess', {
    p_puzzle_id: puzzleId,
    p_guessed_player_id: guessedPlayerId
  });

  if (error) {
    console.error('Error validating guess:', error);
    return null;
  }

  return data;
}

/**
 * Record a game session (analytics)
 */
export async function recordGameSession(sessionData) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_sessions')
    .insert([sessionData]);

  if (error) {
    console.error('Error recording session:', error);
    return null;
  }

  return data;
}

/**
 * Get archive puzzles (past puzzles only)
 * Returns list of puzzle dates before today
 */
export async function getArchivePuzzles() {
  if (!supabase) return [];

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('public_puzzles')
    .select('id, puzzle_date, puzzle_number')
    .lt('puzzle_date', today)
    .order('puzzle_date', { ascending: false });

  if (error) {
    console.error('Error fetching archive puzzles:', error);
    return [];
  }

  return data;
}

// ============================================================================
// LEADERBOARD FUNCTIONS
// ============================================================================

/**
 * Get leaderboard entries for a specific puzzle date
 * @param {string} puzzleDate - Date in YYYY-MM-DD format
 * @returns {Array} - Leaderboard entries sorted by performance
 */
export async function getLeaderboardForPuzzle(puzzleDate) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('puzzle_date', puzzleDate)
    .order('guesses_used', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all-time leaderboard (aggregated stats per player)
 * @returns {Array} - Players with total wins and games played
 */
export async function getAllTimeLeaderboard() {
  if (!supabase) return [];

  // Use RPC for aggregated query, or fallback to client-side aggregation
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('display_name, won, guesses_used')
    .eq('is_seed', false);

  if (error) {
    console.error('Error fetching all-time leaderboard:', error);
    return [];
  }

  // Aggregate on client side
  const playerStats = {};
  (data || []).forEach(entry => {
    const name = entry.display_name;
    if (!playerStats[name]) {
      playerStats[name] = {
        display_name: name,
        games_played: 0,
        total_wins: 0,
        total_guesses: 0
      };
    }
    playerStats[name].games_played++;
    if (entry.won) {
      playerStats[name].total_wins++;
      playerStats[name].total_guesses += entry.guesses_used;
    }
  });

  // Convert to array and sort by wins, then by average guesses
  return Object.values(playerStats)
    .sort((a, b) => {
      if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins;
      const avgA = a.total_wins > 0 ? a.total_guesses / a.total_wins : 5;
      const avgB = b.total_wins > 0 ? b.total_guesses / b.total_wins : 5;
      return avgA - avgB;
    });
}

/**
 * Submit a new leaderboard entry
 * @param {Object} entry - Leaderboard entry data
 * @returns {Object} - { success: boolean, data?: any, error?: string }
 */
export async function submitLeaderboardEntry(entry) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  // Check if device already submitted for this puzzle
  const { data: existing } = await supabase
    .from('leaderboard_entries')
    .select('id')
    .eq('puzzle_date', entry.puzzle_date)
    .eq('device_id', entry.device_id)
    .single();

  if (existing) {
    return { success: false, error: 'Already submitted for this puzzle' };
  }

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .insert([entry])
    .select()
    .single();

  if (error) {
    console.error('Error submitting leaderboard entry:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get user's ranking for a specific puzzle
 * @param {string} puzzleDate - Date in YYYY-MM-DD format
 * @param {string} deviceId - User's device ID
 * @returns {number|null} - User's rank or null if not found
 */
export async function getUserRanking(puzzleDate, deviceId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('id, device_id, guesses_used, won, created_at')
    .eq('puzzle_date', puzzleDate)
    .order('guesses_used', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) {
    return null;
  }

  const index = data.findIndex(entry => entry.device_id === deviceId);
  return index >= 0 ? index + 1 : null;
}

// ============================================================================
// NOTIFICATION/CONTACT FUNCTIONS
// ============================================================================

/**
 * Subscribe for notifications
 * @param {Object} contact - Contact info { email?, phone_number?, preferred_channel }
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function subscribeForNotifications(contact) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  if (!contact.email && !contact.phone_number) {
    return { success: false, error: 'Email or phone number required' };
  }

  const { data, error } = await supabase
    .from('contact_subscriptions')
    .insert([{
      email: contact.email || null,
      phone_number: contact.phone_number || null,
      preferred_channel: contact.preferred_channel || (contact.email ? 'email' : 'sms'),
      is_active: true
    }])
    .select()
    .single();

  if (error) {
    // Check if already subscribed
    if (error.code === '23505') {
      return { success: false, error: 'Already subscribed' };
    }
    console.error('Error subscribing for notifications:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Unsubscribe from notifications
 * @param {string} email - Email to unsubscribe
 * @returns {Object} - { success: boolean }
 */
export async function unsubscribeFromNotifications(email) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const { error } = await supabase
    .from('contact_subscriptions')
    .update({ is_active: false })
    .eq('email', email);

  if (error) {
    console.error('Error unsubscribing:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
