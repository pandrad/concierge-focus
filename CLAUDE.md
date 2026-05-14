# My Concierge — Development Guide

## Project Overview
Personal productivity dashboard synced to Google account. React + Vite SPA deployed to Vercel.

**Purpose:** Help Pedro track daily focus (tasks, emails, calendar), one-off tasks, and weekly completion trends.

## Tech Stack
- **Frontend:** React 18, Vite 5, vanilla CSS-in-JS (no styled-components)
- **APIs:** Google Gmail (readonly), Google Calendar (readonly), Google Drive (appData folder)
- **Deployment:** Vercel
- **State Management:** React hooks + localStorage + Google Drive persistence

## Architecture

### Data Flow
1. **Authentication** → `useGoogleAuth.js` — OAuth2 token flow via Google accounts API
2. **Data Loading** → `useGmailData.js`, `useCalendarData.js` — Fetch via Google APIs
3. **Data Persistence** → `useGoogleDrive.js` — Save/load schedule + one-offs to Drive
4. **UI State** → App.jsx — React state for UI (tabs, checked tasks, editing modes)

### Key Data Structures

**schedule:** Object organized by day of week
```javascript
{ Monday: [{id, label}], Tuesday: [...], ... }
```

**oneOffs:** Array of tasks assigned to specific days or unassigned
```javascript
[{ id, label, day: 'Monday'|null, done: boolean }]
```

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
- **Today's Focus** — Schedule tasks + one-offs for today with checkbox completion
- **Last 7 Days** — Bar chart showing daily completion percentages
- **Needs Reply** — Unread emails (last 7 days), marked as handled when checked. Emails can be ignored for the day or blocked permanently (with confirmation modal, no undo)
- **Today's Events** — Calendar events, convertible to one-off tasks with toggle (shows ✓ added, click again to remove)
- All sections draggable to reorder
- Logged-in Google account shown in header

### Week Tab
- Per-day task scheduler (Monday–Sunday)
- Add/delete/move tasks between days

### One-offs Tab
- Create standalone tasks
- Assign to specific days
- Mark complete (hides from One-offs tab, shows crossed out in Today's Focus; uncheck to restore)

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

**Authorized Origins:** Must include localhost:5173 (dev) and Vercel URL (prod)

## Development Workflow

### Setup
```bash
npm install
cp .env.example .env.local
# Add VITE_GOOGLE_CLIENT_ID to .env.local
npm run dev
```

### Git Workflow
- Feature branches not required for small features
- Commit directly to main when testing locally
- Push to GitHub, then deploy from Vercel (auto on push)

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

### Why vanilla CSS-in-JS?
- No build-time dependencies
- Entire style system in code (color tokens, responsive)
- Easy to refactor—can find references with grep

### Why separate `checked` and `done` fields?
- `checked` (daily) — UI state for highlighting completed items, also used for emails
- `done` (persistent) — One-off completion status that persists across days
- Allows completed one-offs to stay visible (crossed out) in Today's Focus

### Email ignore vs block
- `ignored` — keyed by date in localStorage + Drive, resets each day, email grays out but stays visible
- `permanentlyIgnored` — array of email IDs in Drive, email never shown again, no undo (confirmation modal before applying)

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
