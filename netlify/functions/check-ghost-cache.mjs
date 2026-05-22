import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  try {
    const { lcNumber, title, language = 'Python', difficulty = 'Medium' } = JSON.parse(event.body);

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
    } catch { /* fall through if lookup fails */ }

    // 1. Check Cache
    try {
      const [cached] = await sql`
        SELECT json_data FROM ghost_cache
        WHERE lc_number = ${lcNumber} AND language = ${language}
      `;
      if (cached) {
        if (cached.json_data && cached.json_data.status === 'generating') {
          const startedAt = cached.json_data.started_at || 0;
          if (Date.now() - startedAt > 300000) {
            // Lock is older than 5 minutes, assume crashed and clear it
            await sql`DELETE FROM ghost_cache WHERE lc_number = ${lcNumber} AND language = ${language}`;
            return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, status: 'pending' }) };
          }
          return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, status: 'generating' }) };
        }
        if (cached.json_data && cached.json_data.not_found) {
          return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: 'NO_SOLUTION', message: `The Ghost Engine doesn't have a verified solution for "${title}" yet. Try a well-known LeetCode problem!` }) };
        }
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: cached.json_data }) };
      }
    } catch (e) {
      console.warn("Ghost cache read error:", e.message);
    }

    // Cache miss, return pending so frontend can trigger background function
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, status: 'pending' }) };

  } catch (err) {
    console.error('Check Ghost Cache error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
