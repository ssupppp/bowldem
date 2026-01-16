# Bowldem - Claude Context

## Important: Branch & Location
- **Working Directory:** `C:\Users\Vikas\Documents\Projects\bowldem-work`
- **Branch:** `feature/feedback-system-update` (NOT main)
- **Remote:** https://github.com/ssupppp/bowldem

Always work on the `feature/feedback-system-update` branch. Do NOT switch to main or other branches.

---

## DEPRECATED - Do Not Use

### Old Branches (on GitHub)
These branches are outdated and should be ignored:
- `feature/role-runs-wickets-matches-feedback` - OLD, superseded by current branch
- `claude/update-mvp-todos-mWtrA` - OLD, auto-generated branch
- `main` - Not actively used, current work is on feature branch

### Old Local Folders
These folders contain outdated versions of the project:
- `C:\Users\Vikas\Documents\Projects\CricGuessV2` - OLD (rename to `_OLD_CricGuessV2`)
  - Contains `cricguess-mvp` - older MVP with T20I data
  - Contains `bowldemv2` - older version with Express backend + SQLite (abandoned)

**Only use `C:\Users\Vikas\Documents\Projects\bowldem-work`**

---

## TODO - Current Tasks

### In Progress
- [ ] **Expand player database** - Adding T20 World Cup nation players

### Next Up (Phase 1.1 - Missing Nations)
- [ ] Add Afghanistan players (~25) - Rashid Khan, Nabi, Zadran brothers, etc.
- [ ] Add Canada players (~20)
- [ ] Add UAE players (~18)
- [ ] Add Uganda players (~18)
- [ ] Add Papua New Guinea players (~18)

### Backlog
- [ ] Phase 1.2: Expand associate nation squads (NED, SCO, NAM, etc.)
- [ ] Phase 1.3: Fill gaps in full member rosters
- [ ] Phase 2: Add domestic T20 league players (IPL, BBL, PSL, etc.)
- [ ] Phase 3: Add retired legends
- [ ] UI/UX improvements to feedback display
- [ ] Mobile responsiveness
- [ ] Add more puzzle content (ODI, IPL matches)

### Completed
- [x] Add roles to all 370 existing players
- [x] Add ~200 more professional cricketers (now 569 total)
- [x] Create PLAYER_DATABASE_PLAN.md

---

## Project Overview
Bowldem is a **Wordle-style daily cricket puzzle game** where players guess the Man of the Match from historic cricket matches based on venue and scorecard clues.

### Game Flow
1. Player sees venue + match scores (team names hidden)
2. Player types a cricketer's name (autocomplete after 3 chars)
3. System provides Y/N feedback on 4 attributes:
   - **Played:** Did this player play in this match?
   - **Team:** Is this player on the same team as the MVP?
   - **Role:** Does this player have the same role (Batsman/Bowler/All-rounder/WK)?
   - **MVP:** Is this the Man of the Match? (Win condition)
4. Player has 4 guesses to find the MVP

## Tech Stack
- **Frontend:** React 18 + Vite
- **Styling:** CSS (App.css)
- **Data:** Static JSON files (no backend)
- **Deployment:** Replit-ready

## Key Files
```
src/
├── App.jsx                 # Main game component
├── App.css                 # All styling
├── components/
│   ├── FeedbackDisplay.jsx # Y/N feedback grid
│   ├── PlayerAutocomplete.jsx # Player search input
│   ├── StatsModal.jsx      # Player statistics
│   ├── CountdownTimer.jsx  # Next puzzle countdown
│   └── DebugPanel.jsx      # Dev tools (date manipulation)
├── hooks/
│   └── useDailyPuzzle.js   # Daily puzzle logic & state persistence
├── utils/
│   └── dailyPuzzle.js      # Date/puzzle calculation utilities
└── data/
    ├── all_players.json    # Player database (id, fullName, country, role)
    └── match_puzzles_t20wc.json # 60 T20 World Cup puzzles

public/
└── index.html

scripts/
├── extract_players.js      # Player data extraction
└── process_cricsheet.js    # Match data processing
```

## Data Structure

### Player (all_players.json)
```json
{
  "id": "player_key",
  "fullName": "Virat Kohli",
  "country": "India",
  "role": "Batsman"
}
```

### Puzzle (match_puzzles_t20wc.json)
```json
{
  "puzzleId": 1,
  "targetPlayer": "player_key",
  "matchData": {
    "scorecard": { "venue": "...", "team1Score": "...", "team2Score": "...", "result": "..." },
    "playersInMatch": ["player_key1", "player_key2", ...],
    "targetPlayerTeam": "India",
    "targetPlayerRole": "Batsman"
  }
}
```

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Production build
```

## Current State (as of Jan 2025)
- **569 players** in database (all with proper roles)
- 60 T20 World Cup puzzles loaded
- Y/N feedback system working
- Daily puzzle rotation working (EPOCH: 2026-01-15)
- Stats tracking (localStorage)
- Share functionality working

## Priority Tasks
1. **Expand player database** - See `PLAYER_DATABASE_PLAN.md`
2. UI/UX improvements to feedback display
3. Mobile responsiveness
4. Add more puzzle content (ODI, IPL matches)

## Player Database Expansion
See `PLAYER_DATABASE_PLAN.md` for the full plan. Summary:

### Phase 1: T20 World Cup Nations (Current)
- Add missing nations: Afghanistan, Canada, UAE, Uganda, PNG
- Expand associate nation squads
- Fill gaps in full member rosters
- Target: +300 players

### Phase 2: Domestic T20 Leagues
- IPL uncapped players, BBL, PSL, CPL, etc.
- Target: +150 players

### Phase 3: Retired Legends
- Historical players from 1980s-2010s
- Target: +200 players

### Quick Commands
```bash
# Count by country
cat src/data/all_players.json | grep -o '"country": "[^"]*"' | sort | uniq -c | sort -rn

# Total count
grep -c '"id"' src/data/all_players.json
```
