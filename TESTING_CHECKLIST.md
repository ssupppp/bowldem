# Bowldem Manual Testing Checklist

Use this checklist to manually verify all features work correctly before releases.

---

## First Visit Flow

- [ ] Game loads without errors
- [ ] Venue hint is displayed correctly
- [ ] Match scores show "Team 1" and "Team 2" (not actual names)
- [ ] Input field is enabled and responsive
- [ ] "Who's the Man of the Match?" prompt is visible
- [ ] P/T/R/M legend is visible and clear

### Tutorial (When Implemented)
- [ ] Tutorial video plays on first visit
- [ ] Skip button works
- [ ] Tutorial marked as seen (doesn't replay on refresh)

---

## Game Play Flow

### Autocomplete
- [ ] Autocomplete activates after 3 characters typed
- [ ] Player suggestions appear in dropdown
- [ ] Player country and role shown in suggestions
- [ ] Clicking a suggestion makes a guess
- [ ] Keyboard navigation works (arrow keys + Enter)

### Feedback System
- [ ] Feedback row appears after guess with animation
- [ ] P/T/R/M boxes reveal sequentially
- [ ] Correct colors show:
  - Green for correct (P/T/R match)
  - Red for incorrect
  - Trophy emoji for MVP
- [ ] Guesses remaining updates correctly
- [ ] Previously guessed players are marked/disabled

### Win Condition
- [ ] Win triggers after guessing correct MVP
- [ ] Success modal appears after ~850ms delay
- [ ] Modal shows:
  - Trophy emoji
  - Puzzle number
  - Guess count (e.g., "2/4")
  - Game radar (emoji grid)
  - Copy Result button
  - View Leaderboard link

### Loss Condition
- [ ] Game over triggers after 4 wrong guesses
- [ ] Game over modal appears
- [ ] Modal does NOT reveal the answer (daily mode)
- [ ] Copy Result button works

---

## Completed State (Return Visit)

- [ ] **BUG FIX**: Return visit shows banner, NOT modal
- [ ] Completed state banner displays:
  - Result (won/lost)
  - Guess count
  - Streak (if > 1)
- [ ] Countdown timer shows time until next puzzle
- [ ] Leaderboard preview visible (if won)
- [ ] Share buttons work:
  - [ ] X (Twitter) - opens share dialog
  - [ ] WhatsApp - opens share dialog
  - [ ] Copy - copies to clipboard
- [ ] Archive button accessible
- [ ] "Play More" or archive CTA visible

### Nostalgia Card (When Implemented)
- [ ] Match context displayed (e.g., "T20 World Cup 2016 Final")
- [ ] Trivia fact shown
- [ ] Player highlight shown

---

## Leaderboard

### During Game
- [ ] LiveLeaderboard visible below feedback area
- [ ] Shows top entries with names and scores

### After Win
- [ ] Can submit name (2-20 characters)
- [ ] Name validation works
- [ ] Submission creates entry on leaderboard
- [ ] User's rank displays correctly

### Leaderboard Modal
- [ ] Opens from header icon
- [ ] Shows full leaderboard with rankings
- [ ] Percentile displayed if available
- [ ] Close button works

---

## Archive Mode

### Archive Modal
- [ ] Opens from header icon
- [ ] Shows calendar/list of past puzzles
- [ ] Completed puzzles marked (won/lost indicator)
- [ ] Can select any available puzzle

### Archive Gameplay
- [ ] Selected puzzle loads correctly
- [ ] Header shows "Archive" badge
- [ ] Puzzle number shows "Archive #X"
- [ ] Game plays normally
- [ ] Win/loss tracked for archive (separate from daily)
- [ ] Success modal offers "More Archives" and "Back to Today"

### Exit Archive
- [ ] "Back to Today" button works
- [ ] Returns to daily puzzle correctly
- [ ] Daily state preserved

---

## Stats Modal

- [ ] Opens from header icon (chart icon)
- [ ] Shows:
  - Games played
  - Win percentage
  - Current streak
  - Max streak
  - Guess distribution chart
- [ ] Close button works

---

## How to Play Modal

- [ ] Opens from header icon (?)
- [ ] Explains game rules clearly
- [ ] P/T/R/M feedback explained
- [ ] Tips section visible
- [ ] "Start Playing" closes modal

### Watch Tutorial (When Implemented)
- [ ] "Watch Tutorial" button replays video
- [ ] Video plays correctly

---

## Edge Cases

### Duplicate Prevention
- [ ] Can't guess same player twice
- [ ] Used players marked in autocomplete

### Network Errors
- [ ] Toast notification on network failure (when implemented)
- [ ] Fallback to client-side validation works

### State Persistence
- [ ] Refresh mid-game preserves state
- [ ] Guesses remain after refresh
- [ ] Feedback history preserved

### Midnight Rollover
- [ ] New puzzle available after midnight UTC
- [ ] Previous day's completion doesn't affect new puzzle
- [ ] Streak updates correctly across days

---

## Mobile Responsiveness

### Small Screens (< 640px)
- [ ] All content visible without horizontal scroll
- [ ] Touch targets large enough (48px+ recommended)
- [ ] Autocomplete dropdown usable
- [ ] Modals fit screen

### Medium Screens (640px - 1024px)
- [ ] Layout adjusts gracefully
- [ ] No awkward spacing

### Large Screens (> 1024px)
- [ ] Content centered
- [ ] Max-width respected
- [ ] No stretched elements

---

## Accessibility

- [ ] Keyboard navigation works throughout
- [ ] Focus states visible
- [ ] Screen reader friendly (when tested)
- [ ] Color contrast sufficient
- [ ] Touch targets adequate size

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance

- [ ] Initial load < 3 seconds
- [ ] No visible jank during animations
- [ ] Autocomplete responsive (< 100ms)
- [ ] Modals open smoothly

---

## Sign-off

| Tester | Date | Version | Pass/Fail | Notes |
|--------|------|---------|-----------|-------|
|        |      |         |           |       |

---

*Last updated: January 2026*
