# AlgoTracker 

> A full-stack DSA preparation tool built for the grind. Track mainly LeetCode problems (with options to brainstorm and pull from Codeforces, AtCoder, and CSES), run mock interviews, review with spaced repetition, get AI-powered code feedback, and natively read integrated `cp-algorithms.com` docs without leaving the tab. Pure *jugaad*, maximum performance.

**Live:** [algotracker.xyz](https://algotracker.xyz) · Built by [Arindam Paria](https://arindamparia.in)

---

## 🚀 The Feature List (What this actually does)

I built this because existing trackers were either too simple (just a spreadsheet) or too bloated. Here is every feature currently packed into this codebase:

### 🧠 AI & Smart Suggestions
- **AI Code Review (`analyze-code.mjs`)**: Paste your solution and get instant feedback on correctness, edge cases, and Time/Space complexity powered by OpenAI. No more waiting for LeetCode or Codeforces judging servers.
- **AI Hints (`ai.js`)**: Get a contextual nudge to unblock yourself without reading the full spoiler solution.
- **Smart Pick Engine (`smart-queue.js`)**: Priority-scored algorithm that suggests exactly what you should solve next based on your history.
- **AI Similar Problems (`rank-similar-problems.mjs`)**: Dynamically ranks and pulls similar problems when you want to drill down on a specific pattern.

### 📚 Study & Prep Modes
- **Company Prep Mode (`company-filter.js`)**: Filter the 450+ curated problems by 527+ companies (Google, Amazon, TCS, Infosys, etc.) and track your "Readiness Score" for upcoming interviews.
- **Mock Interviews (`mock-interview.js`)**: High-pressure, timed sessions where you configure the difficulty mix (e.g., 1 Easy, 2 Mediums).
- **Spaced Repetition System (SRS) (`spaced-repetition.js`)**: Anki-style review queue. The app schedules problems for review just before your brain forgets the sliding window trick.
- **Focus Sessions (`focus-mode.js`)**: Lock yourself into a single topic for deep work and track your session time.

### 📊 Analytics & Gamification
- **Weakness Heatmap (`weakness-heatmap.js`)**: A grid that visualizes your exact blind spots by crossing topics with difficulty levels.
- **Mastery Radar Chart (`mastery-chart.js`)**: A beautiful radar chart showing your proficiency across all algorithm categories.
- **Contribution Graph (`modal-report.js`)**: A GitHub-style green-square heatmap because we all know streaks are addictive.
- **Daily Goals & Streaks (`daily-goal.js`)**: Set targets, track your daily problem count, and maintain your streak.
- **"Boss Defeated" Animations (`hard-celebration.js`)**: Custom celebrations for when you finally crack a Hard problem after 2 hours.

### 🛠 Quality of Life & Environment
- **Ambient Audio Player (`ambient.js`)**: Built-in rain, ocean, flute, and chanting sounds. Powered by the Web Audio API with a reactive FFT visualizer.
- **Pomodoro & Stopwatch (`stopwatch.js`)**: A floating timer widget right in the header.
- **Hanging Timer Physics (`timer-nudge.js`)**: The stopwatch widget is a physics-based interactive object. It leans towards your cursor and swings on its ropes if you sweep past it. Peak desi UI polish.
- **Daily Email Reports (`night-reminder.mjs`)**: Automated morning motivational nudges and late-night summary reports sent directly to your inbox via Resend.
- **Integrated CP-Algorithms (`cp-proxy.mjs`)**: Read `cp-algorithms.com` docs directly inside the app without breaking layout, thanks to a glorious server-side CORS proxy hack.
- **100% PWA Offline Support (`sw.js`)**: Installable on Android/iOS/Mac. Works even when your Wi-Fi drops.

---

## 🛠 Tech Stack (The Desi Stack)

We didn't use React, Next.js, or Webpack. This is a bare-metal Vanilla JS application designed to load instantly on a 5-year-old laptop on a 3G network. It hits **100 on Lighthouse** consistently.

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES Modules), raw CSS custom properties |
| Animations | Motion One |
| Backend | Netlify Serverless Functions (Node.js ESM) |
| Database | Neon PostgreSQL (serverless) |
| Auth | Clerk (JWT, networkless verification forced into browser mode) |
| AI | OpenAI API |
| Email | Resend |
| CDN | Cloudinary (images + audio) |
| Hosting | Netlify |

**For a deep dive into how this all works without a massive bundler, read [ARCHITECTURE.md](./ARCHITECTURE.md).**

---

## 🏗 Project Structure

