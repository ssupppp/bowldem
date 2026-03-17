/**
 * Auto-generate odi_matches.json config from all ODI files in odi/ directory.
 * Reads each Cricsheet JSON, extracts metadata, and builds config entries.
 *
 * Usage: node scripts/build_odi_config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ODI_DIR = path.join(__dirname, '..', 'odi');
const CONFIG_FILE = path.join(__dirname, 'odi_matches.json');

// Role mapping for known MOTMs — we'll try to auto-detect but override where needed
const ROLE_OVERRIDES = {
  // Wicketkeepers
  "AC Gilchrist": "Wicketkeeper",
  "MS Dhoni": "Wicketkeeper",
  "KC Sangakkara": "Wicketkeeper",
  "BJ Haddin": "Wicketkeeper",
  "JC Buttler": "Wicketkeeper",
  "AJ Healy": "Wicketkeeper",
  "Q de Kock": "Wicketkeeper",
  "Khaled Mashud": "Wicketkeeper",
  "TWM Latham": "Wicketkeeper",
  "BB McCullum": "Wicketkeeper",

  // All-rounders
  "A Symonds": "All-rounder",
  "BA Stokes": "All-rounder",
  "SR Watson": "All-rounder",
  "JP Faulkner": "All-rounder",
  "CR Woakes": "All-rounder",
  "Yuvraj Singh": "All-rounder",
  "A Flintoff": "All-rounder",
  "CH Gayle": "All-rounder",
  "Shoaib Malik": "All-rounder",
  "Shakib Al Hasan": "All-rounder",
  "RA Jadeja": "All-rounder",
  "R Ravindra": "All-rounder",
  "GD Elliott": "All-rounder",
  "JDP Oram": "All-rounder",
  "C de Grandhomme": "All-rounder",
  "IDR Bradshaw": "All-rounder",
  "Aftab Ahmed": "Batsman",
  "GJ Maxwell": "All-rounder",
  "Andrew Flintoff": "All-rounder",

  // Bowlers
  "GD McGrath": "Bowler",
  "SE Bond": "Bowler",
  "Mohammed Shami": "Bowler",
  "TA Boult": "Bowler",
  "MJ Henry": "Bowler",
  "Z Khan": "Bowler",
  "B Lee": "Bowler",
  "Brett Lee": "Bowler",
  "Zaheer Khan": "Bowler",
  "Shaheen Shah Afridi": "Bowler",

  // Batsmen — most are default but specify key ones
  "V Kohli": "Batsman",
  "RG Sharma": "Batsman",
  "SR Tendulkar": "Batsman",
  "RT Ponting": "Batsman",
  "TM Head": "Batsman",
  "DA Warner": "Batsman",
  "SC Ganguly": "Batsman",
  "SPD Smith": "Batsman",
  "ML Hayden": "Batsman",
  "DPMD Jayawardene": "Batsman",
  "TM Dilshan": "Batsman",
  "AJ Strauss": "Batsman",
  "V Sehwag": "Batsman",
  "Virender Sehwag": "Batsman",
  "AB de Villiers": "Batsman",
  "MJ Guptill": "Batsman",
  "Fakhar Zaman": "Batsman",
  "AJ Finch": "Batsman",
  "JM Bairstow": "Batsman",
};

// Context/trivia for known matches
const MATCH_INFO = {
  // World Cup Finals
  "1384439": {
    context: "ICC Cricket World Cup 2023 Final",
    trivia: "Travis Head's stunning 137 off 120 balls silenced 100,000 fans at Ahmedabad as Australia won their 6th World Cup title, denying unbeaten India",
    highlight: "Travis Head counter-attacked from 47/3, putting on 192 with Labuschagne to chase down 241 with 7 overs to spare"
  },
  "656495": {
    context: "ICC Cricket World Cup 2015 Final",
    trivia: "James Faulkner took 3/36 as Australia restricted New Zealand to 183, then cruised to victory at the MCG in front of 93,000 fans",
    highlight: "Faulkner's death-overs bowling strangled New Zealand's innings in the biggest match of the tournament"
  },
  "247507": {
    context: "ICC Cricket World Cup 2007 Final",
    trivia: "Adam Gilchrist smashed 149 off 104 balls in the World Cup Final — later revealing he used a squash ball inside his glove for grip",
    highlight: "Gilchrist's blistering knock remains the highest individual score in a World Cup Final"
  },
  "65286": {
    context: "ICC Cricket World Cup 2003 Final",
    trivia: "Ricky Ponting hammered an unbeaten 140 off 121 balls as Australia demolished India by 125 runs at the Wanderers to win their third consecutive World Cup",
    highlight: "Ponting's aggressive century was the cornerstone of Australia's dominant 359/2, the highest World Cup Final total at the time"
  },

  // World Cup Semi-Finals
  "1384437": {
    context: "ICC Cricket World Cup 2023 Semi-Final",
    trivia: "Mohammed Shami took 7/57 — the best-ever World Cup semi-final figures — as India crushed New Zealand by 70 runs at the Wankhede",
    highlight: "Shami's devastating spell ripped through New Zealand's batting, with India's bowlers ensuring a comfortable semi-final victory"
  },
  "1384438": {
    context: "ICC Cricket World Cup 2023 Semi-Final",
    trivia: "Travis Head scored a match-winning 51-ball 62* as Australia chased down South Africa's total with 3 wickets and 6 balls to spare at Eden Gardens",
    highlight: "Head's calm aggression in the chase secured Australia's place in the final despite a shaky start"
  },
  "433605": {
    context: "ICC Cricket World Cup 2011 Semi-Final",
    trivia: "The biggest cricket match on earth — India vs Pakistan in a World Cup semi-final at Mohali, with Sachin Tendulkar's 85 anchoring India's run chase",
    highlight: "Tendulkar survived early dropped catches and played a crucial knock as India beat their arch-rivals to reach the World Cup Final at home"
  },
  "433604": {
    context: "ICC Cricket World Cup 2011 Semi-Final",
    trivia: "Kumar Sangakkara scored a masterful unbeaten 54 as Sri Lanka chased down New Zealand's target to reach the World Cup Final in Mumbai",
    highlight: "Sangakkara's composed knock guided Sri Lanka through a tricky chase in Colombo"
  },
  "247505": {
    context: "ICC Cricket World Cup 2007 Semi-Final",
    trivia: "Mahela Jayawardene's brilliant 115* guided Sri Lanka past New Zealand and into the World Cup Final",
    highlight: "Jayawardene's unbeaten century was a masterclass in ODI batting under pressure in Jamaica"
  },
  "247506": {
    context: "ICC Cricket World Cup 2007 Semi-Final",
    trivia: "Glenn McGrath's 3/18 helped Australia restrict South Africa to 149 in a completely one-sided semi-final in St Lucia",
    highlight: "McGrath produced a vintage performance in what would be one of his final ODI matches"
  },
  "656491": {
    context: "ICC Cricket World Cup 2015 Semi-Final",
    trivia: "Grant Elliott hit a six off Dale Steyn's penultimate ball to seal New Zealand's first-ever World Cup Final berth, breaking South African hearts at Eden Park",
    highlight: "Elliott's unbeaten 84 in a tense chase will forever be remembered as one of cricket's most dramatic semi-final knocks"
  },
  "65284": {
    context: "ICC Cricket World Cup 2003 Semi-Final",
    trivia: "Andrew Symonds scored 91* and took a crucial run-out as Australia beat Sri Lanka to reach yet another World Cup Final",
    highlight: "Symonds anchored Australia's chase with an aggressive unbeaten knock at Port Elizabeth"
  },
  "65285": {
    context: "ICC Cricket World Cup 2003 Semi-Final",
    trivia: "Sourav Ganguly led from the front with 111* as India demolished Kenya by 91 runs to reach the World Cup Final for the first time since 1983",
    highlight: "Ganguly's captain's knock set up a huge total as India booked their ticket to the Final at Durban"
  },

  // World Cup QFs
  "656489": {
    context: "ICC Cricket World Cup 2015 Quarter-Final",
    trivia: "Martin Guptill smashed 237* — the highest World Cup score ever — as New Zealand obliterated West Indies by 143 runs in Wellington",
    highlight: "Guptill's record-breaking double century featured 24 fours and 11 sixes in a stunning quarter-final display"
  },
  "656485": {
    context: "ICC Cricket World Cup 2015 Quarter-Final",
    trivia: "Rohit Sharma's 137 and Umesh Yadav's 4/31 powered India past Bangladesh at the MCG",
    highlight: "Rohit's assured century set up a comfortable Indian win in the quarter-final"
  },
  "433603": {
    context: "ICC Cricket World Cup 2011 Quarter-Final",
    trivia: "Tillakaratne Dilshan scored a century and took 2/38 as Sri Lanka thrashed England by 10 wickets in Colombo",
    highlight: "Dilshan's all-round display led to a comprehensive Sri Lankan victory, one of the most dominant WC QF performances"
  },
  "433602": {
    context: "ICC Cricket World Cup 2011 Quarter-Final",
    trivia: "Jacob Oram's 4/39 dismantled South Africa as New Zealand won a close quarter-final at Mirpur",
    highlight: "Oram's bowling spell was the difference as New Zealand knocked out South Africa"
  },

  // Iconic WC Group Matches
  "433568": {
    context: "ICC Cricket World Cup 2011 Group Stage",
    trivia: "One of the rarest results in WC history — a tie between India and England in Bangalore. Andrew Strauss scored 158 but India's batting made it a dead heat",
    highlight: "Strauss hit 158 in a losing (well, tying) cause as both teams finished on identical scores in a thrilling group match"
  },
  "433558": {
    context: "ICC Cricket World Cup 2011 Group Stage",
    trivia: "Virender Sehwag smashed 175 off just 140 balls — the highest WC score at the time — as India crushed Bangladesh in the tournament opener at Mirpur",
    highlight: "Sehwag's explosive century set the tone for India's eventual World Cup triumph on home soil"
  },
  "656437": {
    context: "ICC Cricket World Cup 2015 Group Stage",
    trivia: "An all-time classic — Trent Boult took 5/27 and Mitchell Starc 6/28, but NZ chased 151 with 1 wicket to spare. Kane Williamson and Boult saw them home",
    highlight: "Boult's brilliant 5-wicket haul bowled Australia out cheaply before NZ scraped home in a thriller at Auckland"
  },
  "656427": {
    context: "ICC Cricket World Cup 2015 Group Stage",
    trivia: "Chris Gayle's 215 off 147 balls — the first-ever double century in a World Cup match — destroyed Zimbabwe at Canberra",
    highlight: "Gayle's record-breaking double century included 10 fours and 16 sixes in an utterly dominant display"
  },
  "656405": {
    context: "ICC Cricket World Cup 2015 Group Stage",
    trivia: "Virat Kohli's 107 was the centerpiece of India's 76-run victory over Pakistan in the biggest group-stage rivalry match at Adelaide",
    highlight: "Kohli's century continued his superb record against Pakistan in World Cups"
  },
  "656435": {
    context: "ICC Cricket World Cup 2015 Group Stage",
    trivia: "AB de Villiers smashed 162 off 66 balls — reaching his century off just 31 balls, the fastest in WC history — as SA won by a record 257 runs",
    highlight: "De Villiers' innings featured 17 fours and 8 sixes in the most destructive WC batting performance ever seen"
  },
  "1144514": {
    context: "ICC Cricket World Cup 2019 Group Stage",
    trivia: "Aaron Finch hit 100 as Australia beat England by 64 runs at Lord's in a crucial group-stage encounter",
    highlight: "Finch's composed century laid the foundation for Australia's statement win at the home of cricket"
  },
  "1144520": {
    context: "ICC Cricket World Cup 2019 Group Stage",
    trivia: "Jonny Bairstow's 111 powered England to a must-win victory over India at Edgbaston, keeping their World Cup hopes alive",
    highlight: "Bairstow's aggressive century set the tone for England's crucial chase"
  },
  "65279": {
    context: "ICC Cricket World Cup 2003 Super Six",
    trivia: "Shane Bond took 6/23 — the best figures in a WC match against Australia — but it wasn't enough as Brett Lee's 5/42 helped Australia win",
    highlight: "An extraordinary bowling duel between Bond and Lee at Port Elizabeth"
  },

  // 2023 WC Group
  "1384428": {
    context: "ICC Cricket World Cup 2023 Group Stage",
    trivia: "Virat Kohli scored his 49th ODI century — equaling Sachin Tendulkar's all-time record — in a dominant Indian win over South Africa at Kolkata",
    highlight: "Kohli's historic century drew him level with Tendulkar's seemingly unbreakable record"
  },
  "1384412": {
    context: "ICC Cricket World Cup 2023 Group Stage",
    trivia: "Mohammed Shami took 5/54 on a turning Dharamsala pitch as India beat New Zealand early in the tournament",
    highlight: "Shami's 5-wicket haul continued India's dominance in the 2023 World Cup"
  },
  "1384409": {
    context: "ICC Cricket World Cup 2023 Group Stage",
    trivia: "David Warner blasted 163 off 124 balls — his highest ODI score — to set up Australia's win over Pakistan at Bengaluru",
    highlight: "Warner's career-best 163 featured 17 fours and 5 sixes in a batting masterclass"
  },
  "1384415": {
    context: "ICC Cricket World Cup 2023 Group Stage",
    trivia: "Glenn Maxwell scored an unbelievable 201* off 128 balls — the greatest ODI chase ever — to single-handedly rescue Australia from 91/7 against Netherlands",
    highlight: "Maxwell's 201* is the highest score in a successful ODI chase, battling cramps and the impossible at Lucknow"
  },
  "1384420": {
    context: "ICC Cricket World Cup 2023 Group Stage",
    trivia: "Rohit Sharma's blistering 87-ball century set the tone as India maintained their unbeaten run against England in Lucknow",
    highlight: "Rohit's attacking century was the highlight of India's dominant group-stage campaign"
  },

  // 2019 WC Semi
  "1144529": {
    context: "ICC Cricket World Cup 2019 Semi-Final",
    trivia: "Chris Woakes' 3/20 and Jason Roy's 85 helped England dismantle defending champions Australia at Edgbaston to reach the Final",
    highlight: "Woakes' new-ball spell removed Australia's top order as England cruised to a comfortable semi-final victory"
  },

  // Champions Trophy
  "1466428": {
    context: "ICC Champions Trophy 2025 Final",
    trivia: "Rohit Sharma's unbeaten century sealed India's Champions Trophy triumph over New Zealand in Dubai",
    highlight: "Rohit's match-winning knock in the final capped a dominant Indian campaign in the 2025 Champions Trophy"
  },
  "1466426": {
    context: "ICC Champions Trophy 2025 Semi-Final",
    trivia: "Virat Kohli delivered a vintage performance as India knocked out Australia in the Champions Trophy semi-final at Dubai",
    highlight: "Kohli's match-winning display guided India past Australia and into the Champions Trophy Final"
  },
  "1466427": {
    context: "ICC Champions Trophy 2025 Semi-Final",
    trivia: "Rachin Ravindra's all-round brilliance powered New Zealand past South Africa in the Champions Trophy semi-final at Lahore",
    highlight: "Ravindra's match-winning performance earned New Zealand a spot in the Champions Trophy Final"
  },
  "1022375": {
    context: "ICC Champions Trophy 2017 Final",
    trivia: "Fakhar Zaman's 114 powered Pakistan to a stunning 180-run victory over India in the Champions Trophy Final at The Oval — one of the biggest upsets in ICC tournament history",
    highlight: "Fakhar's fearless century on the biggest stage humbled favorites India in a shocking result"
  },
  "566948": {
    context: "ICC Champions Trophy 2013 Final",
    trivia: "Ravindra Jadeja's 2/24 and his crucial 33* with the bat helped India defend 129 to beat England by 5 runs in a low-scoring Champions Trophy Final",
    highlight: "Jadeja's all-round performance in dire conditions at Edgbaston won India their second Champions Trophy"
  },
  "415287": {
    context: "ICC Champions Trophy 2009 Final",
    trivia: "Shane Watson's 105* guided Australia to a comfortable 6-wicket win over New Zealand in the Champions Trophy Final at Centurion",
    highlight: "Watson's unbeaten century in the final sealed Australia's second Champions Trophy title"
  },
  "66210": {
    context: "ICC Champions Trophy 2004 Final",
    trivia: "Ian Bradshaw's dramatic 34* off 36 balls from 147/8 guided West Indies to a 2-wicket win over England in one of the greatest CT Final finishes",
    highlight: "Bradshaw and Browne's last-wicket stand of 71 pulled off the impossible at The Oval"
  },

  // Famous Individual Performances
  "441828": {
    context: "India vs South Africa ODI Series 2010",
    trivia: "Sachin Tendulkar became the first player in history to score a double century in ODIs — 200* off 147 balls at Gwalior",
    highlight: "Tendulkar's historic 200* included 25 fours and 3 sixes, rewriting the record books"
  },

  // Classic matches
  "238199": {
    context: "Australia in South Africa ODI Series 2006",
    trivia: "The greatest ODI match ever? South Africa chased 434 to win, the highest successful ODI chase until 2018. Final score: SA 438/9 beat Australia 434/4",
    highlight: "Herschelle Gibbs' 175 and the South African tail's heroics completed the most famous ODI chase in history"
  },
  "1158069": {
    context: "England tour of West Indies 2019",
    trivia: "Jos Buttler's 150 off 77 balls and Chris Gayle's 162 off 97 balls made this one of the most explosive bilateral ODIs ever played",
    highlight: "Buttler's incredible 150 was matched by Gayle's blistering 162, producing 652 runs in a single match"
  },

  // Original 7 matches (keep for variety)
  "236358": {
    context: "VB Series Final 2006",
    trivia: "Sangakkara's brilliant 89* steered Sri Lanka to a comfortable win in the VB Series Final",
    highlight: "KC Sangakkara anchored the chase with an unbeaten 89 off 93 balls"
  },
  "64814": {
    context: "India tour of New Zealand 2003",
    trivia: "Sehwag smashed a blistering century to set up India's series-levelling win",
    highlight: "Virender Sehwag's explosive innings at the top set the tone"
  },
  "64817": {
    context: "India tour of New Zealand 2003",
    trivia: "Zaheer Khan's devastating spell with the new ball dismantled New Zealand's batting lineup",
    highlight: "Zaheer Khan picked up crucial wickets to seal the series for India"
  },
  "64830": {
    context: "Bangladesh tour of Australia 2003",
    trivia: "Brett Lee's fiery pace was too much for Bangladesh as Australia dominated at home",
    highlight: "Brett Lee terrorized the Bangladesh batsmen with raw pace"
  },
  "64844": {
    context: "England tour of Bangladesh 2003",
    trivia: "Flintoff showed his all-round prowess in testing conditions in Dhaka",
    highlight: "Andrew Flintoff delivered with both bat and ball to earn Man of the Match"
  },
  "64852": {
    context: "West Indies tour of Zimbabwe 2003",
    trivia: "Chris Gayle lit up Harare with a commanding all-round display",
    highlight: "Chris Gayle dominated with bat and ball against Zimbabwe"
  },
  "66380": {
    context: "Paktel Cup 2003",
    trivia: "Shoaib Malik's all-round display powered Pakistan to a win in the Paktel Cup",
    highlight: "Shoaib Malik contributed with both bat and ball in a polished all-round performance"
  },
  "238169": {
    context: "Sri Lanka in Bangladesh ODI Series 2006",
    trivia: "Aftab Ahmed's explosive batting powered Bangladesh to a memorable 4-wicket victory over Sri Lanka in Bogra",
    highlight: "Aftab Ahmed's aggressive knock turned the chase in Bangladesh's favor"
  },
};

function getRole(motmName) {
  return ROLE_OVERRIDES[motmName] || "Batsman";
}

function buildCricinfoUrl(matchId, info) {
  // Build approximate ESPN Cricinfo URL — these will need manual verification
  const event = info.event || {};
  const eventName = (event.name || '').toLowerCase().replace(/\s+/g, '-');
  return `https://www.espncricinfo.com/matches/engine/match/${matchId}.html`;
}

function main() {
  const files = fs.readdirSync(ODI_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_') && f !== 'odis_json.zip')
    .sort((a, b) => {
      const aId = parseInt(a.replace('.json', ''));
      const bId = parseInt(b.replace('.json', ''));
      return aId - bId;
    });

  console.log(`Processing ${files.length} ODI match files...\n`);

  const matches = [];
  const errors = [];

  for (const file of files) {
    const matchId = file.replace('.json', '');
    const filePath = path.join(ODI_DIR, file);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const info = data.info;
      if (!info || !info.player_of_match) {
        errors.push({ file, error: 'No MOTM' });
        continue;
      }

      const motm = info.player_of_match[0];
      const role = getRole(motm);
      const matchInfo = MATCH_INFO[matchId];

      if (!matchInfo) {
        errors.push({ file, error: 'No context/trivia defined' });
        continue;
      }

      matches.push({
        file: file,
        cricinfoUrl: buildCricinfoUrl(matchId, info),
        targetPlayerRole: role,
        matchContext: matchInfo.context,
        triviaFact: matchInfo.trivia,
        playerHighlight: matchInfo.highlight
      });

      console.log(`  OK: ${file} | MOTM: ${motm} (${role}) | ${matchInfo.context}`);
    } catch (err) {
      errors.push({ file, error: err.message });
    }
  }

  // Write config
  const config = {
    matches,
    _TODO_iconic_matches: [
      "STILL NEED: Sachin 200* (441828 if downloaded), 1999 WC matches, ABD fastest 150",
      "Also: verify all cricinfoUrl links against actual scorecards"
    ]
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`\nConfig written to: ${CONFIG_FILE}`);
  console.log(`Total matches configured: ${matches.length}`);

  if (errors.length > 0) {
    console.log(`\nSkipped (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e.file}: ${e.error}`));
  }
}

main();
