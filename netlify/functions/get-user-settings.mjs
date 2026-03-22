import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

/** Lightweight endpoint — returns only the current user's profile fields. */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  try {
    const sql = getDb();
    const [row] = await sql`
      SELECT is_subscribed, reminders_enabled, reminder_email, name, phone, role
      FROM   users
      WHERE  email = ${userEmail}
    `;

    if (!row) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ ok: false, error: "User not found" }) };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok:                true,
        is_subscribed:     row.is_subscribed     ?? false,
        reminders_enabled: row.reminders_enabled ?? false,
        reminder_email:    row.reminder_email    ?? null,
        user_name:         row.name              ?? null,
        user_phone:        row.phone             ?? null,
        user_role:         row.role              ?? 'USER',
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
