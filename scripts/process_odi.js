/**
 * Process Cricsheet ODI data into Bowldem puzzle format
 *
 * Usage: node scripts/process_odi.js
 *
 * Reads match config from scripts/odi_matches.json
 * Reads raw Cricsheet JSON from /odi/ directory
 * Cross-references player keys against all_players.json
 * Outputs to src/data/match_puzzles_odi.json + src/data/match_highlights.json (ODI entries)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DATA_DIR = path.join(__dirname, '..', 'odi');
const CONFIG_FILE = path.join(__dirname, 'odi_matches.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'match_puzzles_odi.json');
const HIGHLIGHTS_FILE = path.join(__dirname, '..', 'src', 'data', 'match_highlights.json');
const PLAYERS_FILE = path.join(__dirname, '..', 'src', 'data', 'all_players.json');

// ODI puzzle IDs start after T20 WC puzzles (60 existing)
const ID_OFFSET = 60;

// ============================================================
// Player key mapping: Cricsheet abbreviated names → all_players.json IDs
// ============================================================

function loadPlayerDB() {
  const raw = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  const data = raw.players || raw;
  const byId = new Map();       // key → player object
  const byLastName = new Map(); // lastName → [player objects]

  data.forEach(player => {
    byId.set(player.id, player);

    // Index by last name (last word of fullName)
    const parts = player.fullName.split(' ');
    const lastName = parts[parts.length - 1].toUpperCase();
    if (!byLastName.has(lastName)) byLastName.set(lastName, []);
    byLastName.get(lastName).push(player);
  });

  return { byId, byLastName, allPlayers: data };
}

function generatePlayerKey(fullName) {
  return fullName.toUpperCase().replace(/[^A-Z]/g, '');
}

function resolvePlayerKey(cricsheetName, playerDB) {
  const cricsheetKey = generatePlayerKey(cricsheetName);

  // 1. Direct match — key already exists in DB
  if (playerDB.byId.has(cricsheetKey)) {
    return { key: cricsheetKey, method: 'direct' };
  }

  // 2. Extract last name and search
  const parts = cricsheetName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1].toUpperCase();
  const candidates = playerDB.byLastName.get(lastName) || [];

  if (candidates.length === 1) {
    return { key: candidates[0].id, method: 'lastname-unique' };
  }

  if (candidates.length > 1) {
    // Try matching first initial
    const firstInitial = cricsheetName.trim()[0].toUpperCase();
    const initialMatches = candidates.filter(p => {
      const pFirstChar = p.fullName.trim()[0].toUpperCase();
      return pFirstChar === firstInitial;
    });
    if (initialMatches.length === 1) {
      return { key: initialMatches[0].id, method: 'lastname-initial' };
    }

    // Try: does the cricsheet key appear as a substring of any candidate's key?
    const substrMatches = candidates.filter(p => p.id.includes(cricsheetKey) || cricsheetKey.includes(p.id));
    if (substrMatches.length === 1) {
      return { key: substrMatches[0].id, method: 'substring' };
    }
  }

  // 3. Not found
  return { key: cricsheetKey, method: 'MISSING' };
}

// ============================================================
// Score formatting
// ============================================================

function formatOvers(totalBalls) {
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;
  return balls === 0 ? `${overs}` : `${overs}.${balls}`;
}

function formatScore(runs, wickets, totalBalls, maxOvers) {
  const oversStr = formatOvers(totalBalls);
  return `${runs}/${wickets} (${oversStr} overs)`;
}

function formatResult(info) {
  const outcome = info.outcome;
  if (!outcome.winner) {
    if (outcome.result === 'tie') return 'Match tied';
    if (outcome.result === 'no result') return 'No result';
    return 'Match drawn';
  }
  const winner = outcome.winner;
  const by = outcome.by;
  if (by.runs) return `${winner} won by ${by.runs} runs`;
  if (by.wickets) return `${winner} won by ${by.wickets} wickets`;
  return `${winner} won`;
}

// ============================================================
// Match processing
// ============================================================

function processMatch(matchData, puzzleId, config, playerDB) {
  const info = matchData.info;
  const innings = matchData.innings;
  const teams = info.teams;

  // Resolve all player keys against DB (deduplicate)
  const playersInMatch = [];
  const seenKeys = new Set();
  const missingPlayers = [];

  teams.forEach(team => {
    info.players[team].forEach(playerName => {
      const resolved = resolvePlayerKey(playerName, playerDB);
      if (!seenKeys.has(resolved.key)) {
        seenKeys.add(resolved.key);
        playersInMatch.push(resolved.key);
      }
      if (resolved.method === 'MISSING') {
        missingPlayers.push({ name: playerName, cricsheetKey: resolved.key, team });
      }
    });
  });

  // Calculate team scores from ball-by-ball data
  const teamData = {};
  teams.forEach(team => {
    teamData[team] = { runs: 0, wickets: 0, balls: 0 };
  });

  innings.forEach(inning => {
    const team = inning.team;
    inning.overs.forEach(over => {
      over.deliveries.forEach(delivery => {
        teamData[team].runs += delivery.runs.total || 0;
        const isWide = delivery.extras && delivery.extras.wides;
        const isNoBall = delivery.extras && delivery.extras.noballs;
        if (!isWide && !isNoBall) {
          teamData[team].balls += 1;
        }
        if (delivery.wickets) {
          teamData[team].wickets += delivery.wickets.length;
        }
      });
    });
  });

  // Format scores
  const team1 = teams[0];
  const team2 = teams[1];
  const team1Score = formatScore(teamData[team1].runs, teamData[team1].wickets, teamData[team1].balls, info.overs || 50);
  const team2Score = formatScore(teamData[team2].runs, teamData[team2].wickets, teamData[team2].balls, info.overs || 50);

  // Get MOTM
  const motmName = info.player_of_match[0];
  const motmResolved = resolvePlayerKey(motmName, playerDB);

  // Determine MOTM's team
  let targetPlayerTeam = '';
  teams.forEach(team => {
    if (info.players[team].includes(motmName)) {
      targetPlayerTeam = team;
    }
  });

  // Build venue string
  let venue = info.venue || '';
  if (info.city && !venue.includes(info.city)) {
    venue = `${venue}, ${info.city}`;
  }

  return {
    puzzle: {
      id: puzzleId,
      targetPlayer: motmResolved.key,
      cricinfoUrl: config.cricinfoUrl,
      matchData: {
        scorecard: {
          venue: venue,
          team1Name: team1,
          team2Name: team2,
          team1Score: team1Score,
          team2Score: team2Score,
          result: formatResult(info)
        },
        playersInMatch: playersInMatch,
        targetPlayerTeam: targetPlayerTeam,
        targetPlayerRole: config.targetPlayerRole
      }
    },
    missingPlayers,
    motmMethod: motmResolved.method
  };
}

// ============================================================
// Main
// ============================================================

function main() {
  // Load player database
  console.log('Loading player database...');
  const playerDB = loadPlayerDB();
  console.log(`  ${playerDB.byId.size} players loaded\n`);

  // Load match config
  const configData = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const matchConfigs = configData.matches;

  const puzzles = [];
  const highlights = [];
  const errors = [];
  const allMissing = [];

  matchConfigs.forEach((config, index) => {
    const filePath = path.join(RAW_DATA_DIR, config.file);
    const puzzleId = ID_OFFSET + index + 1;

    console.log(`Processing: ${config.file} → Puzzle #${puzzleId}`);

    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const matchData = JSON.parse(rawData);
      const result = processMatch(matchData, puzzleId, config, playerDB);
      puzzles.push(result.puzzle);

      // Build highlight entry
      highlights.push({
        puzzleId: puzzleId,
        matchContext: config.matchContext,
        triviaFact: config.triviaFact,
        playerHighlight: config.playerHighlight
      });

      const sc = result.puzzle.matchData.scorecard;
      console.log(`  ${sc.team1Name} ${sc.team1Score} vs ${sc.team2Name} ${sc.team2Score}`);
      console.log(`  MOTM: ${result.puzzle.targetPlayer} (${result.motmMethod})`);
      console.log(`  Result: ${sc.result}`);

      if (result.missingPlayers.length > 0) {
        console.log(`  ⚠ ${result.missingPlayers.length} players NOT in all_players.json`);
        result.missingPlayers.forEach(p => {
          allMissing.push({ ...p, puzzleId });
        });
      }
      console.log('');
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      errors.push({ file: config.file, error: err.message });
    }
  });

  // Write puzzle output
  const output = { puzzles };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nPuzzles written to: ${OUTPUT_FILE}`);
  console.log(`Total ODI puzzles: ${puzzles.length}`);

  // Merge ODI highlights into existing highlights file
  if (highlights.length > 0) {
    try {
      const existingHighlights = JSON.parse(fs.readFileSync(HIGHLIGHTS_FILE, 'utf8'));
      existingHighlights.highlights = existingHighlights.highlights.filter(h => h.puzzleId <= ID_OFFSET);
      existingHighlights.highlights.push(...highlights);
      fs.writeFileSync(HIGHLIGHTS_FILE, JSON.stringify(existingHighlights, null, 2));
      console.log(`Highlights merged into: ${HIGHLIGHTS_FILE}`);
    } catch (err) {
      console.log(`Note: Could not merge highlights - ${err.message}`);
      const standaloneFile = path.join(__dirname, '..', 'src', 'data', 'odi_highlights.json');
      fs.writeFileSync(standaloneFile, JSON.stringify({ highlights }, null, 2));
      console.log(`Standalone highlights written to: ${standaloneFile}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n⚠ Errors (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e.file}: ${e.error}`));
  }

  // Report missing players
  if (allMissing.length > 0) {
    console.log(`\n========================================`);
    console.log(`MISSING PLAYERS: ${allMissing.length} need to be added to all_players.json`);
    console.log(`========================================`);

    // Deduplicate
    const seen = new Set();
    const unique = allMissing.filter(p => {
      if (seen.has(p.cricsheetKey)) return false;
      seen.add(p.cricsheetKey);
      return true;
    });

    unique.forEach(p => {
      console.log(`  "${p.name}" → key: ${p.cricsheetKey} (${p.team})`);
    });

    console.log(`\nUnique missing: ${unique.length}`);
    console.log(`\nTo add these players, you can copy-paste the JSON below into all_players.json:`);
    console.log('---');
    unique.forEach(p => {
      // Guess country from team name
      const country = p.team;
      // Guess role (default to Batsman, manual fix needed)
      console.log(`    { "id": "${p.cricsheetKey}", "fullName": "${p.name}", "country": "${country}", "role": "Batsman" },`);
    });
  } else {
    console.log('\n✓ All players found in all_players.json!');
  }
}

main();
