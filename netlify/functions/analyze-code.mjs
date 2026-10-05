import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";
import { aiGate, refundDailyUse } from "./ai-gate.mjs";
import { callAI, parseAIJson } from "./ai-service.mjs";
import { PROMPT_INJECTION_DEFENSE } from "./ai-config.mjs";

// Maps a thrown callAI error (timeout, provider down, missing key) to a JSON response.
const aiFailure = (err) => {
  const timedOut = err?.status === 504;
  return {
    statusCode: timedOut ? 504 : 502,
    headers: CORS,
    body: JSON.stringify({
      error: timedOut
        ? 'The AI took too long to respond. Please try again.'
        : 'AI service returned an error. Please try again.',
    }),
  };
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  // API key check is handled by callAI

  try {
    const { action, title, code, platform = 'LeetCode' } = JSON.parse(event.body);
    
    if (title?.length > 200 || (code && code.length > 20000)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Input exceeds maximum allowed length' }) };
    }

    // Sanitize platform — only allow known values to prevent prompt injection
    const KNOWN_PLATFORMS = ['LeetCode','Codeforces','AtCoder','CSES','GeeksforGeeks','SPOJ','HackerRank','HackerEarth','Codewars','Exercism','CodinGame','Project Euler','CodeChef','CodingNinjas'];
    const safePlatform = KNOWN_PLATFORMS.includes(platform) ? platform : 'LeetCode';
    if (!action || !title) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing action or title' }) };
    }

    // ── Hints: free for all, just per-minute rate limit ───────────────────
    if (action === 'hint') {
      const hintBlocked = await aiGate(userEmail, CORS, { skipDailyLimit: true, fnName: 'analyze_code_hint' });
      if (hintBlocked) return hintBlocked;

      const messages = [
        {
          role: 'system',
          content: `You are a strict, concise coding interviewer. The user needs a hint for: "${title}". Provide a single nudge or concept to think about. DO NOT write code. DO NOT give the direct answer. Maximum 3 sentences.` + PROMPT_INJECTION_DEFENSE
        },
        { role: 'user', content: `Hint for ${title}?` }
      ];

      let res;
      try { res = await callAI('analyze_code_hint', messages); }
      catch (err) { console.error('analyze-code hint error:', err.message); return aiFailure(err); }
      if (!res.ok) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service error.' }) };
      const d = await res.json();
      const content = d?.choices?.[0]?.message?.content;
      if (!content) return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected AI response.' }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: content }) };
    }

    // ── Analyze: two-stage prompting ──────────────────────────────────────
    if (action === 'analyze') {
      if (!code) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Code is required for analysis' }) };

      // STAGE 0: rate limits + ai_access + daily quota (takes one daily use).
      // Single call — each aiGate call counts against the 1/s limiter, so a second
      // "burst" call would reject every request.
      const blocked = await aiGate(userEmail, CORS, { fnName: 'analyze_code' });
      if (blocked) return blocked;

      // STAGE 1: Cheap mismatch detection (~50-80 tokens)
      // Runs AFTER the counter is incremented so mismatches cost a daily use.
      let isMismatch = false;
      let mismatchReason = '';
      try {
        const messages = [
          {
            role: 'system',
            content: `You are a strict code-problem matcher. Determine if the given code is a reasonable attempt to solve the ${safePlatform} problem: "${title}".
Reply ONLY with valid JSON: { "match": true/false, "reason": "<one sentence>" }
- match=true  if the code is a plausible attempt at this problem (even if wrong or suboptimal)
- match=false if the code is clearly for a DIFFERENT problem, is empty, or is a stub with no logic`
          },
          { role: 'user', content: `Problem: ${title}\n\nCode:\n${code}` }
        ];

        const detectRes = await callAI('analyze_code_mismatch', messages, {
          max_tokens: 80,
          timeoutMs: 6000,   // cheap check: don't let it eat the analysis budget
          maxAttempts: 1
        });
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          const parsed = parseAIJson(detectData?.choices?.[0]?.message?.content || '{}');
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
  "is_correct_solution": <true if the code logic is correct and would pass test cases for this problem; false if it has bugs, wrong logic, or would fail>,
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
- structure 1 = monolithic / hard to trace logic  2 = reasonable flow  3 = excellent organisation` + PROMPT_INJECTION_DEFENSE + `Complexity strings: prefer standard formats — O(1), O(log n), O(sqrt(n)), O(n), O(n log n), O(n+m), O(n²), O(2^n) etc. Use custom format only if genuinely more precise.
CRITICAL RULE — No Hallucination: If you do not have confident knowledge of this specific problem "${title}", you MUST NOT guess or invent an analysis. Instead return ONLY: { "not_found": true }`
        },
        { role: 'user', content: `Problem: ${title}\n\nCode:\n${code}` }
      ];

      let response;
      try {
        response = await callAI('analyze_code_full', messages, {
          response_format: { type: 'json_object' },
          timeoutMs: 9000    // 2 attempts x 9s + backoff + 6s mismatch check stays under the 26s function limit
        });
      } catch (err) {
        console.error('analyze-code AI error:', err.status, err.message);
        await refundDailyUse(userEmail);
        return aiFailure(err);
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error('AI error:', response.status, errBody);
        await refundDailyUse(userEmail);
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service returned an error. Please try again.' }) };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.error('Unexpected AI response shape:', JSON.stringify(data));
        await refundDailyUse(userEmail);
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected response from AI service.' }) };
      }

      try {
        const parsed = parseAIJson(content);
        if (parsed.not_found) {
          await refundDailyUse(userEmail);
          return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: 'NO_SOLUTION', message: `We can't analyze this question right now, sorry! Try a different problem.` }) };
        }
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: parsed }) };
      } catch {
        await refundDailyUse(userEmail);
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI returned malformed data. Please try again.' }) };
      }
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (err) {
    console.error('analyze-code error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
