# Plan: ODI Puzzles + Personalized Email System

**Created:** 2026-03-09
**Status:** Not started

---

## Part 1: ODI Match Puzzle Additions

### Source
Same as T20 WC — **Cricsheet JSON files** (ball-by-ball data with `player_of_match` field).
- 7 raw ODI files already exist in `/odi/` directory (Cricsheet format, confirmed)
- Existing `scripts/process_cricsheet.js` can process this format — needs adaptation for ODI (currently hardcoded to T20 WC files)

### Steps

1. **Pick iconic ODI matches** — Target: 30 puzzles
   - World Cup finals & semis (1983, 1992, 1996, 1999, 2003, 2007, 2011, 2015, 2019, 2023)
   - Classic rivalries (Ind/Pak, Aus/Eng, etc.)
   - Famous individual performances (Sachin 200*, Herschelle Gibbs 6 sixes, etc.)

2. **Download Cricsheet data** — Get match JSON files from cricsheet.org for selected matches

3. **Verify MOTM on Cricinfo** — Cross-check every `player_of_match` against ESPNcricinfo scorecard (mandatory per CLAUDE.md data validation rules)

4. **Adapt `process_cricsheet.js`** — Fork into `process_odi.js`:
   - Change `RAW_DATA_DIR` to `/odi/`
   - Output to `src/data/match_puzzles_odi.json`
   - Same puzzle format: `{ id, targetPlayer, cricinfoUrl, matchData: { scorecard, playersInMatch, targetPlayerTeam, targetPlayerRole } }`
   - Add `cricinfoUrl` for each match

5. **Add ODI players to `all_players.json`** — Any ODI-era players not already in the 898 (retired legends like Sachin, Ponting, Jayasuriya, etc.)

6. **Merge into puzzle rotation** — Update `App.jsx` / `useDailyPuzzle.js` to include ODI puzzles in the pool (or keep as separate mode)

7. **Add match highlights** — `matchContext` and `triviaFact` for each ODI puzzle

### Open question
- Separate "ODI mode" vs. mixed into daily rotation? (Decide before implementation)

---

## Part 2: Personalized Email System

### 3 Email Types

#### Email 1: Welcome (immediately on registration)
**Trigger:** User submits email (win modal, lose modal, or notify form)
**Content:**
- Welcome to Bowldem
- Brief how-to-play reminder
- Their result from today's puzzle (if just played)
- CTA: "Come back tomorrow for a new puzzle"

#### Email 2: Daily Puzzle Reminder (next day when new puzzle drops)
**Trigger:** New puzzle day starts (daily, ~midnight UTC or configured time)
**Send to:** All registered emails
**Content — personalized based on previous day:**
- "Yesterday's puzzle was [Match X] — the MOTM was [Player]"
- If they played yesterday:
  - "You got it in [N] guesses!" or "Tough one — you used all 5"
  - "You were faster than X% of players" (percentile from leaderboard)
  - Current streak info
- If they didn't play yesterday:
  - "You missed yesterday's puzzle! Don't break your streak"
- CTA: "Today's puzzle is live — play now"

#### Email 3: Weekly Recap (once per week)
**Trigger:** Weekly (e.g., Sunday morning)
**Send to:** All registered emails
**Content — personalized weekly stats:**
- Puzzles played this week (X/7)
- Win rate this week vs. overall
- Best guess (fewest attempts)
- "You beat X% of players this week" (weekly percentile)
- Streak status
- Fun fact or trivia from the week's puzzles
- CTA: "Keep the streak alive"

### Infrastructure

**Option A: Supabase Edge Functions + Cron**
- Edge Function for each email type
- `pg_cron` or Supabase scheduled functions for daily/weekly triggers
- Supabase `email_subscriptions` table already exists
- Need: email sending service (Resend, SendGrid, or Postmark)

**Option B: External email service with API**
- Use Resend/SendGrid directly
- Webhook or cron job triggers from Vercel/external

### Data needed for personalization
- `leaderboard_entries` — daily results (guesses, score, puzzle_id)
- `player_profiles` — aggregate stats (total games, wins, streaks)
- Puzzle data — match details for "yesterday's answer" content

### Database additions
- `email_subscriptions` — add `last_email_sent_at`, `email_frequency_pref`, `unsubscribed_at`
- `email_log` table — track sent emails (email, type, sent_at, puzzle_id) for deduplication

### Unsubscribe
- One-click unsubscribe link in every email (required by law)
- Unsubscribe updates `email_subscriptions.unsubscribed_at`

---

## Implementation Order

1. **ODI puzzles** — independent, can start immediately
2. **Welcome email** — depends on email service setup (Resend/SendGrid)
3. **Daily reminder** — depends on welcome email infra + cron setup
4. **Weekly recap** — last, needs a week of data to be meaningful

---

## Files to create/modify

### ODI Puzzles
- `scripts/process_odi.js` — new script (fork of process_cricsheet.js)
- `src/data/match_puzzles_odi.json` — new puzzle data
- `src/data/all_players.json` — add missing ODI-era players
- `src/data/match_highlights.json` — add ODI highlights
- `src/App.jsx` or `src/hooks/useDailyPuzzle.js` — load ODI puzzles

### Email System
- `supabase/functions/send-welcome-email/` — Edge Function
- `supabase/functions/send-daily-reminder/` — Edge Function
- `supabase/functions/send-weekly-recap/` — Edge Function
- `supabase/migrations/005_email_system.sql` — email_log table, subscription updates
- `src/lib/supabase.js` — unsubscribe endpoint
