import { getDb } from "./db.mjs";
import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  try { await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  try {
    const { lc_number, similar_problems, hint } = JSON.parse(event.body || "{}");
    if (!lc_number) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "lc_number required" }) };

    const sql = getDb();

    if (similar_problems !== undefined) {
      await sql`
        UPDATE questions
        SET similar_problems = ${similar_problems}
        WHERE lc_number = ${lc_number}
      `;
    }

    if (hint !== undefined) {
      await sql`
        UPDATE questions
        SET hint = ${hint}
        WHERE lc_number = ${lc_number}
      `;
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
