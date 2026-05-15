import { getDb } from "./db.mjs";
import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  let userEmail;
  try {
    ({ email: userEmail } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();

    const rows = await sql`
      SELECT
        lc_number,
        COALESCE(is_done, false)           AS is_done,
        COALESCE(solution, '')             AS solution,
        COALESCE(notes, '')                AS notes,
        COALESCE(needs_review, false)      AS needs_review,
        COALESCE(time_complexity, '')      AS time_complexity,
        COALESCE(space_complexity, '')     AS space_complexity,
        COALESCE(ai_analysis, '')          AS ai_analysis,
        COALESCE(srs_interval_index, 0)   AS srs_interval_index,
        srs_last_reviewed_at,
        updated_at,
        solved_at
      FROM progress
      WHERE user_email = ${userEmail}
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, progress: rows }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
