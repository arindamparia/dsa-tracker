# AlgoTracker

> A full-stack DSA preparation tool — track LeetCode problems, run mock interviews, review with spaced repetition, and get AI-powered code feedback.

**Live:** [algotracker.xyz](https://algotracker.xyz) · Built by [Arindam Paria](https://arindamparia.in)

---

## Features

- **450+ curated problems** organized by topic and section
- **AI code analysis** — paste your solution, get instant feedback on correctness, edge cases & complexity (powered by Claude)
- **AI hints** — get a nudge without the full spoiler
- **Mock interviews** — timed sessions with configurable difficulty mix
- **Company prep mode** — filter by 527+ companies (Google, Meta, Amazon, etc.)
- **Spaced repetition** review queue — revisit solved problems on a schedule
- **Focus sessions** — topic-locked study mode with session tracking
- **Weakness heatmap** — visualize blind spots by section and difficulty
- **Section mastery map** — radar chart of your progress per topic
- **Daily goals** — set targets, track streaks, celebrate milestones
- **Ambient focus audio** — rain, ocean, forest, river sounds
- **Smart pick** — priority-scored problem suggestion engine
- **Contribution graph** — GitHub-style heatmap of activity
- **Light / dark theme** — with system preference detection
- **PWA** — installable, works offline

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), CSS custom properties |
| Animations | Motion One |
| Backend | Netlify Serverless Functions (Node.js ESM) |
| Database | Neon PostgreSQL (serverless) |
| Auth | Clerk (JWT, networkless verification) |
| AI | Anthropic Claude API |
| CDN | Cloudinary (images + audio) |
| Hosting | Netlify |

---

## Project Structure

```
algotracker/
├── netlify.toml                      # Build config, redirects, CSP headers
├── package.json
├── public/
│   ├── index.html                    # Single-page app shell
│   ├── welcome.html                  # Sign-in / landing page
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker (network-first)
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── icons/
│   ├── css/
│   │   ├── variables.css             # All CSS custom properties (design tokens)
│   │   ├── base.css                  # Reset, body, loader, update banner
│   │   ├── header.css                # Header, motivation box, watermark
│   │   ├── buttons.css               # Button variants (action, feature, secondary)
│   │   ├── stats.css                 # Stat cards, progress bar, streak
│   │   ├── controls.css              # Sticky controls bar, theme FAB, timer
│   │   ├── sections.css              # Accordion sections, grid collapse animation
│   │   ├── table.css                 # Problem rows, AI cells, skeleton loader
│   │   ├── modal.css                 # Modal base and forms
│   │   ├── toast.css                 # Toast notifications
│   │   ├── focus-mode.css            # Focus session bar + hard-problem modal
│   │   ├── company.css               # Company filter, pills, readiness stats
│   │   ├── daily-goal.css            # Daily goal ring, banner, editor
│   │   ├── mastery-chart.css         # Mastery radar chart modal
│   │   ├── review-queue.css          # SRS review carousel
│   │   ├── report.css                # Contribution heatmap + report modal
│   │   ├── smart-queue.css           # Smart pick suggestion card
│   │   ├── weakness-heatmap.css      # Weakness heatmap modal
│   │   ├── mock-interview.css        # Mock interview config + session bar
│   │   ├── ambient.css               # Ambient sound widget
│   │   └── pwa.css                   # PWA install banner
│   └── js/
│       ├── main.js                   # Entry point: boot, window bindings, fetch interceptor
│       ├── auth.js                   # Clerk auth (load, getToken, signOut)
│       ├── state.js                  # Single mutable state object
│       ├── cache.js                  # localStorage cache helpers
│       ├── utils.js                  # groupBySections(), smoothTransition()
│       ├── toast.js                  # showToast()
│       ├── stats.js                  # updateStats(), updateSectionMeta()
│       ├── filters.js                # Diff/status filters, search, pickRandom()
│       ├── render.js                 # render(), buildRow(), lazy loading, skeleton
│       ├── progress.js               # toggleCheck(), debounceSave(), persistSolution()
│       ├── toggles.js                # Column visibility toggles
│       ├── data.js                   # boot(), bootFresh(), hardRefresh()
│       ├── stopwatch.js              # Stopwatch + Pomodoro timer (hanging widget)
│       ├── timer-nudge.js            # Physics-based cursor nudge on idle
│       ├── focus-mode.js             # FocusMode (start/end/summary)
│       ├── company-filter.js         # Company dropdown, prep mode session
│       ├── company-stats.js          # Company readiness stats panel
│       ├── spaced-repetition.js      # SRS review queue and scheduling
│       ├── smart-queue.js            # Smart pick engine + suggestion card
│       ├── ai.js                     # AI hint + code analysis (Claude)
│       ├── daily-goal.js             # DailyGoal widget, ring, banner
│       ├── mastery-chart.js          # Section mastery radar chart
│       ├── weakness-heatmap.js       # Weakness heatmap by section × difficulty
│       ├── mock-interview.js         # Timed mock interview sessions
│       ├── similar-problems.js       # Similar problems tray (AI-ranked)
│       ├── modal-add.js              # Add Question modal
│       ├── modal-solution.js         # Solution expand modal
│       ├── modal-report.js           # Contribution graph + report modal
│       ├── modal-logout.js           # Logout confirmation
│       ├── reset.js                  # Reset all progress modal
│       ├── user-settings.js          # User settings panel (theme, reminders, bg)
│       ├── ambient.js                # Ambient audio widget
│       ├── pwa-install.js            # PWA install banner (Android, iOS, macOS)
│       ├── version-check.js          # ETag polling → update banner
│       ├── quotes.js                 # Motivational quotes
│       ├── hard-celebration.js       # "Boss Defeated" hard problem celebration
│       └── motion.js                 # Motion One re-export
└── netlify/
    └── functions/
        ├── db.mjs                    # Shared Neon DB connection + schema init
        ├── clerk-auth.mjs            # Networkless JWT verification (CLERK_JWT_KEY)
        ├── clerk-config.mjs          # Exposes publishable key to frontend
        ├── cors.mjs                  # Shared CORS headers
        ├── rate-limit.mjs            # Simple in-memory rate limiter
        ├── get-questions.mjs         # GET  — seed DB, return questions + user progress
        ├── get-progress.mjs          # GET  — fetch progress for current user
        ├── update-progress.mjs       # POST — upsert checkbox, solution, notes, SRS fields
        ├── add-question.mjs          # POST — insert new question
        ├── update-question.mjs       # POST — edit question metadata
        ├── get-user-settings.mjs     # GET  — fetch user settings (theme, reminders)
        ├── update-reminder-settings.mjs # POST — update email reminder preferences
        ├── analyze-code.mjs          # POST — AI code analysis via Claude
        ├── rank-similar-problems.mjs # POST — AI-ranked similar problems
        ├── morning-reminder.mjs      # Scheduled — morning study nudge email
        └── night-reminder.mjs        # Scheduled — night review summary email
```

