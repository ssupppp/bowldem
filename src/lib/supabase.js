import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get today's puzzle (safe - doesn't expose answer)
 */
export async function getTodaysPuzzle() {
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
  const { data, error } = await supabase
    .from('game_sessions')
    .insert([sessionData]);

  if (error) {
    console.error('Error recording session:', error);
    return null;
  }

  return data;
}
