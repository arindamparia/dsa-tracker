import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

// ── AlgoTracker feature context — fed to AI on every request ─────────────────
const SITE_CONTEXT = `AlgoTracker (algotracker.xyz) — DSA question progress tracker and interview prep app.

PROGRESS TRACKING: mark problems done/undone (checkbox), solved count stats (Easy/Medium/Hard totals), overall completion % progress bar, daily streak counter, "solved today" green border highlight, per-problem solution code editor (auto-save, syntax-validated), per-problem notes editor (auto-save), time/space complexity dropdowns (16 Big-O options), needs-review star flag, view toggles to hide/show solutions/notes/tags/company-pills globally

PROBLEMS: 450+ LeetCode problems + Codeforces/AtCoder/CSES support, organised into topic sections (Arrays, Strings, LinkedList, Trees, Graphs, Dynamic Programming, Binary Search, Stack/Queue, Hashing, Greedy, Backtracking, Two Pointers, Sliding Window, Bit Manipulation), Easy/Medium/Hard difficulty tags, collapsible section accordions, admin can add custom questions

SEARCH & FILTERS: real-time full-text search (title/topic/tags), difficulty filter (Easy/Medium/Hard), status filter (Done/Undone/Review/starred), company filter dropdown (527+ companies with solve progress bar and solved/total count)

COMPANY FEATURES: company pills on each problem row (sorted by frequency), 527+ company filter dropdown, Company Prep Mode (select a company → filters to only its problems, sticky session bar with solved count + elapsed time, end session → summary modal with Easy/Medium/Hard breakdown), Company Stats panel (Interview Readiness Score per company: Hard×3 + Medium×2 + Easy×1, labels: Interview Ready/On Track/Needs Work/Just Starting)

STUDY MODES: Focus Mode (select topic → strips UI to only unsolved problems in that section, auto-starts stopwatch, exit → session summary with time + problems solved by difficulty), Company Prep Mode (described above), Mock Interview Mode (configure Easy+Medium+Hard count + optional company/section filter + time limit 30/45/60/90/120 min, AI disabled during session, countdown turns red in final 5 min, submit → report card with score + rating Excellent/Passed/Needs Practice)

AI FEATURES: AI Hint per problem (1-2 sentence nudge, free), AI Code Analysis (complexity extraction, LeetCode-style breakdown, approach vs optimal, code style score, premium only), AI Similar Problems (top 3 structurally similar problems ranked by AI, cached, clickable to jump), Smart Pick/Smart Queue (adaptive scoring: section weakness 35% + difficulty progression 25% + SRS urgency 20% + company relevance 15% + never attempted 5%; shortcut R; next suggestion slide-in card after solving)

SPACED REPETITION (SRS): Anki-style review queue, intervals 1d/3d/1w/2w/1mo, due-problems banner at top of dashboard, Mark Reviewed button, morning email listing due reviews

ANALYTICS & STATS: stats bar (total solved + Easy/Medium/Hard counts + streak), global progress bar, daily goal ring (SVG fills as you solve, confetti on exact goal hit, ghost ring for over-achievement), Mastery Radar Chart (proficiency per algorithm topic), Activity Heatmap (GitHub-style daily grid, hover for count), Weakness Heatmap (section × difficulty grid coloured red→green by completion %, click cell to filter, shortcut H)

TIME MANAGEMENT: Stopwatch + Pomodoro timer (floating header widget, configurable hours+minutes), physics-based timer button (leans toward cursor, swings on hover)

GAMIFICATION: Boss Battle modal on Hard solve (fire embers, screen flashes, quotes), confetti on daily goal, daily motivational quotes widget (refresh button), streak counter

AMBIENT & UI: ambient audio player (rain/ocean/flute/chanting + FFT visualiser), dark/light theme toggle, PWA (installable on Android/iOS/Mac, offline support), responsive mobile layout, performance tiers (full/standard/lite)

REMINDERS: morning SRS review email, night solved-summary email, configurable email address, unsubscribe link

CP RESOURCES: integrated cp-algorithms.com reader (server-side CORS proxy, no new tab needed)

ACCOUNT & AUTH: Clerk auth (email + Google OAuth), user profile (name/email/phone/reminders/theme/perf tier), free + premium tier (AI Code Analysis gated)

ADMIN ONLY: add question, broadcast email to all users, view all feedback submissions (with name + avatar)

KEYBOARD SHORTCUTS: S or / (search), R (Smart Pick), F (Focus Mode), M (Mock Interview), H (Weakness Heatmap), Esc (close modal)

NOT BUILT (genuinely missing): public leaderboard, friend/peer comparison, social features, video explanations, discussion comments per problem, difficulty voting, LeetCode account import/sync, native mobile app, interview scheduling, resume builder`;

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

  // ── Block admins from submitting feedback ─────────────────────────────────
  const sql = getDb();
  const [callerRow] = await sql`SELECT role FROM users WHERE email = ${userEmail} LIMIT 1`;
  if (callerRow?.role === "ADMIN") {
    return {
      statusCode: 403,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Admins cannot submit feedback." }),
    };
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
  let aiReply        = null;
  let alreadyImpl    = false;
  let featureLocation = null;
  let isGenuine      = true; // default true; set false only when AI explicitly says not genuine
  let aiCategory     = null; // feature_request | bug_report | suggestion | already_exists | spam | off_topic

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
          max_tokens: 320,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a feedback classifier for AlgoTracker (algotracker.xyz). Classify the user message and output JSON only.

OUTPUT FORMAT (strict JSON, no markdown, no extra keys):
{"genuine":<bool>,"category":<str>,"already_implemented":<bool>,"feature_location":<str|null>,"spam_reason":<str|null>,"reply":<str>}

CLASSIFICATION RULES — follow these exactly:
1. "genuine": true if the message is a real feature request, bug report, or suggestion specifically about AlgoTracker. False for gibberish, random text, abuse, off-topic content, meaningless test inputs like "hello", "test", "asdf".
2. "category": classify into exactly one of these — "feature_request" | "bug_report" | "suggestion" | "already_exists" | "spam" | "off_topic". Use "already_exists" when genuine but already implemented. Use "spam" when not genuine AND looks like intentional spam/abuse. Use "off_topic" when not genuine but not spam (e.g. general DSA questions).
3. "already_implemented": true if the feature or concept the user describes ALREADY EXISTS in AlgoTracker (see feature list below). Match by concept and intent — not just exact words.
4. "feature_location": if already_implemented, write max 6 words describing where it is in the app. Otherwise null.
5. "spam_reason": if not genuine, write max 8 words explaining why (e.g. "random characters", "unrelated DSA question", "abusive language"). Otherwise null.
6. "reply": one sentence, max 20 words, shown to the user.
   - If not genuine: politely ask them to send real AlgoTracker feedback.
   - If already_implemented: tell them the feature exists and where to find it.
   - If genuine new idea: thank them briefly.

ALGOTRACKER FEATURE LIST — check this carefully before deciding already_implemented:
${SITE_CONTEXT}`,
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
          aiReply         = parsed.reply              ?? null;
          alreadyImpl     = parsed.already_implemented === true;
          featureLocation = parsed.feature_location    ?? null;
          isGenuine       = parsed.genuine !== false;
          aiCategory      = parsed.category            ?? null;
          // all cases fall through to save — counts toward daily limit
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
      INSERT INTO feedback (user_email, user_name, message, is_genuine, ai_category)
      VALUES (${userEmail}, ${displayName}, ${trimmed}, ${isGenuine}, ${aiCategory})
    `;

    // Non-genuine: saved (counts toward limit) but tell user to write real feedback
    if (!isGenuine) {
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
