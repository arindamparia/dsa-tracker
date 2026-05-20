import { Redis } from "@upstash/redis";
import { getDb } from "./db.mjs";
import { checkAIRateLimit } from "./rate-limit.mjs";

const ADMIN_EMAIL = "arindamparia321@gmail.com";
const CACHE_TTL_S = 600; // 10 minutes — ai_access/limit/subscription rarely changes

// ── Upstash Redis client ──────────────────────────────────────────
// Falls back gracefully to null if env vars aren't set yet (local dev).
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Netlify
// dashboard → Site configuration → Environment variables.
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch {
  // Upstash not configured — all reads will fall through to Postgres
}

function cacheKey(email) {
  return `ai_gate:${email}`;
}

async function getCachedRow(email) {
  if (!redis) return null;
  try {
    return await redis.get(cacheKey(email)); // auto-parsed from JSON by @upstash/redis
  } catch {
    return null; // Redis down → fall through to DB
  }
}

async function setCachedRow(email, row) {
  if (!redis) return;
  try {
    await redis.set(cacheKey(email), row, { ex: CACHE_TTL_S });
  } catch {
    // Non-fatal — next request will re-read from DB
  }
}

/**
 * Delete the cached user row for `email`.
 * Call this immediately after any admin change (subscribe, ai_access, daily_limit).
 */
export async function invalidateAccessCache(email) {
  if (!redis) return;
  try {
    await redis.del(cacheKey(email));
  } catch {
    // Non-fatal
  }
}

/**
 * Centralized AI access gatekeeper.
 *
 * Checks (in order):
 *   1. ai_access flag — 403 if revoked by admin
 *   2. Daily limit    — 429 if quota exhausted
 *   3. Per-minute     — 429 if too many requests in the last minute
 *
 * Returns null   → user is allowed through.
 * Returns object → ready-to-send blocked response.
 *
 * @param {string}  userEmail
 * @param {object}  CORS
 * @param {object}  [opts]
 * @param {boolean} [opts.skipDailyLimit=false]
 * @param {boolean} [opts.skipPerMinute=false]
 */
export async function aiGate(userEmail, CORS, opts = {}) {
  const { skipDailyLimit = false, skipPerMinute = false } = opts;

  // Admin always bypasses everything
  if (userEmail === ADMIN_EMAIL) return null;

  // ── 1. ai_access + daily limit ────────────────────────────────────
  if (!skipDailyLimit) {
    try {
      const sql = getDb();

      // Try Redis cache first, fall back to Postgres on miss
      let row = await getCachedRow(userEmail);
      if (!row) {
        const [fetched] = await sql`
          SELECT ai_access, ai_daily_limit, is_subscribed
          FROM users
          WHERE email = ${userEmail}
          LIMIT 1
        `;
        row = fetched ?? {};
        await setCachedRow(userEmail, row); // warm the cache for 60s
      }

      // Block if admin has revoked access
      if (row.ai_access === false) {
        return {
          statusCode: 403,
          headers: CORS,
          body: JSON.stringify({
            ok: false,
            error: "ai_access_denied",
            message: "AI access is not enabled for your account. Please contact support.",
          }),
        };
      }

      // Resolve effective daily limit
      const baseLimit  = row.ai_daily_limit ?? 4;
      const dailyLimit = row.is_subscribed && baseLimit < 10 ? 10 : baseLimit;

      // Daily usage still read from Postgres — it's the source of truth
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const [usage] = await sql`
        SELECT COALESCE(SUM(count), 0)::int AS total
        FROM ai_rate_limits
        WHERE user_email = ${userEmail}
          AND window_start >= ${dayStart.toISOString()}
      `;

      if ((usage?.total ?? 0) >= dailyLimit) {
        return {
          statusCode: 429,
          headers: CORS,
          body: JSON.stringify({
            ok: false,
            error: "daily_limit_reached",
            message: `You've used all ${dailyLimit} AI calls for today. Resets at midnight UTC.`,
          }),
        };
      }
    } catch {
      // DB / Redis failure → fail open (don't block users on infra issues)
    }
  }

  // ── 2. Per-minute burst protection ───────────────────────────────
  if (!skipPerMinute) {
    try {
      const allowed = await checkAIRateLimit(userEmail);
      if (!allowed) {
        return {
          statusCode: 429,
          headers: CORS,
          body: JSON.stringify({
            ok: false,
            error: "rate_limited",
            message: "Too many requests. Please wait a moment.",
          }),
        };
      }
    } catch {
      // Fail open
    }
  }

  return null; // ✅ allowed through
}
