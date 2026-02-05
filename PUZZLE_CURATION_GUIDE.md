# Puzzle Curation Guide

This guide helps you schedule puzzles based on upcoming matches, venues, and nostalgia links.

## How Puzzle Scheduling Works

1. **Default behavior**: Puzzles rotate daily using modulo (day % 60)
2. **Override**: Add an entry to `puzzle_schedule` table in Supabase to show a specific puzzle on a specific date
3. **Fallback**: If no schedule entry exists, the default rotation is used

## Supabase Table: `puzzle_schedule`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated |
| `schedule_date` | DATE | The date to show this puzzle (YYYY-MM-DD) |
| `puzzle_id` | INT | The puzzle ID from the list below |
| `team1` | TEXT | Optional: First team (for reference) |
| `team2` | TEXT | Optional: Second team (for reference) |
| `motm_player` | TEXT | Optional: MOTM player name |
| `venue_tag` | TEXT | Optional: Venue identifier |
| `curation_reason` | TEXT | Why scheduled: `team_playing`, `venue_match`, `player_birthday`, `tournament_anniversary` |
| `notes` | TEXT | Optional admin notes |

### Example: Schedule Ind vs Pak puzzle for Feb 23, 2026

```sql
INSERT INTO puzzle_schedule (schedule_date, puzzle_id, team1, team2, motm_player, curation_reason, notes)
VALUES ('2026-02-23', 8, 'India', 'Pakistan', 'Jasprit Bumrah', 'team_playing', 'Asia Cup Ind vs Pak match');
```

---

## Puzzle Reference (by Team)

### India Puzzles
| ID | Venue | MOTM Player | vs Team |
|----|-------|-------------|---------|
| 3 | Melbourne Cricket Ground | Virat Kohli | Pakistan |
| 6 | Kensington Oval, Barbados | Virat Kohli | South Africa |
| 8 | Nassau County, New York | Jasprit Bumrah | Pakistan |
| 9 | Providence Stadium, Guyana | Axar Patel | England |
| 21 | Adelaide Oval | Virat Kohli | Bangladesh |
| 24 | Sir Vivian Richards, Antigua | Hardik Pandya | Bangladesh |
| 25 | Daren Sammy Stadium, St Lucia | Rohit Sharma | Australia |
| 33 | Eden Gardens, Kolkata | Virat Kohli | Pakistan |
| 39 | Shere Bangla, Dhaka | Virat Kohli | South Africa |
| 40 | Shere Bangla, Dhaka | R Ashwin | Bangladesh |
| 41 | M Chinnaswamy, Bengaluru | R Ashwin | Bangladesh |
| 42 | PCA Stadium, Mohali | Virat Kohli | Australia |
| 44 | Shere Bangla, Dhaka | R Ashwin | Australia |
| 46 | Dubai International | Ravindra Jadeja | Scotland |
| 48 | Sydney Cricket Ground | Suryakumar Yadav | Netherlands |
| 49 | Melbourne Cricket Ground | Suryakumar Yadav | Zimbabwe |
| 52 | Dubai International | Ravindra Jadeja | Namibia |
| 53 | Nassau County, New York | Jasprit Bumrah | Ireland |
| 55 | Nassau County, New York | Arshdeep Singh | USA |

### Pakistan Puzzles
| ID | Venue | MOTM Player | vs Team |
|----|-------|-------------|---------|
| 2 | Dubai International | Shaheen Shah Afridi | India |
| 10 | Sydney Cricket Ground | Shadab Khan | South Africa |
| 20 | Sharjah Cricket Stadium | Haris Rauf | New Zealand |
| 22 | Adelaide Oval | Shaheen Shah Afridi | Bangladesh |
| 23 | Sydney Cricket Ground | Mohammad Rizwan | New Zealand |
| 45 | Zayed Cricket Stadium, Abu Dhabi | Mohammad Rizwan | Namibia |
| 47 | Sharjah Cricket Stadium | Shoaib Malik | Scotland |
| 51 | Perth Stadium | Shadab Khan | Netherlands |
| 59 | Central Broward, Florida | Shaheen Shah Afridi | Ireland |

