import { getDb, initSchema } from "./db.mjs";
import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

  // ── Auth ─────────────────────────────────────────────────────────
  let userEmail;
  try {
    userEmail = await getAuthEmail(event);
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();
    await initSchema(sql);

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
        q.hint                              AS hint,
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
      body: JSON.stringify({ ok: true, questions: rows }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