---

## Database Schema

```sql
-- Users (one row per Clerk user)
CREATE TABLE users (
  clerk_id   TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions (shared, seeded once)
CREATE TABLE questions (
  lc_number      INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL,
  url            TEXT    NOT NULL,
  topic          TEXT    NOT NULL,
  difficulty     TEXT    NOT NULL,        -- 'Easy' | 'Medium' | 'Hard'
  section        TEXT    NOT NULL,
  section_order  INTEGER NOT NULL,
  tags           TEXT[]  DEFAULT '{}',
  companies_asked TEXT[] DEFAULT '{}'
);

-- Progress (per user, per problem)
CREATE TABLE progress (
  lc_number            INTEGER NOT NULL REFERENCES questions(lc_number) ON DELETE CASCADE,
  user_email           TEXT    NOT NULL,
  is_done              BOOLEAN DEFAULT FALSE,
  solution             TEXT    DEFAULT '',
  notes                TEXT    DEFAULT '',
  needs_review         BOOLEAN DEFAULT FALSE,
  time_complexity      TEXT    DEFAULT '',
  space_complexity     TEXT    DEFAULT '',
  ai_analysis          TEXT    DEFAULT '',    -- cached JSON from Claude
  srs_interval_index   INTEGER DEFAULT 0,
  srs_last_reviewed_at TIMESTAMPTZ,
  solved_at            TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lc_number, user_email)
);
```

---

## Environment Variables

Set these in Netlify → Site settings → Environment variables:

| Variable | Description |
|---|---|
| `NEON_DATABASE_URL` | PostgreSQL connection string from [neon.tech](https://neon.tech) |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_live_...`) |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_live_...`) |
| `CLERK_JWT_KEY` | Clerk JWT public key for networkless verification |
| `OpenAI_API_KEY` | Claude API key for AI hint + code analysis |

---

## Local Development

```bash
npm install
cp .env.example .env
# Fill in all env vars above
npx netlify dev
# Visit http://localhost:8888
```

---

## Deploy to Netlify

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "init"
gh repo create algotracker --public --push
```

### 2. Import to Netlify
Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import existing project → connect GitHub repo. Build settings are auto-detected from `netlify.toml`.

### 3. Set environment variables (see above)

### 4. First deploy
On first page load, `get-questions` seeds the `questions` table and creates all tables if they don't exist. It's idempotent — safe to run multiple times.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/.netlify/functions/get-questions` | Seed DB + return all questions with user progress |
| GET | `/.netlify/functions/get-progress` | Return progress for authenticated user |
| POST | `/.netlify/functions/update-progress` | Upsert is_done, solution, notes, complexity, SRS fields |
| POST | `/.netlify/functions/add-question` | Insert new question (409 if LC# exists) |
| POST | `/.netlify/functions/update-question` | Edit question metadata |
| GET | `/.netlify/functions/get-user-settings` | Fetch user settings and reminder preferences |
| POST | `/.netlify/functions/update-reminder-settings` | Update email reminder schedule |
| POST | `/.netlify/functions/analyze-code` | AI code review via Claude — returns structured feedback |
| POST | `/.netlify/functions/rank-similar-problems` | AI-ranked similar problems for a given question |

All endpoints require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

---

## Architecture Notes

- **No framework** — Vanilla JS ES modules. Zero build step for the frontend.
- **Lazy rendering** — Problem rows are built into the DOM only when a section is opened. Hover pre-loads, click renders with skeleton.
- **Single state object** — `state.js` is the single source of truth. No global variables scattered across files.
- **Column hiding** — Uses `width: 0` + `overflow: hidden` on `col`/`td` elements (not `display: none`) to preserve `table-layout: fixed`.
- **Smooth collapse** — Sections animate via `grid-template-rows: 0fr → 1fr` trick, not `max-height`.
- **Network-first SW** — Service worker uses network-first for same-origin assets. Cross-origin (Cloudinary) requests bypass the SW entirely.
- **Clerk auth** — JWT verified networklessly in every function using `CLERK_JWT_KEY`. No Clerk API call per request.

---

Made with ♥ by [Arindam Paria](https://arindamparia.in)
