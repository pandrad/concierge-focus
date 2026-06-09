# My Concierge — Development Guide

## Project Overview
Personal productivity dashboard synced to Google account. React + Vite SPA deployed to Vercel.

**Live URL:** https://concierge-focus.vercel.app

**Purpose:** Help Pedro track daily focus (tasks, emails, calendar), one-off tasks, and weekly completion trends.

## Tech Stack
- **Frontend:** React 18, Vite 5, vanilla CSS-in-JS (no styled-components)
- **APIs:** Google Gmail (readonly), Google Calendar (readonly), Google Drive (appData folder)
- **Deployment:** Vercel
- **State Management:** React hooks + localStorage + Google Drive persistence

## Architecture

### Directory Structure
```
src/
├── App.jsx                  ← thin orchestrator (~80 lines)
├── theme.js                 ← LIGHT/DARK color tokens
├── services/                ← Google API integrations
│   ├── config.js
│   ├── useGoogleAuth.js
│   ├── useGmailData.js
│   ├── useCalendarData.js
│   └── useGoogleDrive.js
├── hooks/
│   └── useAppState.js       ← all business logic & state management
├── components/              ← reusable UI primitives
│   ├── Buttons.jsx          ← PrimaryBtn, GhostBtn
│   ├── DragHandle.jsx
│   ├── Spinner.jsx
│   ├── NoCredentialsWarning.jsx
│   └── index.js
└── views/                   ← one file per tab
    ├── BriefView.jsx
    ├── WeekView.jsx
    └── OneOffsView.jsx
```

### Data Flow
1. **Authentication** → `services/useGoogleAuth.js` — OAuth2 token flow via Google accounts API, with silent refresh on expiry
2. **Data Loading** → `services/useGmailData.js`, `services/useCalendarData.js` — Fetch via Google APIs
3. **Data Persistence** → `services/useGoogleDrive.js` — Save/load schedule + one-offs to Drive
4. **Business Logic & State** → `hooks/useAppState.js` — all task/email/one-off state and actions
5. **UI** → `views/` + `components/` — purely presentational, receive state and callbacks as props

### Key Data Structures

**schedule:** Object organized by day of week
```javascript
{ Monday: [{id, label}], Tuesday: [...], ... }
```

**oneOffs:** Array of tasks assigned to specific days or unassigned
```javascript
[{ id, label, day: 'Monday'|null, done: boolean, overdue?: boolean }]
```
`overdue: true` is set by the carryover logic — never by user action. Overdue tasks are normal one-offs otherwise (completable, deletable).

**checked:** Daily state (resets each day) for task completion checkboxes
```javascript
{ 'task-id': boolean, 'email-id': boolean }
```

**dailyStats:** Historical completion data by date
```javascript
{ 'Mon May 12 2026': { done: 3, total: 5 }, ... }
```

## Features

### Brief Tab (Dashboard)
- **Today's Focus** — Schedule tasks + one-offs for today with checkbox completion; one-offs can be deleted directly from this view; overdue tasks appear with an amber OVERDUE badge
- **Last 7 Days** — Bar chart showing daily task completion percentages (emails excluded from progress)
- **Needs Reply** — Unread emails (last 7 days); `+ task` button adds a `Reply: from — subject` one-off for today (toggle to remove); emails can be ignored for the day (grayed out, restorable) or blocked permanently (confirmation modal, no undo)
- **Today's Events** — Calendar events, convertible to one-off tasks with toggle (shows ✓ added, click again to remove)
- All sections draggable to reorder
- Logged-in Google account shown in header
- Progress % in header reflects tasks + one-offs only (not emails)

### Week Tab
- Per-day task scheduler (Monday–Sunday)
- Add/delete/move tasks between days

