/**
 * Add missing ODI players to all_players.json
 *
 * Usage: node scripts/add_odi_players.js
 *
 * Adds players needed for ODI puzzles that don't exist in the player database.
 * Players are listed with correct full names, countries, and roles.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_FILE = path.join(__dirname, '..', 'src', 'data', 'all_players.json');

// Missing players with correct full names and roles
// Sourced from ESPNcricinfo player profiles
const MISSING_PLAYERS = [
  // === 2019 World Cup Final (Puzzle 61) ===
  { id: "HMNICHOLLS", fullName: "Henry Nicholls", country: "New Zealand", role: "Batsman" },
  { id: "TWMLATHAM", fullName: "Tom Latham", country: "New Zealand", role: "Wicketkeeper" },
  { id: "CDEGRANDHOMME", fullName: "Colin de Grandhomme", country: "New Zealand", role: "All-rounder" },

  // === 2011 World Cup Final (Puzzle 62) ===
  { id: "TTSAMARAWEERA", fullName: "Thilan Samaraweera", country: "Sri Lanka", role: "Batsman" },
  { id: "SRANDIV", fullName: "Suraj Randiv", country: "Sri Lanka", role: "Bowler" },

  // === Rohit 264 (Puzzle 63) ===
  { id: "STRBINNY", fullName: "Stuart Binny", country: "India", role: "All-rounder" },
  { id: "KVSHARMA", fullName: "Karn Sharma", country: "India", role: "Bowler" },
  { id: "DSKULKARNI", fullName: "Dhawal Kulkarni", country: "India", role: "Bowler" },
  { id: "SPRASANNA", fullName: "Seekkuge Prasanna", country: "Sri Lanka", role: "All-rounder" },
  { id: "RMSERANGA", fullName: "Shaminda Eranga", country: "Sri Lanka", role: "Bowler" },

  // === 2019 World Cup Semi-Final (Puzzle 64) ===
  // MJ Henry already in DB as MATTHENRY via lastname match
  // Missing: C de Grandhomme (already above), HM Nicholls (already above)
  // Check if any others...

  // === 2007 World Cup Semi-Final (Puzzle 66) ===
  { id: "GBHOGG", fullName: "Brad Hogg", country: "Australia", role: "Bowler" },
  { id: "SWTAIT", fullName: "Shaun Tait", country: "Australia", role: "Bowler" },
  { id: "PGFULTON", fullName: "Peter Fulton", country: "New Zealand", role: "Batsman" },
  { id: "SPFLEMING", fullName: "Stephen Fleming", country: "New Zealand", role: "Batsman" },
  { id: "JECFRANKLIN", fullName: "James Franklin", country: "New Zealand", role: "All-rounder" },
  { id: "MJMASON", fullName: "Mitchell Mason", country: "New Zealand", role: "Bowler" },
  { id: "JSPATEL", fullName: "Jeetan Patel", country: "New Zealand", role: "Bowler" },

  // === 2011 World Cup Quarter-Final (Puzzle 67) ===
  { id: "BLEE", fullName: "Brett Lee", country: "Australia", role: "Bowler" },
  { id: "JJKREJZA", fullName: "Jason Krejza", country: "Australia", role: "Bowler" },
  // CL White already in DB? Check...

  // === Bangladesh vs Sri Lanka 2006 (Puzzle 68) ===
  { id: "JAVEDOMAR", fullName: "Javed Omar", country: "Bangladesh", role: "Batsman" },
  { id: "SHAHRIARNAFEES", fullName: "Shahriar Nafees", country: "Bangladesh", role: "Batsman" },
  { id: "RAJINSALEH", fullName: "Rajin Saleh", country: "Bangladesh", role: "Batsman" },
  { id: "ALOKKAPALI", fullName: "Alok Kapali", country: "Bangladesh", role: "All-rounder" },
  { id: "SYEDRASEL", fullName: "Syed Rasel", country: "Bangladesh", role: "Bowler" },
  { id: "JMUBARAK", fullName: "Jehan Mubarak", country: "Sri Lanka", role: "Batsman" },
  { id: "KHRKFERNANDO", fullName: "Kehelwala Fernando", country: "Sri Lanka", role: "Bowler" },
  { id: "MFMAHAROOF", fullName: "Farveez Maharoof", country: "Sri Lanka", role: "All-rounder" },
  { id: "HMCMBANDARA", fullName: "Charith Bandara", country: "Sri Lanka", role: "Bowler" },
  { id: "CRDFERNANDO", fullName: "Dilhara Fernando", country: "Sri Lanka", role: "Bowler" },
  { id: "PDRLPERERA", fullName: "Dammika Perera", country: "Sri Lanka", role: "Bowler" },

  // === VB Series Final 2006 (Puzzle 69) ===
  { id: "JRHOPES", fullName: "James Hopes", country: "Australia", role: "All-rounder" },
  { id: "SRCLARK", fullName: "Stuart Clark", country: "Australia", role: "Bowler" },
  { id: "RPARNOLD", fullName: "Russell Arnold", country: "Sri Lanka", role: "Batsman" },
  // NW Bracken, MS Atapattu, ST Jayasuriya handled by other entries or mappings

  // === India tour of NZ 2003 (Puzzles 70, 71) ===
  { id: "MSSINCLAIR", fullName: "Mathew Sinclair", country: "New Zealand", role: "Batsman" },
  { id: "DRTUFFEY", fullName: "Daryl Tuffey", country: "New Zealand", role: "Bowler" },
  { id: "PAHITCHCOCK", fullName: "Paul Hitchcock", country: "New Zealand", role: "Bowler" },
  { id: "MKAIF", fullName: "Mohammad Kaif", country: "India", role: "Batsman" },
  { id: "SBBANGAR", fullName: "Sanjay Bangar", country: "India", role: "All-rounder" },
  { id: "ARADAMS", fullName: "Andre Adams", country: "New Zealand", role: "All-rounder" },

  // === Bangladesh tour of Australia 2003 (Puzzle 72) ===
  { id: "ALSAHARIAR", fullName: "Al Sahariar", country: "Bangladesh", role: "Batsman" },
  { id: "TUSHARIMRAN", fullName: "Tushar Imran", country: "Bangladesh", role: "Batsman" },
  { id: "KHALEDMAHMUD", fullName: "Khaled Mahmud", country: "Bangladesh", role: "All-rounder" },
  { id: "HASIBULHOSSAIN", fullName: "Hasibul Hossain", country: "Bangladesh", role: "Bowler" },
  { id: "DSLEHMANN", fullName: "Darren Lehmann", country: "Australia", role: "Batsman" },

  // === England tour of Bangladesh 2003 (Puzzle 73) ===
  { id: "NAFEESIQBAL", fullName: "Nafees Iqbal", country: "Bangladesh", role: "Batsman" },
  { id: "MONIRUZZAMAN", fullName: "Moniruzzaman", country: "Bangladesh", role: "All-rounder" },
  { id: "MUSHFIQURRAHMAN", fullName: "Mushfiqur Rahman", country: "Bangladesh", role: "Wicketkeeper" },
  { id: "TAPASHBAISYA", fullName: "Tapash Baisya", country: "Bangladesh", role: "Bowler" },
  { id: "VSSOLANKI", fullName: "Vikram Solanki", country: "England", role: "Batsman" },
  { id: "IDBLACKWELL", fullName: "Ian Blackwell", country: "England", role: "All-rounder" },
  { id: "CMWREAD", fullName: "Chris Read", country: "England", role: "Wicketkeeper" },
  { id: "RLJOHNSON", fullName: "Richard Johnson", country: "England", role: "Bowler" },
  { id: "JMANDERSON", fullName: "James Anderson", country: "England", role: "Bowler" },

  // === West Indies tour of Zimbabwe 2003 (Puzzle 74) ===
  { id: "VSIBANDA", fullName: "Vusi Sibanda", country: "Zimbabwe", role: "Batsman" },
  { id: "BGROGERS", fullName: "Brendan Rogers", country: "Zimbabwe", role: "Batsman" },
  { id: "MAVERMEULEN", fullName: "Mark Vermeulen", country: "Zimbabwe", role: "Batsman" },
  { id: "CBWISHART", fullName: "Craig Wishart", country: "Zimbabwe", role: "Batsman" },
  { id: "AMAREGWEDE", fullName: "Alester Maregwede", country: "Zimbabwe", role: "All-rounder" },
  { id: "AMBLIGNAUT", fullName: "Andy Blignaut", country: "Zimbabwe", role: "All-rounder" },
  { id: "RWPRICE", fullName: "Ray Price", country: "Zimbabwe", role: "Bowler" },
  { id: "WWHINDS", fullName: "Wavell Hinds", country: "West Indies", role: "Batsman" },
  { id: "RDJACOBS", fullName: "Ridley Jacobs", country: "West Indies", role: "Wicketkeeper" },
  { id: "MDILLON", fullName: "Mervyn Dillon", country: "West Indies", role: "Bowler" },
  { id: "CDCOLLYMORE", fullName: "Corey Collymore", country: "West Indies", role: "Bowler" },

  // === Paktel Cup 2003 (Puzzle 75) ===
  { id: "DAGUNAWARDENE", fullName: "Avishka Gunawardene", country: "Sri Lanka", role: "Batsman" },
  { id: "UDUCHANDANA", fullName: "Upul Chandana", country: "Sri Lanka", role: "Bowler" },
  { id: "KSLOKUARACHCHI", fullName: "Kaushal Lokuarachchi", country: "Sri Lanka", role: "Bowler" },
  { id: "DNTZOYSA", fullName: "Nuwan Zoysa", country: "Sri Lanka", role: "Bowler" },
  { id: "YOUSUFYOUHANA", fullName: "Yousuf Youhana", country: "Pakistan", role: "Batsman" },
  { id: "NAVEDULHASAN", fullName: "Naved-ul-Hasan", country: "Pakistan", role: "All-rounder" },

  // === Additional missing from various puzzles ===
  { id: "NWBRACKEN", fullName: "Nathan Bracken", country: "Australia", role: "Bowler" },
  { id: "MSATAPATTU", fullName: "Marvan Atapattu", country: "Sri Lanka", role: "Batsman" },
  { id: "STJAYASURIYA", fullName: "Sanath Jayasuriya", country: "Sri Lanka", role: "All-rounder" },
  { id: "CDMCMILLAN", fullName: "Craig McMillan", country: "New Zealand", role: "All-rounder" },
  { id: "LVINCENT", fullName: "Lou Vincent", country: "New Zealand", role: "Batsman" },
  { id: "JDPORAM", fullName: "James Poram", country: "New Zealand", role: "All-rounder" },
  { id: "BBMCCULLUM", fullName: "Brendon McCullum", country: "New Zealand", role: "Wicketkeeper" },
  { id: "KDMILLS", fullName: "Kyle Mills", country: "New Zealand", role: "Bowler" },
  { id: "DLVETTORI", fullName: "Daniel Vettori", country: "New Zealand", role: "All-rounder" },
  { id: "SCGANGULY", fullName: "Sourav Ganguly", country: "India", role: "Batsman" },
  { id: "VVSLAXMAN", fullName: "VVS Laxman", country: "India", role: "Batsman" },
  { id: "RDRAVID", fullName: "Rahul Dravid", country: "India", role: "Batsman" },
  { id: "SBSTYRIS", fullName: "Scott Styris", country: "New Zealand", role: "All-rounder" },
  { id: "CLCAIRNS", fullName: "Chris Cairns", country: "New Zealand", role: "All-rounder" },
  { id: "CZHARRIS", fullName: "Chris Harris", country: "New Zealand", role: "All-rounder" },
  { id: "SEBOND", fullName: "Shane Bond", country: "New Zealand", role: "Bowler" },
  { id: "DMONGIA", fullName: "Dinesh Mongia", country: "India", role: "All-rounder" },
  { id: "SRTENDULKAR", fullName: "Sachin Tendulkar", country: "India", role: "Batsman" },
  { id: "AKUMBLE", fullName: "Anil Kumble", country: "India", role: "Bowler" },
  { id: "JSRINATH", fullName: "Javagal Srinath", country: "India", role: "Bowler" },
  { id: "HANNANSARKAR", fullName: "Hannan Sarkar", country: "Bangladesh", role: "Batsman" },
  { id: "SANWARHOSSAIN", fullName: "Sanwar Hossain", country: "Bangladesh", role: "Batsman" },
  { id: "KHALEDMASHUD", fullName: "Khaled Mashud", country: "Bangladesh", role: "Wicketkeeper" },
  { id: "MOHAMMADRAFIQUE", fullName: "Mohammad Rafique", country: "Bangladesh", role: "All-rounder" },
  { id: "ACGILCHRIST", fullName: "Adam Gilchrist", country: "Australia", role: "Wicketkeeper" },
  { id: "MLHAYDEN", fullName: "Matthew Hayden", country: "Australia", role: "Batsman" },
  { id: "RTPONTING", fullName: "Ricky Ponting", country: "Australia", role: "Batsman" },
  { id: "DRMARTYN", fullName: "Damien Martyn", country: "Australia", role: "Batsman" },
  { id: "ASYMONDS", fullName: "Andrew Symonds", country: "Australia", role: "All-rounder" },
  { id: "MJCLARKE", fullName: "Michael Clarke", country: "Australia", role: "Batsman" },
  { id: "MEKHUSSEY", fullName: "Michael Hussey", country: "Australia", role: "Batsman" },
  { id: "NJASTLE", fullName: "Nathan Astle", country: "New Zealand", role: "Batsman" },
  { id: "MGBEVAN", fullName: "Michael Bevan", country: "Australia", role: "Batsman" },
  { id: "JNGILLESPIE", fullName: "Jason Gillespie", country: "Australia", role: "Bowler" },
  { id: "AJBICHEL", fullName: "Andy Bichel", country: "Australia", role: "All-rounder" },
  { id: "HHSTREAK", fullName: "Heath Streak", country: "Zimbabwe", role: "All-rounder" },
  { id: "TTAIBU", fullName: "Tatenda Taibu", country: "Zimbabwe", role: "Wicketkeeper" },
  { id: "SMERVINE", fullName: "Sean Ervine", country: "Zimbabwe", role: "All-rounder" },
  { id: "GBBRENT", fullName: "Gary Brent", country: "Zimbabwe", role: "Bowler" },
  { id: "BCLARA", fullName: "Brian Lara", country: "West Indies", role: "Batsman" },
  { id: "RLPOWELL", fullName: "Ricardo Powell", country: "West Indies", role: "All-rounder" },
  { id: "SCHANDERPAUL", fullName: "Shivnarine Chanderpaul", country: "West Indies", role: "Batsman" },
  { id: "RRSARWAN", fullName: "Ramnaresh Sarwan", country: "West Indies", role: "Batsman" },
  { id: "FHEDWARDS", fullName: "Fidel Edwards", country: "West Indies", role: "Bowler" },
  { id: "MANJURALISLAMRANA", fullName: "Manjural Islam Rana", country: "Bangladesh", role: "Bowler" },
  { id: "AFGILES", fullName: "Ashley Giles", country: "England", role: "Bowler" },
  { id: "RCLARKE", fullName: "Rikki Clarke", country: "England", role: "All-rounder" },
  { id: "MPVAUGHAN", fullName: "Michael Vaughan", country: "England", role: "Batsman" },
  { id: "PDCOLLINGWOOD", fullName: "Paul Collingwood", country: "England", role: "All-rounder" },
  { id: "AFLINTOFF", fullName: "Andrew Flintoff", country: "England", role: "All-rounder" },
  { id: "METRESCOTHICK", fullName: "Marcus Trescothick", country: "England", role: "Batsman" },
  { id: "SALMANBUTT", fullName: "Salman Butt", country: "Pakistan", role: "Batsman" },
  { id: "YASIRHAMEED", fullName: "Yasir Hameed", country: "Pakistan", role: "Batsman" },
  { id: "INZAMAMULHAQ", fullName: "Inzamam-ul-Haq", country: "Pakistan", role: "Batsman" },
  { id: "MOHAMMADSAMI", fullName: "Mohammad Sami", country: "Pakistan", role: "Bowler" },
  { id: "GDMCGRATH", fullName: "Glenn McGrath", country: "Australia", role: "Bowler" },
  { id: "SRWATSON", fullName: "Shane Watson", country: "Australia", role: "All-rounder" },
  { id: "MRGILLESPIE", fullName: "Mark Gillespie", country: "New Zealand", role: "Bowler" },
  { id: "VSEHWAG", fullName: "Virender Sehwag", country: "India", role: "Batsman" },
  { id: "ZKHAN", fullName: "Zaheer Khan", country: "India", role: "Bowler" },
  { id: "CLWHITE", fullName: "Cameron White", country: "Australia", role: "All-rounder" },
  { id: "DJHUSSEY", fullName: "David Hussey", country: "Australia", role: "Batsman" },
  { id: "GGAMBHIR", fullName: "Gautam Gambhir", country: "India", role: "Batsman" },
  { id: "MMPATEL", fullName: "Munaf Patel", country: "India", role: "Bowler" },
  { id: "SSREESANTH", fullName: "Sreesanth", country: "India", role: "Bowler" },
  { id: "WUTHARANGA", fullName: "Upul Tharanga", country: "Sri Lanka", role: "Batsman" },
  { id: "SLMALINGA", fullName: "Lasith Malinga", country: "Sri Lanka", role: "Bowler" },
  { id: "NLTCPERERA", fullName: "Thisara Perera", country: "Sri Lanka", role: "All-rounder" },
  { id: "AMRAHANE", fullName: "Ajinkya Rahane", country: "India", role: "Batsman" },
  { id: "ATRAYUDU", fullName: "Ambati Rayudu", country: "India", role: "Batsman" },
  { id: "RVUTHAPPA", fullName: "Robin Uthappa", country: "India", role: "Batsman" },
  { id: "ARPATEL", fullName: "Axar Patel", country: "India", role: "All-rounder" },
  { id: "MDKJPERERA", fullName: "Kusal Perera", country: "Sri Lanka", role: "Wicketkeeper" },
  { id: "LDCHANDIMAL", fullName: "Dinesh Chandimal", country: "Sri Lanka", role: "Batsman" },
  { id: "ADMATHEWS", fullName: "Angelo Mathews", country: "Sri Lanka", role: "All-rounder" },
  { id: "HDRLTHIRIMANNE", fullName: "Lahiru Thirimanne", country: "Sri Lanka", role: "Batsman" },
  { id: "BAWMENDIS", fullName: "Ajantha Mendis", country: "Sri Lanka", role: "Bowler" },
  { id: "AFTABAHMED", fullName: "Aftab Ahmed", country: "Bangladesh", role: "Batsman" },
  { id: "NAZMULHOSSAIN", fullName: "Nazmul Hossain", country: "Bangladesh", role: "Bowler" },
  { id: "MOHAMMADASHRAFUL", fullName: "Mohammad Ashraful", country: "Bangladesh", role: "Batsman" },
];

function main() {
  const raw = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  const players = raw.players || raw;
  const existingIds = new Set(players.map(p => p.id));

  let added = 0;
  let skipped = 0;
  const duplicates = [];

  MISSING_PLAYERS.forEach(player => {
    if (existingIds.has(player.id)) {
      skipped++;
      duplicates.push(player.id);
    } else {
      players.push(player);
      existingIds.add(player.id);
      added++;
    }
  });

  // Sort by country, then fullName
  players.sort((a, b) => {
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    return a.fullName.localeCompare(b.fullName);
  });

  // Write back
  const output = raw.players ? { players } : players;
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(output, null, 2));

  console.log(`Added: ${added} players`);
  console.log(`Skipped (already exist): ${skipped}`);
  if (duplicates.length > 0) {
    console.log(`Duplicate IDs: ${duplicates.join(', ')}`);
  }
  console.log(`Total players: ${players.length}`);
}

main();
