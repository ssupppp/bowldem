/**
 * Process Cricsheet T20 World Cup data into Bowldem puzzle format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files for our 5 MVP matches
const MATCH_FILES = [
  '1298150.json',  // 2022 IND vs PAK (Kohli 82*)
  '1298179.json',  // 2022 Final ENG vs PAK
  '1415755.json',  // 2024 Final IND vs SA
  '951373.json',   // 2016 Final WI vs ENG
  '1273727.json',  // 2021 IND vs PAK
];

const RAW_DATA_DIR = path.join(__dirname, '..', 't20_wc_raw');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'match_puzzles_t20wc.json');

function processMatch(matchData, puzzleId) {
  const info = matchData.info;
  const innings = matchData.innings;

  // Initialize player stats
  const playerStats = {};
  const teams = info.teams;

  // Initialize all players from both teams
  teams.forEach(team => {
    info.players[team].forEach(player => {
      playerStats[player] = {
        full_name: player,
        team: team,
        runs_in_match: 0,
        wickets_in_match: 0,
        played_in_match: true
      };
    });
  });

  // Process each innings
  innings.forEach(inning => {
    const battingTeam = inning.team;
    const bowlingTeam = teams.find(t => t !== battingTeam);

    inning.overs.forEach(over => {
      over.deliveries.forEach(delivery => {
        const batter = delivery.batter;
        const bowler = delivery.bowler;

        // Add batter runs
        if (playerStats[batter]) {
          playerStats[batter].runs_in_match += delivery.runs.batter || 0;
        }

        // Check for wickets
        if (delivery.wickets) {
          delivery.wickets.forEach(wicket => {
            // Credit bowler for bowled, caught, lbw, stumped, hit wicket
            const creditedKinds = ['bowled', 'caught', 'lbw', 'stumped', 'hit wicket', 'caught and bowled'];
            if (creditedKinds.includes(wicket.kind) && playerStats[bowler]) {
              playerStats[bowler].wickets_in_match += 1;
            }
          });
        }
      });
    });
  });

  // Convert player names to keys
  const playerPerformances = {};
  Object.entries(playerStats).forEach(([name, stats]) => {
    const key = generatePlayerKey(name);
    playerPerformances[key] = stats;
  });

  // Calculate team scores
  const teamScores = {};
  teams.forEach(team => {
    teamScores[team] = { runs: 0, wickets: 0 };
  });

  innings.forEach(inning => {
    const team = inning.team;
    let runs = 0;
    let wickets = 0;

    inning.overs.forEach(over => {
      over.deliveries.forEach(delivery => {
        runs += delivery.runs.total || 0;
        if (delivery.wickets) {
          wickets += delivery.wickets.length;
        }
      });
    });

    teamScores[team] = { runs, wickets };
  });

  // Get MOTM player key
  const motmName = info.player_of_match[0];
  const motmKey = generatePlayerKey(motmName);

  return {
    id: puzzleId,
    targetPlayer: motmKey,
    matchData: {
      scorecard: {
        teams: teams,
        venue: info.venue || info.city,
        date: info.dates[0],
        winner: info.outcome.winner,
        player_of_match: motmName,
        team_scores: teamScores
      },
      playerPerformances: playerPerformances
    }
  };
}

function generatePlayerKey(fullName) {
  // Generate a consistent key from player name
  // Remove initials and special characters, uppercase
  const parts = fullName.split(' ');
  if (parts.length === 1) {
    return fullName.toUpperCase().replace(/[^A-Z]/g, '');
  }

  // For names like "V Kohli" -> "VKOHLI"
  // For names like "Mohammad Rizwan" -> "MOHAMMADRIZWAN"
  return fullName.toUpperCase().replace(/[^A-Z]/g, '');
}

function main() {
  const puzzles = [];

  MATCH_FILES.forEach((file, index) => {
    const filePath = path.join(RAW_DATA_DIR, file);
    console.log(`Processing: ${file}`);

    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const matchData = JSON.parse(rawData);
      const puzzle = processMatch(matchData, index + 1);
      puzzles.push(puzzle);

      console.log(`  Teams: ${puzzle.matchData.scorecard.teams.join(' vs ')}`);
      console.log(`  MOTM: ${puzzle.matchData.scorecard.player_of_match} (${puzzle.targetPlayer})`);
      console.log(`  Winner: ${puzzle.matchData.scorecard.winner}`);
      console.log('');
    } catch (err) {
      console.error(`Error processing ${file}:`, err.message);
    }
  });

  const output = { puzzles };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);
  console.log(`Total puzzles: ${puzzles.length}`);
}

main();
