import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

/** Returns the current user's profile fields. Upserts user & backfills clerk_name from Clerk. */
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  let userEmail, clerkId, clerkName;
  try {
    ({ email: userEmail, clerkId, name: clerkName } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();

    // Upsert user — seeds on first login, backfills clerk_name when null
    const [row] = await sql`
      INSERT INTO users (email, clerk_id, name, clerk_name)
      VALUES (${userEmail}, ${clerkId}, ${clerkName}, ${clerkName})
      ON CONFLICT (email) DO UPDATE SET
        clerk_id   = COALESCE(users.clerk_id, EXCLUDED.clerk_id),
        clerk_name = COALESCE(EXCLUDED.clerk_name, users.clerk_name),
        name       = COALESCE(NULLIF(users.name, ''), EXCLUDED.clerk_name)
      RETURNING is_subscribed, reminders_enabled, reminder_email, name, phone, role, clerk_name
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
        clerk_name:        row.clerk_name        ?? null,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
