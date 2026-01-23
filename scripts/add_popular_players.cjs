/**
 * Add popular missing players to the database
 * Run: node scripts/add_popular_players.cjs
 */

const fs = require('fs');
const path = require('path');

// Popular players to add (legends and fan favorites)
const newPlayers = [
  // Indian Legends (80s-90s-2000s)
  { id: "KAPILDEV", fullName: "Kapil Dev", country: "India", role: "All-rounder" },
  { id: "SUNILGAVASKAR", fullName: "Sunil Gavaskar", country: "India", role: "Batsman" },
  { id: "MOHAMMADAZHAR", fullName: "Mohammad Azharuddin", country: "India", role: "Batsman" },
  { id: "DILIPVENGSARKAR", fullName: "Dilip Vengsarkar", country: "India", role: "Batsman" },
  { id: "JAVAGALSRINATH", fullName: "Javagal Srinath", country: "India", role: "Bowler" },
  { id: "VENKATESHPRASAD", fullName: "Venkatesh Prasad", country: "India", role: "Bowler" },
  { id: "NAYANMONGIA", fullName: "Nayan Mongia", country: "India", role: "Wicketkeeper" },
  { id: "VINODKAMBLI", fullName: "Vinod Kambli", country: "India", role: "Batsman" },
  { id: "AJAYJ", fullName: "Ajay Jadeja", country: "India", role: "All-rounder" },
  { id: "ROBINUTHAPPA", fullName: "Robin Uthappa", country: "India", role: "Wicketkeeper" },
  { id: "ISHANT", fullName: "Ishant Sharma", country: "India", role: "Bowler" },
  { id: "PUJARA", fullName: "Cheteshwar Pujara", country: "India", role: "Batsman" },
  { id: "UMESH", fullName: "Umesh Yadav", country: "India", role: "Bowler" },
  { id: "ISHANKISHAN", fullName: "Ishan Kishan", country: "India", role: "Wicketkeeper" },
  { id: "YUZVENDRACHAHAL", fullName: "Yuzvendra Chahal", country: "India", role: "Bowler" },
  { id: "MANISHPANDEY", fullName: "Manish Pandey", country: "India", role: "Batsman" },
  { id: "AMBATIRAYUDU", fullName: "Ambati Rayudu", country: "India", role: "Batsman" },
  { id: "KEDARJADHAV", fullName: "Kedar Jadhav", country: "India", role: "All-rounder" },
  { id: "DINESHKARTHIK", fullName: "Dinesh Karthik", country: "India", role: "Wicketkeeper" },
  { id: "WRIDDHI", fullName: "Wriddhiman Saha", country: "India", role: "Wicketkeeper" },

  // Pakistan Legends
  { id: "IMRANKHAN", fullName: "Imran Khan", country: "Pakistan", role: "All-rounder" },
  { id: "JAVEDMIANDAD", fullName: "Javed Miandad", country: "Pakistan", role: "Batsman" },
  { id: "SHOAIBAKHTAR", fullName: "Shoaib Akhtar", country: "Pakistan", role: "Bowler" },
  { id: "SAIDFANWAR", fullName: "Saeed Anwar", country: "Pakistan", role: "Batsman" },
  { id: "YOUNIS", fullName: "Younis Khan", country: "Pakistan", role: "Batsman" },
  { id: "MISBAH", fullName: "Misbah-ul-Haq", country: "Pakistan", role: "Batsman" },
  { id: "ABDULRAZZAQ", fullName: "Abdul Razzaq", country: "Pakistan", role: "All-rounder" },

  // Australian Legends
  { id: "STEVEWAUGH", fullName: "Steve Waugh", country: "Australia", role: "All-rounder" },
  { id: "MARKWAUGH", fullName: "Mark Waugh", country: "Australia", role: "Batsman" },
  { id: "ALLANBORDR", fullName: "Allan Border", country: "Australia", role: "Batsman" },
  { id: "DENNISLILLEE", fullName: "Dennis Lillee", country: "Australia", role: "Bowler" },
  { id: "BRETTLEE", fullName: "Brett Lee", country: "Australia", role: "Bowler" },
  { id: "JASONGILLESP", fullName: "Jason Gillespie", country: "Australia", role: "Bowler" },
  { id: "MICHAELCLARKE", fullName: "Michael Clarke", country: "Australia", role: "Batsman" },
  { id: "MICHAELHUSSEY", fullName: "Michael Hussey", country: "Australia", role: "Batsman" },
  { id: "ANDREWSYMONDS", fullName: "Andrew Symonds", country: "Australia", role: "All-rounder" },

  // England Legends
  { id: "IANBOTHAM", fullName: "Ian Botham", country: "England", role: "All-rounder" },
  { id: "GRAHAMGOOCH", fullName: "Graham Gooch", country: "England", role: "Batsman" },
  { id: "ALECCOOK", fullName: "Alastair Cook", country: "England", role: "Batsman" },
  { id: "JAMANDERSON", fullName: "James Anderson", country: "England", role: "Bowler" },
  { id: "STUARTBROAD", fullName: "Stuart Broad", country: "England", role: "Bowler" },
  { id: "GRAEMESWANN", fullName: "Graeme Swann", country: "England", role: "Bowler" },
  { id: "PAULCOLLINGWOOD", fullName: "Paul Collingwood", country: "England", role: "All-rounder" },

  // South Africa Legends
  { id: "ALLANDONALD", fullName: "Allan Donald", country: "South Africa", role: "Bowler" },
  { id: "HANSIECRONJE", fullName: "Hansie Cronje", country: "South Africa", role: "All-rounder" },
  { id: "JONTYRHODES", fullName: "Jonty Rhodes", country: "South Africa", role: "Batsman" },
  { id: "LANCEKLUSENER", fullName: "Lance Klusener", country: "South Africa", role: "All-rounder" },
  { id: "MARKBOUCHER", fullName: "Mark Boucher", country: "South Africa", role: "Wicketkeeper" },
  { id: "HASHIMAMLA", fullName: "Hashim Amla", country: "South Africa", role: "Batsman" },
  { id: "DALESTEYN", fullName: "Dale Steyn", country: "South Africa", role: "Bowler" },
  { id: "MLORANI", fullName: "Morne Morkel", country: "South Africa", role: "Bowler" },
  { id: "IMRANTAHIR", fullName: "Imran Tahir", country: "South Africa", role: "Bowler" },

  // West Indies Legends
  { id: "VIVIDRICHARDS", fullName: "Viv Richards", country: "West Indies", role: "Batsman" },
  { id: "CLIVELLOYD", fullName: "Clive Lloyd", country: "West Indies", role: "Batsman" },
  { id: "GORDONGREENI", fullName: "Gordon Greenidge", country: "West Indies", role: "Batsman" },
  { id: "DESMONDHAYNE", fullName: "Desmond Haynes", country: "West Indies", role: "Batsman" },
  { id: "JOELGARNER", fullName: "Joel Garner", country: "West Indies", role: "Bowler" },
  { id: "MICHAELHOLDING", fullName: "Michael Holding", country: "West Indies", role: "Bowler" },
  { id: "ANDYROBERTS", fullName: "Andy Roberts", country: "West Indies", role: "Bowler" },

  // Sri Lanka Legends
  { id: "ARJUNARANATUNGA", fullName: "Arjuna Ranatunga", country: "Sri Lanka", role: "Batsman" },
  { id: "ARAVINDADESILVA", fullName: "Aravinda de Silva", country: "Sri Lanka", role: "Batsman" },
  { id: "ROMESHKALUWITHARANA", fullName: "Romesh Kaluwitharana", country: "Sri Lanka", role: "Wicketkeeper" },
  { id: "CHAMINDAVAAS", fullName: "Chaminda Vaas", country: "Sri Lanka", role: "Bowler" },
  { id: "TILLAKARATNE", fullName: "Tillakaratne Dilshan", country: "Sri Lanka", role: "All-rounder" },

  // New Zealand Legends
  { id: "RICHARDHADLEE", fullName: "Richard Hadlee", country: "New Zealand", role: "All-rounder" },
  { id: "MARTINCROWE", fullName: "Martin Crowe", country: "New Zealand", role: "Batsman" },
  { id: "STEPHFLEMING", fullName: "Stephen Fleming", country: "New Zealand", role: "Batsman" },
  { id: "CHRISCAIRNS", fullName: "Chris Cairns", country: "New Zealand", role: "All-rounder" },
  { id: "DANIELVETTORI", fullName: "Daniel Vettori", country: "New Zealand", role: "All-rounder" },
  { id: "BRENDONMCCULLUM", fullName: "Brendon McCullum", country: "New Zealand", role: "Wicketkeeper" },
  { id: "ROSST", fullName: "Ross Taylor", country: "New Zealand", role: "Batsman" },

  // IPL Stars & Recent Players
  { id: "RASHIDKHANSPIN", fullName: "Rashid Khan", country: "Afghanistan", role: "Bowler" },
  { id: "MOHAMMADNABI", fullName: "Mohammad Nabi", country: "Afghanistan", role: "All-rounder" },
  { id: "FAZALHAQFAROOQI", fullName: "Fazalhaq Farooqi", country: "Afghanistan", role: "Bowler" },
  { id: "MUJEEBZADRAN", fullName: "Mujeeb Ur Rahman", country: "Afghanistan", role: "Bowler" },
];

