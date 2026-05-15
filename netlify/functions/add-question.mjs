import { getDb, initSchema } from "./db.mjs";
import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

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

    // ── Role check — ADMIN only ───────────────────────────────────
    const [userRow] = await sql`SELECT role FROM users WHERE email = ${userEmail}`;
    if (!userRow || userRow.role !== 'ADMIN') {
      return { statusCode: 403, headers: CORS, body: JSON.stringify({ ok: false, error: 'Admin access required' }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { lc_number, name, url, topic, difficulty, section, section_order, tags } = body;

    if (!lc_number || !name || !url || !topic || !difficulty || !section) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "lc_number, name, url, topic, difficulty, section are required" }) };
    }
    if (!["Easy", "Medium", "Hard"].includes(difficulty)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "difficulty must be Easy, Medium, or Hard" }) };
    }

    const tagsArr = Array.isArray(tags) ? tags : (tags ? String(tags).split(",").map(t => t.trim()).filter(Boolean) : []);
    const secOrder = section_order ?? 99;
    
    const result = await sql`
      INSERT INTO questions (lc_number, name, url, topic, difficulty, section, section_order, tags)
      VALUES (${lc_number}, ${name}, ${url}, ${topic}, ${difficulty}, ${section}, ${secOrder}, ${tagsArr})
      RETURNING *
    `;
    return { statusCode: 201, headers: CORS, body: JSON.stringify({ ok: true, question: result[0] }) };
  } catch (err) {
    if (err.code === "23505" || (err.message && err.message.includes("unique"))) {
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ ok: false, error: `LC #${JSON.parse(event.body || "{}").lc_number} already exists` }) };
    }
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
