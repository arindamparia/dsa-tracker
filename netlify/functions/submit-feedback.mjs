import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

// ── AlgoTracker feature context — fed to AI on every request ─────────────────
// Sourced from README.md, USER_GUIDE.md, DOCUMENTATION.md — keep in sync.
const SITE_CONTEXT = `AlgoTracker (algotracker.xyz) is a full-stack DSA question tracker and interview prep app. Its entire purpose is tracking your progress through coding problems. Built with Vanilla JS, Netlify serverless functions, Neon PostgreSQL, Clerk auth, and OpenAI.

━━ CORE: QUESTION PROGRESS TRACKING ━━
AlgoTracker IS a question/problem progress tracker — this is its primary purpose. Every user gets a personal dashboard showing which problems they've solved, how many remain, and their overall completion percentage.
- 450+ curated problems from LeetCode, Codeforces, AtCoder, CSES organised into topic sections (Arrays, Strings, LinkedList, Trees, Graphs, Dynamic Programming, Binary Search, Stack/Queue, Hashing, Greedy, Backtracking, Two Pointers, Sliding Window, Bit Manipulation, etc.)
- Each problem has a checkbox to mark it done/solved — checking it records the solve timestamp, updates all counters, and turns the row green
- Needs-review star (★): flag any problem to revisit later; filter to see only starred/review items
- "Solved today" highlight: problems solved today show a green left border so you see today's progress at a glance
- Per-problem solution code editor (textarea with syntax validation — rejects plain English, requires actual code structure); auto-saves after 800ms with a green checkmark confirmation toast
- Per-problem notes textarea for plain-English explanations, edge cases, walkthroughs; also auto-saved
- Per-problem time complexity and space complexity dropdowns (16 Big-O options: O(1), O(log n), O(n), O(n log n), O(n²), O(2^n), O(n!), O(V+E), etc.)
- Admin can add new custom questions (LeetCode, Codeforces, AtCoder, CSES) via the Add Question panel
- View toggles in the header: globally hide/show solution boxes, notes boxes, topic tags, and company pills to reduce visual clutter

━━ STATS & PROGRESS DASHBOARD ━━
- Stats bar at top: total problems solved, Easy solved count, Medium solved count, Hard solved count, current daily streak (consecutive days with at least one solve)
- Global progress bar showing overall completion percentage across all 450+ problems
- Daily goal ring: set a daily target number of problems; an animated SVG ring fills up as you solve; hitting the exact goal triggers confetti celebration; going over shows a ghost "bonus" ring
- Mastery Radar Chart: spider/polygon chart showing your proficiency level across every algorithm topic/section
- Activity Contribution Heatmap: GitHub-style green grid showing how many problems you solved on each day over the past months; hover to see daily count
- Weakness Heatmap (shortcut H): a section × difficulty grid (e.g. Trees/Medium) coloured red→green by completion %; click any cell to filter the problem list to that exact combo
- Company Stats panel: each company shows an Interview Readiness Score weighted by difficulty (Hard×3, Medium×2, Easy×1); labels: Interview Ready / On Track / Needs Work / Just Starting

━━ SEARCH & FILTERS ━━
- Real-time full-text search across problem title, topic, and tags (shortcut: S or /)
- Difficulty filter buttons: All / Easy / Medium / Hard
- Status filter buttons: All / Done (solved) / Undone (unsolved) / Review (needs-review starred)
- Company filter dropdown: 527+ companies each with a solve progress bar and solved/total count; click a company to see only its questions; click again to clear
- Active filters hide sections with zero matches and show matching/total counts in purple per section

━━ AI FEATURES ━━
- AI Hint button per problem: generates a 1-2 sentence conceptual nudge without spoiling the solution; available to all users
- AI Code Analysis (premium only): paste your solution code and click Analyze — extracts exact time/space complexity, shows LeetCode-style breakdown (approach vs optimal, key idea, edge cases, code style score 1–3); auto-populates the complexity dropdowns
- AI Similar Problems: click "Similar" on any problem to get the top 3 structurally similar problems ranked by AI; results are cached per problem; clicking a node jumps to that problem in the list
- Smart Pick / Smart Queue (shortcut R): adaptive algorithm scores every unsolved problem across 5 factors — section weakness (35%), difficulty progression (25%), SRS urgency (20%), company relevance (15%), never attempted bonus (5%) — and highlights the single best next problem to solve; after marking a problem done a slide-in card suggests the next one

━━ SPACED REPETITION (SRS) ━━
- Anki-style flashcard review system for problems you've already solved, to prevent forgetting
- Review intervals: 1 day → 3 days → 1 week → 2 weeks → 1 month
- A "Due for Review" banner appears at the top of the dashboard listing problems due today; click any to jump to it; click "Mark Reviewed ✓" to advance to the next interval
- Morning reminder email lists all problems due for SRS review that day

━━ STUDY MODES ━━
- Focus Mode (shortcut F): choose a topic section; UI strips to only unsolved problems in that section; stopwatch auto-starts; on exit a summary modal shows time spent + problems solved by difficulty
- Company Prep Mode: click the Prep button and pick a company; filters to only that company's problems; hides non-essential UI; shows a sticky bar with company name, problems solved this session, and elapsed time; end session → summary modal with duration and Easy/Medium/Hard breakdown
- Mock Interview Mode (shortcut M): configure number of Easy/Medium/Hard problems + optional company/section filter + time limit (30/45/60/90/120 min); AI Hint and Analyze buttons are disabled during the session; timer turns red in the final 5 minutes; submit → report card with score, rating (Excellent/Passed/Needs Practice), time taken, and per-difficulty breakdown

━━ TIME MANAGEMENT ━━
- Stopwatch/Pomodoro timer widget in the header: standard stopwatch or countdown Pomodoro mode with configurable hours and minutes
- Physics-based timer button: leans toward your cursor and swings like a hanging sign when you move the mouse past it

━━ GAMIFICATION & MOTIVATION ━━
- "Boss Battle" celebration modal: solving a Hard problem triggers a darkened overlay with fire ember particles, radial screen flashes, and intense motivational quotes
- Confetti explosion when you hit your exact daily goal
- Daily motivational quotes widget (sourced from Atomic Habits, Deep Work) with a refresh button
- Daily streak counter: shows consecutive days you've solved at least one problem

━━ AMBIENT & ENVIRONMENT ━━
- Ambient audio player: rain, ocean waves, flute, chanting sounds; powered by Web Audio API with an FFT frequency visualiser bar
- Dark/Light theme toggle
- PWA (Progressive Web App): installable on Android, iOS, Mac; works offline
- Responsive mobile layout
- Performance tiers: full / standard / lite for low-end or slow devices

━━ REMINDERS & NOTIFICATIONS ━━
- Morning email: lists SRS problems due for review
- Night/evening email: daily solved-problem summary
- Configurable reminder email address; unsubscribe link in every email

━━ CP RESOURCES ━━
- Integrated cp-algorithms.com reader: browse competitive programming algorithm docs inside the app without opening a new tab (uses a server-side CORS proxy)

━━ ACCOUNT, AUTH & ADMIN ━━
- Authentication via Clerk: sign in with email or Google OAuth
- User profile settings: name, email, phone number, reminder preferences, theme, performance tier
- Free tier + premium/subscribed tier (AI Code Analysis is premium-only)
- Admin-only panel: Add new Question to the database, Send broadcast email to all users, View all user Feedback submissions (with name and avatar)
- User feedback system: submit feedback from within the app (AI-validated, minimum 5 words)

━━ KEYBOARD SHORTCUTS ━━
S or / → focus search box | R → Smart Pick | F → Focus Mode | M → Mock Interview | H → Weakness Heatmap | Esc → close modal

━━ NOT BUILT YET (genuinely missing features) ━━
Public leaderboard, friend/peer comparison, following other users, social features, video explanations, discussion/comment threads per problem, difficulty voting, importing your LeetCode account or syncing LeetCode progress automatically, native mobile app, interview scheduling, resume builder.`;

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  let userEmail, clerkName;
  try {
    ({ email: userEmail, name: clerkName } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  let message;
  try {
    ({ message } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Message is required" }) };
  }

  const trimmed = message.trim();

  // ── Minimum word count (server-side guard, mirrors client) ────────────────
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: "Please write at least 5 words so we understand your feedback." }),
    };
  }

  if (trimmed.length > 2000) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Message too long (max 2000 chars)" }) };
  }

  const sql = getDb();

  // ── Per-user spam guard: max 2 submissions per 24 hours ──
  try {
    const [countRow] = await sql`
      SELECT COUNT(*) AS cnt FROM feedback
      WHERE user_email = ${userEmail}
        AND created_at > NOW() - INTERVAL '24 hours'
    `;
    if (parseInt(countRow?.cnt ?? 0, 10) >= 2) {
      return {
        statusCode: 429,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "You've submitted a lot of feedback today. Please wait before sending more." }),
      };
    }
  } catch { /* non-fatal — proceed */ }

  // ── AI evaluation ─────────────────────────────────────────────────────────
  let aiReply   = null;
  let alreadyImpl = false;
  let featureLocation = null;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_API_KEY) {
    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 250,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a strict product feedback classifier for AlgoTracker (algotracker.xyz), a DSA interview prep web app. Your ONLY job is to classify feedback about THIS app. Do not answer questions, give advice, write code, or respond to anything unrelated to AlgoTracker.

CURRENT FEATURES OF ALGOTRACKER:
${SITE_CONTEXT}

TASK: Classify the user's feedback message and respond with JSON only.

RULES:
1. "genuine" = true if the message is a real, actionable feature request, bug report, or suggestion ABOUT ALGOTRACKER SPECIFICALLY. Set to false for: gibberish, random characters, abuse, off-topic messages (e.g. general DSA questions, unrelated requests), test inputs like "hello" or "asdf", or anything not actionable for this app.
2. "already_implemented" = true if the core concept or use-case the user describes already exists in the app, even if they use different words. AlgoTracker IS itself a question progress tracker — marking problems done/undone, tracking solved counts, streaks, completion bars, and per-problem notes/solutions IS the progress tracking system. Match by concept and intent, not just exact wording.
3. "feature_location" = max 6 words saying where in the app it exists if already_implemented; else null.
4. "reply" = one sentence, max 20 words, shown directly to the user. Stay strictly on-topic about AlgoTracker only.
   - Not genuine or off-topic: ask them to submit feedback specifically about AlgoTracker.
   - Already implemented: name the feature and where to find it in the app.
   - Genuine new idea: thank them briefly.

OUTPUT — strict JSON, no markdown, no extra keys:
{"genuine":<bool>,"already_implemented":<bool>,"feature_location":<str|null>,"reply":<str>}`,
            },
            { role: "user", content: trimmed },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const choice = aiData?.choices?.[0];
        const raw = choice?.message?.content;
        // If the model hit the token cap the JSON will be truncated — treat as no AI response
        if (raw && choice?.finish_reason !== "length") {
          const parsed = JSON.parse(raw);
          aiReply        = parsed.reply         ?? null;
          alreadyImpl    = parsed.already_implemented === true;
          featureLocation = parsed.feature_location  ?? null;

          // Reject non-genuine feedback — don't save it
          if (parsed.genuine === false) {
            return {
              statusCode: 400,
              headers: { ...CORS, "Content-Type": "application/json" },
              body: JSON.stringify({
                ok: false,
                ai_rejected: true,
                error: aiReply || "Please write a clear, meaningful feedback so we can improve.",
              }),
            };
          }
        }
      } else {
        const errText = await aiRes.text().catch(() => '');
        console.error("[feedback-ai] OpenAI error", aiRes.status, errText);
      }
    } catch (aiErr) {
      console.error("[feedback-ai] exception:", aiErr?.message);
    }
  }

  // ── Save to DB ────────────────────────────────────────────────────────────
  try {
    let displayName = clerkName || null;
    if (!displayName) {
      const [row] = await sql`
        SELECT COALESCE(NULLIF(TRIM(clerk_name), ''), NULLIF(TRIM(name), '')) AS stored_name
        FROM   users WHERE email = ${userEmail} LIMIT 1
      `;
      displayName = row?.stored_name || null;
    }
    await sql`
      INSERT INTO feedback (user_email, user_name, message)
      VALUES (${userEmail}, ${displayName}, ${trimmed})
    `;
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        already_implemented: alreadyImpl,
        feature_location:    featureLocation,
        ai_reply:            aiReply,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
