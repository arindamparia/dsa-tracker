import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
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

  // ── Rate limiting — max 10 AI calls per user per minute ──────────────
  try {
    const allowed = await checkAIRateLimit(userEmail);
    if (!allowed) {
      return { statusCode: 429, headers: CORS, body: JSON.stringify({ ok: false, error: 'rate_limited', message: 'Too many requests. Please wait a moment and try again.' }) };
    }
  } catch {
    // If rate-limit check fails (DB issue), allow the request through
  }

  try {
    const { source, candidates } = JSON.parse(event.body);

    if (!source || !candidates || !candidates.length) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing source problem or candidates list' }) };
    }

    const candidateList = candidates.map((c, i) =>
      `${i}. [${c.difficulty}] ${c.name} (Topic: ${c.topic}, Tags: ${c.tags.join(', ')})`
    ).join('\n');

    const sourceDetails = `[${source.difficulty}] ${source.name} (Topic: ${source.topic}, Tags: ${source.tags.join(', ')})`;

    const messages = [
      {
        role: 'system',
        content: `You are a senior competitive programming coach. Given a source LeetCode problem (with difficulty, topic, and tags) and a ranked list of candidate problems (also with difficulty, topic, and tags), pick the 3 that are MOST similar in terms of underlying algorithm pattern, data structure, and problem-solving technique.

Consider not just the explicit topic/tags, but the actual algorithm usually required to solve them (e.g. if the source is a 2D matrix BFS, pick other 2D matrix BFS problems).
Assume the candidates are already somewhat filtered, but you act as the final tiebreaker for true algorithmic equivalence.

Respond ONLY with a JSON object: { "picks": [i, j, k] } where each value is a 0-based index from the provided candidate list. Do not provide any explanations.`
      },
      {
        role: 'user',
        content: `Source problem:\n${sourceDetails}\n\nCandidates:\n${candidateList}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('OpenAI error:', response.status, errBody);
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service returned an error. Please try again.' }) };
    }

    const data = await response.json();
    // Null-safe access — guard against unexpected OpenAI response shapes
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Unexpected OpenAI response shape:', JSON.stringify(data));
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected response from AI service.' }) };
    }

    try {
      const parsed = JSON.parse(content);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: parsed }) };
    } catch {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI returned malformed data. Please try again.' }) };
    }

  } catch (err) {
    console.error('rank-similar-problems error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
