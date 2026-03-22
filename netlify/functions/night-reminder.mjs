import { getDb } from "./db.mjs";
import { Resend } from "resend";

// Netlify scheduled function — also HTTP-triggerable with ?secret=REMINDER_SECRET
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const triggerSecret = process.env.REMINDER_SECRET;
    if (triggerSecret) {
      const isScheduled = request.headers.get("x-nf-scheduled") === "true";
      if (!isScheduled && url.searchParams.get("secret") !== triggerSecret) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const resend    = new Resend(process.env.RESEND_API_KEY);
    const sql       = getDb();
    const siteUrl   = process.env.URL || "https://tracemydsa.netlify.app";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // ── Motivational messages ─────────────────────────────────────
    const motivations = [
      "Every problem you solve is a version of you that didn't exist yesterday.",
      "The grind is the goal. One more problem, one step closer.",
      "Consistency beats intensity. Show up every day, even when it's hard.",
      "Champions are built in the quiet moments nobody sees. This is one of them.",
      "You're not just solving problems — you're rewiring your brain to think better.",
      "Progress isn't always loud. Sometimes it's just one more problem before bed.",
      "The best time to solve a problem was yesterday. The second best time is right now.",
      "Coding is a skill. Skills are built in the repetitions that feel boring.",
      "Every hard problem you don't skip is interest paid to your future self.",
      "You don't need motivation. You need discipline. Show up anyway.",
      "One problem a day keeps interview panic away.",
      "Small actions, compounded daily, produce extraordinary results.",
    ];

    // ── Difficulty styles ─────────────────────────────────────────
    const diffStyle = {
      Easy:   { color: "#06d6a0", border: "rgba(6,214,160,0.4)" },
      Medium: { color: "#f8b500", border: "rgba(248,181,0,0.4)" },
      Hard:   { color: "#ff4757", border: "rgba(255,71,87,0.4)" },
    };

    // ── Get all opted-in users ────────────────────────────────────
    const users = await sql`
      SELECT email,
             COALESCE(NULLIF(TRIM(reminder_email), ''), email) AS send_to,
             name
      FROM   users
      WHERE  reminders_enabled = TRUE
    `;

    if (!users.length) {
      return new Response(JSON.stringify({ ok: true, count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const todayDate   = new Date();
    const today       = todayDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    const subjectDate = todayDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
    const motivation  = motivations[Math.floor(Math.random() * motivations.length)];

    let sent = 0;
    for (const user of users) {
      const userEmail   = user.email;
      const toEmail     = user.send_to;
      const displayName = user.name || toEmail.split("@")[0];

      // Fetch today's solved count + overall stats in parallel
      const [[todayStats], [stats]] = await Promise.all([
        sql`
          SELECT COUNT(*) AS solved_today
          FROM   progress
          WHERE  is_done    = TRUE
            AND  user_email = ${userEmail}
            AND  solved_at  >= CURRENT_DATE
        `,
        sql`
          SELECT
            COUNT(*) FILTER (WHERE COALESCE(p.is_done, false) = true)  AS done,
            COUNT(*) FILTER (WHERE COALESCE(p.is_done, false) = false) AS remaining
          FROM   questions q
          LEFT JOIN progress p
            ON  p.lc_number  = q.lc_number
            AND p.user_email = ${userEmail}
        `,
      ]);

      const solvedToday = Number(todayStats?.solved_today || 0);

      let suggestedProblem = null;
      if (solvedToday <= 1) {
        const [p] = await sql`
          SELECT q.name, q.lc_number, q.difficulty, q.topic, q.url
          FROM   questions q
          LEFT JOIN progress p
            ON  p.lc_number  = q.lc_number
            AND p.user_email = ${userEmail}
          WHERE  COALESCE(p.is_done, false) = false
          ORDER  BY RANDOM()
          LIMIT  1
        `;
        suggestedProblem = p || null;
      }

      const done      = Number(stats?.done      || 0);
      const remaining = Number(stats?.remaining || 0);
      const total     = done + remaining;
      const pct       = total ? Math.round((done / total) * 100) : 0;

      // ── Plain-text version ──────────────────────────────────────
      const suggestTxt = suggestedProblem
        ? [
            ``,
            `Suggested problem for tonight:`,
            `  ${suggestedProblem.name}`,
            `  Difficulty : ${suggestedProblem.difficulty}`,
            `  Topic      : ${suggestedProblem.topic}`,
            `  Link       : ${suggestedProblem.url}`,
          ].join("\n")
        : "";

      const plainText = solvedToday > 1
        ? [
            `Hi ${displayName},`,
            ``,
            `Great work today (${today})!`,
            `You solved ${solvedToday} problems today.`,
            ``,
            `"${motivation}"`,
            ``,
            `Overall: ${done} of ${total} solved (${pct}%).`,
            `${remaining} problems remaining.`,
            ``,
            `Keep the streak going: ${siteUrl}`,
            ``,
            `— Trace My DSA`,
          ].join("\n")
        : [
            `Hi ${displayName},`,
            ``,
            solvedToday === 1
              ? `You solved 1 problem today (${today}). Good start — can you squeeze in one more?`
              : `It's getting late (${today}) and no problems marked done yet.`,
            ``,
            `"${motivation}"`,
            suggestTxt,
            ``,
            `Overall: ${done} of ${total} solved (${pct}%).`,
            ``,
            `Open your tracker: ${siteUrl}`,
            ``,
            `— Trace My DSA`,
          ].join("\n");

      // ── Suggestion block ────────────────────────────────────────
      const suggestionBlock = suggestedProblem
        ? (() => {
            const ds = diffStyle[suggestedProblem.difficulty] || diffStyle.Hard;
            return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #2a2a3e;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#16162a;padding:10px 20px;border-bottom:1px solid #2a2a3e;">
              <span style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:1.8px;color:#7c6af7;">&#127919; One More Before Sleep</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 24px;">
              <p style="margin:0 0 14px;font-size:18px;font-weight:700;color:#e8e8f0;line-height:1.3;">${suggestedProblem.name}</p>
              <p style="margin:0 0 20px;">
                <span style="display:inline-block;background:transparent;color:${ds.color};border:1px solid ${ds.border};border-radius:999px;padding:3px 12px;font-size:10px;font-weight:700;font-family:monospace;text-transform:uppercase;letter-spacing:0.06em;">${suggestedProblem.difficulty}</span>
                &nbsp;
                <span style="display:inline-block;background:rgba(124,106,247,0.12);color:#9d8ff7;border:1px solid rgba(124,106,247,0.3);border-radius:4px;padding:3px 10px;font-size:10px;font-family:monospace;">${suggestedProblem.topic}</span>
              </p>
              <a href="${suggestedProblem.url}"
                 style="display:inline-block;background:#7c6af7;color:#fff;text-decoration:none;padding:11px 26px;border-radius:7px;font-size:14px;font-weight:700;font-family:monospace;letter-spacing:0.02em;">
                Open on LeetCode &rarr;
              </a>
            </td>
          </tr>
        </table>`;
          })()
        : "";

      // ── Status block ────────────────────────────────────────────
      const statusBlock = solvedToday > 1
        ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #1a3a2a;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#0d2a1a;padding:10px 20px;border-bottom:1px solid #1a3a2a;">
              <span style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:1.8px;color:#06d6a0;">&#9989; Today's Progress</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 24px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e8e8f0;line-height:1.3;">
                ${solvedToday} problems solved today
              </p>
              <p style="margin:0;font-size:13px;color:#9898b0;line-height:1.5;font-style:italic;">
                &ldquo;${motivation}&rdquo;
              </p>
            </td>
          </tr>
        </table>`
        : `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #3a2a1a;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#2a1a0d;padding:10px 20px;border-bottom:1px solid #3a2a1a;">
              <span style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:1.8px;color:#f8b500;">
                ${solvedToday === 1 ? "&#9888;&#65039; Only 1 problem solved" : "&#9888;&#65039; No problems solved yet"}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 24px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#e8e8f0;line-height:1.3;">
                ${solvedToday === 1 ? "Good start — can you squeeze in one more?" : "Still time to solve one before midnight."}
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#9898b0;line-height:1.5;font-style:italic;">
                &ldquo;${motivation}&rdquo;
              </p>
              <a href="${siteUrl}"
                 style="display:inline-block;background:#f8b500;color:#000811;text-decoration:none;padding:11px 26px;border-radius:7px;font-size:14px;font-weight:700;font-family:monospace;letter-spacing:0.02em;">
                Open Tracker &rarr;
              </a>
            </td>
          </tr>
        </table>
        ${suggestionBlock}`;

      // ── Progress bar ────────────────────────────────────────────
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
  <title>DSA Night Check-in</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${solvedToday > 1 ? `${solvedToday} solved today — ${done}/${total} overall. Great work!` : solvedToday === 1 ? `1 solved today — can you do one more? ${done}/${total} overall.` : `No problems solved yet today — still time before midnight!`}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="background:#111118;border-radius:14px;border:1px solid #2a2a3e;overflow:hidden;">

              <!-- Top accent bar -->
              <div style="height:3px;background:linear-gradient(90deg,#7c6af7,#06d6a0);"></div>

              <div style="padding:28px 28px 10px;">
                <p style="margin:0 0 6px;font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:2px;color:#6b6b85;">Trace My DSA</p>
                <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#e8e8f0;line-height:1.2;">Good Night, ${displayName} &#127769;</h1>
                <p style="margin:0;font-size:14px;color:#9898b0;line-height:1.6;">
                  Here's your end-of-day summary for <strong style="color:#e8e8f0;">${today}</strong>.
                </p>

                ${progressBar}
                ${statusBlock}

                <p style="margin-top:24px;font-size:13px;color:#6b6b85;">
                  <a href="${siteUrl}" style="color:#7c6af7;text-decoration:none;font-weight:600;">Open Dashboard &rarr;</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="padding:14px 28px;border-top:1px solid #1e1e2e;">
                <p style="margin:0;font-size:10px;color:#6b6b85;font-family:monospace;">
                  Sent at 10:00 PM IST &middot;
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
        from:     `Trace My DSA <${fromEmail}>`,
        to:       toEmail,
        reply_to: toEmail,
        subject:  `🌙 DSA Night Check-in — ${subjectDate}`,
        text:     plainText,
        html,
        headers: {
          "List-Unsubscribe": `<mailto:${toEmail}?subject=Unsubscribe%20DSA%20Reminder>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Mailer": "Trace-My-DSA/1.0",
        },
      });

      sent++;
    }

    return new Response(JSON.stringify({ ok: true, count: sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

// Runs at 10:00 PM IST = 16:30 UTC every day
export const config = {
  schedule: "30 16 * * *",
};
