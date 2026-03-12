import { neon } from "@neondatabase/serverless";

export function getDb() {
  if (!process.env.NEON_DATABASE_URL) {
    throw new Error("NEON_DATABASE_URL env variable is not set");
  }
  return neon(process.env.NEON_DATABASE_URL);
}

export async function initSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id            SERIAL PRIMARY KEY,
      lc_number     INTEGER NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      url           TEXT NOT NULL,
      topic         TEXT NOT NULL,
      difficulty    TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
      section       TEXT NOT NULL,
      section_order INTEGER NOT NULL DEFAULT 99,
      tags          TEXT[] DEFAULT '{}',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS progress (
      id          SERIAL PRIMARY KEY,
      lc_number   INTEGER NOT NULL UNIQUE REFERENCES questions(lc_number) ON DELETE CASCADE,
      is_done     BOOLEAN DEFAULT FALSE,
      solution    TEXT DEFAULT '',
      notes       TEXT DEFAULT '',
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  
  // Safe migrations for newly added columns
  await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS time_complexity TEXT DEFAULT ''`;
  await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS space_complexity TEXT DEFAULT ''`;
  await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS srs_interval_index INTEGER DEFAULT 0`;
  await sql`ALTER TABLE progress ADD COLUMN IF NOT EXISTS srs_last_reviewed_at TIMESTAMPTZ DEFAULT NULL`;
}
