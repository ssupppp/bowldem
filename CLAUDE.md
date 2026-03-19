# Bowldem - Claude Context

## Important: Branch & Location
- **Working Directory:** `C:\Users\vikas\bowldem`
- **Branch:** `main` (production)
- **Remote:** https://github.com/ssupppp/bowldem
- **Deployment:** Vercel (bowldem-work project) → bowldem.com

---

## CRITICAL: Styling Rules (NO TAILWIND!)

⚠️ **This project uses PLAIN CSS only. Tailwind is NOT installed.**

### DO NOT USE:
```jsx
// ❌ WRONG - Tailwind classes don't exist here
<div className="w-full pl-12 pr-12 py-4 bg-white rounded-xl border-2">
<div className="flex items-center gap-2 text-sm text-slate-600">
```

### USE INSTEAD:
```jsx
// ✅ CORRECT - Use CSS classes defined in App.css
<div className="autocomplete-container">
<div className="wordle-feedback">
<div className="live-leaderboard">
```

### Key CSS Class Patterns (defined in App.css):
- **Autocomplete:** `autocomplete-container`, `autocomplete-input`, `autocomplete-dropdown`, `autocomplete-item`
- **Feedback Grid:** `wordle-feedback`, `wordle-grid`, `wordle-row`, `wordle-box`, `correct`, `incorrect`
- **Leaderboard:** `live-leaderboard`, `live-entry`, `preview-entry`
- **Modals:** `stats-modal`, `archive-modal`, `leaderboard-modal`
- **Buttons:** `share-btn`, `btn-notify`, `archive-button`

### Before Writing Component JSX:
1. Check `src/App.css` for existing class names
2. Use those classes, don't invent Tailwind-style utilities
3. If new styles needed, ADD them to App.css first

---

## CRITICAL: Testing Before Push

⚠️ **ALWAYS test locally before pushing to main.**

```bash
# 1. Run build to catch errors
npm run build

# 2. Preview the production build
npm run preview

# 3. Test in browser - check:
#    - All components render with correct styling
#    - Autocomplete dropdown appears styled
#    - Feedback boxes have colors
#    - Modals open correctly
```

**If build fails or UI looks unstyled, DO NOT PUSH.**

---

## Deployment

- **Platform:** Vercel
- **GitHub Repo:** https://github.com/ssupppp/bowldem
- **Domain:** bowldem.com
- **Auto-deploy:** Yes - pushes to GitHub trigger Vercel builds
  - `main` branch → Production
  - Feature branches → Preview deployments
- **Build command:** `npm run build`
- **Output directory:** `dist`

### Deploy Process
1. Push changes to GitHub `main` branch
2. Vercel auto-detects and builds
3. Check Vercel dashboard for deployment status
4. Preview URLs are created for feature branches

**Note:** The `.replit` file in the repo is legacy - ignore it. Deployment is on Vercel, NOT Replit.

---

## DEPRECATED - Do Not Use

### Old Branches (on GitHub)
These branches are outdated and should be ignored:
- `feature/role-runs-wickets-matches-feedback` - OLD, superseded
- `claude/update-mvp-todos-mWtrA` - OLD, auto-generated branch

### Old Local Folders
These folders contain outdated versions of the project:
- `C:\Users\Vikas\Documents\Projects\CricGuessV2` - OLD
  - Contains `cricguess-mvp` - older MVP with T20I data
  - Contains `bowldemv2` - older version with Express backend + SQLite (abandoned)

---

## TODO - Current Tasks (March 2026)

### 1. Auth, Permanence & Newsletter (branch: `feature/auth-newsletter`)
**Code written 2026-03-19.** Needs Supabase Dashboard setup + testing before merge.

- [x] Google OAuth + Magic Link auth (useAuth hook, AuthModal, UserAvatar)
- [x] Migration flow (localStorage → Supabase on first login)
- [x] user_profiles table + auth_user_id linking
- [x] Leaderboard auto-includes auth_user_id + email
- [x] Post-game auth prompt (replaces email capture for logged-out users)
- [x] Newsletter edge function (Gemini 2.0 Flash content + Resend)
- [x] Newsletter DB schema (content cache, email_log dedup)
- [ ] **Supabase Dashboard:** Enable Google OAuth provider
- [ ] **Supabase Dashboard:** Configure redirect URLs
- [ ] **Resend:** Set up as custom SMTP + configure `hello@bowldem.com`
- [ ] **Run migrations:** 005 + 006
- [ ] **Deploy edge function:** send-daily-newsletter
- [ ] **Set secrets:** RESEND_API_KEY, GEMINI_API_KEY
- [ ] **pg_cron:** Schedule at 02:30 UTC daily
- [ ] **Test:** Full auth flow (Google + magic link + anonymous preserved)
- [ ] **Test:** Multi-device merge
- [ ] **Test:** Newsletter email delivery + unsubscribe

### 2. ODI Puzzles — Live Testing
- 57 ODI puzzles pushed to main (2026-03-17)
- [ ] Play through ODI puzzles end-to-end on bowldem.com
- [ ] Verify autocomplete, feedback, MOTM, highlights, archive, mobile

### 3. ODI Data Quality (low priority)
- Some player names use Cricsheet abbreviations
- Maxwell 201*, 1999 WC matches not in Cricsheet
- RG Sharma MOTM in 4 puzzles

