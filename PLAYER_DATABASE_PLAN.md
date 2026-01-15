# Player Database Expansion Plan

## Goal
Build a comprehensive cricket player database for autocomplete functionality. Target: **2000+ players** for excellent autocomplete coverage.

## Current Status
- **569 players** (as of Jan 2025)
- 17 countries represented
- Major gaps: Afghanistan, Canada, UAE, Uganda, PNG

---

## Phase 1: T20 World Cup Nations - Current Squads (Priority: HIGH)

### 1.1 Missing Nations (CRITICAL)
| Nation | Target | Status |
|--------|--------|--------|
| Afghanistan | 25 | NOT STARTED |
| Canada | 20 | NOT STARTED |
| UAE | 18 | NOT STARTED |
| Uganda | 18 | NOT STARTED |
| Papua New Guinea | 18 | NOT STARTED |

### 1.2 Associate Nations - Expand Squads
| Nation | Current | Target | Need |
|--------|---------|--------|------|
| Netherlands | 18 | 30 | +12 |
| Scotland | 13 | 25 | +12 |
| Namibia | 15 | 25 | +10 |
| Oman | 11 | 22 | +11 |
| Nepal | 11 | 22 | +11 |
| USA | 13 | 25 | +12 |
| Ireland | 18 | 30 | +12 |

### 1.3 Full Members - Fill Gaps
| Nation | Current | Target | Need |
|--------|---------|--------|------|
| New Zealand | 31 | 50 | +19 |
| Zimbabwe | 27 | 40 | +13 |
| Sri Lanka | 43 | 55 | +12 |
| Australia | 45 | 60 | +15 |
| England | 47 | 60 | +13 |
| South Africa | 49 | 60 | +11 |
| Bangladesh | 48 | 55 | +7 |
| Pakistan | 53 | 65 | +12 |
| West Indies | 56 | 65 | +9 |
| India | 71 | 85 | +14 |

**Phase 1 Total: ~300 players to add**

---

## Phase 2: IPL & Domestic T20 Leagues (Priority: MEDIUM)

### 2.1 IPL Players (non-international)
- Uncapped Indian players who played IPL
- Target: 50-80 players

### 2.2 Other T20 Leagues
- Big Bash (Australia) - 20 players
- PSL (Pakistan) - 15 players
- CPL (Caribbean) - 15 players
- SA20 (South Africa) - 15 players
- The Hundred (England) - 15 players

**Phase 2 Total: ~150 players to add**

---

## Phase 3: Retired Legends & Historical Players (Priority: MEDIUM)

### 3.1 By Era
- 2010s stars (already partially done)
- 2000s stars
- 1990s legends
- 1980s legends (limited - for iconic names)

### 3.2 By Country (Target per country)
- India: 30 retired
- Australia: 25 retired
- England: 20 retired
- Pakistan: 20 retired
- West Indies: 20 retired
- South Africa: 15 retired
- Sri Lanka: 15 retired
- New Zealand: 12 retired
- Others: 5 each

**Phase 3 Total: ~200 players to add**

---

## Phase 4: Test/ODI Specialists (Priority: LOW)

Players primarily known for longer formats:
- Test specialists (Pujara types)
- ODI-era players not in T20s
- Target: 100 players

---

## Data Sources

### Primary Sources
1. **ESPNcricinfo** - Most reliable for player data
   - T20I squad pages: `espncricinfo.com/team/[country]/squad`
   - Player profiles for role verification

2. **ICC Website** - Official T20 World Cup squads
   - `icc-cricket.com/tournaments/t20worldcup`

3. **Wikipedia** - Quick reference for squad lists
   - `[Country] cricket team` pages

### Data Format
```json
{
  "id": "PLAYERNAME",           // UPPERCASE, no spaces
  "fullName": "Player Name",    // Proper case, full name
  "country": "Country Name",    // Full country name
  "role": "Batsman|Bowler|All-rounder|Wicketkeeper"
}
```

### ID Generation Rules
- Remove spaces, special characters
- UPPERCASE only
- Examples:
  - "Virat Kohli" → "VIRATKOHLI" or "VKOHLI"
  - "Mohammad Rizwan" → "MOHAMMADRIZWAN"
  - "Jos Buttler" → "JOSBUTTLER" or "JCBUTTLER"

---

## Progress Tracking

### Checklist - Phase 1.1 (Missing Nations)
- [ ] Afghanistan (25 players)
  - [ ] Current T20I squad (15)
  - [ ] Recent squad members (10)
- [ ] Canada (20 players)
- [ ] UAE (18 players)
- [ ] Uganda (18 players)
- [ ] Papua New Guinea (18 players)

### Checklist - Phase 1.2 (Associates)
- [ ] Netherlands (+12)
- [ ] Scotland (+12)
- [ ] Namibia (+10)
- [ ] Oman (+11)
- [ ] Nepal (+11)
- [ ] USA (+12)
- [ ] Ireland (+12)

### Checklist - Phase 1.3 (Full Members)
- [ ] New Zealand (+19)
- [ ] Zimbabwe (+13)
- [ ] Sri Lanka (+12)
- [ ] Australia (+15)
- [ ] England (+13)
- [ ] South Africa (+11)
- [ ] Bangladesh (+7)
- [ ] Pakistan (+12)
- [ ] West Indies (+9)
- [ ] India (+14)

---

## Quick Commands

### Count players by country
```bash
cat src/data/all_players.json | grep -o '"country": "[^"]*"' | sort | uniq -c | sort -rn
```

### Count total players
```bash
grep -c '"id"' src/data/all_players.json
```

### Validate JSON
```bash
cat src/data/all_players.json | python -m json.tool > /dev/null && echo "Valid JSON"
```

---

## Notes
- Always verify player roles from official sources
- Maintain consistent naming (use full names when possible)
- Check for duplicates before adding (same player, different ID formats)
- Commit after each batch of ~50 players added
