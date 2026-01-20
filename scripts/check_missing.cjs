const data = require('../src/data/all_players.json');
const names = data.players.map(p => p.fullName.toLowerCase());

const checkPlayers = [
  'VVS Laxman', 'Ajit Agarkar', 'Ashish Nehra', 'Irfan Pathan', 'RP Singh',
  'Pragyan Ojha', 'Amit Mishra', 'Munaf Patel', 'S Sreesanth', 'Joginder Sharma',
  'Robin Singh', 'Saba Karim', 'Noel David', 'Sadagoppan Ramesh', 'MSK Prasad',
  'Yuvraj Singh', 'Gautam Gambhir', 'Marlon Samuels', 'Carlos Brathwaite',
  'Samuel Badree', 'Daren Sammy', 'Travis Head', 'Mitchell Marsh', 'Cameron Green',
  'Josh Inglis', 'Fawad Alam', 'Mohammad Nawaz', 'Usama Mir',
  'Shai Hope', 'Brandon King', 'Rovman Powell', 'Kyle Mayers',
  'Rahul Chahar', 'Varun Chakravarthy', 'Ruturaj Gaikwad', 'Venkatesh Iyer',
  'Abhishek Sharma', 'Shivam Dube', 'Mayank Yadav', 'Harshit Rana'
];

checkPlayers.forEach(p => {
  const searchName = p.toLowerCase();
  const lastName = searchName.split(' ').pop();
  const found = names.some(n => n.includes(lastName) || n.includes(searchName));
  if (!found) console.log('Missing: ' + p);
});
