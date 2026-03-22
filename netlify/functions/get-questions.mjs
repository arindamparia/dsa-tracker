import { getDb, initSchema } from "./db.mjs";
import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  // ── Auth ─────────────────────────────────────────────────────────
  let userEmail, clerkId;
  try {
    ({ email: userEmail, clerkId } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();
    await initSchema(sql);

    // Upsert caller into users table — updates clerk_id if missing; return subscription status
    const [userRow] = await sql`
      INSERT INTO users (email, clerk_id) VALUES (${userEmail}, ${clerkId})
      ON CONFLICT (email) DO UPDATE SET clerk_id = COALESCE(users.clerk_id, EXCLUDED.clerk_id)
      RETURNING is_subscribed, reminders_enabled, reminder_email, name, phone
    `;
    const isSubscribed     = userRow?.is_subscribed     ?? false;
    const remindersEnabled = userRow?.reminders_enabled ?? false;
    const reminderEmail    = userRow?.reminder_email    ?? null;
    const userName         = userRow?.name              ?? null;
    const userPhone        = userRow?.phone             ?? null;

    const rows = await sql`
      SELECT
        q.lc_number,
        q.name,
        q.url,
        q.topic,
        q.difficulty,
        q.section,
        q.section_order,
        q.tags,
        COALESCE(p.is_done, false)           AS is_done,
        COALESCE(p.solution, '')             AS solution,
        COALESCE(p.notes, '')                AS notes,
        COALESCE(p.needs_review, false)      AS needs_review,
        COALESCE(p.time_complexity, '')      AS time_complexity,
        COALESCE(p.space_complexity, '')     AS space_complexity,
        COALESCE(p.ai_analysis, '')          AS ai_analysis,
        COALESCE(p.srs_interval_index, 0)   AS srs_interval_index,
        p.srs_last_reviewed_at              AS srs_last_reviewed_at,
        q.similar_problems                  AS similar_problems,
        COALESCE(q.companies_asked, '{}')   AS companies_asked,
        p.updated_at                        AS updated_at,
        p.solved_at                         AS solved_at
      FROM questions q
      LEFT JOIN progress p
        ON p.lc_number = q.lc_number
       AND p.user_email = ${userEmail}
      ORDER BY q.section_order ASC, q.lc_number ASC
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, questions: rows, is_subscribed: isSubscribed, reminders_enabled: remindersEnabled, reminder_email: reminderEmail, user_name: userName, user_phone: userPhone }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
