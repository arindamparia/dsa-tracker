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
    const { lc_number, name, url, topic, difficulty, section, section_order, tags } = JSON.parse(event.body);

    if (!lc_number || !name || !url || !topic || !difficulty || !section) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "lc_number, name, url, topic, difficulty, section are required" }) };
    }
    if (!["Easy", "Medium", "Hard"].includes(difficulty)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "difficulty must be Easy, Medium, or Hard" }) };
    }

    const sql = getDb();

    let secOrder = section_order;
    if (!secOrder) {
      const rows = await sql`SELECT MAX(section_order) AS mo FROM questions WHERE section = ${section}`;
      secOrder = rows[0]?.mo ?? 99;
    }

    const tagsArr = Array.isArray(tags)
      ? tags
      : (tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : []);

    const result = await sql`
      INSERT INTO questions (lc_number, name, url, topic, difficulty, section, section_order, tags)
      VALUES (${lc_number}, ${name}, ${url}, ${topic}, ${difficulty}, ${section}, ${secOrder}, ${tagsArr})
      RETURNING *
    `;

    // Bust cache so next GET picks up the new question
    cacheBust();

    return { statusCode: 201, headers, body: JSON.stringify({ ok: true, question: result[0] }) };
  } catch (err) {
    if (err.message?.includes("unique") || err.code === "23505") {
      return { statusCode: 409, headers, body: JSON.stringify({ ok: false, error: `LC #${JSON.parse(event.body).lc_number} already exists` }) };
    }
    console.error("add-question error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
