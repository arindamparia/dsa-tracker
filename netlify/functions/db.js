import { neon } from "@neondatabase/serverless";

// ── Singleton SQL client ─────────────────────────────────────────
// Netlify functions reuse the same Node process across warm invocations
// on the same container, so reuse the client instead of recreating it.
let _sql = null;
export function getDb() {
  if (!_sql) _sql = neon(process.env.NEON_DATABASE_URL);
  return _sql;
}

// ── Schema init guard ────────────────────────────────────────────
// CREATE TABLE IF NOT EXISTS is safe but still costs a round-trip.
// Only run once per warm container lifetime.
let _schemaReady = false;

export async function ensureSchema(sql) {
  if (_schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id              SERIAL PRIMARY KEY,
      lc_number       INTEGER NOT NULL UNIQUE,
      name            TEXT    NOT NULL,
      url             TEXT    NOT NULL,
      topic           TEXT    NOT NULL,
      difficulty      TEXT    NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
      section         TEXT    NOT NULL,
      section_order   INTEGER NOT NULL DEFAULT 99,
      tags            TEXT[]  DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS progress (
      id          SERIAL PRIMARY KEY,
      lc_number   INTEGER NOT NULL UNIQUE REFERENCES questions(lc_number) ON DELETE CASCADE,
      is_done     BOOLEAN DEFAULT FALSE,
      solution    TEXT    DEFAULT '',
      notes       TEXT    DEFAULT '',
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  _schemaReady = true;
}

// ── In-process question cache ────────────────────────────────────
// Lives in module scope → survives across warm Lambda invocations.
// Cold starts always fetch fresh from Neon. TTL = 5 min safety-net.
//
// Cache is BUSTED immediately (not just expired) when:
//   • A question is added    → add-question.js calls cacheBust()
//   • Progress is updated    → update-progress.js calls cacheBust()
//
// Normal study session: GET hits cache, POSTs write to Neon + bust.
//
const TTL_MS = 5 * 60 * 1000; // 5 minutes

let _cache = { data: null, builtAt: 0, etag: null };

export function cacheGet() {
  if (!_cache.data) return null;
  if (Date.now() - _cache.builtAt > TTL_MS) {
    _cache = { data: null, builtAt: 0, etag: null };
    return null;
  }
  return _cache;
}

export function cacheSet(data) {
  _cache = { data, builtAt: Date.now(), etag: `"${Date.now()}"` };
}

export function cacheBust() {
  _cache = { data: null, builtAt: 0, etag: null };
}
