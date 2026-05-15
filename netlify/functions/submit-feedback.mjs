import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

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

  let message;
  try {
    ({ message } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Message is required" }) };
  }
  if (message.trim().length > 2000) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: "Message too long (max 2000 chars)" }) };
  }

  try {
    const sql = getDb();
    // JWT name may be null if Clerk account has no full_name set —
    // fall back to the stored name/clerk_name in the users table.
    let displayName = clerkName || null;
    if (!displayName) {
      const [row] = await sql`
        SELECT COALESCE(NULLIF(TRIM(clerk_name), ''), NULLIF(TRIM(name), '')) AS stored_name
        FROM   users WHERE email = ${userEmail} LIMIT 1
      `;
      displayName = row?.stored_name || null;
    }
    await sql`
      INSERT INTO feedback (user_email, user_name, message)
      VALUES (${userEmail}, ${displayName}, ${message.trim()})
    `;
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
