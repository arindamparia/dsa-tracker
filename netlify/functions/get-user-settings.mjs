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

// Runs once per warm Lambda container — skipped on subsequent warm invocations
let schemaInitialized = false;

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
    if (!schemaInitialized) {
      await initSchema(sql);
      schemaInitialized = true;
    }

    // Fetch fresh imageUrl from Clerk API on every login so DB stays in sync
    // when the user updates their profile picture.
    let imageUrl = null;
    try {
      const clerk = getClerk();
      if (clerk && clerkId) {
        const clerkUser = await clerk.users.getUser(clerkId);
        imageUrl = clerkUser.imageUrl || null;
      }
    } catch { /* non-fatal — continue without imageUrl */ }

    // upsert user on every login — backfills clerk_name and image_url
    const [row] = await sql`
      INSERT INTO users (email, clerk_id, name, clerk_name, image_url, last_active)
      VALUES (${userEmail}, ${clerkId}, ${clerkName}, ${clerkName}, ${imageUrl}, NOW())
      ON CONFLICT (email) DO UPDATE SET
        clerk_id   = EXCLUDED.clerk_id,
        clerk_name = COALESCE(EXCLUDED.clerk_name, users.clerk_name),
        name       = COALESCE(NULLIF(users.name, ''), EXCLUDED.clerk_name),
        image_url  = COALESCE(EXCLUDED.image_url, users.image_url),
        last_active = NOW()
      RETURNING is_subscribed, reminders_enabled, reminder_email, name, phone, role, clerk_name, image_url
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
        image_url:         row.image_url         ?? null,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
