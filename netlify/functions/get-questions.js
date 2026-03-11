import { getDb, initSchema } from "./db.js";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CACHE_HEADERS = {
  // private = only browser cache, not CDN (safe since site is password-protected)
  // max-age=300 = reuse for 5 minutes without hitting Neon at all
  "Cache-Control": "private, max-age=300",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };

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
        COALESCE(p.is_done, false) AS is_done,
        COALESCE(p.solution, '')   AS solution,
        COALESCE(p.notes, '')      AS notes
      FROM questions q
      LEFT JOIN progress p ON p.lc_number = q.lc_number
      ORDER BY q.section_order ASC, q.lc_number ASC
    `;

    return {
      statusCode: 200,
      headers: { ...CORS, ...CACHE_HEADERS },
      body: JSON.stringify({ ok: true, questions: rows }),
    };
  } catch (err) {
    console.error("get-questions ERROR:", err.message, err.stack);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
