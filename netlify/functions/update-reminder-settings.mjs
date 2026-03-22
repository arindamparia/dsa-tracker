import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb, initSchema } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  try {
    const { reminders_enabled, reminder_email, name, phone } = JSON.parse(event.body || "{}");

    const sql = getDb();
    await initSchema(sql); // ensure columns exist
    await sql`
      UPDATE users
      SET reminders_enabled = ${!!reminders_enabled},
          reminder_email    = ${reminder_email?.trim() || null},
          name              = ${name?.trim()           || null},
          phone             = ${phone?.trim()          || null}
      WHERE email = ${userEmail}
    `;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