### England Puzzles
| ID | Venue | MOTM Player | vs Team |
|----|-------|-------------|---------|
| 4 | Adelaide Oval | Alex Hales | India |
| 5 | Melbourne Cricket Ground | Sam Curran | Pakistan |
| 13 | Wankhede Stadium, Mumbai | Joe Root | South Africa |
| 15 | Dubai International | Moeen Ali | West Indies |
| 18 | Feroz Shah Kotla, Delhi | Jos Buttler | Sri Lanka |
| 19 | Feroz Shah Kotla, Delhi | Jason Roy | New Zealand |
| 29 | Brisbane Cricket Ground | Jos Buttler | New Zealand |
| 30 | Sydney Cricket Ground | Adil Rashid | Sri Lanka |
| 31 | Daren Sammy Stadium, St Lucia | Phil Salt | West Indies |
| 34 | Zayed Cricket Stadium, Abu Dhabi | Jason Roy | Bangladesh |
| 36 | Dubai International | Chris Jordan | Australia |
| 37 | Sharjah Cricket Stadium | Jos Buttler | Sri Lanka |
| 43 | Zahur Ahmed Chowdhury, Chittagong | Alex Hales | Sri Lanka |
| 57 | Sir Vivian Richards, Antigua | Harry Brook | Namibia |
| 58 | Kensington Oval, Barbados | Adil Rashid | USA |
| 60 | Sir Vivian Richards, Antigua | Adil Rashid | Oman |

### South Africa Puzzles
| ID | Venue | MOTM Player | vs Team |
|----|-------|-------------|---------|
| 12 | Daren Sammy Stadium, St Lucia | Quinton de Kock | England |
| 16 | Dubai International | Anrich Nortje | West Indies |
| 17 | Sir Vivian Richards, Antigua | Tabraiz Shamsi | West Indies |
| 27 | Nassau County, New York | Anrich Nortje | Sri Lanka |
| 28 | Nassau County, New York | Heinrich Klaasen | Bangladesh |
| 35 | Sharjah Cricket Stadium | Tabraiz Shamsi | Sri Lanka |
| 38 | Zayed Cricket Stadium, Abu Dhabi | Kagiso Rabada | Bangladesh |
| 50 | Sir Vivian Richards, Antigua | Quinton de Kock | USA |
| 54 | Nassau County, New York | David Miller | Netherlands |
| 56 | Arnos Vale Ground, St Vincent | Tabraiz Shamsi | Nepal |

### West Indies Puzzles
| ID | Venue | MOTM Player | vs Team |
|----|-------|-------------|---------|
| 1 | Eden Gardens, Kolkata | Marlon Samuels | England (Final) |
| 7 | Wankhede Stadium, Mumbai | Chris Gayle | England |
| 11 | Wankhede Stadium, Mumbai | Lendl Simmons | India |
| 14 | VCA Stadium, Nagpur | Marlon Samuels | South Africa |
| 26 | Shere Bangla, Dhaka | Dwayne Bravo | Pakistan |
| 32 | Shere Bangla, Dhaka | Darren Sammy | Australia |

---

## Puzzle Reference (by Venue)

### Australia Venues
| Puzzle ID | Venue | MOTM | Team |
|-----------|-------|------|------|
| 3, 49 | Melbourne Cricket Ground | Kohli, SKY | India |
| 5 | Melbourne Cricket Ground | Sam Curran | England |
| 4, 21 | Adelaide Oval | Hales, Kohli | England, India |
| 22 | Adelaide Oval | Shaheen | Pakistan |
| 10, 23, 48 | Sydney Cricket Ground | Shadab, Rizwan, SKY | Pakistan, India |
| 30 | Sydney Cricket Ground | Adil Rashid | England |
| 29 | Brisbane Cricket Ground | Jos Buttler | England |
| 51 | Perth Stadium | Shadab Khan | Pakistan |

