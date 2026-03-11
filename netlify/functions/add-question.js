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
    const sql = getDb();

    const result = await sql`
      INSERT INTO questions (lc_number, name, url, topic, difficulty, section, section_order, tags)
      VALUES (${lc_number}, ${name}, ${url}, ${topic}, ${difficulty}, ${section}, ${secOrder}, ${tagsArr})
      RETURNING *
    `;
    return { statusCode: 201, headers: CORS, body: JSON.stringify({ ok: true, question: result[0] }) };
  } catch (err) {
    console.error("add-question error:", err.message, err.stack);
    if (err.code === "23505" || (err.message && err.message.includes("unique"))) {
      return { statusCode: 409, headers: CORS, body: JSON.stringify({ ok: false, error: `LC #${JSON.parse(event.body || "{}").lc_number} already exists` }) };
    }
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
