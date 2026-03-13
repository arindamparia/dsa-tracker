# DSA Mastery Tracker — Comprehensive Technical Documentation

This document serves as the complete technical documentation for the DSA Mastery Tracker. It provides an exhaustive breakdown of every feature, module, and function present in the codebase, detailing both the backend API and the frontend application architecture.

---

## 🏗 Backend Architecture (Netlify Functions)

The backend consists of serverless Netlify Functions interacting with a Neon PostgreSQL database and external APIs (OpenAI, Resend).

### 1. Database & Schema Initialization (`db.js`)
- **`getDb()`**: Instantiates the Neon serverless PostgreSQL connection using the `NEON_DATABASE_URL` environment variable.
- **`initSchema(sql)`**: Runs idempotent migrations (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`) to define the `questions` and `progress` tables. Handles newly added features like `similar_problems`, AI analysis (`time_complexity`, `space_complexity`, `needs_review`), and Spaced Repetition tracking columns (`srs_interval_index`, `srs_last_reviewed_at`).

### 2. Authentication (`edge-functions/auth.js`)
- **Edge Middleware**: Runs globally to enforce site-wide password protection.
- **Login Flow**: Validates POST requests against `SITE_PASSWORD`. On success, sets an HTTP-only, secure, strict cookie (`dsa_auth`) with a deterministic base64 hash and redirects to the dashboard.
- **Access Control**: Validates the cookie on every sub-request. Serves a hardcoded styling login page (intercepting requests) if unauthenticated.
- **Logout Flow**: Provides a `/logout` path that forcefully expires the auth cookie and clears cache storage headers. 

### 3. Core CRUD Endpoints
- **`get-questions.js` (GET)**: Fetches the entire problem set in a single payload. Performs a `LEFT JOIN` between `questions` and `progress` to combine metadata + user persistence metrics, and orders them by section index.
- **`add-question.js` (POST)**: Validates required metadata (LC number, name, topic, difficulty, section URL) and inserts a new problem uniquely into the `questions` table. Returns a status 409 conflict if the LeetCode number already exists.
- **`update-progress.js` (POST)**: The central synchronization hub for user activity. Performs an `UPSERT` (Insert on Conflict Update) into the `progress` table for status checks (`is_done`), `solution`, `notes`, `needs_review` statuses, complexity metadata, AI analysis, completion metrics (`solved_at`), and SRS metadata.
- **`update-question.js` (POST)**: Specifically updates isolated `questions` entity metadata fields, primarily used for caching identified `similar_problems` to the database.

### 4. AI & Cloud Integrations
- **`analyze-code.js` (POST)**: Acts as a proxy to OpenAI (`gpt-4o-mini`).
  - **Action: `hint`**: Asks an AI to evaluate a problem name and yield a single, subtle direction without providing actual code.
  - **Action: `analyze`**: Accepts user-written code. Asks the AI to enforce JSON output specifying exact `time_complexity` and `space_complexity` matches (Big-O enumeration), accompanied by a 1-3 sentence codebase evaluation and missed edge cases feedback.
- **`rank-similar-problems.js` (POST)**: An intelligent sorting engine using OpenAI. Analyzes a "source" problem's metadata against an array of 5 heuristically-chosen "candidates", requesting the AI to return the top 3 items based on identical underlying algorithmic patterns (e.g. confirming two separate matrix BFS problems).
- **`daily-reminder.js` (Scheduled Function)**: Runs on a CRON schedule (`30 16 * * *` - 10:00 PM IST). Checks if the user's `is_done` tally for the current day is 0. If True, it interfaces with the `Resend` API to trigger an accountability email explicitly containing a motivational quote to maintain streaks.

---

## 🎨 Frontend Architecture & Global State

The frontend operates as a stateful Vanilla JS Single Page Application (SPA), heavily driven by modular ES Imports.

### 1. Data Store & State
- **`state.js`**: Holds the mutable runtime singleton memory reference. Contains the global `questions` array, UI filters (`diffFilter`, `statusFilter`), toggle states (`hideTags`, `hideSolution`, `hideNotes`), Focus Mode trackers, and active `setTimeout` ID registries for debounced typing actions.
- **`cache.js`**: Synchronizes the `state.questions` dataset locally to `localStorage` (`dsa_questions`) using a 30-day Time-to-Live (TTL). Mitigates serverless latency and provides instantaneous hydration on application boot. 
- **`data.js`**: Orchestrates bootstraps. `boot()` fetches from the cache or falls back to `bootFresh()` containing the API request. Houses the `RefreshModal` for hard-purging `localStorage` forcing a raw database sync.

### 2. Rendering Engine
- **`render.js`**: The foundational DOM engine. 
  - Iterates through the raw state data to build grouping "accordion sections", tracking ratio progress (`done/total`). 
  - Converts objects into functional HTML table rows. Dynamically injects AI buttons, tag pills, complexity dropdown menus, and textareas.
  - Utilizes `requestAnimationFrame` and yielding timeouts (`setTimeout(..., 10)`) for complex DOM manipulations to safeguard smooth View Transitions without blocking the main JS thread. Implements lazy-loader DOM skeletons.
- **`utils.js`**: Pure utilities. `groupBySections()` cleanly clusters flat arrays into UI headers dynamically. `smoothTransition()` bridges experimental Document View Transitions API wrapping.

### 3. Application Entry Point
- **`main.js`**: Intercepts initialization. Bootstraps the sub-features, exposes required UI interaction methods globally via the `window` Object (for inline `onclick` bindings in HTML), registers hotkeys (e.g., `Escape` bindings to close out modal overlays globally).

---

## 🚀 Core Interactive Features & Modules

### 1. Daily Goals & Motivational UX (`daily-goal.js`, `quotes.js`)
- **Set Daily Objective**: A configurable `<input type="number">` goal per day.
- **Ring Visualization**: Mathematically draws and calculates a dynamic SVG ring (using `stroke-dashoffset`) around the user's daily progression. Exceeding the goal activates a segmented ghost ring (+X Bonus text).
- **Complex Celebration Triggers**: Observes state intercepts across re-renders. A crossing event (moving from `< goal` to `>= goal`) executes:
  - **`spawnConfetti()`**: An internally written Canvas 2D gravitational particle physics engine cascading random confetti pieces.
  - Generates center-screen motivational captions & trailing banner tooltips to reinforce psychological reward circuits.
- **Daily Quotes (`quotes.js`)**: Scrapes an array of curated book quotes (Atomic Habits, Deep Work, Mindset). Displays randomly inside the primary UI widget with a re-roll button executing CSS rotating animations.

### 2. Spaced Repetition System — SRS (`spaced-repetition.js`)
- **Interval Queue Logic**: An internal algorithm calculating intervals for mastery `[1, 3, 7, 14, 30]` days. Extracts `srs_interval_index` and `srs_last_reviewed_at` to dynamically compute review due dates.
- **UI Queue**: Renders an overarching "Review Queue" carousel at the top of the interface for elements meeting the due-date threshold, prioritizing by oldest unreviewed first. Contains independent single-click "Mark Reviewed ✓" actions interacting directly with the update endpoint.

### 3. Focus Mode Workflows (`focus-mode.js`)
- **Distraction-Free Environment**: Exclusively prompts the user to select a single Topic/Section containing purely "Unsolved" items.
- **Environmental Filtering**: Intercepts CSS and JS classes to strictly collapse, hide, and filter away *all other elements*, ensuring the developer operates strictly on the active domain issue.
- **Deep Interfacing**: Automatically hijacks and auto-starts the global Stopwatch to record duration.
- **Session Complete Metrics**: On abort, measures exactly what was conquered dynamically via array `Map` snapshots captured at session start vs. close. Triggers a customized summary modal (Time spent, Problems conquered per difficult class).

### 4. Spatiotemporal Metrics & Logging (`stats.js`, `progress.js`)
- **Real-time Statistical Counters (`stats.js`)**: Recalculates remaining totals, segmented difficulties (Easy/Medium/Hard). Identifies contiguous `doneDates` utilizing a backward-calculating date-loop sequence to enforce UI display "Streaks".
- **Database Interceptors (`progress.js`)**: Connects DOM interactions (checkbox toggling, text-area modifications) back to API via debounced wrappers (`debounceSave`, `debounceNotesSave`). Dispatches cascading UI reactions on checkbox true states (Mastery Charts updates, SRS recalculations, Goal count).

### 5. AI Analytics Engine (`ai.js`)
- **Hints Ecosystem**: A button click initiates OpenAI to evaluate the row entity. Disables the button temporarily loading UI, then extracts and appends an inline `Hint` text-block directly underneath the problem context row.
- **Algorithmic Evaluation (`analyze-code.js` via `ai.js`)**: Evaluates handwritten solutions locally. Analyzes syntax using a local Regex heuristic check (preventing spam API hits for non-code entries). Triggers OpenAI.
- Automatically isolates standard Big-O notation formatting (e.g., mapping `O(n^2), O(n * n)` gracefully universally mapping to `O(n²)` globally bounds) applying it forcefully into the `<select>` drop-downs automatically, whilst concurrently unfolding an AI Feedback wrapper box for human visibility.

### 6. Time Management (`stopwatch.js`, `timer-nudge.js`)
- **Dual Mode Support**: Standard incremental timer or a customizable Countdown Pomodoro (Tomato Mode).
- **Pomodoro Modal Wrapper**: Allows the user to construct specific multi-hour and multi-minute bounds logically via custom stepper keys preventing string character bugs via event capture blocks.
- **Visual Hover Interaction (`timer-nudge.js`)**: Calculates bounding boxes and vector paths evaluating the entry vector `(mouseX, mouseY)` determining whether the mouse hit Left, Right, or Bottom edges—appending CSS transform directional classes simulating physically "nudging" a hanging sign.

### 7. Similar Problems Graph Discovery (`similar-problems.js`)
- **Inline Display Tray**: Opening a similar problems pathway instantiates a dynamic UI tray cleanly underneath an active table row.
- **Base Heuristics Engine**: Pre-calculates base scores natively querying across local arrays (+3 Topical match, +X Tag overlap modifiers, Negative weighting based upon complexity divergence mappings structure).
- **AI Vector Search**: Resolves matches returning >3 possible equivalents internally requesting OpenAI's evaluation sorting API, cleanly mitigating bad approximations. Permanently saves resolved paths mapping directly back to the Neon PostgreSQL rows via `update-question.js` for zero-cost sub-second subsequent caching.

### 8. Hard Celebration Architecture (`hard-celebration.js`)
- **The "Boss Battle" End**: Executed via Event Flags strictly when `is_done = True` on `Hard` problems.
- **Physics Layer Canvas**: Engages an aggressive independent `<canvas>` render simulating upward-floating Fire / Spark Embers via sine-wave wind forces and dynamic gravity/frictions.
- **Layer 2 DOM Modulation**: Injects overlapping radial gradients CSS screen flashes, animating an intense modal displaying aggressive quotes to finalize psychological momentum loops. Queues itself hierarchically above Daily Goal confetti engines avoiding graphical occlusion.

### 9. Component Modals & Displays
- **Section Mastery Radar Map (`mastery-chart.js`)**: Operates via raw Vanilla HTML5 Canvas rendering. Calculates geometry computing Cartesian grid translations recursively across available sections constructing a filled radar chart relative to problem quantity completion volumes.
- **Contribution Graph / Heatmap (`modal-report.js`)**: Maps historical problem executions extracting stringified normalized date data representing an overarching mapping. Implements dynamically padded placeholder columns, tracking user interactions by overlaying coordinate responsive tooltip hover behaviors mimicking GitHub.
- **Add / Remove Data Interfaces**: Modals (`modal-add.js`, `modal-solution.js`, `modal-logout.js`, `reset.js`) enforce simple API routing behaviors. Encompass input string validation and DOM refresh loops immediately rendering data back securely. 
- **Slide Up Reveal Ecosystem (`reveal.js`)**: Registers global `IntersectionObserver` watchers upon DOM stat elements tracking scrolling thresholds, un-observing, and locking CSS transitions independently avoiding continuous lag loops upon reflows.

---

*This comprehensive suite unifies backend storage and dynamic micro-features into a cohesive and performant developer studying tool.*
