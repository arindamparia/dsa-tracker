import { getDb } from "./db.js";
import { Resend } from "resend";

// Netlify scheduled function handler
export default async (request, context) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sql = getDb();

    // Check if any problems were solved today
    const [result] = await sql`
      SELECT COUNT(*) as solved_today
      FROM progress
      WHERE is_done = TRUE 
        AND updated_at >= CURRENT_DATE
    `;

    const solvedCount = parseInt(result.solved_today, 10);

    if (solvedCount === 0) {
      // Send reminder email if count is 0
      await resend.emails.send({
        from: "DSA Tracker <arindamparia321@gmail.com>",
        to: "arindamparia321@gmail.com",
        subject: "Time to code! 💻 Your DSA streak needs you",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0b0c10; color: #c5c6c7; border-radius: 10px;">
            <h2 style="color: #66fcf1;">Hey Arindam,</h2>
            <p style="font-size: 16px; line-height: 1.5;">Just a friendly reminder: you haven't marked any DSA problems as "done" today.</p>
            <p style="font-size: 16px; line-height: 1.5;"><em>"Success is doing a half dozen things really well, repeated five thousand times."</em></p>
            <div style="margin-top: 30px;">
              <a href="https://your-dsa-tracker-url.netlify.app" style="background-color: #45a29e; color: #0b0c10; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; font-size: 16px;">Go to DSA Tracker</a>
            </div>
            <p style="font-size: 12px; margin-top: 40px; color: #45a29e;">This is an automated reminder from your Netlify Scheduled Functions.</p>
          </div>
        `,
      });
      console.log("Reminder email sent successfully.");
    } else {
      console.log(`User already solved ${solvedCount} problems today. Skipping email.`);
    }

    return new Response("OK");
  } catch (err) {
    console.error("Scheduled function error:", err);
    return new Response("Error", { status: 500 });
  }
};

// Configure the function to run at 10 PM IST (which is 4:30 PM UTC)
export const config = {
  schedule: "30 16 * * *",
};
