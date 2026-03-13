# DSA Mastery Tracker — Comprehensive User Guide

Welcome to the **DSA Mastery Tracker**! This application is designed meticulously to help you track, optimize, and master your Data Structures and Algorithms journey. 

This guide details every single feature and interaction available in the application so you can utilize it to its fullest potential.

---

## 🔐 1. Authentication & Access
The application is strictly protected to ensure your data stays private.
- **Login**: Upon visiting the site, you will be prompted for a password. Enter your configured `SITE_PASSWORD` to gain access.
- **Persistent Sessions**: Once logged in, your session is securely saved in a cookie. You won't need to log in again unless you explicitly log out.
- **Logout**: To secure your session, click the **Log Out** button located in the top-right header corner.

---

## 📊 2. Dashboard Analytics
At the very top of your application, you have an eagle-eye view of your progress.
- **Stats Counter**: Real-time counters showing how many Easy, Medium, and Hard problems you've conquered, along with your overall completion percentage.
- **Current Streak**: Tracks consecutive days you've solved at least one problem. Don't break the chain!
- **Daily Goal Ring**:
  - Click the **🎯 Goal: X** button to set your target number of problems for the current day.
  - As you check off problems, the circular SVG ring dynamically fills up.
  - **Confetti Celebration**: Hitting your exact goal triggers a physics-based confetti explosion across your screen!
  - **Overachievement**: Surpassing your goal creates a glowing secondary "ghost" ring tracking bonus problems.
- **Mastery Radar Chart**: A dynamic polygon chart visualizing your proficiency across different underlying topics (e.g., Arrays, Graphs, DP).
- **Activity Heatmap**: A GitHub-style contribution grid displaying your activity concentration over the past several months. Hover over any square to see exactly how many problems were solved that day.
- **Daily Quotes**: Whenever you need a mental boost, glance at the Daily Quote widget. Click the refresh (`⟳`) icon to spin an animation and load a new curated quote from atomic habits and deep work psychologies.

---

## 🧠 3. Spaced Repetition System (SRS)
To prevent forgetting older solutions, the app implements a mastery review queue.
- **The Review Queue Bar**: Located prominently at the top of the interface. If the system calculates you are due to review a specific problem again based on spaced intervals (1 day, 3 days, 1 week, etc.), it appears here.
- **Reviewing**: Clicking a problem in the queue jumps you right to it.
- **Marking as Reviewed**: Click the **✓ Mark Reviewed** button within the queue banner to reset its neural-decay timer and push it to the next maturity interval.

---

## 🗂 4. Navigation & Filtering
Finding the right problem at the right time is crucial.
- **Global Search**: Type any Name, UI ID, Topic, or Tag into the top text box. The table dynamically filters out non-matches instantly.
- **Difficulty Toggles**: Click the `All`, `Easy`, `Medium`, or `Hard` circular pills to isolate problems by structural complexity.
- **Status Toggles**: Filter by `All`, `Done` (finished), `Undone` (unsolved), or `Review` (flagged for later). Clicking an active pill again resets the filter to `All`.
- **👉 Pick Random**: Don't know what to solve? Click the **Pick Random** button!
  - The system will pick a random unseen/unsolved problem.
  - It will smoothly automatically scroll your viewport exactly to that row.
  - A purple tooltip saying **"👉 Solve this!"** will physically attach to the row and track it flawlessly even if you scroll, remaining visible for exactly 6 seconds.
- **Section Accordions**: Problems are grouped cleanly by patterns (e.g., "Two Pointers", "Greedy"). Click any thick section header to collapse or expand its contents.

---

## 📝 5. Table Rows & Problem Mechanics
The core interface where you will spend the majority of your time interacting with questions.

### Execution & Logging
- **The Checkbox (Marking Done)**: 
  - Clicking the left-most animated checkbox marks a problem as completed, striking out the title and coloring the row mint green.
  - **The Boss Battle (Hard Celebration)**: If you check off a problem flagged as `Hard`, brace yourself! The screen will erupt into a special darkened modal featuring rising fire embers, intense quotes, and radial screen flashes to reward your mental effort!
