# Bowldem - Project Workstreams

**Created**: 2026-01-16
**Status**: Active Development
**Repository**: https://github.com/ssupppp/bowldem
**Branch**: `feature/feedback-system-update`

---

## Overview

Three parallel workstreams to take Bowldem from MVP to production-ready:

| Workstream | Focus | Priority |
|------------|-------|----------|
| 1. Data Gathering | Players & Puzzles | Ongoing |
| 2. UI/UX Improvements | World-class frontend | High |
| 3. Backend System | Daily puzzles, archive, features | Medium |

---

## Workstream 1: Data Gathering (Continuous)

### Current Status
- **665 players** across 22 countries
- **60 puzzles** (T20 World Cup matches only)

### Phase 1.1: Missing Nations - COMPLETE
- [x] Afghanistan (26 players)
- [x] Canada (20 players)
- [x] UAE (18 players)
- [x] Uganda (17 players)
- [x] Papua New Guinea (15 players)

### Phase 1.2: Expand Associate Nations (Next)
| Nation | Current | Target | Need |
|--------|---------|--------|------|
| Netherlands | 18 | 30 | +12 |
| Scotland | 13 | 25 | +12 |
| Namibia | 15 | 25 | +10 |
| Oman | 11 | 22 | +11 |
| Nepal | 11 | 22 | +11 |
| USA | 13 | 25 | +12 |
| Ireland | 18 | 30 | +12 |

### Phase 1.3: Fill Full Member Gaps
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

### Phase 2: Puzzle Content Expansion
- [ ] IPL matches (2008-2024) - Target: 50 puzzles
- [ ] ODI World Cup matches - Target: 30 puzzles
- [ ] Test match classics - Target: 20 puzzles
- [ ] Historic moments (WC finals, etc.) - Target: 20 puzzles

**Total Target: 2000+ players, 180+ puzzles**

---

## Workstream 2: UI/UX Improvements

### Current Architecture
```
src/
├── App.jsx              # Main game (517 lines)
├── App.css              # All styles (42KB)
├── components/
│   ├── CountdownTimer.jsx
│   ├── DebugPanel.jsx
│   ├── FeedbackDisplay.jsx    # Y/N feedback grid
│   ├── PlayerAutocomplete.jsx # Search input
│   └── StatsModal.jsx
├── hooks/
│   └── useDailyPuzzle.js      # Game state management
└── utils/
    └── dailyPuzzle.js         # Date/puzzle utilities
```

### Current UI Features
- Wordle-style Y/N feedback grid (4 attributes: Played, Team, Role, MVP)
- Player autocomplete (triggers after 3 chars)
- Daily puzzle countdown timer
- Win/Lose modals with share functionality
- Stats tracking (localStorage)
- Debug panel for testing

### UI/UX Improvement Areas

#### A. Feedback System Redesign (Critical)
**Problem**: Current Y/N grid is functional but not engaging
**Goal**: Cricket-themed, visually rich feedback

**Ideas**:
1. **Cricket Scorecard Style**
   - Show feedback like a match scorecard
   - Player photo placeholder
   - Animated reveals (like IPL graphics)

2. **Progressive Hints**
   - After each guess, reveal more context
   - "Getting warmer" indicators
   - Role-specific hints (spinner? pacer? opener?)

3. **Visual Comparisons**
   - Side-by-side guess vs target (hidden until reveal)
   - Bar charts for stats comparison
   - Country flag indicators

#### B. Mobile Experience (High Priority)
**Current Issues**:
- Touch targets may be small
- Autocomplete might be awkward on mobile
- Modal sizing needs work

**Improvements**:
- 48px+ touch targets
- Sticky feedback panel
- Bottom sheet for autocomplete
- Haptic feedback on guess
- Swipe gestures for navigation

#### C. Visual Design (Medium Priority)
**Current**: Clean but basic
**Goal**: World-class, cricket-branded

**Ideas**:
1. **Theme Options**
   - Day/Night mode
   - Team-themed backgrounds
   - Tournament themes (WC, IPL, Ashes)

2. **Animations**
   - Celebration effects on win (confetti, fireworks)
   - Card flip for reveal
   - Smooth transitions between states

3. **Typography & Color**
   - Cricket-inspired color palette
   - Bold, sports-style typography
   - Gradient accents

#### D. Gamification (Future)
- Streaks visualization
- Achievement badges
- Daily/Weekly leaderboards
- Challenge modes (speedrun, hard mode)

