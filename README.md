# DSA Mastery Tracker

Full-stack LeetCode tracker with Neon PostgreSQL backend, deployed on Netlify.

---

## Project Structure

```
dsa-tracker/
├── netlify.toml
├── package.json
├── .env.example
├── public/
│   ├── index.html                    # Markup only — links CSS + JS entry point
│   ├── css/
│   │   ├── variables.css             # CSS custom properties (design tokens)
│   │   ├── base.css                  # Reset, body, scrollbar, keyframes
│   │   ├── header.css                # Site header
│   │   ├── buttons.css               # Button variants
│   │   ├── stats.css                 # Stat cards, global progress bar
│   │   ├── controls.css              # Sticky controls bar (filters, search)
│   │   ├── sections.css              # Accordion sections, col headers, counts
│   │   ├── table.css                 # Problem table, cells, AI, skeleton
│   │   ├── modal.css                 # Modals and forms
│   │   ├── toast.css                 # Toast notifications, loading states
│   │   ├── focus-mode.css            # Focus Mode session bar + summary
│   │   ├── company.css               # Company filter, pills, prep mode
│   │   ├── daily-goal.css            # Daily goal widget
│   │   ├── mastery-chart.css         # Mastery Chart modal
│   │   ├── review-queue.css          # SRS review queue widget
│   │   └── report.css                # Report / feedback modal
│   └── js/
│       ├── main.js                   # Entry point: window bindings + boot
│       ├── state.js                  # Single mutable state object
│       ├── cache.js                  # localStorage cache (get/set/clear)
│       ├── utils.js                  # groupBySections(), smoothTransition()
│       ├── toast.js                  # showToast()
│       ├── stats.js                  # updateStats(), updateSectionMeta()
│       ├── filters.js                # setDiffFilter(), setStatusFilter(), applyFilters(), pickRandom()
│       ├── render.js                 # render(), buildRow(), toggleSection(), lazy loading
│       ├── progress.js               # toggleCheck(), debounceSave(), persistSolution()
│       ├── toggles.js                # toggleTags(), toggleSolution(), toggleNotes(), toggleCompanies()
│       ├── data.js                   # boot(), bootFresh(), hardRefresh()
│       ├── stopwatch.js              # Stopwatch + Pomodoro timer
│       ├── focus-mode.js             # FocusMode object (start/end/summary)
│       ├── company-filter.js         # CompanyFilter (dropdown, prep mode, session)
│       ├── company-stats.js          # Company readiness stats panel
│       ├── spaced-repetition.js      # SRS review queue logic
│       ├── ai.js                     # AI hint + code analysis
│       ├── daily-goal.js             # DailyGoal widget
│       ├── mastery-chart.js          # MasteryChart modal
│       ├── similar-problems.js       # SimilarProblems tray
│       ├── modal-add.js              # Add Question modal
│       ├── modal-solution.js         # Solution expand modal
│       ├── modal-report.js           # Report modal
│       ├── modal-logout.js           # Logout confirmation
│       ├── reset.js                  # ResetModal (clear all progress)
│       ├── quotes.js                 # Motivational quotes
│       ├── hard-celebration.js       # "Boss Defeated" hard problem modal
│       └── timer-nudge.js            # Idle nudge after inactivity
└── netlify/
    ├── edge-functions/
    │   └── auth.js                   # Password auth — sets dsa_auth cookie
    └── functions/
        ├── db.js                     # Shared DB connection + schema init
        ├── get-questions.js          # GET  — seed DB on first run, return all questions + progress
        ├── update-progress.js        # POST — upsert checkbox / solution / notes / complexity
        ├── add-question.js           # POST — insert new question
        ├── update-question.js        # POST — edit existing question metadata
        ├── analyze-code.js           # POST — AI code analysis via Claude
        ├── rank-similar-problems.js  # POST — rank similar problems via Claude
        ├── morning-reminder.js       # Scheduled morning study reminder
        └── night-reminder.js         # Scheduled night review reminder
```

---

## Database Schema

```sql
-- questions table (one row per LeetCode problem)
CREATE TABLE questions (
  lc_number       INTEGER NOT NULL UNIQUE PRIMARY KEY,
  name            TEXT    NOT NULL,
  url             TEXT    NOT NULL,
  topic           TEXT    NOT NULL,           -- e.g. 'Sliding Window'
  difficulty      TEXT    NOT NULL,           -- 'Easy' | 'Medium' | 'Hard'
  section         TEXT    NOT NULL,           -- e.g. 'Arrays & Hashing'
  section_order   INTEGER NOT NULL,           -- controls display order
  tags            TEXT[]  DEFAULT '{}',       -- e.g. ['goldman-sachs','trending']
  companies_asked TEXT[]  DEFAULT '{}',       -- e.g. ['Google','Meta','Amazon']
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- progress table (one row per attempted problem)
CREATE TABLE progress (
  lc_number           INTEGER NOT NULL UNIQUE REFERENCES questions(lc_number) ON DELETE CASCADE,
  is_done             BOOLEAN DEFAULT FALSE,
  solution            TEXT    DEFAULT '',
  notes               TEXT    DEFAULT '',
  needs_review        BOOLEAN DEFAULT FALSE,
  time_complexity     TEXT    DEFAULT '',     -- e.g. 'O(n log n)'
  space_complexity    TEXT    DEFAULT '',     -- e.g. 'O(n)'
  ai_analysis         TEXT    DEFAULT '',     -- cached AI feedback JSON
  srs_interval_index  INTEGER DEFAULT 0,      -- SRS interval step
  srs_last_reviewed_at TIMESTAMPTZ,           -- last SRS review timestamp
  solved_at           TIMESTAMPTZ,            -- when first marked done
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Deploy to Netlify

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "init"
gh repo create dsa-tracker --public --push
```

### 2. Import to Netlify
- Go to https://app.netlify.com → "Add new site" → "Import an existing project"
- Connect your GitHub repo — build settings auto-detected from `netlify.toml`

### 3. Set Environment Variables
- **`NEON_DATABASE_URL`** — PostgreSQL connection string from Neon
- **`SITE_PASSWORD`** — Password for the edge-function auth gate
- **`ANTHROPIC_API_KEY`** — Required for AI hint and code analysis features

### 4. First Deploy
On first page load, `get-questions` will:
1. Create `questions` and `progress` tables (if they don't exist)
2. Seed all problems (idempotent — safe to run multiple times)
3. Return all questions with progress joined

---

## Local Development

```bash
npm install
cp .env.example .env
# Fill in NEON_DATABASE_URL, SITE_PASSWORD, ANTHROPIC_API_KEY
npx netlify dev
# Visit http://localhost:8888
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/.netlify/functions/get-questions`      | Seed + fetch all questions with progress |
| POST | `/.netlify/functions/update-progress`    | Upsert is_done, solution, notes, complexity, SRS fields |
| POST | `/.netlify/functions/add-question`       | Insert new question (409 if LC# exists) |
| POST | `/.netlify/functions/update-question`    | Edit question metadata (name, url, topic, etc.) |
| POST | `/.netlify/functions/analyze-code`       | AI code analysis (Claude) — returns structured feedback |
| POST | `/.netlify/functions/rank-similar-problems` | AI-ranked similar problems for a given question |

