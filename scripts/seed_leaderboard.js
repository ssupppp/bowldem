/**
 * Seed Leaderboard Script
 * Generates realistic fake leaderboard entries for social proof
 *
 * Usage:
 *   node scripts/seed_leaderboard.js
 *   node scripts/seed_leaderboard.js --date 2026-01-22
 *   node scripts/seed_leaderboard.js --count 15
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cricket-themed username patterns
const USERNAME_PREFIXES = [
  'Swift', 'Golden', 'Mighty', 'Pro', 'Elite', 'Super', 'Cricket', 'Spin', 'Pace', 'Power',
  'Quick', 'Steady', 'Sharp', 'Cool', 'Fast', 'Big', 'The', 'King', 'Star', 'Rising'
];

const USERNAME_CORES = [
  'Yorker', 'Spinner', 'Sixer', 'Boundary', 'Wicket', 'Bowler', 'Batsman', 'Keeper',
  'Captain', 'Champion', 'Master', 'Legend', 'Warrior', 'Hunter', 'Striker', 'Hitter',
  'Fielder', 'Allrounder', 'Opener', 'Finisher'
];

const USERNAME_SUFFIXES = [
  '', '7', '11', '22', '99', '_Pro', '_King', 'X', '2024', '_MVP', 'Star', 'Fan',
  '_Official', '', '', '', '', '', '', '' // Empty strings for variety
];

/**
 * Generate a cricket-themed username
 */
function generateUsername() {
  const prefix = USERNAME_PREFIXES[Math.floor(Math.random() * USERNAME_PREFIXES.length)];
  const core = USERNAME_CORES[Math.floor(Math.random() * USERNAME_CORES.length)];
  const suffix = USERNAME_SUFFIXES[Math.floor(Math.random() * USERNAME_SUFFIXES.length)];

  // Randomly decide format
  const format = Math.floor(Math.random() * 4);

  switch (format) {
    case 0:
      return `${prefix}${core}${suffix}`;
    case 1:
      return `${core}${prefix}${suffix}`;
    case 2:
      return `${prefix}_${core}`;
    case 3:
      return `${core}${Math.floor(Math.random() * 100)}`;
    default:
      return `${prefix}${core}`;
  }
}

/**
 * Generate guess count based on realistic distribution
 * 10% - 1 guess
 * 30% - 2 guesses
 * 40% - 3 guesses
 * 20% - 4 guesses
 */
function generateGuessCount() {
  const rand = Math.random() * 100;

  if (rand < 10) return 1;
  if (rand < 40) return 2;
  if (rand < 80) return 3;
  return 4;
}

/**
 * Generate a random timestamp within the day
 */
function generateTimestamp(date) {
  const baseDate = new Date(date);
  // Random time between 00:00 and 23:59
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const seconds = Math.floor(Math.random() * 60);

  baseDate.setHours(hours, minutes, seconds, 0);
  return baseDate.toISOString();
}

/**
 * Generate seeded leaderboard entries
 * @param {string} puzzleDate - Date in YYYY-MM-DD format
 * @param {number} puzzleNumber - Puzzle number
 * @param {number} count - Number of entries to generate
 */
async function generateSeedEntries(puzzleDate, puzzleNumber, count) {
  const entries = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    // Generate unique username
    let username;
    do {
      username = generateUsername();
    } while (usedNames.has(username.toLowerCase()));
    usedNames.add(username.toLowerCase());

    // Generate stats
    const guessesUsed = generateGuessCount();
    const won = true; // All seeded entries are winners for positive social proof

    entries.push({
      display_name: username,
      device_id: `seed_${Date.now()}_${i}`, // Unique seed device ID
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      guesses_used: guessesUsed,
      won: won,
      is_seed: true,
      created_at: generateTimestamp(puzzleDate)
    });
  }

  return entries;
}

/**
 * Check if seed data already exists for a date
 */
async function checkExistingSeedData(puzzleDate) {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('id')
    .eq('puzzle_date', puzzleDate)
    .eq('is_seed', true)
    .limit(1);

  if (error) {
    console.error('Error checking existing seed data:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Insert seed entries into database
 */
async function insertSeedEntries(entries) {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .insert(entries)
    .select();

  if (error) {
    console.error('Error inserting seed entries:', error);
    return false;
  }

  console.log(`Successfully inserted ${data.length} seed entries`);
  return true;
}

/**
 * Remove seed data for a specific date
 */
async function removeSeedData(puzzleDate) {
  const { error } = await supabase
    .from('leaderboard_entries')
    .delete()
    .eq('puzzle_date', puzzleDate)
    .eq('is_seed', true);

  if (error) {
    console.error('Error removing seed data:', error);
    return false;
  }

  console.log(`Removed seed data for ${puzzleDate}`);
  return true;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let targetDate = new Date().toISOString().split('T')[0]; // Today
  let count = 15; // Default: 15 entries
  let remove = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      targetDate = args[i + 1];
      i++;
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--remove') {
      remove = true;
    } else if (args[i] === '--help') {
      console.log(`
Usage: node scripts/seed_leaderboard.js [options]

Options:
  --date YYYY-MM-DD    Target date (default: today)
  --count N            Number of entries to generate (default: 15)
  --remove             Remove seed data for the date
  --help               Show this help

Examples:
  node scripts/seed_leaderboard.js
  node scripts/seed_leaderboard.js --date 2026-01-22 --count 20
  node scripts/seed_leaderboard.js --date 2026-01-22 --remove
      `);
      process.exit(0);
    }
  }

  console.log(`Target date: ${targetDate}`);

  if (remove) {
    await removeSeedData(targetDate);
    process.exit(0);
  }

  // Check if seed data already exists
  const exists = await checkExistingSeedData(targetDate);
  if (exists) {
    console.log(`Seed data already exists for ${targetDate}. Use --remove to clear first.`);
    process.exit(1);
  }

  // Calculate puzzle number (assuming epoch of 2026-01-15)
  const epochDate = new Date('2026-01-15');
  const target = new Date(targetDate);
  const puzzleNumber = Math.floor((target - epochDate) / (1000 * 60 * 60 * 24)) + 1;

  console.log(`Puzzle number: ${puzzleNumber}`);
  console.log(`Generating ${count} seed entries...`);

  const entries = await generateSeedEntries(targetDate, puzzleNumber, count);

  // Log distribution for verification
  const distribution = [0, 0, 0, 0];
  entries.forEach(e => distribution[e.guesses_used - 1]++);
  console.log(`Distribution: 1g=${distribution[0]}, 2g=${distribution[1]}, 3g=${distribution[2]}, 4g=${distribution[3]}`);

  // Insert entries
  const success = await insertSeedEntries(entries);

  if (success) {
    console.log('Seeding complete!');
  } else {
    console.log('Seeding failed.');
    process.exit(1);
  }
}

main().catch(console.error);
