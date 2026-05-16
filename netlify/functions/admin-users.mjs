import { getAuthEmail } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

const ADMIN_EMAIL = "arindamparia321@gmail.com";

/**
 * Verifies the calling user is an ADMIN.
 * Double-checks: Clerk JWT (via getAuthEmail) + DB role column.
 * Never trusts frontend state — role is re-read from DB on every request.
 */
async function verifyAdmin(event, sql) {
  const callerEmail = await getAuthEmail(event); // throws 401 if token invalid

  // Hard-coded owner bypass — always admin regardless of DB role
  if (callerEmail === ADMIN_EMAIL) return callerEmail;

  // DB role check — must be explicitly set to ADMIN
  const [row] = await sql`SELECT role FROM users WHERE email = ${callerEmail} LIMIT 1`;
  if (!row || row.role !== 'ADMIN') {
    const err = new Error('Forbidden: Admin access required');
    err.statusCode = 403;
    throw err;
  }
  return callerEmail;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  const sql = getDb();
  let callerEmail;

  try {
    callerEmail = await verifyAdmin(event, sql);
  } catch (err) {
    const status = err.statusCode || 401;
    return { statusCode: status, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  // ── GET: list / search users ─────────────────────────────────────
  if (event.httpMethod === "GET") {
    try {
      const q = (event.queryStringParameters?.q || '').trim().toLowerCase();
      const limit = Math.min(parseInt(event.queryStringParameters?.limit || '50', 10), 50);

      let users;
      if (q) {
        users = await sql`
          SELECT
            email, COALESCE(clerk_name, name, '') AS name,
            role, is_subscribed, ai_access, ai_daily_limit,
            last_active, created_at
          FROM users
          WHERE LOWER(email) LIKE ${'%' + q + '%'}
             OR LOWER(COALESCE(clerk_name, name, '')) LIKE ${'%' + q + '%'}
          ORDER BY last_active DESC NULLS LAST
          LIMIT ${limit}
        `;
      } else {
        users = await sql`
          SELECT
            email, COALESCE(clerk_name, name, '') AS name,
            role, is_subscribed, ai_access, ai_daily_limit,
            last_active, created_at
          FROM users
          ORDER BY last_active DESC NULLS LAST
          LIMIT ${limit}
        `;
      }

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: true, users }),
      };
    } catch (err) {
      console.error('admin-users GET error:', err);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'Internal server error' }) };
    }
  }

  // ── POST: toggle AI access ───────────────────────────────────────
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || '{}');
      const { action, target_email, value } = body;

      if (!['set_ai_access', 'set_daily_limit'].includes(action)) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Invalid action' }) };
      }

      // Validate target_email strictly
      if (!target_email || typeof target_email !== 'string' || !target_email.includes('@')) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Invalid target_email' }) };
      }
      // For set_ai_access: value must be boolean. For set_daily_limit: value must be a positive integer.
      if (action === 'set_ai_access' && typeof value !== 'boolean') {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'value must be boolean for set_ai_access' }) };
      }
      if (action === 'set_daily_limit' && (typeof value !== 'number' || value < 1)) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'value must be a positive number for set_daily_limit' }) };
      }

      const safeEmail = target_email.trim().toLowerCase();

      // Verify target user actually exists in DB
      const [target] = await sql`SELECT email FROM users WHERE email = ${safeEmail} LIMIT 1`;
      if (!target) {
        return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: 'User not found' }) };
      }

      if (action === 'set_ai_access') {
        const [updated] = await sql`
          UPDATE users
          SET ai_access = ${value}
          WHERE email = ${safeEmail}
          RETURNING email, COALESCE(clerk_name, name, '') AS name, role, is_subscribed, ai_access, ai_daily_limit, last_active, created_at
        `;
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: updated }) };
      }

      if (action === 'set_daily_limit') {
        // value is already validated as a number; clamp it to 1–50
        const clampedLimit = Math.max(1, Math.min(50, Math.floor(Number(value))));
        if (!Number.isFinite(clampedLimit)) {
          return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Invalid limit value' }) };
        }
        const [updated] = await sql`
          UPDATE users
          SET ai_daily_limit = ${clampedLimit}
          WHERE email = ${safeEmail}
          RETURNING email, COALESCE(clerk_name, name, '') AS name, role, is_subscribed, ai_access, ai_daily_limit, last_active, created_at
        `;
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, user: updated }) };
      }
    } catch (err) {
      console.error('admin-users POST error:', err);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'Internal server error' }) };
    }
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
};
