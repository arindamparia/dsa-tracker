import { getDb } from "./db.mjs";
import { Resend } from "resend";

// Netlify scheduled function — also HTTP-triggerable with ?secret=REMINDER_SECRET
export default async (request, context) => {
  try {
    // Allow manual HTTP trigger with optional secret guard
    const url = new URL(request.url);
    const triggerSecret = process.env.REMINDER_SECRET;
    if (triggerSecret) {
      const isScheduled = request.headers.get("x-nf-scheduled") === "true";
      if (!isScheduled && url.searchParams.get("secret") !== triggerSecret) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const sql    = getDb();

    // Fetch a random unsolved problem + overall stats in parallel
    const [[problem], [stats]] = await Promise.all([
      sql`
        SELECT q.name, q.lc_number, q.difficulty, q.topic, q.url
        FROM   questions q
        LEFT JOIN progress p ON q.lc_number = p.lc_number
        WHERE  COALESCE(p.is_done, false) = false
        ORDER  BY RANDOM()
        LIMIT  1;
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(p.is_done, false) = true)  AS done,
          COUNT(*) FILTER (WHERE COALESCE(p.is_done, false) = false) AS remaining
        FROM   questions q
        LEFT JOIN progress p ON q.lc_number = p.lc_number;
      `,
    ]);

    const siteUrl  = process.env.URL          || "https://dsatrackerforarindam.netlify.app";
    const toEmail  = process.env.REMINDER_TO_EMAIL  || "arindamparia321@gmail.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const done      = Number(stats?.done      || 0);
    const remaining = Number(stats?.remaining || 0);
    const total     = done + remaining;
    const pct       = total ? Math.round((done / total) * 100) : 0;

    const todayDate = new Date();
    const today = todayDate.toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long",
    });
    // Subject line format: "Friday, 13 Mar"
    const subjectDate = todayDate.toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "short",
    });

    // ── Difficulty colours (dark bg) ───────────────────────────────────
    const diffStyle = {
      Easy:   { color: "#06d6a0", border: "rgba(6,214,160,0.4)" },
      Medium: { color: "#f8b500", border: "rgba(248,181,0,0.4)" },
      Hard:   { color: "#ff4757", border: "rgba(255,71,87,0.4)" },
    };
    const ds = diffStyle[problem?.difficulty] || diffStyle.Hard;

    // ── Plain-text version (critical for deliverability) ───────────────
    const plainText = problem
      ? [
          `Hi Arindam,`,
          ``,
          `Here is your LeetCode problem for today (${today}):`,
          ``,
          `  ${problem.name}`,
          `  Difficulty : ${problem.difficulty}`,
          `  Topic      : ${problem.topic}`,
          `  Link       : ${problem.url}`,
          ``,
          `Your progress: ${done} of ${total} solved (${pct}%).`,
          `${remaining} problems remaining.`,
          ``,
          `Open your tracker: ${siteUrl}`,
          ``,
          `— DSA Tracker`,
        ].join("\n")
      : `Hi Arindam,\n\nNo unsolved problems left — every single one is done. Impressive.\n\nOpen your tracker: ${siteUrl}\n\n— DSA Tracker`;

    // ── HTML version (dark theme) ───────────────────────────────────────
    const problemBlock = problem
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #2a2a3e;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#16162a;padding:10px 20px;border-bottom:1px solid #2a2a3e;">
              <span style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:1.8px;color:#6b6b85;">&#127919; Problem of the Day</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 24px;">
              <p style="margin:0 0 14px;font-size:20px;font-weight:700;color:#e8e8f0;line-height:1.3;">${problem.name}</p>
              <p style="margin:0 0 22px;">
                <span style="display:inline-block;background:transparent;color:${ds.color};border:1px solid ${ds.border};border-radius:999px;padding:3px 12px;font-size:10px;font-weight:700;font-family:monospace;text-transform:uppercase;letter-spacing:0.06em;">${problem.difficulty}</span>
                &nbsp;
                <span style="display:inline-block;background:rgba(124,106,247,0.12);color:#9d8ff7;border:1px solid rgba(124,106,247,0.3);border-radius:4px;padding:3px 10px;font-size:10px;font-family:monospace;">${problem.topic}</span>
              </p>
              <a href="${problem.url}"
                 style="display:inline-block;background:#06d6a0;color:#000811;text-decoration:none;padding:11px 26px;border-radius:7px;font-size:14px;font-weight:700;font-family:monospace;letter-spacing:0.02em;">
                Open on LeetCode &rarr;
              </a>
            </td>
          </tr>
        </table>`
      : `<p style="margin-top:20px;color:#6b6b85;font-size:14px;">Every problem in your list is solved. Nothing left for today!</p>`;

    const progressBar = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #2a2a3e;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;color:#6b6b85;">Overall Progress</td>
                <td align="right" style="font-size:13px;font-family:monospace;font-weight:700;color:#06d6a0;">${done}&thinsp;/&thinsp;${total} solved</td>
              </tr>
            </table>
            <div style="margin-top:10px;background:#1e1e2e;border-radius:999px;height:5px;overflow:hidden;">
              <div style="width:${pct}%;background:linear-gradient(90deg,#7c6af7,#06d6a0);height:100%;border-radius:999px;"></div>
            </div>
            <p style="margin:6px 0 0;font-size:10px;font-family:monospace;color:#6b6b85;text-align:right;">${pct}% &middot; ${remaining} remaining</p>
          </td>
        </tr>
      </table>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>DSA Problem of the Day</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${problem ? `Today: ${problem.name} (${problem.difficulty}) — ${done}/${total} solved` : "All problems solved!"}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Card -->
          <tr>
            <td style="background:#111118;border-radius:14px;border:1px solid #2a2a3e;overflow:hidden;">

              <!-- Top accent bar -->
              <div style="height:3px;background:linear-gradient(90deg,#7c6af7,#06d6a0);"></div>

              <div style="padding:28px 28px 10px;">
                <!-- Logo / label -->
                <p style="margin:0 0 6px;font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:2px;color:#6b6b85;">DSA Tracker</p>
                <!-- Greeting -->
                <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#e8e8f0;line-height:1.2;">Good Morning, Arindam &#128075;</h1>
                <p style="margin:0;font-size:14px;color:#9898b0;line-height:1.6;">
                  Your daily LeetCode problem is ready. Solve one today, stay sharp always.
                </p>

                ${progressBar}
                ${problemBlock}

                <!-- Dashboard link -->
                <p style="margin-top:24px;font-size:13px;color:#6b6b85;">
                  <a href="${siteUrl}" style="color:#7c6af7;text-decoration:none;font-weight:600;">Open Dashboard &rarr;</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="padding:14px 28px;border-top:1px solid #1e1e2e;">
                <p style="margin:0;font-size:10px;color:#6b6b85;font-family:monospace;">
                  Sent at 8:00 AM IST &middot;
                  <a href="${siteUrl}" style="color:#6b6b85;">${siteUrl.replace("https://", "")}</a>
                  &middot;
                  <a href="mailto:${toEmail}?subject=Unsubscribe%20DSA%20Reminder" style="color:#6b6b85;">unsubscribe</a>
                </p>
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

    await resend.emails.send({
      from:     `DSA Tracker <${fromEmail}>`,
      to:       toEmail,
      reply_to: toEmail,                     // replies go back to yourself
      subject:  `🌅 Your DSA Problem of the Day — ${subjectDate}`,
      text:     plainText,                   // plain-text alternative (key for deliverability)
      html,
      headers: {
        // Tells Gmail this is a scheduled digest, not cold spam
        "List-Unsubscribe": `<mailto:${toEmail}?subject=Unsubscribe%20DSA%20Reminder>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Mailer": "DSA-Tracker/1.0",
      },
    });

    console.log("Morning reminder sent:", problem?.name ?? "no problem found");
    return new Response(JSON.stringify({ ok: true, problem: problem?.name || null }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("morning-reminder error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

// Runs at 8:00 AM IST = 02:30 AM UTC every day
export const config = {
  schedule: "30 2 * * *",
};
