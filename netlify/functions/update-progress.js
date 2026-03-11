import { getDb, cacheBust } from "./db.js";

export const handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const { lc_number, is_done, solution, notes } = JSON.parse(event.body);
    if (!lc_number) return { statusCode: 400, headers, body: JSON.stringify({ error: "lc_number required" }) };

    const sql = getDb();
    await sql`
      INSERT INTO progress (lc_number, is_done, solution, notes, updated_at)
      VALUES (${lc_number}, ${is_done ?? false}, ${solution ?? ''}, ${notes ?? ''}, NOW())
      ON CONFLICT (lc_number) DO UPDATE SET
        is_done    = EXCLUDED.is_done,
        solution   = EXCLUDED.solution,
        notes      = EXCLUDED.notes,
        updated_at = NOW()
    `;

    // Bust cache so next GET fetches fresh progress from Neon
    cacheBust();

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("update-progress error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
