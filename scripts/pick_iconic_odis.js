/**
 * Scan bulk Cricsheet ODI data and pick 50 iconic matches for Bowldem puzzles.
 *
 * Usage: node scripts/pick_iconic_odis.js
 *
 * Scans odi/bulk_temp/ for all ODI JSON files and ranks matches by importance:
 * - World Cup finals, semis, knockouts
 * - Champions Trophy finals/semis
 * - Famous individual performances (200+, 5W+)
 * - Classic rivalries (India-Pakistan, Ashes, etc.)
 *
 * Outputs a curated list of match IDs + metadata.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BULK_DIR = path.join(__dirname, '..', 'odi', 'bulk_temp');
const EXISTING_DIR = path.join(__dirname, '..', 'odi');

// Already have these files — skip them
const existingFiles = new Set(
  fs.readdirSync(EXISTING_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('_'))
    .map(f => f.replace('.json', ''))
);

console.log(`Existing match files: ${existingFiles.size}`);
console.log(`Scanning ${BULK_DIR}...`);

const allMatches = [];
const files = fs.readdirSync(BULK_DIR).filter(f => f.endsWith('.json'));
console.log(`Total ODI files: ${files.length}`);

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(BULK_DIR, file), 'utf8'));
    const info = data.info;
    if (!info || !info.teams) continue;

    const matchId = file.replace('.json', '');
    const motm = info.player_of_match ? info.player_of_match[0] : null;
    const event = info.event || {};
    const eventName = event.name || '';
    const matchNumber = event.match_number || '';
    const stage = event.stage || '';
    const teams = info.teams;
    const date = info.dates ? info.dates[0] : '';
    const venue = info.venue || '';
    const city = info.city || '';
    const outcome = info.outcome || {};

    // Skip no-result matches
    if (outcome.result === 'no result') continue;
    // Skip matches without MOTM
    if (!motm) continue;

    // Calculate importance score
    let score = 0;
    let tags = [];

    // World Cup matches
    const isWorldCup = eventName.toLowerCase().includes('world cup') ||
                       eventName.toLowerCase().includes('icc cricket world cup');
    const isChampionsTrophy = eventName.toLowerCase().includes('champions trophy');

    if (isWorldCup) {
      if (stage === 'Final') { score += 100; tags.push('WC-FINAL'); }
      else if (stage === 'Semi Final') { score += 90; tags.push('WC-SEMI'); }
      else if (stage === 'Quarter Final') { score += 80; tags.push('WC-QF'); }
      else if (stage === 'Super Six' || stage === 'Super 8') { score += 60; tags.push('WC-SUPER'); }
      else { score += 40; tags.push('WC-GROUP'); }
    }

    if (isChampionsTrophy) {
      if (stage === 'Final') { score += 85; tags.push('CT-FINAL'); }
      else if (stage === 'Semi Final') { score += 75; tags.push('CT-SEMI'); }
      else { score += 35; tags.push('CT'); }
    }

    // Classic rivalries bonus
    const teamPair = teams.sort().join(' vs ');
    const classicRivalries = ['Australia vs India', 'India vs Pakistan', 'Australia vs England'];
    if (classicRivalries.includes(teamPair)) {
      score += 15;
      tags.push('RIVALRY');
    }

    // Check for big individual performances from ball-by-ball data
    if (data.innings) {
      for (const inning of data.innings) {
        const batterRuns = {};
        const bowlerWickets = {};

        for (const over of (inning.overs || [])) {
          for (const delivery of over.deliveries) {
            // Track batting
            const batter = delivery.batter;
            if (!batterRuns[batter]) batterRuns[batter] = 0;
            batterRuns[batter] += delivery.runs.batter || 0;

            // Track bowling wickets
            if (delivery.wickets) {
              const bowler = delivery.bowler;
              if (!bowlerWickets[bowler]) bowlerWickets[bowler] = 0;
              bowlerWickets[bowler] += delivery.wickets.length;
            }
          }
        }

        // Big centuries
        for (const [batter, runs] of Object.entries(batterRuns)) {
          if (runs >= 200) { score += 50; tags.push(`${runs}-${batter}`); }
          else if (runs >= 150) { score += 25; tags.push(`${runs}-${batter}`); }
          else if (runs >= 100) { score += 10; }
        }

        // Big bowling performances
        for (const [bowler, wickets] of Object.entries(bowlerWickets)) {
          if (wickets >= 6) { score += 30; tags.push(`${wickets}W-${bowler}`); }
          else if (wickets >= 5) { score += 20; tags.push(`${wickets}W-${bowler}`); }
        }
      }
    }

    // Close matches bonus
    if (outcome.result === 'tie') { score += 30; tags.push('TIE'); }
    else if (outcome.by) {
      if (outcome.by.runs && outcome.by.runs <= 5) { score += 15; tags.push('CLOSE'); }
      if (outcome.by.wickets && outcome.by.wickets <= 1) { score += 15; tags.push('CLOSE'); }
    }

    // Recency bonus (post-2000 matches are more recognizable)
    const year = parseInt(date.substring(0, 4));
    if (year >= 2010) score += 5;
    if (year >= 2000) score += 3;

    // Only keep matches with some significance
    if (score >= 20) {
      allMatches.push({
        matchId,
        teams: teams.join(' vs '),
        date,
        event: eventName,
        stage,
        venue,
        city,
        motm,
        score,
        tags,
        result: outcome.winner
          ? `${outcome.winner} won by ${outcome.by.runs ? outcome.by.runs + ' runs' : outcome.by.wickets + ' wickets'}`
          : (outcome.result === 'tie' ? 'Tied' : 'No result'),
        alreadyHave: existingFiles.has(matchId)
      });
    }
  } catch (err) {
    // Skip malformed files
  }
}

// Sort by score descending
allMatches.sort((a, b) => b.score - a.score);

console.log(`\nMatches with score >= 20: ${allMatches.length}`);
console.log(`\n${'='.repeat(100)}`);
console.log('TOP 80 ICONIC ODIs (pick ~50 from these)');
console.log('='.repeat(100));

const top80 = allMatches.slice(0, 80);

top80.forEach((m, i) => {
  const have = m.alreadyHave ? ' [ALREADY HAVE]' : '';
  console.log(`\n${i + 1}. [Score: ${m.score}] ${m.matchId}.json${have}`);
  console.log(`   ${m.teams} | ${m.date} | ${m.event} ${m.stage || ''}`);
  console.log(`   ${m.venue}${m.city ? ', ' + m.city : ''}`);
  console.log(`   MOTM: ${m.motm} | Result: ${m.result}`);
  console.log(`   Tags: ${m.tags.join(', ')}`);
});

// Output just the match IDs we need (excluding already-have)
const needed = top80
  .filter(m => !m.alreadyHave)
  .slice(0, 50);

console.log(`\n\n${'='.repeat(60)}`);
console.log(`MATCHES TO COPY (${needed.length} new files):`);
console.log('='.repeat(60));
needed.forEach(m => {
  console.log(`${m.matchId}.json  # ${m.teams} ${m.date} ${m.event} ${m.stage || ''} (MOTM: ${m.motm})`);
});

// Also output as a simple array for scripting
console.log(`\n\nMATCH_IDS="${needed.map(m => m.matchId).join(' ')}"`);
