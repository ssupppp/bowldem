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

// ============================================================================
// PUZZLE SCHEDULE FUNCTIONS
// ============================================================================

/**
 * Get scheduled puzzle ID for a specific date
 * Returns the puzzle_id if a manual override exists, null otherwise
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {number|null} - Puzzle ID or null if no schedule
 */
export async function getScheduledPuzzleId(date) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('puzzle_schedule')
    .select('puzzle_id')
    .eq('schedule_date', date)
    .single();

  if (error) {
    // PGRST116 = no rows found (expected when no schedule exists)
    if (error.code !== 'PGRST116') {
      console.error('Error fetching scheduled puzzle:', error);
    }
    return null;
  }

  return data?.puzzle_id || null;
}

/**
 * Get all scheduled puzzles (for admin/debugging)
 * @returns {Array} - Array of schedule entries
 */
export async function getAllScheduledPuzzles() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('puzzle_schedule')
    .select('*')
    .order('schedule_date', { ascending: true });

  if (error) {
    console.error('Error fetching puzzle schedule:', error);
    return [];
  }

  return data || [];
}

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
 * Get all-time leaderboard from player_profiles (persistent stats)
 * @param {string} sortBy - Sort field: 'wins', 'win_rate', 'streak', 'avg_guesses'
 * @param {number} limit - Max results to return
 * @returns {Array} - Players with aggregated stats
 */
export async function getAllTimeLeaderboard(sortBy = 'wins', limit = 50) {
  if (!supabase) return [];

  // Map sort options to column names
  const sortColumn = {
    wins: 'total_wins',
    win_rate: 'win_rate',
    streak: 'best_streak',
    avg_guesses: 'avg_guesses'
  }[sortBy] || 'total_wins';

  // For avg_guesses, lower is better (ascending)
  const ascending = sortBy === 'avg_guesses';

  const { data, error } = await supabase
    .from('player_profiles')
    .select('*')
    .gt('total_games', 0)  // Only players who have played
    .order(sortColumn, { ascending })
    .limit(limit);

  if (error) {
    console.error('Error fetching all-time leaderboard:', error);
    return [];
  }

  // Transform to match expected format
  return (data || []).map(profile => ({
    display_name: profile.display_name,
    email: profile.email,
    total_wins: profile.total_wins,
    games_played: profile.total_games,
    win_rate: profile.win_rate,
    avg_guesses: profile.avg_guesses,
    current_streak: profile.current_streak,
    best_streak: profile.best_streak,
    last_played_date: profile.last_played_date
  }));
}

/**
 * Get all-time leaderboard (legacy - client-side aggregation)
 * Fallback for when player_profiles is empty
 * @returns {Array} - Players with total wins and games played
 * @deprecated Use getAllTimeLeaderboard() which reads from player_profiles
 */
export async function getAllTimeLeaderboardLegacy() {
  if (!supabase) return [];

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
// EMAIL SUBSCRIPTION FUNCTIONS
// ============================================================================

/**
 * Subscribe an email to Bowldem emails (daily reminders, weekly digest)
 * Upserts into email_subscribers and triggers welcome email Edge Function
 * @param {string} email - Email address
 * @param {Object} options - { displayName?, deviceId?, source? }
 * @returns {Object} - { success: boolean, alreadySubscribed?: boolean, error?: string }
 */
export async function subscribeToEmails(email, options = {}) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: 'Invalid email address' };
  }

  const { displayName, deviceId, source = 'leaderboard' } = options;

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('email_subscribers')
    .select('id, is_active, welcome_sent_at')
    .eq('email', normalizedEmail)
    .single();

  if (existing?.is_active) {
    return { success: true, alreadySubscribed: true };
  }

  // Upsert: reactivate if previously unsubscribed, or create new
  const { data, error } = await supabase
    .from('email_subscribers')
    .upsert([{
      email: normalizedEmail,
      display_name: displayName || null,
      device_id: deviceId || null,
      source,
      is_active: true,
      unsubscribed_at: null,
      subscribed_at: new Date().toISOString()
    }], {
      onConflict: 'email'
    })
    .select()
    .single();

  if (error) {
    console.error('Error subscribing email:', error);
    return { success: false, error: error.message };
  }

  // Trigger welcome email (non-blocking)
  if (!existing?.welcome_sent_at) {
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: { email: normalizedEmail, displayName: displayName || null }
      });
    } catch (e) {
      console.warn('Welcome email trigger failed (non-blocking):', e);
    }
  }

  return { success: true, data };
}

