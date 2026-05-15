import { getAuthInfo, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  let userEmail;
  try {
    ({ email: userEmail } = await getAuthInfo(event));
  } catch (err) {
    return { ...unauthorized(err.message), headers: CORS };
  }

  try {
    const sql = getDb();

    // Verify caller is ADMIN
    const [user] = await sql`SELECT role FROM users WHERE email = ${userEmail} LIMIT 1`;
    if (!user || user.role !== "ADMIN") {
      return { statusCode: 403, headers: CORS, body: JSON.stringify({ ok: false, error: "Forbidden" }) };
    }

    // Coalesce stored feedback name with users table name so old null-name rows
    // still show the correct display name.
    const rows = await sql`
      SELECT f.id,
             f.user_email,
             COALESCE(
               NULLIF(TRIM(f.user_name), ''),
               NULLIF(TRIM(u.clerk_name), ''),
               NULLIF(TRIM(u.name), '')
             ) AS user_name,
             u.image_url,
             f.message,
             f.created_at
      FROM   feedback f
      LEFT JOIN users u ON u.email = f.user_email
      ORDER  BY f.created_at DESC
      LIMIT  200
    `;

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, feedback: rows }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
