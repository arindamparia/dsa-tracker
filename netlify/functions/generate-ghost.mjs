import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";
import { aiGate } from "./ai-gate.mjs";
import { callAI } from "./ai-service.mjs";
import { PROMPT_INJECTION_DEFENSE } from "./ai-config.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  // API key check is handled by callAI

  try {
    const { lcNumber, title, language = 'Python', platform = 'LeetCode', difficulty = 'Medium' } = JSON.parse(event.body);
    
    if (title?.length > 200 || lcNumber?.toString().length > 20 || language?.length > 50 || platform?.length > 50 || difficulty?.length > 50) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Input exceeds maximum allowed length' }) };
    }

    if (!title || !lcNumber) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing title or lcNumber' }) };
    }

    const sql = getDb();

    // 0. Verify the question is Hard difficulty (server-side enforcement)
    try {
      const [q] = await sql`SELECT difficulty FROM questions WHERE lc_number = ${lcNumber} LIMIT 1`;
      if (q && q.difficulty !== 'Hard') {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Ghost Replay is only available for Hard problems.' }) };
      }
    } catch { /* if questions table lookup fails, fall through */ }

    // 1. Check Cache
    try {
      const [cached] = await sql`
        SELECT json_data FROM ghost_cache
        WHERE lc_number = ${lcNumber} AND language = ${language}
      `;
      if (cached) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: cached.json_data }) };
      }
    } catch (e) {
      console.warn("Ghost cache read error:", e.message);
    }

    // 2. ai_access + daily limit + per-minute check (only on cache miss)
    const blocked = await aiGate(userEmail, CORS, { skipDailyLimit: true, fnName: 'generate_ghost' });
    if (blocked) return blocked;

    // Dynamic length based on difficulty
    let intuitionLength = "3-4 sentences";
    if (difficulty.toLowerCase() === 'hard') intuitionLength = "4-5 sentences";
    else if (difficulty.toLowerCase() === 'easy') intuitionLength = "2-3 sentences";

    const systemPrompt = `You are "Snowy", an elite Staff Software Engineer mentoring Indian engineering students preparing for placements. You are recording a "Ghost Replay" tutorial for the ${platform} problem: "${title}" (${difficulty} difficulty).
Your goal is to provide the most optimal solution in ${language}, and to simulate the cognitive process of writing it to teach the user.
Your tone MUST be encouraging, clear, and slightly colloquial (e.g., "The brute force approach is obvious, but it will give TLE. Let's find a better one").
You MUST explain abstract DSA concepts using highly relatable real-world analogies. Maintain a professional but friendly mentor tone without using excessive dog-related puns.

If the language is C++, you MUST strictly start your code with:
#include <bits/stdc++.h>
using namespace std;
If the language is Java, you MUST strictly start your code with:
import java.util.*;

Strict Coding Style Guidelines (Mandatory):
1. **Human-Readable Variables:** Ban single-letter variables entirely (except 'i', 'j' for simple loops). Use extremely descriptive, human-readable names that explain their purpose perfectly (e.g., 'maxCurrentProfit', 'leftBoundary', 'currentRunningSum', 'longestSubarrayLength'). Do NOT use obscure, overly mathematical, or heavily abbreviated variable names.
2. **Idiomatic Cleanliness:** NEVER use pedantic, cluttered type-casting like 'static_cast<int>(nums.size()) - 1'. Instead, explicitly cache array lengths at the top of the function (e.g., 'int n = nums.size();' or 'int n = nums.length;').
3. **Guard Clauses:** Use early returns to prevent deep nesting (e.g., 'if (root == null) return;').
4. **No Clever Hacks:** Favor readability over clever "one-liners" or obscure bitwise hacks unless the specific problem strictly requires it. Your code must be easily understood by a beginner.
5. **Strategic Spacing & Extensive Comments:** Use empty lines to separate cognitive chunks (base cases, initialization, main loop). You MUST write extensive, conversational, and self-explanatory inline comments ('//') directly inside the code to explain the complex logic, 'why' you are doing something, and the intuition behind it. Make the code completely self-explanatory to a beginner.

CRITICAL RULE — No Hallucination:
If you do not have confident, reliable knowledge of this specific problem and its optimal solution, you MUST NOT guess or invent code. Instead, immediately return this exact JSON and nothing else:
{ "not_found": true }

Only proceed with the full schema below if you are genuinely confident in the solution.

CORRECTNESS MANDATE (Non-Negotiable):
The 'optimal_code' you produce MUST be a complete, correct solution that passes ALL test cases on ${platform}, including edge cases (empty input, single element, maximum constraints, duplicates, negative numbers where applicable). Before finalising, mentally verify your solution against at least 3 representative test cases. If you have any doubt that the code would be accepted as a correct submission, return { "not_found": true } instead of guessing.

You must respond ONLY in valid JSON matching this exact schema:
{
  "naive_approach": "<A highly conversational explanation of the brute-force/naive approach. Explain what it is, and briefly state WHY it fails or gets Time Limit Exceeded (TLE). Use an encouraging mentor tone.>",
  "intuition": "<A highly conversational, easy-to-understand explanation of the optimal approach. Explain it using a relatable Indian real-world analogy. Must be exactly ${intuitionLength} long based on problem difficulty.>",
  "time_complexity": "<e.g., O(N log N)>",
  "space_complexity": "<e.g., O(1)>",
  "optimal_code": "<The complete, correct, highly optimized ${language} solution. It MUST pass ALL test cases including edge cases — incorrect or incomplete code is not acceptable. Must be strictly formatted, highly readable, production-grade code with excellent variable names. Do NOT include leading blank lines.>",

  "dry_run": [
    {
      "step": <integer index, e.g., 1, 2, 3>,
      "variable_state": "<A short string showing the key variables changing, e.g., 'i=0, max=5'>",
      "description": "<What is happening in this step of the dry run on a small example input>"
    }
  ]
}

JSON Formatting Rules (CRITICAL):
1. The 'optimal_code' field MUST NOT contain any markdown formatting like \`\`\`cpp or \`\`\`. It must be pure raw code.
2. Ensure all newlines, double quotes, and special characters inside 'optimal_code' and 'intuition' are properly escaped so the response is valid, parsable JSON.

`;

    const featureKey = (difficulty.toLowerCase() === 'medium' || difficulty.toLowerCase() === 'hard') 
      ? 'generate_ghost_hard' 
      : 'generate_ghost_easy';

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the Ghost Replay for ${title} on ${platform} in ${language}.` }
    ];

    const res = await callAI(featureKey, messages, {
      response_format: { type: "json_object" }
    });

    if (!res.ok) {
      console.error('AI service error:', await res.text());
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service error.' }) };
    }

    const d = await res.json();
    const content = d?.choices?.[0]?.message?.content;
    
    if (!content) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected AI response.' }) };
    }

    const parsed = JSON.parse(content);

    // If AI flagged it doesn't know the solution, return a clear user-friendly error
    if (parsed.not_found) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: 'NO_SOLUTION', message: `The Ghost Engine doesn't have a verified solution for "${title}" yet. Try a well-known LeetCode problem!` }) };
    }

    // 2. Save to Cache (only if a real solution was generated)
    try {
      await sql`
        INSERT INTO ghost_cache (lc_number, language, json_data)
        VALUES (${lcNumber}, ${language}, ${parsed})
        ON CONFLICT (lc_number, language) DO NOTHING
      `;
    } catch (e) {
      console.warn("Ghost cache write error:", e.message);
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: parsed }) };

  } catch (err) {
    console.error('Generate Ghost error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
