import { getDb } from "./db.mjs";
import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  // auth
  let userEmail;
  try {
    userEmail = await getAuthEmail(event);
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const {
      lc_number,
      is_done,
      solution,
      notes,
      needs_review,
      time_complexity,
      space_complexity,
      ai_analysis,
      solved_at,
      srs_interval_index,
      srs_last_reviewed_at,
    } = JSON.parse(event.body || "{}");

    if (!lc_number) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "lc_number required" }) };
    }

    const sql = getDb();
    await sql`
      INSERT INTO progress (
        lc_number, user_email, is_done, solution, notes, needs_review,
        time_complexity, space_complexity, ai_analysis,
        updated_at, solved_at, srs_interval_index, srs_last_reviewed_at
      )
      VALUES (
        ${lc_number}, ${userEmail}, ${is_done ?? false}, ${solution ?? ""},
        ${notes ?? ""}, ${needs_review ?? false},
        ${time_complexity ?? ""}, ${space_complexity ?? ""}, ${ai_analysis ?? ""},
        NOW(), ${solved_at || null}, ${srs_interval_index ?? 0}, ${srs_last_reviewed_at || null}
      )
      ON CONFLICT (lc_number, user_email) DO UPDATE SET
        is_done              = EXCLUDED.is_done,
        solution             = EXCLUDED.solution,
        notes                = EXCLUDED.notes,
        needs_review         = EXCLUDED.needs_review,
        time_complexity      = EXCLUDED.time_complexity,
        space_complexity     = EXCLUDED.space_complexity,
        ai_analysis          = EXCLUDED.ai_analysis,
        solved_at            = EXCLUDED.solved_at,
        srs_interval_index   = EXCLUDED.srs_interval_index,
        srs_last_reviewed_at = EXCLUDED.srs_last_reviewed_at,
        updated_at           = NOW()
    `;
    
    // Also update the user's last_active timestamp without blocking the response unnecessarily
    await sql`UPDATE users SET last_active = NOW() WHERE email = ${userEmail}`.catch(() => {});
    
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
