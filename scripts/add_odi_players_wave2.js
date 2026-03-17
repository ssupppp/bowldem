/**
 * Add wave 2 of missing ODI players to all_players.json
 * Usage: node scripts/add_odi_players_wave2.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_FILE = path.join(__dirname, '..', 'src', 'data', 'all_players.json');

const MISSING_PLAYERS = [
  // 2003 WC Semi (SL)
  { id: "PADESILVA", fullName: "Aravinda de Silva", country: "Sri Lanka", role: "Batsman" },
  { id: "PWGUNARATNE", fullName: "Pulasthi Gunaratne", country: "Sri Lanka", role: "Bowler" },

  // 2003 WC Semi (Kenya)
  { id: "KOOTIENO", fullName: "Kennedy Otieno", country: "Kenya", role: "Wicketkeeper" },
  { id: "PJONGONDO", fullName: "Peter Ongondo", country: "Kenya", role: "Bowler" },
  { id: "TMODOYO", fullName: "Thomas Odoyo", country: "Kenya", role: "All-rounder" },
  { id: "SOTIKOLO", fullName: "Steve Tikolo", country: "Kenya", role: "Batsman" },
  { id: "MOODUMBE", fullName: "Maurice Odumbe", country: "Kenya", role: "All-rounder" },
  { id: "HSMODI", fullName: "Hitesh Modi", country: "Kenya", role: "Batsman" },
  { id: "MASUJI", fullName: "Martin Suji", country: "Kenya", role: "All-rounder" },
  { id: "AYKARIM", fullName: "Aasif Karim", country: "Kenya", role: "All-rounder" },

  // 2004 CT Final (England/WI)
  { id: "GOJONES", fullName: "Geraint Jones", country: "England", role: "Wicketkeeper" },
  { id: "AGWHARF", fullName: "Alex Wharf", country: "England", role: "Bowler" },
  { id: "DGOUGH", fullName: "Darren Gough", country: "England", role: "Bowler" },
  { id: "COBROWNE", fullName: "Courtney Browne", country: "West Indies", role: "Wicketkeeper" },
  { id: "IDRBRADSHAW", fullName: "Ian Bradshaw", country: "West Indies", role: "All-rounder" },

  // 2006 438 game (SA)
  { id: "RTELEMACHUS", fullName: "Roger Telemachus", country: "South Africa", role: "Bowler" },

  // 2007 WC Semi/Final
  { id: "LPCSILVA", fullName: "Lahiru Silva", country: "Sri Lanka", role: "Batsman" },
  { id: "AGPRINCE", fullName: "Ashwell Prince", country: "South Africa", role: "Batsman" },
  { id: "ANEL", fullName: "Andre Nel", country: "South Africa", role: "Bowler" },
  { id: "CKLANGEVELDT", fullName: "Charl Langeveldt", country: "South Africa", role: "Bowler" },

  // 2009 CT Final
  { id: "TDPAINE", fullName: "Tim Paine", country: "Australia", role: "Wicketkeeper" },
  { id: "NMHAURITZ", fullName: "Nathan Hauritz", country: "Australia", role: "Bowler" },
  { id: "PMSIDDLE", fullName: "Peter Siddle", country: "Australia", role: "Bowler" },
  { id: "AJREDMOND", fullName: "Aaron Redmond", country: "New Zealand", role: "Batsman" },
  { id: "NTBROOM", fullName: "Neil Broom", country: "New Zealand", role: "Batsman" },
  { id: "IGBUTLER", fullName: "Ian Butler", country: "New Zealand", role: "Bowler" },

  // 2011 WC
  { id: "IMRULKAYES", fullName: "Imrul Kayes", country: "Bangladesh", role: "Batsman" },
  { id: "RAQIBULHASAN", fullName: "Raqibul Hasan", country: "Bangladesh", role: "Batsman" },
  { id: "NAEEMISLAM", fullName: "Naeem Islam", country: "Bangladesh", role: "All-rounder" },
  { id: "YKPATHAN", fullName: "Yusuf Pathan", country: "India", role: "All-rounder" },
  { id: "PPCHAWLA", fullName: "Piyush Chawla", country: "India", role: "Bowler" },
  { id: "IJLTROTT", fullName: "Jonathan Trott", country: "England", role: "Batsman" },
  { id: "MHYARDY", fullName: "Michael Yardy", country: "England", role: "All-rounder" },
  { id: "JDRYDER", fullName: "Jesse Ryder", country: "New Zealand", role: "All-rounder" },
  { id: "LJWOODCOCK", fullName: "Luke Woodcock", country: "New Zealand", role: "All-rounder" },
  { id: "MMORKEL", fullName: "Morne Morkel", country: "South Africa", role: "Bowler" },
  { id: "CTTREMLETT", fullName: "Chris Tremlett", country: "England", role: "Bowler" },
  { id: "AJMCKAY", fullName: "Andy McKay", country: "New Zealand", role: "Bowler" },
  { id: "ASADSHAFIQ", fullName: "Asad Shafiq", country: "Pakistan", role: "Batsman" },

  // 2010 Sachin 200*
  { id: "ANPETERSEN", fullName: "Alviro Petersen", country: "South Africa", role: "Batsman" },

  // 2013 CT Final
  { id: "ANCOOK", fullName: "Alastair Cook", country: "England", role: "Batsman" },

  // 2015 WC
  { id: "YASIRSHAH", fullName: "Yasir Shah", country: "Pakistan", role: "Bowler" },
  { id: "SOHAILKHAN", fullName: "Sohail Khan", country: "Pakistan", role: "Bowler" },
  { id: "JLCARTER", fullName: "Jonathan Carter", country: "West Indies", role: "Batsman" },
  { id: "SMATSIKENYERI", fullName: "Stuart Matsikenyeri", country: "Zimbabwe", role: "Batsman" },
  { id: "TPANYANGARA", fullName: "Tinashe Panyangara", country: "Zimbabwe", role: "Bowler" },
  { id: "TKAMUNGOZI", fullName: "Tawanda Kamungozi", country: "Zimbabwe", role: "Bowler" },
  { id: "FBEHARDIEN", fullName: "Farhaan Behardien", country: "South Africa", role: "Batsman" },

  // 2017 CT Final
  { id: "JUNAIDKHAN", fullName: "Junaid Khan", country: "Pakistan", role: "Bowler" },

  // 2019 WC
  { id: "JPBEHRENDORFF", fullName: "Jason Behrendorff", country: "Australia", role: "Bowler" },
  { id: "PSPHANDSCOMB", fullName: "Peter Handscomb", country: "Australia", role: "Batsman" },
  { id: "ARNURSE", fullName: "Ashley Nurse", country: "West Indies", role: "All-rounder" },
  { id: "DBISHOO", fullName: "Devendra Bishoo", country: "West Indies", role: "Bowler" },
  { id: "SSCOTTRELL", fullName: "Sheldon Cottrell", country: "West Indies", role: "Bowler" },
  { id: "OTHOMAS", fullName: "Oshane Thomas", country: "West Indies", role: "Bowler" },

  // 2023 WC
  { id: "IMAMULHAQ", fullName: "Imam-ul-Haq", country: "Pakistan", role: "Batsman" },

  // 2023 WC (Netherlands)
  { id: "ADUTT", fullName: "Aryan Dutt", country: "Netherlands", role: "Bowler" },

  // 2025 CT
  { id: "CCONNOLLY", fullName: "Cooper Connolly", country: "Australia", role: "All-rounder" },
  { id: "BJDWARSHUIS", fullName: "Ben Dwarshuis", country: "Australia", role: "All-rounder" },
  { id: "TSANGHA", fullName: "Tanveer Sangha", country: "Australia", role: "Bowler" },
  { id: "WOROURKE", fullName: "Will O'Rourke", country: "New Zealand", role: "Bowler" },
  { id: "NGSMITH", fullName: "Nathan Smith", country: "New Zealand", role: "All-rounder" },

  // Also need HH Dippenaar (238199 MOTM for 438 game — wrong MOTM actually, but add anyway)
  { id: "HHDIPPENAAR", fullName: "Boeta Dippenaar", country: "South Africa", role: "Batsman" },
  { id: "BOETAD", fullName: "Boeta Dippenaar", country: "South Africa", role: "Batsman" },
];

function main() {
  const raw = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  const players = raw.players || raw;
  const existingIds = new Set(players.map(p => p.id));

  let added = 0;
  let skipped = 0;

  MISSING_PLAYERS.forEach(player => {
    if (existingIds.has(player.id)) {
      skipped++;
    } else {
      players.push(player);
      existingIds.add(player.id);
      added++;
    }
  });

  players.sort((a, b) => {
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    return a.fullName.localeCompare(b.fullName);
  });

  const output = raw.players ? { players } : players;
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(output, null, 2));

  console.log(`Added: ${added} players`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${players.length}`);
}

main();
