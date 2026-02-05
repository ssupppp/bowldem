# Email Collection Flow - Redesigned

**Status:** IN PROGRESS
**Last Updated:** 2026-02-05

## Progress Summary

### Completed (Tasks 1-3)
- [x] Task 1: Puzzle scheduling via Supabase (`puzzle_schedule` table)
- [x] Task 2: Permanent leaderboards (`player_profiles` table, triggers, UI)
- [x] Task 3: Email capture component created (needs simplification)

### In Progress (Task 3 Redesign)
- [ ] Remove notification messaging from EmailCapture
- [ ] Implement email-gated answer reveal on loss
- [ ] Update win modal with email prompt
- [ ] Delete NotificationOptIn.jsx
- [ ] Test all flows

---

## Overview

Email collection is tied to **clear value exchange**, not arbitrary timing.

---

## Flow 1: Player WINS (Daily or Archive)

```
Player wins puzzle
       ↓
Success Modal appears
       ↓
"Enter your name to join the leaderboard"
       ↓
[Name input] + [Email input (optional but highlighted)]
       ↓
"Add email to save your stats & appear on all-time leaderboard"
       ↓
[Submit to Leaderboard]
```

**Value proposition**:
- Your name on today's leaderboard
- Email = permanent stats tracking + all-time leaderboard

---

## Flow 2: Player LOSES

```
Player loses (5 guesses used)
       ↓
Game Over Modal appears
       ↓
"Want to see who the MOTM was?"
       ↓
[Email input]
       ↓
"Enter your email to reveal the answer"
       ↓
[Reveal Answer] button
       ↓
Answer is shown + email is captured
```

**Value proposition**:
- See the correct answer (satisfies curiosity)
- Email = future stats tracking

**Alternative for returning players (already have email)**:
- If email already captured → Show answer immediately
- No re-prompting

---

## Implementation Details

### Components Needed

1. **WinModal** (updated)
   - Name entry for leaderboard (required)
   - Email entry (optional but encouraged)
   - Value prop: "Add email to track your stats across devices"

2. **LoseModal** (updated)
   - Email-gated answer reveal
   - If email exists → Show answer immediately
   - If no email → Show email input with "Reveal Answer" button

### State Management

```javascript
// Check if user has provided email
const hasEmail = savedEmail || localStorage.getItem('bowldem_email');

// On win
if (won) {
  showWinModal({
    requireName: true,
    showEmailPrompt: !hasEmail,
    onSubmit: (name, email) => {
      submitToLeaderboard(name, email);
      if (email) saveEmail(email);
    }
  });
}

// On lose
if (lost) {
  if (hasEmail) {
    showLoseModal({ revealAnswer: true });
  } else {
    showLoseModal({
      revealAnswer: false,
      onEmailSubmit: (email) => {
        saveEmail(email);
        revealAnswer();
      }
    });
  }
}
```

### Database Changes

None needed - existing tables support this:
- `leaderboard_entries.email` - already exists
- `player_profiles` - already exists
- `contact_subscriptions` - can remove/ignore (no notifications)

### What to Remove

1. **NotificationOptIn.jsx** - DELETE (no notifications)
2. **EmailCapture.jsx** - SIMPLIFY (remove notification messaging)
3. All references to:
   - "daily reminders"
   - "notifications"
   - "WhatsApp"
   - `subscribeForNotifications()`
   - `contact_subscriptions` table usage

### Copy Changes

**Win Modal:**
- OLD: "Never miss a puzzle! Get notified..."
- NEW: "Join the leaderboard! Add email to track your stats."

**Lose Modal:**
- NEW: "Want to know who the MOTM was? Enter your email to reveal."

---

## User Journeys

### Journey 1: New player, wins first game
1. Plays puzzle, wins
2. Sees success modal with name entry
3. Enters name, optionally adds email
4. Appears on leaderboard
5. Next game: if no email, sees prompt again

### Journey 2: New player, loses first game
1. Plays puzzle, loses
2. Sees "Who was the MOTM?" prompt
3. Enters email to reveal answer
4. Sees answer, email captured
5. Next game win: name pre-filled if from same device

### Journey 3: Returning player (has email)
1. Plays puzzle, wins or loses
2. Win → Submit to leaderboard (name only, email auto-linked)
3. Lose → Answer revealed immediately (no gate)

### Journey 4: Archive mode
1. Player completes archive puzzle
2. Same flows as daily (win/lose)
3. Email captured if not already

---

## Files to Modify

1. `src/App.jsx` - Update win/lose modal logic
2. `src/components/StatsModal.jsx` or new `ResultModal.jsx` - Win/lose UI
3. `src/components/community/EmailCapture.jsx` - Simplify, remove notification text
4. `src/lib/supabase.js` - Remove `subscribeForNotifications` usage
5. `src/hooks/useLeaderboard.js` - Ensure email linking works

## Files to Delete

1. `src/components/community/NotificationOptIn.jsx` - No longer needed

---

## Testing Checklist

- [ ] Win daily puzzle → Name/email prompt appears
- [ ] Win without email → Can still submit to leaderboard
- [ ] Win with email → Stats tracked in player_profiles
- [ ] Lose daily puzzle (no email) → Email gate for answer reveal
- [ ] Lose daily puzzle (has email) → Answer shown immediately
- [ ] Win archive puzzle → Same flow as daily
- [ ] Lose archive puzzle → Same flow as daily
- [ ] Email persists across sessions (localStorage + Supabase)
