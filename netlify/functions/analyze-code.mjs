import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";
import { checkAIRateLimit } from "./rate-limit.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'AI service temporarily unavailable.' }) };
  }

  try {
    const { action, title, code, platform = 'LeetCode' } = JSON.parse(event.body);
    // Sanitize platform — only allow known values to prevent prompt injection
    const KNOWN_PLATFORMS = ['LeetCode','Codeforces','AtCoder','CSES','GeeksforGeeks','SPOJ','HackerRank','HackerEarth','Codewars','Exercism','CodinGame','Project Euler','CodeChef','CodingNinjas'];
    const safePlatform = KNOWN_PLATFORMS.includes(platform) ? platform : 'LeetCode';
    if (!action || !title) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing action or title' }) };
    }

    // ── Hints: free for all, just per-minute rate limit ───────────────────
    if (action === 'hint') {
      try {
        const allowed = await checkAIRateLimit(userEmail);
        if (!allowed) {
          return { statusCode: 429, headers: CORS, body: JSON.stringify({ ok: false, error: 'rate_limited', message: 'Too many requests. Please wait a moment.' }) };
        }
      } catch { /* allow through on DB failure */ }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages: [
            {
              role: 'system',
              content: `You are a strict, concise coding interviewer. The user needs a hint for: "${title}". Provide a single nudge or concept to think about. DO NOT write code. DO NOT give the direct answer. Maximum 3 sentences.`
            },
            { role: 'user', content: `Hint for ${title}?` }
          ]
        })
      });
      if (!res.ok) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service error.' }) };
      const d = await res.json();
      const content = d?.choices?.[0]?.message?.content;
      if (!content) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected AI response.' }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: content }) };
    }

    // ── Analyze: two-stage prompting ──────────────────────────────────────
    if (action === 'analyze') {
      if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Code is required for analysis' }) };

      // STAGE 0: Check ai_access + enforce daily limit (READ + CHECK only, no increment yet)
      let dailyLimit = 4;
      try {
        const sql = getDb();
        const [row] = await sql`SELECT ai_access, ai_daily_limit FROM users WHERE email = ${userEmail}`;
        if (!row?.ai_access) {
          return { statusCode: 403, headers: CORS, body: JSON.stringify({ ok: false, error: 'subscription_required' }) };
        }
        dailyLimit = row.ai_daily_limit ?? 4;

        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const [usage] = await sql`
          SELECT COALESCE(SUM(count), 0)::int AS total
          FROM ai_rate_limits
          WHERE user_email = ${userEmail}
            AND window_start >= ${dayStart.toISOString()}
        `;
        if (userEmail !== 'arindamparia321@gmail.com' && (usage?.total ?? 0) >= dailyLimit) {
          return {
            statusCode: 429,
            headers: CORS,
            body: JSON.stringify({
              ok: false,
              error: 'daily_limit_reached',
              message: `You've used all ${dailyLimit} AI analyses for today. Resets at midnight UTC.`,
            }),
          };
        }
      } catch {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) };
      }

      // INCREMENT the daily counter NOW — counts for both mismatch detections and full analyses.
      // This prevents users from gaming the limit by spamming wrong solutions.
      try {
        const allowed = await checkAIRateLimit(userEmail);
        if (!allowed) {
          return { statusCode: 429, headers: CORS, body: JSON.stringify({ ok: false, error: 'rate_limited', message: 'Too many requests. Please wait a moment.' }) };
        }
      } catch { /* allow through on DB failure */ }

      // STAGE 1: Cheap mismatch detection (~50-80 tokens)
      // Runs AFTER the counter is incremented so mismatches cost a daily use.
      let isMismatch = false;
      let mismatchReason = '';
      try {
        const detectRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-5.4-mini',
            max_tokens: 80,
            messages: [
              {
                role: 'system',
                content: `You are a strict code-problem matcher. Determine if the given code is a reasonable attempt to solve the ${safePlatform} problem: "${title}".
Reply ONLY with valid JSON: { "match": true/false, "reason": "<one sentence>" }
- match=true  if the code is a plausible attempt at this problem (even if wrong or suboptimal)
- match=false if the code is clearly for a DIFFERENT problem, is empty, or is a stub with no logic`
              },
              { role: 'user', content: `Problem: ${title}\n\nCode:\n${code}` }
            ]
          })
        });
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          const raw = detectData?.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(raw);
          if (parsed.match === false) {
            isMismatch = true;
            mismatchReason = parsed.reason || 'The code does not appear to solve this problem.';
          }
        }
        // If detection fails for any reason → fail open (proceed to full analysis)
      } catch { /* ignore — fail open */ }

      // Mismatch: return early with a clear message. Daily counter is already incremented.
      if (isMismatch) {
        return {
          statusCode: 200,
          headers: CORS,
          body: JSON.stringify({
            ok: true,
            data: { mismatch: true, reason: mismatchReason }
          }),
        };
      }

      // STAGE 2: Full analysis — code confirmed to match the problem
      const messages = [
        {
          role: 'system',
          content: `You are an elite algorithm interview coach. Analyze the submitted code for the ${safePlatform} problem: "${title}".
Be direct, specific, and encouraging — like a senior engineer doing a real code review.
Respond ONLY with valid JSON using exactly this schema (no extra keys, no markdown):
{
  "time_complexity": "<Big-O string using standard notation, e.g. 'O(n)'>",
  "space_complexity": "<Big-O string>",
  "summary": "<1-2 sentence overall verdict. Start with 'Congratulations!' if current_time_complexity equals suggested_time_complexity (already optimal), or 'Good attempt!' if a strictly better complexity exists. Name the specific algorithm and what was impressive or what can improve.>",
  "approach": {
    "current": "<Algorithm/technique name only, e.g. 'Two Pointers', 'Hash Map + Sliding Window', 'Bottom-Up DP'>",
    "suggested": "<Most optimal algorithm name. Identical to current if already optimal.>",
    "key_idea": "<One precise sentence: the core insight of the optimal approach.>",
    "consider": "<One sentence follow-up question to deepen understanding — about edge cases, scaling, or a harder variant.>"
  },
  "efficiency": {
    "current_time_complexity": "<Big-O of the submitted code>",
    "suggested_time_complexity": "<The BEST possible time complexity for this problem. MUST be equal to or strictly better (lower) than current_time_complexity. NEVER suggest a worse complexity as an improvement.>",
    "current_space_complexity": "<Big-O of the submitted code>",
    "suggested_space_complexity": "<The BEST possible space complexity. MUST be equal to or strictly better than current_space_complexity.>",
    "time_suggestions": "<1-2 sentences specifically about TIME complexity. If suggested_time equals current_time, celebrate and say it is optimal. Otherwise explain the concrete algorithmic change needed to achieve the better time complexity.>",
    "space_suggestions": "<1-2 sentences specifically about SPACE complexity. If suggested_space equals current_space, celebrate and say it is optimal. Otherwise explain the concrete change needed to reduce memory usage.>"
  },
  "code_style": {
    "readability": <integer 1, 2, or 3>,
    "structure": <integer 1, 2, or 3>,
    "suggestions": "<1-2 concrete sentences on naming, spacing, comments, or logical organisation.>"
  }
}
Scoring guide for code_style integers:
- readability 1 = hard to follow (cryptic names, zero spacing)  2 = acceptable but improvable  3 = clean and self-documenting
- structure 1 = monolithic / hard to trace logic  2 = reasonable flow  3 = excellent organisation
Complexity strings: prefer standard formats — O(1), O(log n), O(sqrt(n)), O(n), O(n log n), O(n+m), O(n²), O(2^n) etc. Use custom format only if genuinely more precise.
CRITICAL RULE — No Hallucination: If you do not have confident knowledge of this specific problem "${title}", you MUST NOT guess or invent an analysis. Instead return ONLY: { "not_found": true }`
        },
        { role: 'user', content: `Problem: ${title}\n\nCode:\n${code}` }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5.4-mini', messages, response_format: { type: 'json_object' } })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('OpenAI error:', response.status, errBody);
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service returned an error. Please try again.' }) };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.error('Unexpected OpenAI response shape:', JSON.stringify(data));
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected response from AI service.' }) };
      }

      try {
        const parsed = JSON.parse(content);
        if (parsed.not_found) {
          return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: 'NO_SOLUTION', message: `We can't analyze this question right now, sorry! Try a different problem.` }) };
        }
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: parsed }) };
      } catch {
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI returned malformed data. Please try again.' }) };
      }
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (err) {
    console.error('analyze-code error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