### India Venues
| Puzzle ID | Venue | MOTM | Team |
|-----------|-------|------|------|
| 1, 33 | Eden Gardens, Kolkata | Samuels, Kohli | WI, India |
| 7, 11, 13 | Wankhede Stadium, Mumbai | Gayle, Simmons, Root | WI, WI, England |
| 18, 19 | Feroz Shah Kotla, Delhi | Buttler, Roy | England |
| 41 | M Chinnaswamy, Bengaluru | R Ashwin | India |
| 42 | PCA Stadium, Mohali | Virat Kohli | India |
| 14 | VCA Stadium, Nagpur | Marlon Samuels | WI |

### UAE Venues
| Puzzle ID | Venue | MOTM | Team |
|-----------|-------|------|------|
| 2, 15, 16, 36, 46, 52 | Dubai International | Shaheen, Moeen, Nortje, Jordan, Jadeja | Various |
| 20, 35, 37, 47 | Sharjah Cricket Stadium | Rauf, Shamsi, Buttler, Malik | Various |
| 34, 38, 45 | Zayed Cricket Stadium, Abu Dhabi | Roy, Rabada, Rizwan | Various |

### West Indies Venues
| Puzzle ID | Venue | MOTM | Team |
|-----------|-------|------|------|
| 6, 58 | Kensington Oval, Barbados | Kohli, Rashid | India, England |
| 9 | Providence Stadium, Guyana | Axar Patel | India |
| 12, 25, 31 | Daren Sammy Stadium, St Lucia | de Kock, Rohit, Salt | SA, India, England |
| 17, 24, 50, 57, 60 | Sir Vivian Richards, Antigua | Shamsi, Pandya, de Kock, Brook, Rashid | Various |

### USA Venues
| Puzzle ID | Venue | MOTM | Team |
|-----------|-------|------|------|
| 8, 27, 28, 53, 54, 55 | Nassau County, New York | Bumrah, Nortje, Klaasen, Bumrah, Miller, Arshdeep | Various |
| 59 | Central Broward, Florida | Shaheen | Pakistan |

---

## Curation Strategies

### 1. Team Playing Tomorrow
If India vs Pakistan is playing tomorrow:
- Schedule puzzle 8 (Ind vs Pak, NY, Bumrah MOTM)
- Or puzzle 33 (Ind vs Pak, Kolkata, Kohli MOTM)
- Or puzzle 3 (Ind vs Pak, MCG, Kohli MOTM)

### 2. Venue Match
If a match is at Melbourne Cricket Ground:
- Schedule puzzle 3 (Kohli vs Pak)
- Or puzzle 5 (Sam Curran vs Pak)
- Or puzzle 49 (SKY vs Zimbabwe)

### 3. Player Milestone/Birthday
If it's Virat Kohli's birthday:
- Puzzles 3, 6, 21, 33, 39, 42 all feature Kohli as MOTM

### 4. Tournament Anniversary
If it's the anniversary of 2016 T20 World Cup Final:
- Schedule puzzle 1 (Marlon Samuels, Eden Gardens)

---

## Quick SQL Queries for Curation

### Find puzzles by team
```sql
SELECT * FROM puzzle_schedule WHERE team1 = 'India' OR team2 = 'India';
```

### Find puzzles by venue
```sql
SELECT id, venue, target_player_team FROM puzzles WHERE venue LIKE '%Melbourne%';
```

### Check current schedule
```sql
SELECT * FROM puzzle_schedule WHERE schedule_date >= CURRENT_DATE ORDER BY schedule_date;
```

### Clear old schedules
```sql
DELETE FROM puzzle_schedule WHERE schedule_date < CURRENT_DATE;
```