```
algotracker/
├── netlify.toml                      # Build config, redirects, CSP headers
├── package.json
├── public/
│   ├── index.html                    # Single-page app shell
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker (network-first, peak desi engineering)
│   ├── css/
│   │   ├── variables.css             # Design tokens
│   │   ├── sections.css              # Accordion sections, grid collapse animation
│   │   └── ...                       # Modular CSS (deferred loading for heavy widgets)
│   └── js/
│       ├── main.js                   # Entry point: boot, fetch interceptor, Lenis scroll fixes
│       ├── auth.js                   # Clerk auth wrapper
│       ├── cp-resources.js           # CP-Algorithms iframe viewer
│       ├── ambient.js                # Ambient audio widget (Web Audio API)
│       └── ...                       # ES Modules for every feature listed above
└── netlify/
    └── functions/
        ├── db.mjs                    # Shared Neon DB connection
        ├── clerk-auth.mjs            # Networkless JWT verification bouncer
        ├── cp-proxy.mjs              # Server-side CORS bypass for cp-algorithms
        ├── analyze-code.mjs          # OpenAI API integration
        └── night-reminder.mjs        # Scheduled cron jobs (bulk SQL queries)
```

---

## 💾 Database Schema

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
  companies_asked TEXT[] DEFAULT '{}',
  platform       TEXT    DEFAULT 'LeetCode'
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
  ai_analysis          TEXT    DEFAULT '',    
  srs_interval_index   INTEGER DEFAULT 0,
  srs_last_reviewed_at TIMESTAMPTZ,
  solved_at            TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lc_number, user_email)
);
```

---

## ⚙️ Environment Variables

Set these in Netlify → Site settings → Environment variables:

| Variable | Description |
|---|---|
| `NEON_DATABASE_URL` | PostgreSQL connection string from [neon.tech](https://neon.tech) |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_live_...`) |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_live_...`) |
| `CLERK_JWT_KEY` | Clerk JWT public key for networkless verification |
| `OPENAI_API_KEY` | OpenAI API key for AI hint + code analysis |
| `RESEND_API_KEY` | Resend API key for broadcasting and daily emails |
| `RESEND_FROM_EMAIL` | The verified sender email address for Resend |
| `REMINDER_SECRET` | Secret key to manually trigger the Netlify cron jobs |

---

## 💻 Local Development

1. Clone the repo and install dependencies (we use very few):
```bash
npm install
cp .env.example .env
```
2. Fill in all the environment variables.
3. Boot up the Netlify Dev server:
```bash
npx netlify dev
```
4. Visit `http://localhost:8888`. On first load, the backend will auto-seed the database tables.

---

## 📡 API Reference

All endpoints require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/.netlify/functions/get-questions` | Seed DB + return all questions with user progress |
| GET | `/.netlify/functions/get-progress` | Return progress for authenticated user |
| POST | `/.netlify/functions/update-progress` | Upsert is_done, solution, notes, complexity, SRS fields |
| POST | `/.netlify/functions/add-question` | Insert a new custom question (e.g. from Codeforces) |
| POST | `/.netlify/functions/update-question` | Edit question metadata |
| GET | `/.netlify/functions/get-user-settings` | Fetch user settings and reminder preferences |
| POST | `/.netlify/functions/update-reminder-settings`| Update email reminder schedule |
| POST | `/.netlify/functions/analyze-code` | AI code review — returns structured feedback |
| POST | `/.netlify/functions/rank-similar-problems` | AI-ranked similar problems for a given question |
| GET | `/.netlify/functions/clerk-config` | Exposes the Clerk publishable key and access flags |
| POST | `/.netlify/functions/trigger-broadcast` | Admin-only endpoint to trigger announcements |
| GET | `/.netlify/functions/unsubscribe` | Handles email unsubscribe requests |

---

## 🧠 Architecture Notes (TL;DR)

- **No framework** — Vanilla JS ES modules. Zero build step for the frontend.
- **Lazy rendering** — Problem rows are built into the DOM only when a section is opened. Hover pre-loads, click renders with a skeleton state.
- **Single state object** — `state.js` is the single source of truth. No global variables scattered across files.
- **Smooth collapse** — Sections animate via the `grid-template-rows: 0fr → 1fr` CSS trick, completely avoiding expensive `max-height` DOM recalculations.
- **Network-first SW** — Service worker uses network-first for same-origin HTML to ensure immediate updates, but heavily caches static assets. 
- **Clerk Auth** — JWT verified networklessly in every serverless function using `CLERK_JWT_KEY`. No Clerk API call per request.

**Want to contribute?** Read [ARCHITECTURE.md](./ARCHITECTURE.md) first. Keep it Vanilla, bhai. 

---

Made with ♥ by [Arindam Paria](https://arindamparia.in)