/**
 * Unsubscribe from all Bowldem emails
 * @param {string} email - Email to unsubscribe
 * @returns {Object} - { success: boolean }
 */
export async function unsubscribeFromEmails(email) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const normalizedEmail = email.toLowerCase().trim();

  const { error } = await supabase
    .from('email_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString()
    })
    .eq('email', normalizedEmail);

  if (error) {
    console.error('Error unsubscribing:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if an email is already subscribed
 * @param {string} email - Email to check
 * @returns {boolean}
 */
export async function isEmailSubscribed(email) {
  if (!supabase || !email) return false;

  const { data } = await supabase
    .from('email_subscribers')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single();

  return !!data;
}

// ============================================================================
// EMAIL PERSISTENCE FUNCTIONS
// ============================================================================

/**
 * Link an email to an existing leaderboard entry
 * @param {string} entryId - The leaderboard entry ID
 * @param {string} email - Email to link
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function linkEmailToEntry(entryId, email) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const { error } = await supabase
    .from('leaderboard_entries')
    .update({ email: email.toLowerCase().trim() })
    .eq('id', entryId);

  if (error) {
    console.error('Error linking email to entry:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Link email to all entries for a device ID
 * This allows users to claim all their past entries with one email
 * Also triggers backfill of player_profiles stats
 * @param {string} deviceId - The device ID
 * @param {string} email - Email to link
 * @returns {Object} - { success: boolean, count: number, error?: string }
 */
export async function linkEmailToDevice(deviceId, email) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .update({ email: normalizedEmail })
    .eq('device_id', deviceId)
    .is('email', null)
    .select('id');

  if (error) {
    console.error('Error linking email to device entries:', error);
    return { success: false, error: error.message };
  }

  // Backfill player_profiles with aggregated stats
  // This runs the backfill_player_stats function in Postgres
  try {
    await supabase.rpc('backfill_player_stats', { p_email: normalizedEmail });
  } catch (backfillError) {
    console.warn('Warning: Failed to backfill player stats:', backfillError);
    // Don't fail the whole operation - the trigger will handle future entries
  }

  return { success: true, count: data?.length || 0 };
}

/**
 * Get all leaderboard entries for an email
 * @param {string} email - Email to look up
 * @returns {Array} - Array of leaderboard entries
 */
export async function getEntriesByEmail(email) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .order('puzzle_date', { ascending: false });

  if (error) {
    console.error('Error fetching entries by email:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if an email is already linked to any entries
 * @param {string} email - Email to check
 * @returns {boolean} - True if email has linked entries
 */
export async function isEmailLinked(email) {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .limit(1);

  if (error) {
    return false;
  }

  return data && data.length > 0;
}


// ============================================================================
// PLAYER PROFILE FUNCTIONS
// ============================================================================

/**
 * Get player profile by email
 * @param {string} email - Player's email
 * @returns {Object|null} - Player profile or null
 */
export async function getPlayerProfile(email) {
  if (!supabase || !email) return null;

  const { data, error } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error) {
    // PGRST116 = not found (expected for new players)
    if (error.code !== 'PGRST116') {
      console.error('Error fetching player profile:', error);
    }
    return null;
  }

  return data;
}

/**
 * Backfill player stats from existing leaderboard entries
 * Call this after linking email to device to populate player_profiles
 * @param {string} email - Player's email
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function backfillPlayerStats(email) {
  if (!supabase || !email) return { success: false, error: 'Invalid email' };

  const { error } = await supabase.rpc('backfill_player_stats', {
    p_email: email.toLowerCase().trim()
  });

  if (error) {
    console.error('Error backfilling player stats:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get player's game history (all their entries)
 * @param {string} email - Player's email
 * @param {number} limit - Max entries to return
 * @returns {Array} - Array of game entries with puzzle details
 */
export async function getPlayerHistory(email, limit = 30) {
  if (!supabase || !email) return [];

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .order('puzzle_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching player history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get player's ranking position in all-time leaderboard
 * @param {string} email - Player's email
 * @param {string} sortBy - Sort criteria: 'wins', 'win_rate', 'streak'
 * @returns {number|null} - Ranking position (1-indexed) or null
 */
// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

/**
 * Sign in with Google OAuth (redirect mode for mobile compatibility)
 */
export async function signInWithGoogle() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
}

/**
 * Sign in with Magic Link (passwordless email)
 * @param {string} email - Email address
 */
export async function signInWithMagicLink(email) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  return supabase.auth.signInWithOtp({
    email: email.toLowerCase().trim(),
    options: {
      emailRedirectTo: window.location.origin
    }
  });
}

/**
 * Sign out the current user
 */
export async function signOut() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signOut();
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  if (!supabase) return { data: { user: null } };
  return supabase.auth.getUser();
}

/**
 * Listen for auth state changes
 * @param {Function} callback - (event, session) => void
 * @returns {Object} - { data: { subscription } } for cleanup
 */
export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

// ============================================================================
// AUTH MIGRATION FUNCTIONS
// ============================================================================

/**
 * Upsert user profile on first login — stores auth user ID + device mapping
 * @param {string} authUserId - Auth user UUID
 * @param {Object} options - { displayName, deviceId, localStats }
 */
export async function upsertUserProfile(authUserId, options = {}) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const { displayName, deviceId, localStats } = options;

  // First check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, device_ids')
    .eq('id', authUserId)
    .single();

  if (existing) {
    // Add device_id if not already in array
    const deviceIds = existing.device_ids || [];
    if (deviceId && !deviceIds.includes(deviceId)) {
      deviceIds.push(deviceId);
      const { error } = await supabase
        .from('user_profiles')
        .update({ device_ids: deviceIds })
        .eq('id', authUserId);
      if (error) return { success: false, error: error.message };
    }
    return { success: true, isNew: false };
  }

  // Create new profile
  const { error } = await supabase
    .from('user_profiles')
    .insert([{
      id: authUserId,
      display_name: displayName || null,
      device_ids: deviceId ? [deviceId] : [],
      local_stats: localStats || null
    }]);

  if (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true, isNew: true };
}

