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
    const { lcNumber, title, language = 'Python', platform = 'LeetCode', difficulty = 'Medium' } = JSON.parse(event.body);
    
    if (!title || !lcNumber) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing title or lcNumber' }) };
    }

    const sql = getDb();
    
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

    // Rate limiting (only applied if cache misses)
    try {
      const allowed = await checkAIRateLimit(userEmail);
      if (!allowed) {
        return { statusCode: 429, headers: CORS, body: JSON.stringify({ ok: false, error: 'rate_limited', message: 'Too many requests. Please wait a moment.' }) };
      }
    } catch { /* allow through on DB failure */ }

    // Dynamic length based on difficulty
    let intuitionLength = "3-4 sentences";
    if (difficulty.toLowerCase() === 'hard') intuitionLength = "4-5 sentences";
    else if (difficulty.toLowerCase() === 'easy') intuitionLength = "2-3 sentences";

    const systemPrompt = `You are an elite, highly instructive Staff Software Engineer recording a "Ghost Replay" tutorial for the ${platform} problem: "${title}" (${difficulty} difficulty). 
Your goal is to provide the most optimal solution in ${language}, and to simulate the cognitive process of writing it to teach the user.
If the language is C++, you MUST strictly start your code with:
#include <bits/stdc++.h>
using namespace std;
If the language is Java, you MUST strictly start your code with:
import java.util.*;

Strict Coding Style Guidelines (Mandatory):
1. **Self-Explanatory Variables:** Ban single-letter variables (except 'i', 'j' for loops). Use highly descriptive names (e.g., 'maxProfit', 'leftIndex', 'currentSum').
2. **Idiomatic Cleanliness:** NEVER use pedantic, cluttered type-casting like 'static_cast<int>(nums.size()) - 1'. Instead, explicitly cache array lengths at the top of the function (e.g., 'int n = nums.size();' or 'int n = nums.length;').
3. **Guard Clauses:** Use early returns to prevent deep nesting (e.g., 'if (root == null) return;').
4. **No Clever Hacks:** Favor readability over clever "one-liners" or obscure bitwise hacks unless the specific problem strictly requires it.
5. **Strategic Spacing & Comments:** Use empty lines to separate cognitive chunks (base cases, initialization, main loop). Use brief inline comments ('//') to explain complex logic that isn't covered by your thought pauses.

CRITICAL RULE — No Hallucination:
If you do not have confident, reliable knowledge of this specific problem and its optimal solution, you MUST NOT guess or invent code. Instead, immediately return this exact JSON and nothing else:
{ "not_found": true }

Only proceed with the full schema below if you are genuinely confident in the solution.

CORRECTNESS MANDATE (Non-Negotiable):
The 'optimal_code' you produce MUST be a complete, correct solution that passes ALL test cases on ${platform}, including edge cases (empty input, single element, maximum constraints, duplicates, negative numbers where applicable). Before finalising, mentally verify your solution against at least 3 representative test cases. If you have any doubt that the code would be accepted as a correct submission, return { "not_found": true } instead of guessing.

You must respond ONLY in valid JSON matching this exact schema:
{
  "intuition": "<A high-level explanation of how to approach the problem and why this approach works. Must be exactly ${intuitionLength} long based on problem difficulty.>",
  "time_complexity": "<e.g., O(N log N)>",
  "space_complexity": "<e.g., O(1)>",
  "optimal_code": "<The complete, correct, highly optimized ${language} solution. It MUST pass ALL test cases including edge cases — incorrect or incomplete code is not acceptable. Must be strictly formatted, highly readable, production-grade code with excellent variable names. Do NOT include leading blank lines.>",
  "thought_pauses": [
    {
      "line_number": <integer>,
      "annotation": "<A precise, concise, punchy 1-2 sentence explanation. State exactly WHY this choice is optimal and the Big-O impact. Keep it short and impactful.>"
    }
  ]
}

Rules for 'thought_pauses':
1. Create exactly 3 to 4 pauses at the most complex cognitive leaps (e.g., setting up DP, pointer logic, complex base cases).
2. The 'line_number' must exactly match the 1-indexed line in 'optimal_code'.
3. Do NOT place pauses on boilerplate.
4. The 'annotation' MUST be highly conversational, descriptive, and human-readable. Explain it as if you are a friendly mentor explaining the deeper 'why' behind the logic. It MUST be exactly 4 to 5 sentences long.`;

    // Dynamic model routing based on difficulty
    let aiModel = 'gpt-4o-mini'; // Use previous lightweight model for Easy
    if (difficulty.toLowerCase() === 'medium' || difficulty.toLowerCase() === 'hard') {
      aiModel = 'gpt-5.5-2026-04-23'; // Use flagship model for Medium and Hard
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: aiModel,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the Ghost Replay for ${title} on ${platform} in ${language}.` }
        ]
      })
    });

    if (!res.ok) {
      console.error('OpenAI error:', await res.text());
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
