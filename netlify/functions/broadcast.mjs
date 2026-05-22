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
        `👻 Ghost Replay Engine`,
        `   Watch the optimal solution being typed out character-by-character in Python, C++, Java, or Go.`,
        `   It breaks down the Naive Approach, the Intuition, and provides a Mental Dry Run.`,
        ``,
        `💬 Socratic Mock Interviews`,
        `   Stop reading solutions. Start explaining them out loud.`,
        `   Snowy will interview you on any problem you attempt. She never gives away the answer.`,
        ``,
        `⚡ Lightning-Fast, Unbreakable Engine`,
        `   We rebuilt our backend to be bulletproof. The AI generation happens via a fault-tolerant background process.`,
        `   Plus, with Smart Auto-Marking, whenever the AI verifies your code, it automatically updates your streak.`,
        ``,
        problemPlain,
        ``,
        `These aren't just UI polish. Each one is designed to remove friction between you and consistent daily practice.`,
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
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Stop grinding blindly. Your AI Study Buddy just dropped.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
          <tr>
            <td style="background:#09090b;overflow:hidden;">
              
              <!-- HEADER -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg, #180d2b 0%, #09090b 100%);">
                <tr>
                  <td align="center" style="padding:56px 40px 32px;border-bottom:1px solid rgba(139,92,246,0.3);">
                    <span style="display:inline-block;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:100px;padding:6px 16px;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#c4b5fd;margin-bottom:24px;">&#128293; Massive Platform Update</span>
                    <h1 style="margin:0 0 16px;font-size:32px;font-weight:900;color:#ffffff;line-height:1.2;letter-spacing:-0.03em;">
                      Stop grinding blindly. Your <span style="color:#a78bfa;">AI Study Buddy</span> just dropped.
                    </h1>
                    <p style="margin:0;font-size:16px;color:#94a3b8;font-weight:400;line-height:1.5;">
                      Reading 100 lines of someone else's optimal code is exhausting. We just changed how you prep for FAANG.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CALLOUT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td style="padding:0 32px;">
                    <div style="padding:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;text-align:center;">
                      <p style="margin:0;font-size:15px;color:#cbd5e1;line-height:1.6;">
                        Stuck on a <strong style="color:#fff;">Hard</strong> problem? Hit the <strong style="color:#fff;">Summon Ghost</strong> button. Watch an elite Staff Engineer write the solution live, explain their thought process, and answer your questions mid-code.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- FEATURES -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td style="padding:0 32px;">
                    
                    <!-- Ghost Replay -->
                    <div style="margin-bottom:24px;padding:24px;border-radius:16px;background:linear-gradient(145deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.02) 100%);border:1px solid rgba(139,92,246,0.25);">
                      <p style="margin:0 0 8px;"><span style="font-size:24px;vertical-align:middle;margin-right:12px;">&#128123;</span><strong style="font-size:18px;color:#ffffff;">Ghost Replay Engine</strong></p>
                      <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">Watch the optimal solution being typed out character-by-character in <strong style="color:#fff;">Python, C++, Java, or Go</strong>. It breaks down the Naive Approach, the Intuition, and provides a Mental Dry Run before the coding even begins.</p>
                      <div style="background:#000;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:16px;font-family:monospace;font-size:12px;line-height:1.6;">
                        <span style="color:#475569;font-style:italic;"># Ask questions while the code is generating:</span><br>
                        <strong style="color:#f472b6;">You:</strong> <span style="color:#cbd5e1;">Wait, why are we using a monotonic stack here?</span><br>
                        <strong style="color:#818cf8;">Snowy:</strong> <span style="color:#cbd5e1;">Great question! We need to find the "next greater element" in O(1)...</span>
                      </div>
                    </div>

                    <!-- Mock Interview -->
                    <div style="margin-bottom:24px;padding:24px;border-radius:16px;background:linear-gradient(145deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.02) 100%);border:1px solid rgba(16,185,129,0.25);">
                      <p style="margin:0 0 8px;"><span style="font-size:24px;vertical-align:middle;margin-right:12px;">&#128172;</span><strong style="font-size:18px;color:#ffffff;">Socratic Mock Interviews</strong></p>
                      <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">Stop reading solutions. <strong style="color:#fff;">Start explaining them out loud.</strong> Snowy will interview you on any problem you attempt. She never gives away the answer—she probes your logic and trains you to articulate your thoughts just like a real interview.</p>
                    </div>

                    <!-- Backend Engine -->
                    <div style="margin-bottom:24px;padding:24px;border-radius:16px;background:linear-gradient(145deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.02) 100%);border:1px solid rgba(245,158,11,0.25);">
                      <p style="margin:0 0 8px;"><span style="font-size:24px;vertical-align:middle;margin-right:12px;">&#9889;</span><strong style="font-size:18px;color:#ffffff;">Lightning-Fast, Unbreakable Engine</strong></p>
                      <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">We just rebuilt our backend to be bulletproof. The AI generation now happens via a <strong style="color:#fff;">fault-tolerant background process</strong>. Close the tab while generating? No problem. It keeps working. Plus, Auto-Marking instantly tracks your streak.</p>
                    </div>

                    <!-- Suggested problem -->
                    ${problemCardHtml}

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;border-top:1px solid rgba(255,255,255,0.08);border-bottom:1px solid rgba(255,255,255,0.08);">
                      <tr>
                        <td align="center" style="padding:40px 0;">
                          <h2 style="margin:0 0 24px;font-size:24px;font-weight:900;color:#fff;">Your next problem is waiting.</h2>
                          <a href="${siteUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:800;font-size:16px;padding:16px 40px;border-radius:100px;text-decoration:none;">Try Ghost Replay Now</a><br>
                          <a href="${siteUrl}" style="display:inline-block;color:#a78bfa;font-weight:600;font-size:14px;text-decoration:none;margin-top:16px;">View my dashboard &rarr;</a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- FOOTER -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:32px 32px 48px;">
                    <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                      You are receiving this because you're a registered user of AlgoTracker aiming to crush your placements.<br>
                      <a href="${unsubscribeUrl}" style="color:#818cf8;text-decoration:none;">Unsubscribe</a> | <a href="${siteUrl}" style="color:#818cf8;text-decoration:none;">Manage Preferences</a>
                    </p>
                  </td>
                </tr>
              </table>

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
        subject: `${displayName}, the way you've been prepping for tech interviews is broken 👻`,
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