### One-offs Tab
- Create standalone tasks
- Assign to specific days; long labels truncate with ellipsis, action buttons always visible
- Mark complete (hides from both One-offs tab and Today's Focus; click again in One-offs tab to restore)

### Persistence
- **Local:** localStorage for UI state (dark mode, tab names, brief order, daily stats)
- **Cloud:** Google Drive appData — schedule, oneOffs, checked, ignored, permanentlyIgnored (auto-synced, restored on login)
- **Daily:** Completion stats tracked in localStorage, visible in weekly chart

## Google APIs Setup

**Required Scopes:**
- `gmail.readonly` — Read unread emails
- `calendar.readonly` — Read calendar events
- `drive.appdata` — Store tasks in Drive's private appData folder

**Discovery Docs:** Gmail v1, Calendar v3, Drive v3

**Environment Variable:** `VITE_GOOGLE_CLIENT_ID` (set in .env.local or Vercel dashboard)

**Authorized Origins:** localhost:5173 (dev) and https://concierge-focus.vercel.app (prod)

## Development Workflow

### Setup
```bash
npm install
cp .env.example .env.local
# Add VITE_GOOGLE_CLIENT_ID to .env.local
npm run dev
```

### Local Dev Server (macOS LaunchAgent)
The dev server runs automatically on login via a macOS LaunchAgent. No manual `npm run dev` needed.

- **Plist:** `~/Library/LaunchAgents/com.pedroandrade.concierge-focus.plist`
- **Logs:** `/tmp/concierge-focus.log` / `/tmp/concierge-focus.error.log`
- Stop: `launchctl unload ~/Library/LaunchAgents/com.pedroandrade.concierge-focus.plist`
- Start: `launchctl load ~/Library/LaunchAgents/com.pedroandrade.concierge-focus.plist`

### Git Workflow
- Feature branches not required for small features
- Commit directly to main when testing locally
- Push to GitHub triggers automatic Vercel redeploy (connected to `pandrad/concierge-focus` repo, `main` branch)

### Testing
1. Open localhost:5173
2. Sign in with Google (uses test app, limited users)
3. Create tasks in Week tab, assign to today
4. Check completion in Brief tab
5. Refresh page to verify persistence
6. Sign out/in with different user to test Drive sync

## Important Patterns & Decisions

### Why Google Drive for persistence?
- Free tier sufficient (appData folder is hidden from user)
- Keeps data synced across devices/browsers
- No backend needed; leverages existing Google auth
- Trade-off: ~1 second delay when loading after sign-in

### Why separation of concerns (services / hooks / views)?
- `services/` — swap or mock Google APIs without touching UI
- `hooks/useAppState.js` — business logic testable independently of rendering
- `views/` + `components/` — replace the entire UI without touching data layer
- To change the UI: only edit `views/`, `components/`, and `theme.js`

### Why vanilla CSS-in-JS?
- No build-time dependencies
- Entire style system in code (color tokens, responsive)
- Easy to refactor—can find references with grep

### Responsiveness
- Handled via an inline `<style>` tag in `App.jsx` with CSS media queries (no separate CSS files)
- At ≤480px: header stacks vertically, tab labels are replaced by icons (📋 / 📅 / ✦)

### Overdue carryover
- Runs once per calendar day on app open, gated by `lastCarryoverDate` in localStorage
- Scans: (1) one-offs assigned to any past day that are not `done`, (2) scheduled tasks from the past 7 days whose `checked_<date>` entry is missing
- Injects them as new one-offs with `overdue: true` and `day = today`
- Dedup via `carriedOverIds` in localStorage — each source task is only carried over once, even across multiple app opens on the same day
- Does not modify `schedule` — recurring tasks stay in the Week tab unchanged
- Amber colour tokens: `T.overdue` / `T.overdueBg` in `theme.js`

### Why separate `checked` and `done` fields?
- `checked` (daily) — UI state for task checkbox completion, resets each day; used for recurring scheduled tasks
- `done` (persistent) — One-off completion status that persists across days; completed one-offs are hidden from both Today's Focus and the One-offs tab

### Email ignore vs block
- `ignored` — keyed by date in localStorage + Drive, resets each day, email grays out at 40% opacity with "unignore" button
- `permanentlyIgnored` — array of email IDs in Drive, email never shown again, no undo (confirmation modal before applying)
- `visibleEmails` — emails minus permanentlyIgnored (rendered in list)
- `activeEmails` — emails minus both ignored and permanentlyIgnored (used for header count)

### Google Auth & Session Persistence
- Token saved to `localStorage` as `gapi_token` with an `expiry` timestamp on every successful login
- On app load: gapi initialises first, then a single `tokenClient` is created — all restore/refresh/login flows use this same client instance (no parallel init race)
- If stored token is still valid → restored silently, no login screen
- If stored token is expired → `prompt: 'none'` silent refresh attempted; if Google rejects it (e.g. user revoked access), falls through to the login screen
- While signed in: token auto-refreshes 5 minutes before expiry via a `setTimeout`
- The `callback` on `tokenClient` is set per-request (not at init time) so multiple flows (restore, refresh, manual sign-in) share one client safely

### Logout Behavior
- On sign-out: `schedule`, `oneOffs`, `checked`, `ignored` all cleared from React state
- `permanentlyIgnored` is restored from Drive on next login (it's account-level, not session-level)
- ~1 second delay when new user signs in (Drive API latency)

### Email fetching
- Gmail API fetches unread inbox emails from last 7 days (`is:unread in:inbox after:YYYY/MM/DD`)
- `userEmail` fetched via `gmail.users.getProfile` and shown in header

## Next Features (Planned)

1. **Incomplete Tasks Bucket** — At end of day, capture uncompleted scheduled tasks and offer to convert to one-offs
2. **Better offline support** — Queue Drive syncs if offline
3. **Shared calendars** — Show delegated tasks from others

## Common Debugging

**App shows blank?**
- Check browser console for JS errors
- Verify .env.local has VITE_GOOGLE_CLIENT_ID
- Restart dev server (npm run dev)

**Data not syncing to Drive?**
- Confirm you've added `drive.appdata` scope in Google Cloud Console
- Check that Vercel env var is set correctly
- Open DevTools → Network to see Drive API responses

**Verified Users Error?**
- Google OAuth in test mode — only users you add can sign in
- Add test users in Google Cloud Console → OAuth consent screen
