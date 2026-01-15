/**
 * Extract unique players from match puzzles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUZZLES_FILE = path.join(__dirname, '..', 'src', 'data', 'match_puzzles_t20wc.json');

const data = JSON.parse(fs.readFileSync(PUZZLES_FILE, 'utf8'));

const players = new Map();

data.puzzles.forEach(puzzle => {
  Object.entries(puzzle.matchData.playerPerformances).forEach(([key, player]) => {
    if (!players.has(key)) {
      players.set(key, {
        key,
        fullName: player.full_name,
        team: player.team
      });
    }
  });
});

console.log(`Total unique players: ${players.size}\n`);

// Group by team/country
const byCountry = {};
players.forEach(p => {
  if (!byCountry[p.team]) byCountry[p.team] = [];
  byCountry[p.team].push(p);
});

Object.keys(byCountry).sort().forEach(country => {
  console.log(`\n${country} (${byCountry[country].length}):`);
  byCountry[country].forEach(p => {
    console.log(`  ${p.key}: ${p.fullName}`);
  });
});