### Reference: Best-in-Class Examples
- Wordle (NYT) - Clean, addictive, shareable
- Immaculate Grid - Sports puzzle UX
- Poeltl (NBA) - Similar concept for basketball
- Weddle (NFL) - Player guessing with hints

### Implementation Plan

**Phase 1: Foundation** (Refactor)
- [ ] Extract inline styles to CSS modules or Tailwind
- [ ] Create design system (colors, spacing, typography)
- [ ] Improve component structure (separate concerns)

**Phase 2: Core Improvements**
- [ ] Redesign FeedbackDisplay component
- [ ] Improve PlayerAutocomplete UX
- [ ] Add loading states and animations
- [ ] Mobile-first responsive overhaul

**Phase 3: Polish**
- [ ] Win/Lose celebration animations
- [ ] Theme system (dark mode)
- [ ] Accessibility improvements (WCAG AA)
- [ ] Performance optimization

---

## Workstream 3: Backend System

### Current Architecture
**No backend** - Pure static React + Vite app
- Puzzles loaded from `match_puzzles_t20wc.json`
- Daily rotation via epoch-based calculation
- State persisted to localStorage

### Options for Backend

#### Option A: Keep Static (Minimal Backend)
**Pros**: Simple, cheap, fast deployment
**Cons**: Limited features, manual puzzle management

**Features Possible**:
- Epoch-based daily puzzle (current)
- localStorage for stats
- No user accounts
- Manual JSON updates for new puzzles

#### Option B: Serverless Backend
**Pros**: Scalable, low cost, easy deploy
**Cons**: Cold starts, vendor lock-in

**Tech Stack**:
- Vercel/Netlify functions
- Supabase for database
- Edge functions for API

**Features Possible**:
- Dynamic puzzle scheduling
- Basic analytics
- Archive viewing
- No user accounts (still localStorage)

#### Option C: Full Backend
**Pros**: Full control, rich features
**Cons**: More complex, hosting costs

**Tech Stack**:
- Node.js/Express or Python/FastAPI
- PostgreSQL database
- Redis for caching
- JWT authentication

**Features Possible**:
- User accounts & profiles
- Global leaderboards
- Puzzle archive with replay
- Admin dashboard for puzzle management
- Analytics & insights
- Push notifications
- Social features (friends, challenges)

### Recommended: Hybrid Approach

**Phase 1**: Stay static, optimize what exists
- Keep current architecture
- Add more puzzles via JSON
- Improve epoch calculation if needed

**Phase 2**: Add lightweight serverless
- Supabase for puzzle database
- API for dynamic puzzle loading
- Basic analytics (page views, completion rate)

**Phase 3**: Full backend (if growth justifies)
- User accounts
- Leaderboards
- Admin dashboard

### Feature Backlog

#### Must Have (MVP)
- [x] Daily puzzle rotation
- [x] 4 guesses limit
- [x] Y/N feedback system
- [x] Share functionality
- [x] Local stats tracking
- [ ] More puzzle content (100+)

#### Should Have (V1)
- [ ] Puzzle archive (view past puzzles)
- [ ] Replay past puzzles
- [ ] Improved share text (emoji grid)
- [ ] Better mobile experience

#### Nice to Have (V2)
- [ ] User accounts
- [ ] Global leaderboards
- [ ] Streak tracking with server backup
- [ ] Hard mode (no hints)
- [ ] Timed challenges

#### Future (V3+)
- [ ] Social features
- [ ] Tournament mode
- [ ] Custom puzzles
- [ ] API for third-party

---

## Immediate Next Actions

### This Session
1. ~~Add missing nations players~~ DONE
2. Create this workstreams document DONE
3. Push changes to GitHub

### Next Session Options
- **Data**: Continue Phase 1.2 (associate nations)
- **UI/UX**: Deep dive into FeedbackDisplay redesign
- **Backend**: Plan Supabase integration

### Parallel Work Suggestion
```
Session 1: Data gathering (players)
Session 2: UI/UX improvements
Session 3: Backend planning
Repeat...
```

---

## Quick Reference

### Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
```

### Key Files
- `src/App.jsx` - Main game logic
- `src/App.css` - All styles
- `src/data/all_players.json` - Player database
- `src/data/match_puzzles_t20wc.json` - Puzzle data
- `src/hooks/useDailyPuzzle.js` - Game state hook
- `CLAUDE.md` - AI context file
- `PLAYER_DATABASE_PLAN.md` - Data expansion plan

### Git Workflow
```bash
# Always work on feature branch
git checkout feature/feedback-system-update

# Commit and push
git add .
git commit -m "Description"
git push origin feature/feedback-system-update
```

---

*Last Updated: 2026-01-16*
