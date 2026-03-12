import { getDb } from "./db.js";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { lc_number, is_done, solution, notes, needs_review, time_complexity, space_complexity, solved_at } = JSON.parse(event.body || "{}");
    if (!lc_number) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "lc_number required" }) };

    const sql = getDb();
    await sql`
      INSERT INTO progress (lc_number, is_done, solution, notes, needs_review, time_complexity, space_complexity, updated_at, solved_at)
      VALUES (${lc_number}, ${is_done ?? false}, ${solution ?? ""}, ${notes ?? ""}, ${needs_review ?? false}, ${time_complexity ?? ""}, ${space_complexity ?? ""}, NOW(), ${solved_at || null})
      ON CONFLICT (lc_number) DO UPDATE SET
        is_done          = EXCLUDED.is_done,
        solution         = EXCLUDED.solution,
        notes            = EXCLUDED.notes,
        needs_review     = EXCLUDED.needs_review,
        time_complexity  = EXCLUDED.time_complexity,
        space_complexity = EXCLUDED.space_complexity,
        solved_at        = EXCLUDED.solved_at,
        updated_at       = NOW()
    `;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("update-progress error:", err.message, err.stack);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
