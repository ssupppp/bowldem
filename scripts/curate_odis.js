/**
 * Curate 50 iconic men's ODIs from bulk Cricsheet data.
 * Searches for specific matches by ID and verifies they exist.
 *
 * Usage: node scripts/curate_odis.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BULK_DIR = path.join(__dirname, '..', 'odi', 'bulk_temp');
const ODI_DIR = path.join(__dirname, '..', 'odi');

// Curated list of 50 iconic men's ODIs
// Format: { id, expectedDesc } — we'll verify each exists and has MOTM
const CURATED = [
  // === WORLD CUP FINALS ===
  { id: "1384439", desc: "2023 WC Final: India vs Australia" },
  { id: "656495", desc: "2015 WC Final: Australia vs New Zealand" },
  { id: "247507", desc: "2007 WC Final: Australia vs Sri Lanka" },
  { id: "65286", desc: "2003 WC Final: Australia vs India" },
  // Already have: 1144530 (2019 Final), 433606 (2011 Final)

  // === WORLD CUP SEMI-FINALS ===
  { id: "1384437", desc: "2023 WC Semi: India vs NZ (Shami 7-fer)" },
  { id: "1384438", desc: "2023 WC Semi: Australia vs SA" },
  { id: "433605", desc: "2011 WC Semi: India vs Pakistan" },
  { id: "433604", desc: "2011 WC Semi: NZ vs Sri Lanka" },
  { id: "247505", desc: "2007 WC Semi: NZ vs Sri Lanka" },
  { id: "247506", desc: "2007 WC Semi: Australia vs SA" },
  { id: "656491", desc: "2015 WC Semi: NZ vs SA" },
  { id: "65284", desc: "2003 WC Semi: Australia vs Sri Lanka" },
  { id: "65285", desc: "2003 WC Semi: India vs Kenya" },
  // Already have: 1144528 (2019 Semi Ind vs NZ), 656493 (2015 Semi Aus vs Ind)

  // === WORLD CUP QUARTER-FINALS / KNOCKOUTS ===
  { id: "656489", desc: "2015 WC QF: NZ vs WI (Guptill 237*)" },
  { id: "656485", desc: "2015 WC QF: India vs Bangladesh" },
  { id: "433603", desc: "2011 WC QF: England vs Sri Lanka" },
  { id: "433602", desc: "2011 WC QF: NZ vs SA" },
  // Already have: 433601 (2011 WC QF India vs Aus)

  // === WORLD CUP ICONIC GROUP MATCHES ===
  { id: "433568", desc: "2011 WC: England vs India (Tied!)" },
  { id: "433558", desc: "2011 WC: India vs Bangladesh (Sehwag 175)" },
  { id: "656437", desc: "2015 WC: Aus vs NZ (NZ won by 1, Boult 5W + Starc 6W)" },
  { id: "656427", desc: "2015 WC: WI vs Zim (Gayle 215)" },
  { id: "656405", desc: "2015 WC: India vs Pakistan" },
  { id: "656435", desc: "2015 WC: SA vs WI (ABD 162, SA won by 257)" },
  { id: "1144514", desc: "2019 WC: Australia vs England" },
  { id: "1144520", desc: "2019 WC: England vs India" },
  { id: "65279", desc: "2003 WC: Aus vs NZ (Bond 6W, Lee 5W)" },
  { id: "65173", desc: "2003 WC: India vs Pakistan" },
  { id: "1384429", desc: "2023 WC: India vs SA (Kohli 101*)" },
  { id: "1384412", desc: "2023 WC: India vs Australia (Gill/Rahul)" },
  { id: "1384409", desc: "2023 WC: Aus vs Pak (Warner 163)" },

  // === 2019 WC SEMI (Eng vs Aus - already have 1144528 is Ind vs NZ) ===
  { id: "1144529", desc: "2019 WC Semi: England vs Australia" },

  // === CHAMPIONS TROPHY ===
  { id: "1466428", desc: "2025 CT Final: India vs NZ" },
  { id: "1466426", desc: "2025 CT Semi: India vs Australia" },
  { id: "1466427", desc: "2025 CT Semi: NZ vs SA" },
  { id: "1022375", desc: "2017 CT Final: India vs Pakistan" },
  { id: "566948", desc: "2013 CT Final: England vs India" },
  { id: "415287", desc: "2009 CT Final: Australia vs NZ" },
  { id: "66210", desc: "2004 CT Final: England vs WI" },

  // === FAMOUS INDIVIDUAL PERFORMANCES ===
  { id: "441825", desc: "Sachin 200* vs SA (2010)" },
  // Already have: 792295 (Rohit 264)
  { id: "738165", desc: "ABD fastest 150 ever (SA vs WI 2015)" },
  { id: "858513", desc: "Fakhar Zaman 210* vs Zim (2018)" },

  // === CLASSIC BILATERAL MATCHES ===
  { id: "65072", desc: "1999 WC Semi: Aus vs SA (Tied!)" },
  { id: "749777", desc: "2014 Asia Cup: India vs Pakistan" },
  { id: "1158069", desc: "2019 Eng vs WI (Buttler 150, Gayle 162)" },

  // === 1999 WORLD CUP ===
  { id: "65056", desc: "1999 WC: India vs Pakistan" },
  { id: "65071", desc: "1999 WC Semi: Australia vs SA (Tied!)" },

  // === TIED MATCHES / THRILLERS ===
  { id: "238199", desc: "2006 SA vs Aus (438 game)" },
];

console.log(`Checking ${CURATED.length} curated matches...\n`);

const results = [];
const missing = [];

for (const match of CURATED) {
  const filePath = path.join(BULK_DIR, `${match.id}.json`);
  const alreadyInOdi = fs.existsSync(path.join(ODI_DIR, `${match.id}.json`));

  if (!fs.existsSync(filePath)) {
    missing.push(match);
    console.log(`  MISSING: ${match.id} - ${match.desc}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const info = data.info;
  const motm = info.player_of_match ? info.player_of_match[0] : 'NO MOTM';
  const teams = info.teams.join(' vs ');
  const date = info.dates ? info.dates[0] : '?';
  const event = info.event ? `${info.event.name || ''} ${info.event.stage || ''}` : '';
  const outcome = info.outcome || {};
  let result = '';
  if (outcome.winner) {
    const by = outcome.by;
    result = `${outcome.winner} won by ${by.runs ? by.runs + ' runs' : by.wickets + ' wickets'}`;
  } else if (outcome.result === 'tie') {
    result = 'TIED';
  } else {
    result = outcome.result || 'unknown';
  }

  results.push({
    id: match.id,
    teams,
    date,
    event: event.trim(),
    motm,
    result,
    alreadyInOdi,
    desc: match.desc
  });

  const status = alreadyInOdi ? ' [HAVE]' : '';
  console.log(`  OK: ${match.id}${status} | ${teams} | ${date} | MOTM: ${motm} | ${result}`);
}

// Copy new files to odi/ directory
const toCopy = results.filter(r => !r.alreadyInOdi);
console.log(`\n${'='.repeat(60)}`);
console.log(`Found: ${results.length}/${CURATED.length}`);
console.log(`Missing: ${missing.length}`);
console.log(`Already in odi/: ${results.filter(r => r.alreadyInOdi).length}`);
console.log(`New to copy: ${toCopy.length}`);

if (toCopy.length > 0) {
  console.log(`\nCopying ${toCopy.length} files to odi/ directory...`);
  for (const match of toCopy) {
    const src = path.join(BULK_DIR, `${match.id}.json`);
    const dest = path.join(ODI_DIR, `${match.id}.json`);
    fs.copyFileSync(src, dest);
  }
  console.log('Done!');
}

if (missing.length > 0) {
  console.log(`\nMissing files (not in Cricsheet bulk download):`);
  missing.forEach(m => console.log(`  ${m.id} - ${m.desc}`));
}

// Print summary for odi_matches.json config
console.log(`\n\n${'='.repeat(60)}`);
console.log('NEW MATCHES FOR odi_matches.json:');
console.log('='.repeat(60));
toCopy.forEach(m => {
  console.log(`  { file: "${m.id}.json", motm: "${m.motm}", teams: "${m.teams}", date: "${m.date}", event: "${m.event}" }`);
});
