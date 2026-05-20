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
        icon: "👻",
        tag: "NEW",
        tagColor: "#8b5cf6",
        tagBg: "rgba(139,92,246,0.15)",
        borderColor: "rgba(139,92,246,0.3)",
        title: "Ghost Replay — Watch AI Solve Hard Problems Live",
        desc: "Pick any Hard problem, hit Summon Ghost, and watch an AI Staff Engineer write the perfect solution live — in C++ or Java. Every replay comes with the full story: the intuition, the simpler brute-force approach, a step-by-step dry run, and exactly how fast and memory-efficient the solution is. Ask Snowy questions mid-replay and she'll break down every decision.",
      },
      {
        icon: "💬",
        tag: "NEW",
        tagColor: "#14b8a6",
        tagBg: "rgba(20,184,166,0.15)",
        borderColor: "rgba(20,184,166,0.3)",
        title: "Mock Interview with Snowy — Stop Reading, Start Thinking",
        desc: "Snowy is your AI Staff Engineer who interviews you Socratically. She never gives away the answer — she asks, probes, and pushes you to articulate your reasoning out loud. Exactly how top tech companies interview. Your entire conversation is saved per question on your device so you can pick up exactly where you left off.",
      },
      {
        icon: "✅",
        tag: "SMART",
        tagColor: "#f59e0b",
        tagBg: "rgba(245,158,11,0.15)",
        borderColor: "rgba(245,158,11,0.3)",
        title: "Auto-Mark on Correct Solution",
        desc: "When you submit your code and the AI confirms it's correct, the problem is instantly marked as done — no manual checkbox. Your streak and progress update automatically so you stay in flow.",
      },
      {
        icon: "⚡",
        tag: "RELIABILITY",
        tagColor: "#6366f1",
        tagBg: "rgba(99,102,241,0.15)",
        borderColor: "rgba(99,102,241,0.3)",
        title: "Always-On AI — Super Fast & Never Goes Down",
        desc: "Our AI is super fast and built to always be available. You will never hit a dead end, see a failure screen, or lose your progress mid-session. It just works, every single time.",
      },
    ];

    const featureCardsHtml = features.map(f => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border:1px solid ${f.borderColor};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:18px 20px 16px;">
            <p style="margin:0 0 8px;">
              <span style="font-size:22px;vertical-align:middle;margin-right:8px;">${f.icon}</span>
              <span style="display:inline-block;background:${f.tagBg};color:${f.tagColor};font-size:9px;font-family:monospace;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:2px 8px;border-radius:100px;vertical-align:middle;">${f.tag}</span>
            </p>
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#e8e8f0;line-height:1.2;">${f.title}</p>
            <p style="margin:0;font-size:13px;color:#9898b0;line-height:1.7;">${f.desc}</p>
          </td>
        </tr>
      </table>`).join("");

    const featurePlainText = features.map(f =>
      `${f.icon} [${f.tag}] ${f.title}\n   ${f.desc}`
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
    Ghost Replay just dropped — most people are still reading editorials. Don't be that person.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="background:#111118;border-radius:14px;border:1px solid #2a2a3e;overflow:hidden;">

              <div style="height:3px;background:linear-gradient(90deg,#8b5cf6,#14b8a6,#f59e0b);"></div>

              <div style="padding:30px 28px 8px;">
                <p style="margin:0 0 10px;font-size:10px;font-family:monospace;text-transform:uppercase;letter-spacing:2px;color:#6b6b85;">AlgoTracker &mdash; Product Update</p>
                <h1 style="margin:0 0 14px;font-size:28px;font-weight:900;color:#e8e8f0;line-height:1.2;">
                  ${displayName}, your AI study buddy just got a brain transplant. &#128165;
                </h1>
                <p style="margin:0 0 6px;font-size:15px;color:#9898b0;line-height:1.7;">
                  Reading editorial solutions is the <strong style="color:#ff6b6b;">worst way to prep</strong>. You read, you nod, you close the tab — and two days later you can't solve anything.<br><br>
                  We built two tools that force you to <em>actually think</em>. Here's what just dropped.
                </p>

                <!-- Top mini-CTA -->
                <table cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td style="border-radius:7px;background:linear-gradient(135deg,#8b5cf6,#4f46e5);">
                      <a href="${siteUrl}" style="display:inline-block;padding:10px 24px;font-size:13px;font-weight:700;color:#fff;text-decoration:none;">Try it now &rarr;</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Divider -->
              <div style="margin:20px 28px;border-top:1px solid #2a2a3e;"></div>

              <div style="padding:0 28px 24px;">

                <!-- Feature cards -->
                ${featureCardsHtml}

                <!-- Suggested problem -->
                ${problemCardHtml}

                <!-- What you'll actually learn -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:linear-gradient(135deg,rgba(20,184,166,0.08),rgba(99,102,241,0.06));border:1px solid rgba(20,184,166,0.25);border-radius:10px;">
                  <tr>
                    <td style="padding:18px 20px 10px;">
                      <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:#e8e8f0;">&#128161; What you&rsquo;ll actually learn &mdash; not just watch</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#c4b5fd;">&#129504; Algorithm Intuition</p>
                            <p style="margin:0 0 4px;font-size:11px;color:#64748b;line-height:1.5;">Understand the <em>why</em> before seeing a line of code</p>
                            <p style="margin:0;font-size:10px;color:#8b5cf6;font-weight:600;">&#8594; Watch the intuition card before hitting play</p>
                          </td>
                          <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#5eead4;">&#128483;&#65039; Verbal Articulation</p>
                            <p style="margin:0 0 4px;font-size:11px;color:#64748b;line-height:1.5;">Train yourself to explain your approach out loud</p>
                            <p style="margin:0;font-size:10px;color:#14b8a6;font-weight:600;">&#8594; Use Mock Interview before looking at any solution</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#fde68a;">&#9203; Complexity Analysis</p>
                            <p style="margin:0 0 4px;font-size:11px;color:#64748b;line-height:1.5;">Time &amp; space broken down in plain English</p>
                            <p style="margin:0;font-size:10px;color:#f59e0b;font-weight:600;">&#8594; Pause the replay and predict complexity before Snowy reveals it</p>
                          </td>
                          <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#a5b4fc;">&#127757; Multi-Language Fluency</p>
                            <p style="margin:0 0 4px;font-size:11px;color:#64748b;line-height:1.5;">Same perfect solution in C++ or Java</p>
                            <p style="margin:0;font-size:10px;color:#6366f1;font-weight:600;">&#8594; Watch it in the language your target company uses</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#86efac;">&#128027; Edge Case Radar</p>
                            <p style="margin:0 0 4px;font-size:11px;color:#64748b;line-height:1.5;">Snowy validates or challenges every claim you make</p>
                            <p style="margin:0;font-size:10px;color:#22c55e;font-weight:600;">&#8594; Tell Snowy your solution handles all cases &mdash; see if she agrees</p>
                          </td>
                          <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
                            <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#fb923c;">&#128202; Pattern Recognition</p>
                            <p style="margin:0 0 4px;font-size:11px;color:#64748b;line-height:1.5;">Map each problem to its core algorithm pattern</p>
                            <p style="margin:0;font-size:10px;color:#f97316;font-weight:600;">&#8594; Ask Snowy &ldquo;what pattern does this problem follow?&rdquo;</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- 3 Steps to start RIGHT NOW -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid rgba(251,191,36,0.3);border-radius:10px;overflow:hidden;">
                  <tr><td style="background:rgba(251,191,36,0.08);padding:10px 20px;border-bottom:1px solid rgba(251,191,36,0.2);">
                    <p style="margin:0;font-size:10px;font-family:monospace;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fbbf24;">&#9889; Start in 60 seconds</p>
                  </td></tr>
                  <tr><td style="padding:16px 20px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#8b5cf6;font-size:11px;font-weight:800;color:#fff;text-align:center;line-height:22px;">1</span></td>
                        <td style="padding-left:10px;padding-bottom:12px;"><p style="margin:0;font-size:13px;color:#e2e8f0;line-height:1.5;">Open any <strong>Hard problem</strong> in your tracker</p></td>
                      </tr>
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#14b8a6;font-size:11px;font-weight:800;color:#fff;text-align:center;line-height:22px;">2</span></td>
                        <td style="padding-left:10px;padding-bottom:12px;"><p style="margin:0;font-size:13px;color:#e2e8f0;line-height:1.5;">Hit <strong style="color:#c4b5fd;">&#128172; Mock Interview</strong> &mdash; try to explain the approach to Snowy before seeing any code</p></td>
                      </tr>
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#f59e0b;font-size:11px;font-weight:800;color:#fff;text-align:center;line-height:22px;">3</span></td>
                        <td style="padding-left:10px;"><p style="margin:0;font-size:13px;color:#e2e8f0;line-height:1.5;">Then hit <strong style="color:#c4b5fd;">&#128123; Summon Ghost</strong> &mdash; watch the optimal solution appear live and ask Snowy anything</p></td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <!-- FOMO stats -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-radius:10px;overflow:hidden;border:1px solid #2a2a3e;">
                  <tr>
                    <td width="33%" style="padding:14px 8px;text-align:center;border-right:1px solid #2a2a3e;">
                      <p style="margin:0;font-size:22px;font-weight:900;color:#a78bfa;">5+</p>
                      <p style="margin:2px 0 0;font-size:10px;color:#475569;">Languages</p>
                    </td>
                    <td width="33%" style="padding:14px 8px;text-align:center;border-right:1px solid #2a2a3e;">
                      <p style="margin:0;font-size:22px;font-weight:900;color:#5eead4;">⚡</p>
                      <p style="margin:2px 0 0;font-size:10px;color:#475569;">Always online, always fast</p>
                    </td>
                    <td width="33%" style="padding:14px 8px;text-align:center;">
                      <p style="margin:0;font-size:22px;font-weight:900;color:#fde68a;">&infin;</p>
                      <p style="margin:2px 0 0;font-size:10px;color:#475569;">Saved sessions per question</p>
                    </td>
                  </tr>
                </table>

                <!-- Urgency nudge -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:linear-gradient(135deg,rgba(255,71,87,0.1),rgba(139,92,246,0.08));border:1px solid rgba(255,71,87,0.3);border-radius:10px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#e8e8f0;">&#128293; The gap between you and an offer is closing every day you don&rsquo;t practice.</p>
                      <p style="margin:0;font-size:13px;color:#9898b0;line-height:1.65;">
                        Candidates who land offers at top tech companies don&rsquo;t just solve problems &mdash; they can <em>explain</em> their reasoning under pressure.
                        Mock Interview trains exactly that. Ghost Replay shows you what optimal actually looks like.
                        <strong style="color:#e8e8f0;">Both are live. Both are free. Open your tracker right now.</strong>
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Primary CTA -->
                <table cellpadding="0" cellspacing="0" style="margin-top:28px;width:100%;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="border-radius:9px;background:linear-gradient(135deg,#8b5cf6,#4f46e5);box-shadow:0 8px 24px rgba(139,92,246,0.4);">
                             <a href="${siteUrl}"
                                style="display:inline-block;padding:16px 52px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;letter-spacing:0.03em;">
                               &#128123;&nbsp; Summon Ghost Now
                             </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:12px 0 0;font-size:12px;color:#475569;">or <a href="${siteUrl}" style="color:#7c6af7;text-decoration:none;">open your full tracker &rarr;</a></p>
                    </td>
                  </tr>
                </table>

                <p style="margin-top:28px;font-size:13px;color:#6b6b85;line-height:1.7;border-top:1px solid #2a2a3e;padding-top:20px;">
                  Your next Hard problem is waiting. So is Snowy. &#128123;<br>
                  If you have feedback or a feature request — just reply, we actually read every email.<br>
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
