import { getDb } from "./db.mjs";

const siteUrl = process.env.URL || "https://algotracker.xyz";

const successPage = (email) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — AlgoTracker</title>
  <style>
    body { margin:0; background:#0d0d1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
           display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111118; border:1px solid #2a2a3e; border-radius:14px;
            padding:40px 36px; max-width:440px; width:90%; text-align:center; }
    .bar  { height:3px; background:linear-gradient(90deg,#7c6af7,#06d6a0);
            border-radius:3px 3px 0 0; margin:-40px -36px 32px; }
    h1    { margin:0 0 12px; font-size:22px; color:#e8e8f0; }
    p     { margin:0 0 8px; font-size:14px; color:#9898b0; line-height:1.6; }
    small { color:#6b6b85; font-size:12px; }
    a     { display:inline-block; margin-top:24px; padding:10px 28px; background:#7c6af7;
            color:#fff; text-decoration:none; border-radius:7px; font-size:14px; font-weight:600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <h1>You've been unsubscribed</h1>
    <p>${email} has been removed from AlgoTracker broadcast emails.</p>
    <p><small>Reminder emails (if enabled) are unaffected.<br>You can re-enable broadcasts from your account settings.</small></p>
    <a href="${siteUrl}">Back to AlgoTracker</a>
  </div>
</body>
</html>`;

const alreadyPage = (email) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Already unsubscribed — AlgoTracker</title>
  <style>
    body { margin:0; background:#0d0d1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
           display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111118; border:1px solid #2a2a3e; border-radius:14px;
            padding:40px 36px; max-width:440px; width:90%; text-align:center; }
    .bar  { height:3px; background:linear-gradient(90deg,#7c6af7,#06d6a0);
            border-radius:3px 3px 0 0; margin:-40px -36px 32px; }
    h1    { margin:0 0 12px; font-size:22px; color:#e8e8f0; }
    p     { margin:0; font-size:14px; color:#9898b0; line-height:1.6; }
    a     { display:inline-block; margin-top:24px; padding:10px 28px; background:#7c6af7;
            color:#fff; text-decoration:none; border-radius:7px; font-size:14px; font-weight:600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <h1>Already unsubscribed</h1>
    <p>${email} is already unsubscribed from broadcast emails.</p>
    <a href="${siteUrl}">Back to AlgoTracker</a>
  </div>
</body>
</html>`;

/**
 * Handles both:
 *   GET  /.netlify/functions/unsubscribe?email=...  — clicked from email footer link
 *   POST /.netlify/functions/unsubscribe?email=...  — Gmail one-click (RFC 8058)
 *
 * Intentionally public — unsubscribing is benign and requires knowing the email.
 */
export default async (request) => {
  const url   = new URL(request.url);
  const email = (url.searchParams.get("email") || "").toLowerCase().trim();

  if (!email || !email.includes("@")) {
    return new Response("Missing or invalid email parameter", { status: 400 });
  }

  // RFC 8058: POST body must be "List-Unsubscribe=One-Click"
  // We accept POST regardless of body content for robustness.
  const isPost = request.method === "POST";
  const isGet  = request.method === "GET";
  if (!isPost && !isGet) {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const sql = getDb();
    const [row] = await sql`SELECT broadcast_unsubscribed FROM users WHERE email = ${email}`;

    if (!row) {
      // Email not found — silently succeed (don't expose user existence)
      if (isPost) return new Response("OK", { status: 200 });
      return new Response(successPage(email), {
        status: 200, headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (row.broadcast_unsubscribed) {
      if (isPost) return new Response("OK", { status: 200 });
      return new Response(alreadyPage(email), {
        status: 200, headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    await sql`UPDATE users SET broadcast_unsubscribed = TRUE WHERE email = ${email}`;
    console.log(`[unsubscribe] ${email} unsubscribed via ${request.method}`);

    if (isPost) return new Response("OK", { status: 200 });
    return new Response(successPage(email), {
      status: 200, headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error(`[unsubscribe] Error for ${email}: ${err.message}`);
    if (isPost) return new Response("Error", { status: 500 });
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
};
