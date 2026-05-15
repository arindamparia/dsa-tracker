import { getDb } from "./db.mjs";
import { Resend } from "resend";

export default async (request) => {
  try {
    const url = new URL(request.url);
    const secret = process.env.REMINDER_SECRET;
    if (!secret || url.searchParams.get("secret") !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const resend    = new Resend(process.env.RESEND_API_KEY);
    const sql       = getDb();
    const siteUrl   = process.env.URL || "https://algotracker.xyz";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const users = await sql`
      SELECT email,
             COALESCE(NULLIF(TRIM(reminder_email), ''), email) AS send_to,
             name
      FROM   users
      WHERE  COALESCE(broadcast_unsubscribed, FALSE) = FALSE
      ORDER  BY created_at ASC
    `;

    if (!users.length) {
      return new Response(JSON.stringify({ ok: true, count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const userEmails = users.map(u => u.email);

    const diffStyle = {
      Easy:   { color: "#06d6a0", border: "rgba(6,214,160,0.35)" },
      Medium: { color: "#f8b500", border: "rgba(248,181,0,0.35)" },
      Hard:   { color: "#ff4757", border: "rgba(255,71,87,0.35)" },
    };

    // one random unsolved problem per user
    const allProblems = await sql`
      SELECT u.email AS user_email, sub.name, sub.lc_number, sub.difficulty, sub.topic, sub.url
      FROM   users u
      CROSS JOIN LATERAL (
        SELECT q.name, q.lc_number, q.difficulty, q.topic, q.url
        FROM   questions q
        LEFT JOIN progress p
          ON  p.lc_number  = q.lc_number
          AND p.user_email = u.email
        WHERE  COALESCE(p.is_done, false) = false
        ORDER  BY RANDOM()
        LIMIT  1
      ) sub
      WHERE  u.email = ANY(${userEmails})
    `;
    const problemMap = Object.fromEntries(allProblems.map(r => [r.user_email, r]));

    const features = [
      {
        icon: "🧬",
        title: "Smart Pick",
        desc: "Not sure what to solve next? Smart Pick scores every unsolved problem by difficulty, topic gap, and your weak areas — and picks the one that'll move the needle most. One click, zero decision fatigue.",
      },
      {
        icon: "📋",
        title: "Review Queue — Spaced Repetition",
        desc: "Solved a problem two weeks ago and already forgot it? We now automatically surface problems you should revisit based on proven spaced repetition intervals (1 → 3 → 7 → 14 → 30 days). Your memory will actually hold.",
      },
      {
        icon: "🏢",
        title: "Company Readiness Mode",
        desc: "Preparing for Google, Amazon, or any specific company? Company mode filters your entire tracker to show only the questions that company actually asks — with a readiness score to track how prepared you really are.",
      },
      {
        icon: "⚡",
        title: "Dramatically Faster & Smoother",
        desc: "The whole app is now significantly faster — smarter caching, instant loads, and zero-flicker UI even during theme switching. It adapts to your device and network so you always get the best experience.",
      },
      {
        icon: "📊",
        title: "Better Progress Insights",
        desc: "Your stats dashboard now has collapsible sections, cleaner animations, and tracks your trajectory over time — not just how many you've done, but how consistently you're improving.",
      },
      {
        icon: "🌐",
        title: "Questions Beyond LeetCode",
        desc: "We've expanded the question bank beyond LeetCode. Problems from Codeforces, GeeksforGeeks, HackerRank, and more are now tracked in the same place — one dashboard for your entire prep, regardless of where the question lives.",
      },
    ];

    const featureCardsHtml = features.map(f => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #2a2a3e;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 6px;font-size:16px;">${f.icon} <strong style="color:#e8e8f0;font-size:15px;">${f.title}</strong></p>
            <p style="margin:0;font-size:13px;color:#9898b0;line-height:1.65;">${f.desc}</p>
          </td>
        </tr>
      </table>`).join("");

    const featurePlainText = features.map(f =>
      `${f.icon} ${f.title}\n   ${f.desc}`
    ).join("\n\n");

    const buildPayload = (user) => {
      const toEmail        = user.send_to;
      const displayName    = user.name || user.send_to.split("@")[0];
      const problem        = problemMap[user.email] || null;
      const ds             = diffStyle[problem?.difficulty] || diffStyle.Hard;
      const unsubscribeUrl = `${siteUrl}/.netlify/functions/unsubscribe?email=${encodeURIComponent(user.email)}`;

      const problemPlain = problem
        ? [
            ``,
            `🎯 Try This Today`,
            `   ${problem.name}`,
            `   Difficulty: ${problem.difficulty}  ·  Topic: ${problem.topic}`,
            `   ${problem.url}`,
          ].join("\n")
        : "";

      const problemCardHtml = problem ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #2a2a3e;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#16162a;padding:10px 20px;border-bottom:1px solid #2a2a3e;">
              <span style="font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:1.8px;color:#6b6b85;">&#127919; Try This Today</span>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 20px 22px;">
              <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#e8e8f0;line-height:1.3;">${problem.name}</p>
              <p style="margin:0 0 18px;">
                <span style="display:inline-block;color:${ds.color};border:1px solid ${ds.border};border-radius:999px;padding:3px 12px;font-size:10px;font-weight:700;font-family:monospace;text-transform:uppercase;letter-spacing:0.06em;">${problem.difficulty}</span>
                &nbsp;
                <span style="display:inline-block;background:rgba(124,106,247,0.1);color:#9d8ff7;border:1px solid rgba(124,106,247,0.25);border-radius:4px;padding:3px 10px;font-size:10px;font-family:monospace;">${problem.topic}</span>
              </p>
              <a href="${problem.url}" style="display:inline-block;background:#06d6a0;color:#000811;text-decoration:none;padding:10px 24px;border-radius:7px;font-size:13px;font-weight:700;font-family:monospace;letter-spacing:0.02em;">Solve It Now &rarr;</a>
            </td>
          </tr>
        </table>` : "";

      const plainText = [
        `Hi ${displayName},`,
        ``,
        `Interview season is brutal. You need every edge you can get.`,
        ``,
        `AlgoTracker just got a serious upgrade — here's what's new and why it matters:`,
        ``,
        featurePlainText,
        problemPlain,
        ``,
        `These aren't just UI polish. Each one is designed to remove friction between you and consistent daily practice.`,
        ``,
        `Companies are hiring right now. The people who get the offers are the ones who showed up every day.`,
        ``,
        `Open AlgoTracker: ${siteUrl}`,
        ``,
        `— AlgoTracker`,
        `P.S. Reply to this email if you have feedback or questions. We actually read it.`,
        ``,
        `To unsubscribe: ${unsubscribeUrl}`,
      ].join("\n");

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>AlgoTracker — What's New</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Interview season is here. Here's every new feature we built to help you land the offer.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="background:#111118;border-radius:14px;border:1px solid #2a2a3e;overflow:hidden;">

              <div style="height:3px;background:linear-gradient(90deg,#7c6af7,#06d6a0);"></div>

              <div style="padding:30px 28px 8px;">
                <p style="margin:0 0 6px;font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:2px;color:#6b6b85;">AlgoTracker</p>
                <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#e8e8f0;line-height:1.25;">
                  ${displayName}, your tracker just levelled up. &#128640;
                </h1>
                <p style="margin:0 0 6px;font-size:15px;color:#9898b0;line-height:1.7;">
                  Interview season is brutal. We've been building to give you every edge possible.
                  Here's what changed — and more importantly, <strong style="color:#e8e8f0;">why it matters for you.</strong>
                </p>
              </div>

              <!-- Divider -->
              <div style="margin:20px 28px;border-top:1px solid #2a2a3e;"></div>

              <div style="padding:0 28px 24px;">

                <!-- Feature cards -->
                ${featureCardsHtml}

                <!-- Suggested problem -->
                ${problemCardHtml}

                <!-- Urgency nudge -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:linear-gradient(135deg,rgba(124,106,247,0.12),rgba(6,214,160,0.06));border:1px solid rgba(124,106,247,0.3);border-radius:10px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#e8e8f0;">&#127942; The people who get offers practice every day.</p>
                      <p style="margin:0;font-size:13px;color:#9898b0;line-height:1.65;">
                        Consistency beats cramming every time. Even 30 minutes a day compounds faster than you think.
                        Your tracker is ready — problems queued, weak spots mapped, company filters set.
                        All you have to do is open it.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table cellpadding="0" cellspacing="0" style="margin-top:28px;width:100%;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="border-radius:9px;background:linear-gradient(135deg,#7c6af7,#5b4bd4);">
                            <a href="${siteUrl}"
                               style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.03em;">
                              Open AlgoTracker &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:10px 0 0;font-size:12px;color:#6b6b85;">
                        <a href="${siteUrl}" style="color:#7c6af7;text-decoration:none;">${siteUrl.replace("https://","")}</a>
                      </p>
                    </td>
                  </tr>
                </table>

                <p style="margin-top:28px;font-size:13px;color:#6b6b85;line-height:1.7;border-top:1px solid #2a2a3e;padding-top:20px;">
                  Have feedback or a feature you want? Just reply to this email — we read every one.<br>
                  <strong style="color:#9898b0;">— The AlgoTracker team</strong>
                </p>
              </div>

              <div style="padding:14px 28px;border-top:1px solid #1e1e2e;">
                <p style="margin:0;font-size:10px;color:#6b6b85;font-family:monospace;">
                  <a href="${siteUrl}" style="color:#6b6b85;">${siteUrl.replace("https://", "")}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${unsubscribeUrl}" style="color:#6b6b85;">Unsubscribe</a>
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

      return {
        from:    `AlgoTracker <${fromEmail}>`,
        to:      toEmail,
        subject: `${displayName}, your tracker just levelled up`,
        text:    plainText,
        html,
        headers: {
          "X-Mailer": "AlgoTracker/1.0",
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "Precedence": "bulk",
        },
      };
    };

    // Resend rate limit: 2 emails per 1.5 seconds
    const BATCH_SIZE = 2;
    const BATCH_DELAY_MS = 1500;

    console.log(`[broadcast] Starting batched send to ${users.length} users (batch=${BATCH_SIZE}, delay=${BATCH_DELAY_MS}ms)`);
    const startMs = Date.now();

    const allResults = [];
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      if (i > 0) await new Promise(res => setTimeout(res, BATCH_DELAY_MS));

      const batchResults = await Promise.allSettled(
        batch.map(user => resend.emails.send(buildPayload(user)))
      );
      batchResults.forEach((r, j) => allResults.push({ r, user: batch[j] }));
      console.log(`[broadcast] Batch ${Math.floor(i / BATCH_SIZE) + 1}: processed ${batch.length} email(s)`);
    }

    const elapsed = Date.now() - startMs;
    let sent = 0;
    for (const { r, user } of allResults) {
      const addr = user.send_to;
      if (r.status === "fulfilled" && !r.value?.error) {
        console.log(`[broadcast] ✓ sent to ${addr} (id: ${r.value?.data?.id ?? r.value?.id ?? "?"})`);
        sent++;
      } else {
        const reason = r.reason?.message ?? r.value?.error?.message ?? JSON.stringify(r.value?.error);
        console.error(`[broadcast] ✗ failed for ${addr}: ${reason}`);
      }
    }

    console.log(`[broadcast] Done — ${sent}/${users.length} sent in ${elapsed}ms`);

    return new Response(JSON.stringify({ ok: true, sent, total: users.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[broadcast] Fatal error: ${err.message}`, err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
