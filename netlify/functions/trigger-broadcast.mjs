import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

/** Admin-only endpoint — verifies ADMIN role, then triggers the broadcast. */
export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let userEmail;
  try {
    ({ email: userEmail } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();
    const [row] = await sql`SELECT role FROM users WHERE email = ${userEmail}`;
    if (!row || row.role !== "ADMIN") {
      return { statusCode: 403, headers: CORS, body: JSON.stringify({ ok: false, error: "Forbidden: admin only" }) };
    }

    const secret = process.env.REMINDER_SECRET;
    if (!secret) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: "Broadcast secret not configured" }) };
    }

    const siteUrl = process.env.NETLIFY_DEV
      ? "http://localhost:8888"
      : (process.env.URL || "https://algotracker.xyz");
    const res  = await fetch(`${siteUrl}/.netlify/functions/broadcast?secret=${encodeURIComponent(secret)}`);
    const data = await res.json();

    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
