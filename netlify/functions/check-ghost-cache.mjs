import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";
import { ghostChannel, publicPusherConfig } from "./ghost-events.mjs";

// Keep LOCK_STALE_MS in sync with generate-ghost-background.
const LOCK_STALE_MS  = 5 * 60 * 1000;
const MAX_WAIT_MS    = 20000; // must stay under this function's 26s timeout (netlify.toml)
const POLL_EVERY_MS  = 1500;  // DB check cadence while a request is held open

const json = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) });

// When Pusher is configured, tell the client which channel to subscribe to (null → keep long-polling).
const realtimeFor = (lcNumber, language) => {
  const cfg = publicPusherConfig();
  return cfg ? { ...cfg, channel: ghostChannel(lcNumber, language) } : null;
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  try {
    const { lcNumber, title, language = 'Python', wait = false } = JSON.parse(event.body);

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

    // 1. Check Cache.
    //    wait=true turns this into a long-poll: the request is held open (up to MAX_WAIT_MS)
    //    until generation finishes or fails, so the client gets the result the moment the
    //    background function writes it — no fixed polling interval to wait out.
    const deadline = Date.now() + (wait ? MAX_WAIT_MS : 0);
    while (true) {
      let cached;
      try {
        [cached] = await sql`
          SELECT json_data FROM ghost_cache
          WHERE lc_number = ${lcNumber} AND language = ${language}
        `;
      } catch (e) {
        console.warn("Ghost cache read error:", e.message);
        if (!wait) break;
      }

      const data = cached?.json_data;
      if (data) {
        if (data.status === 'generating') {
          if (Date.now() - (data.started_at || 0) > LOCK_STALE_MS) {
            // Lock is older than 5 minutes, assume crashed and clear it
            await sql`DELETE FROM ghost_cache WHERE lc_number = ${lcNumber} AND language = ${language}`;
            return wait
              ? json(200, { ok: false, status: 'failed' })
              : json(200, { ok: false, status: 'pending', realtime: realtimeFor(lcNumber, language) });
          }
          // still generating → fall through to wait/return below
        } else if (data.status === 'failed') {
          // Initial check: report 'pending' so the client re-triggers generation (the
          // background function takes over failed rows). While waiting: tell the client it failed.
          return wait
            ? json(200, { ok: false, status: 'failed' })
            : json(200, { ok: false, status: 'pending', realtime: realtimeFor(lcNumber, language) });
        } else if (data.not_found) {
          return json(404, { ok: false, error: 'NO_SOLUTION', message: `The Ghost Engine doesn't have a verified solution for "${title}" yet. Try a well-known LeetCode problem!` });
        } else {
          return json(200, { ok: true, data });
        }
      }

      if (Date.now() + POLL_EVERY_MS > deadline) {
        return json(200, { ok: false, status: data ? 'generating' : 'pending', realtime: realtimeFor(lcNumber, language) });
      }
      await new Promise(r => setTimeout(r, POLL_EVERY_MS));
    }

    // Cache read failed (non-wait mode): return pending so frontend can trigger background function
    return json(200, { ok: false, status: 'pending', realtime: realtimeFor(lcNumber, language) });

  } catch (err) {
    console.error('Check Ghost Cache error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
