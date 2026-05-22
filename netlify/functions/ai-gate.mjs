import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getDb } from "./db.mjs";

const ADMIN_EMAIL  = "arindamparia321@gmail.com";
const CACHE_TTL_S  = 600; // 10 min — ai_access row rarely changes

// ── Upstash Redis client ──────────────────────────────────────────
let redis = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch { /* Upstash not configured — fall through to Postgres */ }

// ── Multi-window rate limiters (per function-name + user) ─────────
// Windows:  1 req/s  →  20 req/min  →  200 req/hr
// If Redis is not configured these are null and we skip silently.
//
// Key pattern:  rl:<fnName>:<email>   (e.g. "rl:mock_interview:alice@x.com")
//
// We create one Ratelimit instance per window and check all three.
// The first window that rejects wins and the error is returned.
let rl1s   = null; //  1 per  1 second  — stops instant spam
let rl1m   = null; // 20 per  1 minute  — comfortable chat pace
let rl1h   = null; // 200 per 1 hour    — hourly abuse ceiling
try {
  if (redis) {
    rl1s = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1,   "1 s"),  prefix: "rl1s"  });
    rl1m = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,  "1 m"),  prefix: "rl1m"  });
    rl1h = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, "60 m"), prefix: "rl1h"  });
  }
} catch { /* non-fatal */ }

// ── User access row cache ─────────────────────────────────────────
function cacheKey(email) { return `ai_gate:${email}`; }

async function getCachedRow(email) {
  if (!redis) return null;
  try { return await redis.get(cacheKey(email)); } catch { return null; }
}

async function setCachedRow(email, row) {
  if (!redis) return;
  try { await redis.set(cacheKey(email), row, { ex: CACHE_TTL_S }); } catch {}
}

export async function invalidateAccessCache(email) {
  if (!redis) return;
  try { await redis.del(cacheKey(email)); } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────
function blocked429(CORS, retryAfter, message) {
  return {
    statusCode: 429,
    headers: { ...CORS, "Retry-After": String(retryAfter) },
    body: JSON.stringify({ ok: false, error: "rate_limited", message }),
  };
}

/**
 * Multi-window sliding rate limiter.
 * Checks 1/s → 20/min → 200/hr for the given function name.
 * Falls back to Postgres-backed minute counter if Redis is unavailable.
 *
 * @param {string} userEmail
 * @param {string} fnName      – identifier used as part of the Redis key
 * @param {object} CORS
 * @returns {object|null}  null = allowed, response object = blocked
 */
async function checkRateLimits(userEmail, fnName, CORS) {
  const id = `${fnName}:${userEmail}`;

  if (rl1s && rl1m && rl1h) {
    // ── Redis path: three sliding windows ────────────────────────
    try {
      const [r1s, r1m, r1h] = await Promise.all([
        rl1s.limit(id),
        rl1m.limit(id),
        rl1h.limit(id),
      ]);

      if (!r1s.success) {
        return blocked429(CORS, 1,    "Slow down — 1 message per second please.");
      }
      if (!r1m.success) {
        const wait = Math.ceil((r1m.reset - Date.now()) / 1000);
        return blocked429(CORS, wait, `Too many requests. You can send up to 20 messages per minute. Try again in ${wait}s.`);
      }
      if (!r1h.success) {
        const wait = Math.ceil((r1h.reset - Date.now()) / 1000);
        return blocked429(CORS, wait, `Hourly limit reached. You can send up to 200 messages per hour. Resets in ${Math.ceil(wait / 60)} min.`);
      }
      return null; // ✅ all windows passed
    } catch { /* Redis error → fall through to Postgres */ }
  }

  // ── Postgres fallback: simple per-minute counter ──────────────
  try {
    const sql = getDb();
    const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    const [row] = await sql`
      INSERT INTO ai_rate_limits (user_email, window_start, count)
      VALUES (${userEmail}, ${windowStart}, 1)
      ON CONFLICT (user_email, window_start)
      DO UPDATE SET count = ai_rate_limits.count + 1
      RETURNING count
    `;
    if (row.count > 20) {
      await sql`
        UPDATE ai_rate_limits SET count = count - 1
        WHERE user_email = ${userEmail} AND window_start = ${windowStart}
      `;
      return blocked429(CORS, 30, "Too many requests. Please wait a moment.");
    }
  } catch { /* fail open on DB error */ }

  return null;
}

/**
 * Centralized AI access gatekeeper.
 *
 * Checks in order:
 *   1. ai_access flag    — 403 if revoked by admin
 *   2. Daily quota       — 429 if exhausted  (only when skipDailyLimit=false)
 *   3. Multi-window RL   — 429 with Retry-After (1/s → 20/min → 200/hr)
 *
 * Returns null   → allowed through.
 * Returns object → ready-to-send blocked response.
 *
 * @param {string}  userEmail
 * @param {object}  CORS
 * @param {object}  [opts]
 * @param {boolean} [opts.skipDailyLimit=false]
 * @param {boolean} [opts.skipPerMinute=false]   — kept for back-compat; now controls all RL windows
 * @param {string}  [opts.fnName='ai']           — function identifier for RL key namespacing
 */
export async function aiGate(userEmail, CORS, opts = {}) {
  const {
    skipDailyLimit = false,
    skipPerMinute  = false,
    fnName         = "ai",
  } = opts;

  if (userEmail === ADMIN_EMAIL) return null;

  // ── 1. ai_access + daily limit ────────────────────────────────
  if (!skipDailyLimit) {
    try {
      const sql = getDb();
      let row = await getCachedRow(userEmail);
      if (!row) {
        const [fetched] = await sql`
          SELECT ai_access, ai_daily_limit, is_subscribed
          FROM users WHERE email = ${userEmail} LIMIT 1
        `;
        row = fetched ?? {};
        await setCachedRow(userEmail, row);
      }

      if (row.ai_access === false) {
        return {
          statusCode: 403, headers: CORS,
          body: JSON.stringify({
            ok: false, error: "ai_access_denied",
            message: "AI access is not enabled for your account. Please contact support.",
          }),
        };
      }

      const baseLimit  = row.ai_daily_limit ?? 4;
      const dailyLimit = row.is_subscribed && baseLimit < 10 ? 10 : baseLimit;

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
          statusCode: 429, headers: CORS,
          body: JSON.stringify({
            ok: false, error: "daily_limit_reached",
            message: `You've used all ${dailyLimit} AI analyses for today. Resets at midnight UTC.`,
          }),
        };
      }
    } catch { /* fail open */ }
  }

  // ── 2. Multi-window sliding rate limits ───────────────────────
  if (!skipPerMinute) {
    const rlBlocked = await checkRateLimits(userEmail, fnName, CORS);
    if (rlBlocked) return rlBlocked;
  }

  return null; // ✅ allowed through
}
