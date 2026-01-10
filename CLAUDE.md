# Bowldem - Cricket Daily Puzzle Game

## Project Path
`C:\Users\Vikas\Documents\Projects\CricGuessV2\cricguess-mvp\cricguess-mvp`

## Overview
Wordle-style daily cricket puzzle game where players guess the Man of the Match (MOTM) from a cricket match. One puzzle per day with midnight UTC reset.

## Tech Stack
- **Frontend**: React + Vite
- **Styling**: CSS (App.css)
- **Data**: Static JSON files in `src/data/`
- **Deployment**: GitHub Pages

## Key Files
- `src/App.jsx` - Main game component (39KB)
- `src/App.css` - All styling
- `src/components/` - CountdownTimer, DebugPanel, StatsModal
- `src/data/` - Puzzle and player data
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions

## Game Mechanics
- 3 attempts to guess the MOTM
- Feedback shows stat comparisons (higher/lower/exact)
- Stats tracking: games played, win%, streaks, guess distribution
- Share format: "Bowldem #42 2/3"

## Development
```bash
npm install
npm run dev     # Start dev server
npm run build   # Build for production
```

## Debug Mode
Add `?debug=true` to URL for time travel testing (change puzzle dates)

## Current Content
- 5 T20 World Cup puzzles
