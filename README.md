# DSA Mastery Tracker

Full-stack LeetCode tracker with Neon PostgreSQL backend, deployed on Netlify.

## Project Structure

```
dsa-tracker/
├── netlify.toml                  # Build & functions config
├── package.json
├── .env.example
├── public/
│   └── index.html                # The entire frontend (single file)
└── netlify/
    └── functions/
        ├── db.js                 # Shared DB connection + schema init
        ├── get-questions.js      # GET  — seeds DB on first run, returns all questions + progress
        ├── update-progress.js    # POST — upsert checkbox / solution / notes
        └── add-question.js       # POST — insert new question (LC# unique)
```

## Database Schema

```sql
-- questions table (one row per LeetCode problem)
CREATE TABLE questions (
  id            SERIAL PRIMARY KEY,
  lc_number     INTEGER NOT NULL UNIQUE,   -- e.g. 1, 49, 128 …
  name          TEXT    NOT NULL,
  url           TEXT    NOT NULL,
  topic         TEXT    NOT NULL,
  difficulty    TEXT    NOT NULL,          -- 'Easy' | 'Medium' | 'Hard'
  section       TEXT    NOT NULL,          -- e.g. 'Arrays & Hashing'
  section_order INTEGER NOT NULL,          -- controls display order
  tags          TEXT[]  DEFAULT '{}',      -- e.g. ['goldman-sachs','trending']
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- progress table (one row per attempted problem)
CREATE TABLE progress (
  id          SERIAL PRIMARY KEY,
  lc_number   INTEGER NOT NULL UNIQUE REFERENCES questions(lc_number) ON DELETE CASCADE,
  is_done     BOOLEAN DEFAULT FALSE,
  solution    TEXT    DEFAULT '',
  notes       TEXT    DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Deploy to Netlify

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "init dsa tracker"
gh repo create dsa-tracker --public --push
```

### 2. Import to Netlify
- Go to https://app.netlify.com → "Add new site" → "Import an existing project"
- Connect your GitHub repo
- Build settings are auto-detected from `netlify.toml`

### 3. Set Environment Variable
- Site Settings → Environment Variables → Add variable:
  - Key:   `NEON_DATABASE_URL`
  - Value: `postgresql://neondb_owner:npg_nVeW90SqTpLQ@ep-green-meadow-ahm0aoyn-pooler.c-3.us-east-1.aws.neon.tech/Portfolio?sslmode=require&channel_binding=require`

### 4. Deploy
- Trigger a deploy — on first page load, `get-questions` will:
  1. Create the `questions` and `progress` tables (if they don't exist)
  2. Seed all 300 questions (idempotent — safe to run multiple times)
  3. Return all questions with their progress joined

## Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your real NEON_DATABASE_URL
npx netlify dev
# Visit http://localhost:8888
```

## Adding Questions

Click the **"+ Add Question"** button in the top-right. Fields:
- **LC Number** — must be unique
- **Difficulty** — Easy / Medium / Hard
- **Problem Name**
- **LeetCode URL**
- **Topic / Pattern** — e.g. "Sliding Window"
- **Section** — pick from existing or type a new one
- **Tags** (optional) — comma-separated, shown as purple pills

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/.netlify/functions/get-questions`   | Seed + fetch all questions with progress |
| POST | `/.netlify/functions/update-progress` | Upsert `is_done`, `solution`, `notes` |
| POST | `/.netlify/functions/add-question`    | Insert new question (409 if LC# exists) |
