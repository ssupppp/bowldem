/**
 * Add more popular players to the database
 * Run: node scripts/add_more_players.cjs
 */

const fs = require('fs');
const path = require('path');

// More popular players to add
const newPlayers = [
  // Australia - 90s/2000s legends
  { id: "DAVIDHUSSEY", fullName: "David Hussey", country: "Australia", role: "Batsman" },
  { id: "DAMIENMARTYN", fullName: "Damien Martyn", country: "Australia", role: "Batsman" },
  { id: "MICHAELBEVAN", fullName: "Michael Bevan", country: "Australia", role: "Batsman" },
  { id: "SHANELEE", fullName: "Shane Lee", country: "Australia", role: "All-rounder" },
  { id: "IANHARVEY", fullName: "Ian Harvey", country: "Australia", role: "All-rounder" },
  { id: "ANDYBICHEL", fullName: "Andy Bichel", country: "Australia", role: "Bowler" },
  { id: "NATHANBRACKEN", fullName: "Nathan Bracken", country: "Australia", role: "Bowler" },
  { id: "DANCHRISTIAN", fullName: "Dan Christian", country: "Australia", role: "All-rounder" },
  { id: "MOISESHENRIQUES", fullName: "Moises Henriques", country: "Australia", role: "All-rounder" },
  { id: "STUARTMACGILL", fullName: "Stuart MacGill", country: "Australia", role: "Bowler" },
  { id: "MARKWAUGH", fullName: "Mark Waugh", country: "Australia", role: "Batsman" },
  { id: "TOMMOODY", fullName: "Tom Moody", country: "Australia", role: "All-rounder" },
  { id: "SIMONKATICH", fullName: "Simon Katich", country: "Australia", role: "Batsman" },
  { id: "PHILHUGHES", fullName: "Phillip Hughes", country: "Australia", role: "Batsman" },
  { id: "SHAUNMARSH", fullName: "Shaun Marsh", country: "Australia", role: "Batsman" },
  { id: "USMANKH", fullName: "Usman Khawaja", country: "Australia", role: "Batsman" },

  // India - IPL stars & recent
  { id: "DEEPAKCHAHAR", fullName: "Deepak Chahar", country: "India", role: "Bowler" },
  { id: "TNATARAJAN", fullName: "T Natarajan", country: "India", role: "Bowler" },
  { id: "KRUNALPANDYA", fullName: "Krunal Pandya", country: "India", role: "All-rounder" },
  { id: "DEEPAKHOODA", fullName: "Deepak Hooda", country: "India", role: "All-rounder" },
  { id: "MUKESHKUMAR", fullName: "Mukesh Kumar", country: "India", role: "Bowler" },
  { id: "AVESHKHAN", fullName: "Avesh Khan", country: "India", role: "Bowler" },
  { id: "RAHULTEWATIA", fullName: "Rahul Tewatia", country: "India", role: "All-rounder" },
  { id: "RAVIBISHNOI", fullName: "Ravi Bishnoi", country: "India", role: "Bowler" },
  { id: "ARSHDEEPSINGH", fullName: "Arshdeep Singh", country: "India", role: "Bowler" },
  { id: "MOHDSIRAJ", fullName: "Mohammed Siraj", country: "India", role: "Bowler" },
  { id: "PRASIDKRISHNA", fullName: "Prasidh Krishna", country: "India", role: "Bowler" },
  { id: "TILAKVARMA", fullName: "Tilak Varma", country: "India", role: "Batsman" },
  { id: "YASHASVIJ", fullName: "Yashasvi Jaiswal", country: "India", role: "Batsman" },
  { id: "RINKU", fullName: "Rinku Singh", country: "India", role: "Batsman" },
  { id: "VENUGOPAL", fullName: "Venugopal Rao", country: "India", role: "Batsman" },
  { id: "HEMANGBADANI", fullName: "Hemang Badani", country: "India", role: "Batsman" },
  { id: "LAXMIRATAN", fullName: "Laxmi Ratan Shukla", country: "India", role: "All-rounder" },
  { id: "DEBASHISH", fullName: "Debashish Mohanty", country: "India", role: "Bowler" },
  { id: "ABEYKT", fullName: "Abey Kuruvilla", country: "India", role: "Bowler" },
  { id: "NIRANJAN", fullName: "Niranjan Shah", country: "India", role: "Batsman" },

  // England
  { id: "TOMCURRAN", fullName: "Tom Curran", country: "England", role: "All-rounder" },
  { id: "TYREMILLS", fullName: "Tymal Mills", country: "England", role: "Bowler" },
  { id: "CHRISJORDAN", fullName: "Chris Jordan", country: "England", role: "Bowler" },
  { id: "REECETOPLEY", fullName: "Reece Topley", country: "England", role: "Bowler" },
  { id: "DAVIDWILLEY", fullName: "David Willey", country: "England", role: "All-rounder" },
  { id: "MATTPARKINSON", fullName: "Matt Parkinson", country: "England", role: "Bowler" },
  { id: "OWENMORGAN", fullName: "Owen Morgan", country: "England", role: "Batsman" },
  { id: "ANDREWSTRAUSS", fullName: "Andrew Strauss", country: "England", role: "Batsman" },
  { id: "MICHAELVAUGHAN", fullName: "Michael Vaughan", country: "England", role: "Batsman" },
  { id: "NASSERHUSSAIN", fullName: "Nasser Hussain", country: "England", role: "Batsman" },
  { id: "MARCUSTRESCOTHICK", fullName: "Marcus Trescothick", country: "England", role: "Batsman" },
  { id: "ASHLEYGILES", fullName: "Ashley Giles", country: "England", role: "Bowler" },
  { id: "STEVEHARMISON", fullName: "Steve Harmison", country: "England", role: "Bowler" },
  { id: "MATTHEWHOGGARD", fullName: "Matthew Hoggard", country: "England", role: "Bowler" },
  { id: "SIMONCJONES", fullName: "Simon Jones", country: "England", role: "Bowler" },
  { id: "DARCYSHORT", fullName: "Darcy Short", country: "England", role: "Batsman" },
  { id: "WILLSMEED", fullName: "Will Smeed", country: "England", role: "Batsman" },

  // West Indies
  { id: "RAMNARESHSARWAN", fullName: "Ramnaresh Sarwan", country: "West Indies", role: "Batsman" },
  { id: "CARLHOOPER", fullName: "Carl Hooper", country: "West Indies", role: "All-rounder" },
  { id: "CURTLYAMBROSE", fullName: "Curtly Ambrose", country: "West Indies", role: "Bowler" },
  { id: "COURTNEYWALSH", fullName: "Courtney Walsh", country: "West Indies", role: "Bowler" },
  { id: "MALCOLMMARSHALL", fullName: "Malcolm Marshall", country: "West Indies", role: "Bowler" },
  { id: "RICHIERICHARDSON", fullName: "Richie Richardson", country: "West Indies", role: "Batsman" },
  { id: "JEFFDUJON", fullName: "Jeff Dujon", country: "West Indies", role: "Wicketkeeper" },
  { id: "ROYSREDRI", fullName: "Roston Chase", country: "West Indies", role: "All-rounder" },
  { id: "ALZZARRIJOSEPH", fullName: "Alzarri Joseph", country: "West Indies", role: "Bowler" },
  { id: "ODEANJSMITH", fullName: "Odean Smith", country: "West Indies", role: "All-rounder" },
  { id: "AKEALHOSEI", fullName: "Akeal Hosein", country: "West Indies", role: "Bowler" },
  { id: "GUDAKESHTM", fullName: "Gudakesh Motie", country: "West Indies", role: "Bowler" },

  // Pakistan
  { id: "USMANQADIR", fullName: "Usman Qadir", country: "Pakistan", role: "Bowler" },
  { id: "ABDULQADIR", fullName: "Abdul Qadir", country: "Pakistan", role: "Bowler" },
  { id: "SARFARAZN", fullName: "Sarfaraz Nawaz", country: "Pakistan", role: "Bowler" },
  { id: "MUDASSAR", fullName: "Mudassar Nazar", country: "Pakistan", role: "All-rounder" },
  { id: "ZAHEERABBAS", fullName: "Zaheer Abbas", country: "Pakistan", role: "Batsman" },
  { id: "MAJIDKHAN", fullName: "Majid Khan", country: "Pakistan", role: "Batsman" },
  { id: "ASIFIQBAL", fullName: "Asif Iqbal", country: "Pakistan", role: "All-rounder" },
  { id: "SALEEMM", fullName: "Saleem Malik", country: "Pakistan", role: "Batsman" },
  { id: "RAMIZBR", fullName: "Ramiz Raja", country: "Pakistan", role: "Batsman" },
  { id: "AAQIBJ", fullName: "Aaqib Javed", country: "Pakistan", role: "Bowler" },
  { id: "SAQLAINM", fullName: "Saqlain Mushtaq", country: "Pakistan", role: "Bowler" },
  { id: "ABDULR2", fullName: "Abdul Razzaq", country: "Pakistan", role: "All-rounder" },
  { id: "MOHAMMADY", fullName: "Mohammad Yousuf", country: "Pakistan", role: "Batsman" },
  { id: "KAMRANAKMAL", fullName: "Kamran Akmal", country: "Pakistan", role: "Wicketkeeper" },
  { id: "UMARAKMAL", fullName: "Umar Akmal", country: "Pakistan", role: "Batsman" },
  { id: "AHMEDSHE", fullName: "Ahmed Shehzad", country: "Pakistan", role: "Batsman" },
  { id: "USMANSH", fullName: "Usman Shinwari", country: "Pakistan", role: "Bowler" },

  // New Zealand
  { id: "KYLEMILLS", fullName: "Kyle Mills", country: "New Zealand", role: "Bowler" },
  { id: "NATHANMCCULLUM", fullName: "Nathan McCullum", country: "New Zealand", role: "All-rounder" },
  { id: "SCOTTSTYRIS", fullName: "Scott Styris", country: "New Zealand", role: "All-rounder" },
  { id: "JAMESNEESHAM", fullName: "Jimmy Neesham", country: "New Zealand", role: "All-rounder" },
  { id: "LOUFINCENT", fullName: "Lou Vincent", country: "New Zealand", role: "Batsman" },
  { id: "CRAIGMCMILLAN", fullName: "Craig McMillan", country: "New Zealand", role: "All-rounder" },
  { id: "CHRISCAIRNS2", fullName: "Chris Harris", country: "New Zealand", role: "All-rounder" },
  { id: "DIONSASH", fullName: "Dion Nash", country: "New Zealand", role: "All-rounder" },
  { id: "SHAONEB", fullName: "Shane Bond", country: "New Zealand", role: "Bowler" },
  { id: "ADAMPARORE", fullName: "Adam Parore", country: "New Zealand", role: "Wicketkeeper" },
  { id: "GLENNTURNER", fullName: "Glenn Turner", country: "New Zealand", role: "Batsman" },
  { id: "JOHNNWRIGHT", fullName: "John Wright", country: "New Zealand", role: "Batsman" },
  { id: "JREID", fullName: "John Reid", country: "New Zealand", role: "All-rounder" },
  { id: "RACHINRAVINDRA", fullName: "Rachin Ravindra", country: "New Zealand", role: "All-rounder" },
  { id: "GLENNPHILLIPS", fullName: "Glenn Phillips", country: "New Zealand", role: "Batsman" },
  { id: "MARKSANTNER", fullName: "Mitchell Santner", country: "New Zealand", role: "All-rounder" },
  { id: "MATTHENRY", fullName: "Matt Henry", country: "New Zealand", role: "Bowler" },

  // Sri Lanka
  { id: "UPULTHARANGA", fullName: "Upul Tharanga", country: "Sri Lanka", role: "Batsman" },
  { id: "MARVANA", fullName: "Marvan Atapattu", country: "Sri Lanka", role: "Batsman" },
  { id: "ROSHANM", fullName: "Roshan Mahanama", country: "Sri Lanka", role: "Batsman" },
  { id: "ASANKAGURUSINGHE", fullName: "Asanka Gurusinha", country: "Sri Lanka", role: "Batsman" },
  { id: "HASHAN", fullName: "Hashan Tillakaratne", country: "Sri Lanka", role: "Batsman" },
  { id: "PRAMODYADG", fullName: "Pramodya Wickramasinghe", country: "Sri Lanka", role: "Bowler" },
  { id: "RANGANAN", fullName: "Rangana Herath", country: "Sri Lanka", role: "Bowler" },
  { id: "NUWAN", fullName: "Nuwan Kulasekara", country: "Sri Lanka", role: "Bowler" },
  { id: "SURANGA", fullName: "Suranga Lakmal", country: "Sri Lanka", role: "Bowler" },
  { id: "AJANTHAM", fullName: "Ajantha Mendis", country: "Sri Lanka", role: "Bowler" },
  { id: "JEEVAN", fullName: "Jeevan Mendis", country: "Sri Lanka", role: "All-rounder" },
  { id: "KUSALPERA", fullName: "Kusal Perera", country: "Sri Lanka", role: "Wicketkeeper" },
  { id: "NIROSHAN", fullName: "Niroshan Dickwella", country: "Sri Lanka", role: "Wicketkeeper" },
  { id: "DASUNSHANAKA", fullName: "Dasun Shanaka", country: "Sri Lanka", role: "All-rounder" },
  { id: "CHARITH", fullName: "Charith Asalanka", country: "Sri Lanka", role: "Batsman" },
  { id: "BHANUKARA", fullName: "Bhanuka Rajapaksa", country: "Sri Lanka", role: "Batsman" },

  // Bangladesh
  { id: "LITTON", fullName: "Litton Das", country: "Bangladesh", role: "Wicketkeeper" },
  { id: "AMINUL", fullName: "Aminul Islam", country: "Bangladesh", role: "Batsman" },
  { id: "AKRAMKHAN", fullName: "Akram Khan", country: "Bangladesh", role: "Batsman" },
  { id: "KHALEDSM", fullName: "Khaled Mashud", country: "Bangladesh", role: "Wicketkeeper" },
  { id: "HABIBUL", fullName: "Habibul Bashar", country: "Bangladesh", role: "Batsman" },
  { id: "MOHAMMADRAFTQ", fullName: "Mohammad Rafique", country: "Bangladesh", role: "All-rounder" },
  { id: "MASRAFE", fullName: "Mashrafe Mortaza", country: "Bangladesh", role: "Bowler" },
  { id: "ABDURRAZZAK", fullName: "Abdur Razzak", country: "Bangladesh", role: "Bowler" },
  { id: "RUBELHOSSAIN", fullName: "Rubel Hossain", country: "Bangladesh", role: "Bowler" },
  { id: "SABBIR", fullName: "Sabbir Rahman", country: "Bangladesh", role: "Batsman" },
  { id: "SOUMYAS", fullName: "Soumya Sarkar", country: "Bangladesh", role: "Batsman" },
  { id: "LITONKD", fullName: "Liton Kumer Das", country: "Bangladesh", role: "Batsman" },
  { id: "TANJIDDH", fullName: "Tanzid Hasan", country: "Bangladesh", role: "Batsman" },
  { id: "TOWHIDHR", fullName: "Towhid Hridoy", country: "Bangladesh", role: "Batsman" },
  { id: "NAJMUL", fullName: "Najmul Hossain Shanto", country: "Bangladesh", role: "Batsman" },
  { id: "AFIFH", fullName: "Afif Hossain", country: "Bangladesh", role: "All-rounder" },

  // South Africa - more legends
  { id: "CLIVERICE", fullName: "Clive Rice", country: "South Africa", role: "All-rounder" },
  { id: "JIMMYCOOK", fullName: "Jimmy Cook", country: "South Africa", role: "Batsman" },
  { id: "KEPLER", fullName: "Kepler Wessels", country: "South Africa", role: "Batsman" },
  { id: "ADRIANKUIPER", fullName: "Adrian Kuiper", country: "South Africa", role: "All-rounder" },
  { id: "PETERK", fullName: "Peter Kirsten", country: "South Africa", role: "Batsman" },
  { id: "GARYKIR", fullName: "Gary Kirsten", country: "South Africa", role: "Batsman" },
  { id: "DARYLLCULLINAN", fullName: "Daryll Cullinan", country: "South Africa", role: "Batsman" },
  { id: "BRIAN", fullName: "Brian McMillan", country: "South Africa", role: "All-rounder" },
  { id: "DAVIDRIC", fullName: "Dave Richardson", country: "South Africa", role: "Wicketkeeper" },
  { id: "NEILM", fullName: "Neil McKenzie", country: "South Africa", role: "Batsman" },
  { id: "HERSCHELLEGIBBS", fullName: "Herschelle Gibbs", country: "South Africa", role: "Batsman" },
  { id: "BOETAD", fullName: "Boeta Dippenaar", country: "South Africa", role: "Batsman" },
  { id: "ANDRENETRUMPER", fullName: "Andrew Hall", country: "South Africa", role: "All-rounder" },
  { id: "JUSTINKEMPT", fullName: "Justin Kemp", country: "South Africa", role: "All-rounder" },
  { id: "ALBIEMORK", fullName: "Albie Morkel", country: "South Africa", role: "All-rounder" },
  { id: "ROBBIE", fullName: "Robbie Peterson", country: "South Africa", role: "Bowler" },
  { id: "JOHANNBOTHA", fullName: "Johan Botha", country: "South Africa", role: "All-rounder" },
  { id: "RYANMCLA", fullName: "Ryan McLaren", country: "South Africa", role: "All-rounder" },
  { id: "WAYNEP", fullName: "Wayne Parnell", country: "South Africa", role: "All-rounder" },
  { id: "CHRIMORRIS", fullName: "Chris Morris", country: "South Africa", role: "All-rounder" },
  { id: "DWAINE", fullName: "Dwaine Pretorius", country: "South Africa", role: "All-rounder" },
  { id: "GERALDC", fullName: "Gerald Coetzee", country: "South Africa", role: "Bowler" },
  { id: "MARCOJANSEN", fullName: "Marco Jansen", country: "South Africa", role: "Bowler" },
  { id: "TRISTAN", fullName: "Tristan Stubbs", country: "South Africa", role: "Batsman" },

  // Zimbabwe
  { id: "HEATHENSTREAK", fullName: "Heath Streak", country: "Zimbabwe", role: "Bowler" },
  { id: "ALISTERC", fullName: "Alistair Campbell", country: "Zimbabwe", role: "Batsman" },
  { id: "ANDYFLOWER", fullName: "Andy Flower", country: "Zimbabwe", role: "Wicketkeeper" },
  { id: "GRANTFLOWER", fullName: "Grant Flower", country: "Zimbabwe", role: "All-rounder" },
  { id: "DAVIDHTON", fullName: "Dave Houghton", country: "Zimbabwe", role: "Batsman" },
  { id: "EDDOMBRANDT", fullName: "Eddo Brandes", country: "Zimbabwe", role: "Bowler" },
  { id: "PAULSTRANG", fullName: "Paul Strang", country: "Zimbabwe", role: "Bowler" },
  { id: "NEILJONSON", fullName: "Neil Johnson", country: "Zimbabwe", role: "All-rounder" },
  { id: "GARYWH", fullName: "Gary Brent", country: "Zimbabwe", role: "Batsman" },
  { id: "TATENDATAIBU", fullName: "Tatenda Taibu", country: "Zimbabwe", role: "Wicketkeeper" },
  { id: "HAMILTONMASA", fullName: "Hamilton Masakadza", country: "Zimbabwe", role: "Batsman" },
  { id: "BRENDANTTAYLOR", fullName: "Brendan Taylor", country: "Zimbabwe", role: "Batsman" },
  { id: "ELTONCHIG", fullName: "Elton Chigumbura", country: "Zimbabwe", role: "All-rounder" },
  { id: "CRAIGERVINE", fullName: "Craig Ervine", country: "Zimbabwe", role: "Batsman" },
  { id: "SEANWILLIAMS", fullName: "Sean Williams", country: "Zimbabwe", role: "All-rounder" },
  { id: "SIKANDARRA", fullName: "Sikandar Raza", country: "Zimbabwe", role: "All-rounder" },
  { id: "REGISCHAKABVA", fullName: "Regis Chakabva", country: "Zimbabwe", role: "Wicketkeeper" },
  { id: "BLESSINGMUZ", fullName: "Blessing Muzarabani", country: "Zimbabwe", role: "Bowler" },
  { id: "RICHICHET", fullName: "Richard Ngarava", country: "Zimbabwe", role: "Bowler" },

  // Ireland
  { id: "KEVOBRYEN", fullName: "Kevin O'Brien", country: "Ireland", role: "All-rounder" },
  { id: "WILLIPORTERFIELD", fullName: "William Porterfield", country: "Ireland", role: "Batsman" },
  { id: "EDJOYC", fullName: "Ed Joyce", country: "Ireland", role: "Batsman" },
  { id: "NIOBRYEN", fullName: "Niall O'Brien", country: "Ireland", role: "Wicketkeeper" },
  { id: "JOHNYMOONEY", fullName: "John Mooney", country: "Ireland", role: "All-rounder" },
  { id: "BOYDRANKIN", fullName: "Boyd Rankin", country: "Ireland", role: "Bowler" },
  { id: "TIMMOTHER", fullName: "Tim Murtagh", country: "Ireland", role: "Bowler" },
  { id: "GEORGEDOCK", fullName: "George Dockrell", country: "Ireland", role: "Bowler" },
  { id: "ANDYBALBI", fullName: "Andy Balbirnie", country: "Ireland", role: "Batsman" },
  { id: "PAULSTIRL", fullName: "Paul Stirling", country: "Ireland", role: "All-rounder" },
  { id: "HARRYTRACK", fullName: "Harry Tector", country: "Ireland", role: "Batsman" },
  { id: "CURTCAMPHER", fullName: "Curtis Campher", country: "Ireland", role: "All-rounder" },
  { id: "LORCANTU", fullName: "Lorcan Tucker", country: "Ireland", role: "Wicketkeeper" },
  { id: "JOSHLI", fullName: "Josh Little", country: "Ireland", role: "Bowler" },
  { id: "MARKADK", fullName: "Mark Adair", country: "Ireland", role: "All-rounder" },
  { id: "BARRYMCC", fullName: "Barry McCarthy", country: "Ireland", role: "Bowler" },

  // Afghanistan - more players
  { id: "GULBADIN", fullName: "Gulbadin Naib", country: "Afghanistan", role: "All-rounder" },
  { id: "NAJIBULLAH", fullName: "Najibullah Zadran", country: "Afghanistan", role: "Batsman" },
  { id: "SAMIULLAH", fullName: "Samiullah Shinwari", country: "Afghanistan", role: "All-rounder" },
  { id: "KARIM", fullName: "Karim Janat", country: "Afghanistan", role: "All-rounder" },
  { id: "HASHMATULLAH", fullName: "Hashmatullah Shahidi", country: "Afghanistan", role: "Batsman" },
  { id: "RAHMANULLAH", fullName: "Rahmanullah Gurbaz", country: "Afghanistan", role: "Wicketkeeper" },
  { id: "AZMATULLAH", fullName: "Azmatullah Omarzai", country: "Afghanistan", role: "All-rounder" },
  { id: "NOOR", fullName: "Noor Ahmad", country: "Afghanistan", role: "Bowler" },
  { id: "NAVEEN", fullName: "Naveen-ul-Haq", country: "Afghanistan", role: "Bowler" },

  // USA
  { id: "AARONJ", fullName: "Aaron Jones", country: "United States of America", role: "Batsman" },
  { id: "STEVENT", fullName: "Steven Taylor", country: "United States of America", role: "All-rounder" },
  { id: "MONANK", fullName: "Monank Patel", country: "United States of America", role: "Wicketkeeper" },
  { id: "NITISH", fullName: "Nitish Kumar", country: "United States of America", role: "All-rounder" },
  { id: "COREY", fullName: "Corey Anderson", country: "United States of America", role: "All-rounder" },
  { id: "ALIKHANS", fullName: "Ali Khan", country: "United States of America", role: "Bowler" },
  { id: "SAURABHN", fullName: "Saurabh Netravalkar", country: "United States of America", role: "Bowler" },
  { id: "JASDEEPS", fullName: "Jasdeep Singh", country: "United States of America", role: "Bowler" },
  { id: "ANDRIESGA", fullName: "Andries Gous", country: "United States of America", role: "Wicketkeeper" },
  { id: "MILINDKR", fullName: "Milind Kumar", country: "United States of America", role: "Batsman" },
  { id: "HARMEET", fullName: "Harmeet Singh", country: "United States of America", role: "Bowler" },
  { id: "NOSTHUSHK", fullName: "Nosthush Kenjige", country: "United States of America", role: "Bowler" },
];

// Read existing players
const filePath = path.join(__dirname, '../src/data/all_players.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Get existing IDs to avoid duplicates
const existingIds = new Set(data.players.map(p => p.id));
const existingNames = new Set(data.players.map(p => p.fullName.toLowerCase()));

// Filter out duplicates (check both ID and name)
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

// Append to SQL file for Supabase
const sqlPath = path.join(__dirname, 'add_popular_players.sql');
let sql = fs.readFileSync(sqlPath, 'utf8');

// Remove trailing semicolon from previous SQL and add comma
sql = sql.replace(/;\s*$/, ',\n');

// Add new players
sql += playersToAdd.map((p, i) => {
  const comma = i < playersToAdd.length - 1 ? ',' : ';';
  return `  ('${p.id}', '${p.fullName.replace(/'/g, "''")}', '${p.country}', '${p.role}')${comma}`;
}).join('\n');

fs.writeFileSync(sqlPath, sql);
console.log(`\nSQL file updated: ${sqlPath}`);
