/**
 * DB-backed AI rate limiter.
 * Uses the ai_rate_limits table (created by initSchema in db.mjs).
 * Allows up to AI_LIMIT_PER_MINUTE LLM calls per user per 1-minute window.
 */
import { getDb } from "./db.mjs";

const AI_LIMIT_PER_MINUTE = 10;

/**
 * Returns true if the request is allowed, false if the user is rate-limited.
 * Atomically increments the counter via UPSERT then checks the new value.
 */
export async function checkAIRateLimit(userEmail) {
  // Admin bypass
  if (userEmail === 'arindamparia321@gmail.com') return true;

  const sql = getDb();
  // Bucket = current UTC minute boundary (e.g. "2024-01-01T12:05:00.000Z")
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();

  const [row] = await sql`
    INSERT INTO ai_rate_limits (user_email, window_start, count)
    VALUES (${userEmail}, ${windowStart}, 1)
    ON CONFLICT (user_email, window_start)
    DO UPDATE SET count = ai_rate_limits.count + 1
    RETURNING count
  `;

  if (row.count > AI_LIMIT_PER_MINUTE) {
    // Decrement: we over-counted before rejecting
    await sql`
      UPDATE ai_rate_limits SET count = count - 1
      WHERE user_email = ${userEmail} AND window_start = ${windowStart}
    `;
    return false; // rate-limited
  }
  return true; // allowed
}
