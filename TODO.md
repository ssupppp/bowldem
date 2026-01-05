# Bowldem MVP TODO

## MVP Requirements

### 1. One Puzzle Daily Flow with Archive
- [ ] Implement daily puzzle system (one puzzle per day based on date)
- [ ] Add puzzle scheduling/rotation logic
- [ ] Create "Yesterday's Puzzle" archive link
- [ ] Store user's completed puzzles in localStorage
- [ ] Show archive section with previous day's puzzle accessible
- [ ] Prevent replay of today's puzzle once completed

### 2. Final Feedback System
- [ ] Review and finalize feedback grid display
- [ ] Ensure format-specific stats (IPL vs ODI) work correctly
- [ ] Verify emoji indicators (✅, 🔼, 🔽) display properly
- [ ] Test feedback for all guess scenarios
- [ ] Finalize share text format for social sharing
- [ ] Remove debug panel for production (`showDebugInfo: false`)

### 3. Correct Match Details
- [ ] Verify squad data accuracy for all 24 puzzles
- [ ] Confirm player roles (Batsman/Bowler/All-rounder/Wicketkeeper) are correct
- [ ] Validate match scores (runs/wickets) for both teams
- [ ] Fix any player key mapping issues
- [ ] Ensure Man of the Match is correctly identified in each puzzle
- [ ] Cross-check venue and date information

---

## Current State
- 24 puzzles available (mix of IPL and ODI)
- Feedback system implemented with format-specific logic
- TV broadcast-style scorecard UI complete
- Debug mode currently enabled

## Notes
- Player database: 130 core players in `updatedplayers.json`
- Manual player key mappings exist for edge cases (e.g., BBMCCULLUM → MCCULLUM)
- Format detection (IPL vs ODI) based on team names