// Read existing players
const filePath = path.join(__dirname, '../src/data/all_players.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Get existing IDs to avoid duplicates
const existingIds = new Set(data.players.map(p => p.id));

// Filter out duplicates
const playersToAdd = newPlayers.filter(p => !existingIds.has(p.id));

console.log(`Existing players: ${data.players.length}`);
console.log(`New players to add: ${playersToAdd.length}`);
console.log(`Skipped (duplicates): ${newPlayers.length - playersToAdd.length}`);

if (playersToAdd.length === 0) {
  console.log('No new players to add.');
  process.exit(0);
}

// Add new players
data.players.push(...playersToAdd);

// Sort alphabetically by ID
data.players.sort((a, b) => a.id.localeCompare(b.id));

// Write back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log(`\n✅ Added ${playersToAdd.length} new players`);
console.log(`Total players now: ${data.players.length}`);

// Generate SQL for Supabase
const sqlPath = path.join(__dirname, 'add_popular_players.sql');
let sql = '-- Add popular players to Supabase\n';
sql += 'INSERT INTO players (id, full_name, country, role) VALUES\n';
sql += playersToAdd.map((p, i) => {
  const comma = i < playersToAdd.length - 1 ? ',' : ';';
  return `  ('${p.id}', '${p.fullName.replace(/'/g, "''")}', '${p.country}', '${p.role}')${comma}`;
}).join('\n');

fs.writeFileSync(sqlPath, sql);
console.log(`\n📄 SQL file generated: ${sqlPath}`);
console.log('Run this SQL in Supabase to sync the database.');
