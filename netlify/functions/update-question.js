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
    const { lc_number, similar_problems } = JSON.parse(event.body || "{}");
    if (!lc_number) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "lc_number required" }) };

    const sql = getDb();
    
    if (similar_problems !== undefined) {
      await sql`
        UPDATE questions 
        SET similar_problems = ${similar_problems}
        WHERE lc_number = ${lc_number}
      `;
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("update-question error:", err.message, err.stack);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
