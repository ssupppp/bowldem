/**
 * Generate SQL INSERT statements for Supabase import
 * Run: node scripts/generate_supabase_import.js
 * Then copy output SQL to Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

// Read data files
const playersData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/all_players.json'), 'utf8')
);
const puzzlesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/match_puzzles_t20wc.json'), 'utf8')
);

// Escape single quotes for SQL
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return str.replace(/'/g, "''");
}

// Generate Players INSERT
function generatePlayersSQL(players) {
  let sql = '-- ============================================\n';
  sql += '-- PLAYERS DATA IMPORT\n';
  sql += '-- ============================================\n\n';
  sql += 'INSERT INTO players (id, full_name, country, role) VALUES\n';

  const values = players.map((p, i) => {
    const comma = i < players.length - 1 ? ',' : ';';
    return `  ('${escapeSql(p.id)}', '${escapeSql(p.fullName)}', '${escapeSql(p.country)}', '${escapeSql(p.role)}')${comma}`;
  });

  sql += values.join('\n');
  return sql;
}

// Generate Puzzles INSERT
// Note: puzzle_date starts from EPOCH 2026-01-15
function generatePuzzlesSQL(puzzles) {
  const EPOCH = new Date('2026-01-15');

  let sql = '\n\n-- ============================================\n';
  sql += '-- PUZZLES DATA IMPORT\n';
  sql += '-- ============================================\n\n';
  sql += 'INSERT INTO puzzles (id, puzzle_date, venue, team1_score, team2_score, result, players_in_match, target_player_id, target_player_team, target_player_role, tournament) VALUES\n';

  const values = puzzles.map((p, i) => {
    const puzzleDate = new Date(EPOCH);
    puzzleDate.setDate(puzzleDate.getDate() + (p.id - 1));
    const dateStr = puzzleDate.toISOString().split('T')[0];

    const scorecard = p.matchData.scorecard;
    const playersJson = JSON.stringify(p.matchData.playersInMatch);

    const comma = i < puzzles.length - 1 ? ',' : ';';

    return `  (${p.id}, '${dateStr}', '${escapeSql(scorecard.venue)}', '${escapeSql(scorecard.team1Score)}', '${escapeSql(scorecard.team2Score)}', '${escapeSql(scorecard.result)}', '${escapeSql(playersJson)}'::jsonb, '${escapeSql(p.targetPlayer)}', '${escapeSql(p.matchData.targetPlayerTeam)}', '${escapeSql(p.matchData.targetPlayerRole)}', 'T20 World Cup 2024')${comma}`;
  });

  sql += values.join('\n');
  return sql;
}

// Generate full SQL
const playersSql = generatePlayersSQL(playersData.players);
const puzzlesSql = generatePuzzlesSQL(puzzlesData.puzzles);

const fullSql = playersSql + puzzlesSql;

// Write to file
const outputPath = path.join(__dirname, 'supabase_import.sql');
fs.writeFileSync(outputPath, fullSql);

console.log(`✅ Generated SQL file: ${outputPath}`);
console.log(`   - ${playersData.players.length} players`);
console.log(`   - ${puzzlesData.puzzles.length} puzzles`);
console.log('\nNext steps:');
console.log('1. Open the SQL file');
console.log('2. Copy all contents');
console.log('3. Paste in Supabase SQL Editor');
console.log('4. Click Run');