/**
 * Link leaderboard entries from a device_id to an auth user
 * @param {string} deviceId - Device ID
 * @param {string} authUserId - Auth user UUID
 * @param {string} email - User's email from auth
 */
export async function linkEntriesToAuthUser(deviceId, authUserId, email) {
  if (!supabase) return { success: false, error: 'Supabase not configured' };

  const normalizedEmail = email?.toLowerCase().trim();

  // Link by device_id where auth_user_id is not yet set
  const updates = { auth_user_id: authUserId };
  if (normalizedEmail) updates.email = normalizedEmail;

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .update(updates)
    .eq('device_id', deviceId)
    .is('auth_user_id', null)
    .select('id');

  if (error) {
    console.error('Error linking entries to auth user:', error);
    return { success: false, error: error.message };
  }

  // Also link entries from other devices that belong to this auth user
  // (handles multi-device merge)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('device_ids')
    .eq('id', authUserId)
    .single();

  if (profile?.device_ids) {
    for (const did of profile.device_ids) {
      if (did !== deviceId) {
        await supabase
          .from('leaderboard_entries')
          .update(updates)
          .eq('device_id', did)
          .is('auth_user_id', null);
      }
    }
  }

  // Backfill player stats if email exists
  if (normalizedEmail) {
    try {
      await supabase.rpc('backfill_player_stats', { p_email: normalizedEmail });
    } catch (e) {
      console.warn('Backfill player stats failed (non-blocking):', e);
    }
  }

  return { success: true, count: data?.length || 0 };
}

export async function getPlayerRanking(email, sortBy = 'wins') {
  if (!supabase || !email) return null;

  const sortColumn = {
    wins: 'total_wins',
    win_rate: 'win_rate',
    streak: 'best_streak'
  }[sortBy] || 'total_wins';

  // Get all profiles sorted, find player's position
  const { data, error } = await supabase
    .from('player_profiles')
    .select('email, ' + sortColumn)
    .gt('total_games', 0)
    .order(sortColumn, { ascending: false });

  if (error || !data) {
    return null;
  }

  const index = data.findIndex(p => p.email === email.toLowerCase().trim());
  return index >= 0 ? index + 1 : null;
}