### Completed
- [x] 1,099 players across 22+ countries
- [x] 117 puzzles (60 T20 WC + 57 ODI) with scheduling
- [x] Puzzle archive (replay past puzzles)
- [x] Leaderboard via Supabase (daily + all-time)
- [x] Team name resolution + Answer reveal flow
- [x] Tutorial overlay + SEO + Confetti
- [x] Match highlights fix (puzzles 6-11)
- [x] Email capture (inline EmailNotifySection)
- [x] Auth + Newsletter code (2026-03-19)

---

## Bugs / Data Fixes

### Puzzle Data Issues (Audited Jan 2025)

**match_highlights.json - Wrong matchContext (6 errors):** ✅ FIXED (Jan 2025)
| Puzzle | Was (WRONG) | Fixed To |
|--------|-------------|----------|
| #6 | "T20 WC 2024 Group Stage" | "T20 WC 2024 Final" |
| #7 | "T20 WC 2024 Final" | "T20 WC 2016" |
| #8 | "T20 WC 2024 Semi-Final" | "T20 WC 2024 Group Stage" |
| #9 | "T20 WC 2024 Super 8s" | "T20 WC 2024 Semi-Final" |
| #10 | "T20 WC 2024" | "T20 WC 2022" |
| #11 | "T20 WC 2021" | "T20 WC 2016 Semi-Final" |

**match_highlights.json - Missing highlights:**
- Puzzles 18-60 have NO highlights (43 missing entries)

**Root Cause:** Puzzles 4-11 were added without `cricinfoUrl` source links. Highlights were written from memory with wrong years/matches.

---

## Data Validation Guidelines

### MANDATORY for All New Puzzle Data

1. **Always include cricinfoUrl** - Every puzzle MUST have an ESPNcricinfo URL as the authoritative source
   ```json
   {
     "id": 99,
     "cricinfoUrl": "https://www.espncricinfo.com/series/...",
     ...
   }
   ```

2. **Cross-verify these fields against cricinfoUrl:**
   - `targetPlayer` - Must match official Man of the Match
   - `venue` - Exact venue name from Cricinfo
   - `team1Score`, `team2Score` - Exact scores
   - `result` - Exact result text
   - `matchContext` (in highlights) - Correct tournament + year + stage

3. **Venue → Tournament Year mapping** (for T20 World Cups):
   | Venues | Tournament |
   |--------|------------|
   | India (Mumbai, Kolkata, Delhi, Bengaluru, Mohali, Nagpur) | 2016 |
   | UAE (Dubai, Sharjah, Abu Dhabi) | 2021 |
   | Australia (Melbourne, Sydney, Adelaide, Brisbane, Perth) | 2022 |
   | West Indies/USA (Barbados, Guyana, St Lucia, Antigua, NY, Florida) | 2024 |
   | Bangladesh (Dhaka, Chittagong) | 2014 |

### Test Cases for Validation

Before committing new puzzle data, verify:

```
□ cricinfoUrl present and accessible
□ targetPlayer matches MOTM on Cricinfo page
□ Venue matches Cricinfo (exact spelling)
□ Scores match Cricinfo (format: "XXX/X (YY.Y overs)")
□ Result matches Cricinfo
□ matchContext year matches venue location (see mapping above)
□ triviaFact is factually accurate
□ All players in playersInMatch actually played (check Cricinfo scorecard)
```

### Data Quality Checklist for Bulk Additions

When adding multiple puzzles:
1. Create a spreadsheet with all fields + cricinfoUrl
2. Verify each row against the Cricinfo link
3. Run venue→year sanity check (Australian venue should NOT say 2024)
4. Spot-check 20% of MOTM awards manually
5. Document any exceptions or edge cases

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
4. Player has **5 guesses** to find the MVP

## Tech Stack
- **Frontend:** React 18 + Vite
- **Styling:** Plain CSS (App.css) - **NO TAILWIND!**
- **Data:** Static JSON files + Supabase (leaderboard)
- **Deployment:** Vercel (auto-deploys from GitHub main branch)
- **Domain:** bowldem.com

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

## Current State (as of March 2026)
- **1,099 players** in database across 22+ countries
- 117 puzzles (60 T20 WC + 57 ODI)
- **5 guesses** per puzzle, 4 feedback params (Played/Team/Role/MOTM)
- Daily puzzle rotation (EPOCH: 2026-01-15) + Supabase schedule override
- Leaderboard (daily + all-time via `player_profiles`)
- Email capture (inline EmailNotifySection in WinStateBanner)
- Auth + Newsletter code on `feature/auth-newsletter` branch (not yet merged)
- Archive mode, stats tracking, share functionality, confetti

## Priority Tasks
1. **Auth + Newsletter** — Supabase dashboard setup, test, merge (`feature/auth-newsletter`)
2. **ODI live testing** — verify 57 ODI puzzles work correctly on bowldem.com
3. **Newsletter content** — write style guide samples for Gemini prompt

### Quick Commands
```bash
# Count by country
cat src/data/all_players.json | grep -o '"country": "[^"]*"' | sort | uniq -c | sort -rn

# Total count
grep -c '"id"' src/data/all_players.json
```
