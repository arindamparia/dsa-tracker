import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { createClerkClient } from "@clerk/backend";
import { getDb, initSchema } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

let _clerk = null;
function getClerk() {
  if (!_clerk && process.env.CLERK_SECRET_KEY) {
    _clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return _clerk;
}

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  let userEmail, clerkId, clerkName;
  try {
    ({ email: userEmail, clerkId, name: clerkName } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();

    // upsert user on every login — backfills clerk_name and image_url.
    // (Frontend shows the avatar straight from Clerk's SDK, so image_url isn't fetched here.)
    const upsert = () => sql`
      INSERT INTO users (email, clerk_id, name, clerk_name, image_url, last_active)
      VALUES (${userEmail}, ${clerkId}, ${clerkName}, ${clerkName}, ${null}, NOW())
      ON CONFLICT (email) DO UPDATE SET
        clerk_id   = EXCLUDED.clerk_id,
        clerk_name = COALESCE(EXCLUDED.clerk_name, users.clerk_name),
        name       = COALESCE(NULLIF(users.name, ''), EXCLUDED.clerk_name),
        image_url  = COALESCE(EXCLUDED.image_url, users.image_url),
        last_active = NOW()
      RETURNING is_subscribed, reminders_enabled, reminder_email, name, phone, role, clerk_name, image_url
    `;

    // initSchema is ~46 sequential DDL round-trips; running it on every cold start made this
    // endpoint multi-second (and it raced get-questions' own initSchema on first load).
    // Only migrate when the query actually reports a missing table/column.
    let row;
    try {
      [row] = await upsert();
    } catch (err) {
      if (err?.code !== '42703' && err?.code !== '42P01' && !/does not exist/i.test(err?.message || '')) throw err;
      await initSchema(sql);
      [row] = await upsert();
    }

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
        image_url:         row.image_url         ?? null,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
