/**
 * Final batch of popular players
 * Run: node scripts/add_final_batch.cjs
 */

const fs = require('fs');
const path = require('path');

const newPlayers = [
  // India - missing players
  { id: "AJITAGARKAR", fullName: "Ajit Agarkar", country: "India", role: "Bowler" },
  { id: "PRAGYANOJHA", fullName: "Pragyan Ojha", country: "India", role: "Bowler" },
  { id: "SREESANTH", fullName: "S Sreesanth", country: "India", role: "Bowler" },
  { id: "SADAGOPPAN", fullName: "Sadagoppan Ramesh", country: "India", role: "Batsman" },
  { id: "RAHULCHAHAR", fullName: "Rahul Chahar", country: "India", role: "Bowler" },
  { id: "VARUNCHAKRA", fullName: "Varun Chakravarthy", country: "India", role: "Bowler" },
  { id: "VENKATESHI", fullName: "Venkatesh Iyer", country: "India", role: "All-rounder" },
  { id: "ABHISHEKSHARMA", fullName: "Abhishek Sharma", country: "India", role: "All-rounder" },
  { id: "SHIVAMDUBE", fullName: "Shivam Dube", country: "India", role: "All-rounder" },
  { id: "MAYANKYADAV", fullName: "Mayank Yadav", country: "India", role: "Bowler" },
  { id: "HARSHITRANA", fullName: "Harshit Rana", country: "India", role: "Bowler" },
  { id: "MOHITSHARMA", fullName: "Mohit Sharma", country: "India", role: "Bowler" },
  { id: "SANDEEPWARRIER", fullName: "Sandeep Warrier", country: "India", role: "Bowler" },
  { id: "JAYDEVUNADKAT", fullName: "Jaydev Unadkat", country: "India", role: "Bowler" },
  { id: "ANUJRAWAT", fullName: "Anuj Rawat", country: "India", role: "Wicketkeeper" },
  { id: "DHRUVSHOREY", fullName: "Dhruv Shorey", country: "India", role: "Batsman" },
  { id: "SARVESHK", fullName: "Sarfaraz Khan", country: "India", role: "Batsman" },
  { id: "RAJATPATIDAR", fullName: "Rajat Patidar", country: "India", role: "Batsman" },

  // Pakistan
  { id: "FAWADALAM", fullName: "Fawad Alam", country: "Pakistan", role: "Batsman" },
  { id: "USAMAMIR", fullName: "Usama Mir", country: "Pakistan", role: "Bowler" },
  { id: "MOHAMMADNAWAZ", fullName: "Mohammad Nawaz", country: "Pakistan", role: "All-rounder" },
  { id: "ZAMAN", fullName: "Zaman Khan", country: "Pakistan", role: "Bowler" },
  { id: "ABRAR", fullName: "Abrar Ahmed", country: "Pakistan", role: "Bowler" },
  { id: "SALMANALI", fullName: "Salman Ali Agha", country: "Pakistan", role: "All-rounder" },
  { id: "IRFANKHAN", fullName: "Irfan Khan", country: "Pakistan", role: "Batsman" },
  { id: "SAIM", fullName: "Saim Ayub", country: "Pakistan", role: "Batsman" },

  // Australia - recent stars
  { id: "CAMERONGREEN", fullName: "Cameron Green", country: "Australia", role: "All-rounder" },
  { id: "JOSHINGLIS", fullName: "Josh Inglis", country: "Australia", role: "Wicketkeeper" },
  { id: "MATTHEWWADE", fullName: "Matthew Wade", country: "Australia", role: "Wicketkeeper" },
  { id: "ASHTONAGAR", fullName: "Ashton Agar", country: "Australia", role: "All-rounder" },
  { id: "NATHANELLIS", fullName: "Nathan Ellis", country: "Australia", role: "Bowler" },
  { id: "JHYERICHARDSON", fullName: "Jhye Richardson", country: "Australia", role: "Bowler" },
  { id: "KANERICHARD", fullName: "Kane Richardson", country: "Australia", role: "Bowler" },
  { id: "ANDREWTYE", fullName: "Andrew Tye", country: "Australia", role: "Bowler" },
  { id: "BILLYSTANLAKE", fullName: "Billy Stanlake", country: "Australia", role: "Bowler" },
  { id: "BENMC", fullName: "Ben McDermott", country: "Australia", role: "Batsman" },
  { id: "MATTSHORT", fullName: "Matt Short", country: "Australia", role: "Batsman" },
  { id: "JAKEFRAS", fullName: "Jake Fraser-McGurk", country: "Australia", role: "Batsman" },

  // West Indies - stars
  { id: "KYLEMAYERS", fullName: "Kyle Mayers", country: "West Indies", role: "All-rounder" },
  { id: "JOHNSONCHARLES", fullName: "Johnson Charles", country: "West Indies", role: "Batsman" },
  { id: "DEVONSM", fullName: "Devon Smith", country: "West Indies", role: "Batsman" },
  { id: "KIERANPOW", fullName: "Kieran Powell", country: "West Indies", role: "Batsman" },
  { id: "YANNICKCARN", fullName: "Yannic Cariah", country: "West Indies", role: "Bowler" },
  { id: "HAYDENWALSH", fullName: "Hayden Walsh Jr", country: "West Indies", role: "Bowler" },
  { id: "KEMORPAUL", fullName: "Keemo Paul", country: "West Indies", role: "All-rounder" },
  { id: "ROMARIOSHEP", fullName: "Romario Shepherd", country: "West Indies", role: "All-rounder" },

  // England - more recent
  { id: "SAMCURRAN", fullName: "Sam Curran", country: "England", role: "All-rounder" },
  { id: "WILLJ", fullName: "Will Jacks", country: "England", role: "All-rounder" },
  { id: "BENDUCKETT", fullName: "Ben Duckett", country: "England", role: "Batsman" },
  { id: "ZAKCRAWLEY", fullName: "Zak Crawley", country: "England", role: "Batsman" },
  { id: "JAMIEVINCE", fullName: "James Vince", country: "England", role: "Batsman" },
  { id: "TOMBURWELL", fullName: "Tom Banton", country: "England", role: "Batsman" },
  { id: "GUSATKINSON", fullName: "Gus Atkinson", country: "England", role: "Bowler" },
  { id: "SAMHAIN", fullName: "Sam Hain", country: "England", role: "Batsman" },
  { id: "TOMAH", fullName: "Tom Abell", country: "England", role: "All-rounder" },
  { id: "OLLIEROB", fullName: "Ollie Robinson", country: "England", role: "Bowler" },
  { id: "CHETESH", fullName: "Saqib Mahmood", country: "England", role: "Bowler" },
  { id: "JAMISHR", fullName: "Jamie Overton", country: "England", role: "Bowler" },
  { id: "MATTPO", fullName: "Matt Potts", country: "England", role: "Bowler" },
  { id: "BRIANBRYDON", fullName: "Brydon Carse", country: "England", role: "Bowler" },

  // Netherlands - key players
  { id: "RYANTENDOBTE", fullName: "Ryan ten Doeschate", country: "Netherlands", role: "All-rounder" },
  { id: "WESSELBARENDREGT", fullName: "Wesley Barresi", country: "Netherlands", role: "Batsman" },
  { id: "MAXODONWD", fullName: "Max O'Dowd", country: "Netherlands", role: "Batsman" },
  { id: "BASDELEE", fullName: "Bas de Leede", country: "Netherlands", role: "All-rounder" },
  { id: "SCOTEDWARD", fullName: "Scott Edwards", country: "Netherlands", role: "Wicketkeeper" },
  { id: "VIKYKING", fullName: "Vikramjit Singh", country: "Netherlands", role: "Batsman" },
  { id: "TIMBVL", fullName: "Tim van der Gugten", country: "Netherlands", role: "Bowler" },
  { id: "PAULVME", fullName: "Paul van Meekeren", country: "Netherlands", role: "Bowler" },
  { id: "LOGANVB", fullName: "Logan van Beek", country: "Netherlands", role: "Bowler" },
  { id: "ROELOFVDM", fullName: "Roelof van der Merwe", country: "Netherlands", role: "All-rounder" },
  { id: "TOBIASVISK", fullName: "Tobias Visee", country: "Netherlands", role: "Batsman" },
  { id: "SAQIBZ", fullName: "Saqib Zulfiqar", country: "Netherlands", role: "Batsman" },

  // Scotland
  { id: "KYLEC", fullName: "Kyle Coetzer", country: "Scotland", role: "Batsman" },
  { id: "CALUMMACI", fullName: "Calum MacLeod", country: "Scotland", role: "Batsman" },
  { id: "RICHIEBERR", fullName: "Richie Berrington", country: "Scotland", role: "All-rounder" },
  { id: "MATTCROSS", fullName: "Matthew Cross", country: "Scotland", role: "Wicketkeeper" },
  { id: "ALASDAIRES", fullName: "Alasdair Evans", country: "Scotland", role: "Bowler" },
  { id: "JOSHD", fullName: "Josh Davey", country: "Scotland", role: "Bowler" },
  { id: "SAFFYK", fullName: "Safyaan Sharif", country: "Scotland", role: "Bowler" },
  { id: "BRADWHEAL", fullName: "Brad Wheal", country: "Scotland", role: "Bowler" },
  { id: "GEORGE", fullName: "George Munsey", country: "Scotland", role: "Batsman" },
  { id: "MICHAELJONES", fullName: "Michael Jones", country: "Scotland", role: "Batsman" },
  { id: "BRANDONMC", fullName: "Brandon McMullen", country: "Scotland", role: "All-rounder" },
  { id: "CHRISGRV", fullName: "Chris Greaves", country: "Scotland", role: "All-rounder" },
  { id: "MARKWATT", fullName: "Mark Watt", country: "Scotland", role: "Bowler" },

  // Namibia
  { id: "GERHARDERA", fullName: "Gerhard Erasmus", country: "Namibia", role: "All-rounder" },
  { id: "STEPHENBI", fullName: "Stephan Baard", country: "Namibia", role: "Batsman" },
  { id: "JANFRYLINCK", fullName: "Jan Frylinck", country: "Namibia", role: "All-rounder" },
  { id: "JJSMIT", fullName: "JJ Smit", country: "Namibia", role: "All-rounder" },
  { id: "DAVIDWIESE", fullName: "David Wiese", country: "Namibia", role: "All-rounder" },
  { id: "RUBENKENT", fullName: "Ruben Trumpelmann", country: "Namibia", role: "Bowler" },
  { id: "BERNARDSC", fullName: "Bernard Scholtz", country: "Namibia", role: "Bowler" },
  { id: "MICHIELT", fullName: "Michiel du Preez", country: "Namibia", role: "Batsman" },
  { id: "ZANEGREEN", fullName: "Zane Green", country: "Namibia", role: "Wicketkeeper" },
  { id: "NIKOLAAS", fullName: "Nicol Loftie-Eaton", country: "Namibia", role: "Batsman" },
  { id: "BENSH", fullName: "Ben Shikongo", country: "Namibia", role: "Bowler" },
  { id: "TANGATANG", fullName: "Tangeni Lungameni", country: "Namibia", role: "Bowler" },

  // Oman
  { id: "JATINDERS", fullName: "Jatinder Singh", country: "Oman", role: "Batsman" },
  { id: "AQIBILL", fullName: "Aqib Ilyas", country: "Oman", role: "All-rounder" },
  { id: "ZEESHANM", fullName: "Zeeshan Maqsood", country: "Oman", role: "All-rounder" },
  { id: "MOHAMMEDNADE", fullName: "Mohammad Nadeem", country: "Oman", role: "Batsman" },
  { id: "KASHYAPP", fullName: "Kashyap Prajapati", country: "Oman", role: "Batsman" },
  { id: "BILALKHAAN", fullName: "Bilal Khan", country: "Oman", role: "Bowler" },
  { id: "KALEEMULLAHSH", fullName: "Kaleemullah", country: "Oman", role: "Bowler" },
  { id: "MEHRANM", fullName: "Mehran Khan", country: "Oman", role: "Bowler" },
  { id: "FAYYAZB", fullName: "Fayyaz Butt", country: "Oman", role: "All-rounder" },
  { id: "NASSEMKH", fullName: "Naseem Khushi", country: "Oman", role: "Wicketkeeper" },
  { id: "PRATIKATH", fullName: "Pratik Athavale", country: "Oman", role: "Wicketkeeper" },
];

// Read existing players
const filePath = path.join(__dirname, '../src/data/all_players.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Get existing IDs and names
const existingIds = new Set(data.players.map(p => p.id));
const existingNames = new Set(data.players.map(p => p.fullName.toLowerCase()));

// Filter out duplicates
const playersToAdd = newPlayers.filter(p => {
  if (existingIds.has(p.id)) return false;
  if (existingNames.has(p.fullName.toLowerCase())) return false;
  return true;
});

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

console.log(`\nAdded ${playersToAdd.length} new players`);
console.log(`Total players now: ${data.players.length}`);

// Append to SQL file
const sqlPath = path.join(__dirname, 'add_popular_players.sql');
let sql = fs.readFileSync(sqlPath, 'utf8');
sql = sql.replace(/;\s*$/, ',\n');
sql += playersToAdd.map((p, i) => {
  const comma = i < playersToAdd.length - 1 ? ',' : ';';
  return `  ('${p.id}', '${p.fullName.replace(/'/g, "''")}', '${p.country}', '${p.role}')${comma}`;
}).join('\n');

fs.writeFileSync(sqlPath, sql);
console.log(`\nSQL file updated: ${sqlPath}`);