- **Review Star (★)**: Click the star next to the status to explicitly flag a problem as "Needs Review" (turning it gold). This overrides default filters so you can easily pull it back up later.
- **Add Question (+)**: Click the **Add Question** button in the top right to manually inject a new Leetcode problem into your tracker, mapping its URLs and metadata.

### Deep Work 
- **Solution Textarea**: A resizeable code editor box to paste your optimal solution.
  - **Syntax Validation Heuristics**: You *cannot* paste plain English into this box. It verifies that your text contains structural brackets `{}` and code keywords (`public`, `def`, `let`) before it allows saving to the database, actively preventing junk data.
  - **Auto-Save**: You don't need to click save. Stop typing for `800ms`, and it will silently sync to the cloud (showing a green checkmark toast).
- **Notes Textarea**: A resizeable text box for plain-English conceptual breakdowns, algorithm walkthroughs, or edge-case reminders.
- **View Toggles (Clean UI)**: Use the top-right toggle switches to completely hide Solutions, Notes, or Topic Tags from the screen if you want a purist, distraction-free scanning layout.

### AI Integration 🤖
The application features a deeply integrated Algorithm Engine (OpenAI).
- **AI Hint**: Stuck? Click the `Hint` button to generate a subtle, 1-2 sentence nudge giving you a conceptual direction without spoiling the codebase.
- **AI Code Analyze**: Paste your code into the Solution box and click **🤖 Analyze Code**.
  - **Complexity Extraction**: The AI calculates your exact Time and Space complexities. It natively handles standard limits (`O(N log N)`) and highly custom bounds (`O(N * K)`), appending them safely to your dropdown menus.
  - **Leetcode-Style Breakdown**: Unfurls a beautifully formatted, color-coded dashboard specifically matching LeetCode's syntax.
  - **Approach Section (Purple)**: Details your current algorithm vs. the absolute most optimal sequence, alongside the "Key Idea" and a "Consideration" question pointing out edge cases.
  - **Efficiency Section (Green)**: Verifies if your code hit the optimal theoretical bound and gives a direct verdict on performance!

### Complexity Dropdowns
- Independent dropdowns to manually select `Time` and `Space` complexity (e.g., `O(1)`, `O(n!)`, `O(V+E)`). Hand-curated to feature 16 of the most common Big-O limit formats.

### Similar Problems Graph 🕸
- **Similar Button**: Beside the complexity box lies a "Similar" button.
- **AI Resolution Engine**: Clicking it drops down a UI tray. The system calculates base heuristic matches and then asks the AI to confirm the top 3 equivalent structural patterns. 
- It caches these directly to your row. Clicking these nodes immediately navigates you to that equivalent problem within the app to reinforce the specific pattern you just learned!

---

## ⏱ 6. Time Management & Deep Focus

### Standard Stopwatch & Pomodoro
- Located in the top header. Click it to open the Timer modal.
- **Stopwatch**: A standard incremental timer tracking how many minutes you're spending on the codebase.
- **Pomodoro (Tomato)**: A strict countdown logic. Use the stacked custom `+`/`-` buttons to configure explicit hours and minutes bindings.
- **Hover Physics**: Mousing over the timer button pushes it dynamically like a real-world suspended sign.

### 🌌 Focus Mode
- The ultimate tool for uninterrupted studying! Click the **Focus Mode** button in the header.
- **Setup**: Select a specific category/topic you want to grind.
- **The Execution**: 
  - The UI will aggressively strip away all Navigation, Headers, Charts, Tags, and Dropboxes.
  - Only the *Unsolved* problems of your selected category remain on the screen.
  - The stopwatch automatically initiates to track your exact working time.
- **Completion Benchmark**: Once you finish and click "Exit Focus", a summary modal breaks down explicitly how many minutes you spent in the zone and a mathematical breakdown of exactly how many problems (sorted by difficulty) you successfully crushed during that specific session. 

---

*End of Guide. Best of luck on your mastering of Data Structures & Algorithms!*
