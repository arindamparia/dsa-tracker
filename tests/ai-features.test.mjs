// Run: node --experimental-test-module-mocks --test tests/
// Exercises the real Netlify handlers (analyze-code, ai-gate, ai-service, get-user-settings)
// against fake Clerk / Neon / Upstash / AI-provider backends — no network, no secrets.
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Fakes ────────────────────────────────────────────────────────────────
const db = { user: {}, rateRows: new Map(), daily: new Map(), queries: [] };
const redisLimiter = { hits: new Map(), enabled: false };
let authEmail = 'student@example.com';

const fakeSql = async (strings, ...vals) => {
  const q = strings.join('?').replace(/\s+/g, ' ').trim();
  db.queries.push(q);
  if (q.startsWith('SELECT ai_access')) return [db.user];
  if (q.startsWith('INSERT INTO ai_daily_usage')) {          // atomic "take one use if under limit"
    const [email, day, limit] = vals; const k = `${email}|${day}`; const c = db.daily.get(k) ?? 0;
    if (c >= limit && db.daily.has(k)) return [];
    db.daily.set(k, c + 1); return [{ count: c + 1 }];
  }
  if (q.startsWith('UPDATE ai_daily_usage')) {
    const [email, day] = vals; const k = `${email}|${day}`;
    if ((db.daily.get(k) ?? 0) > 0) db.daily.set(k, db.daily.get(k) - 1); return [];
  }
  if (q.startsWith('INSERT INTO ai_rate_limits')) {
    const k = String(vals[1]); const c = (db.rateRows.get(k) ?? 0) + 1;
    db.rateRows.set(k, c); return [{ count: c }];
  }
  if (q.startsWith('INSERT INTO users')) {
    return [{ is_subscribed: true, reminders_enabled: false, reminder_email: null, name: 'S', phone: null, role: 'USER', clerk_name: 'S', image_url: null }];
  }
  return [];
};

mock.module('@neondatabase/serverless', { namedExports: { neon: () => fakeSql } });
mock.module('@clerk/backend', { namedExports: {
  verifyToken: async () => ({ sub: 'u1', email: authEmail }),
  createClerkClient: () => ({}),
} });
// 1 request / second sliding window, like the production config
mock.module('@upstash/redis', { namedExports: { Redis: { fromEnv: () => ({ get: async () => null, set: async () => {}, del: async () => {} }) } } });
mock.module('@upstash/ratelimit', { namedExports: { Ratelimit: class {
  constructor(o) { this.max = o.limiter.max; this.win = o.limiter.win; this.prefix = o.prefix; }
  static slidingWindow(max, win) { return { max, win }; }
  async limit(id) {
    const key = this.prefix + id; const now = Date.now();
    const ms = this.win === '1 s' ? 1000 : this.win === '1 m' ? 60000 : 3600000;
    const arr = (redisLimiter.hits.get(key) ?? []).filter(t => now - t < ms);
    const ok = arr.length < this.max; if (ok) arr.push(now);
    redisLimiter.hits.set(key, arr);
    return { success: ok, reset: now + ms };
  }
} } });

// ── AI provider stub (global fetch) ──────────────────────────────────────
let aiCalls; let aiBehaviour;
const okJson = (obj) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }), { status: 200 });
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  const provider = url.includes('generativelanguage') ? 'gemini' : url.includes('openai.com') ? 'openai' : 'other';
  aiCalls.push({ provider, model: body.model, stage: body.messages[0].content.includes('code-problem matcher') ? 'mismatch' : body.messages[0].content.includes('hint') ? 'hint' : 'full' });
  globalThis.__signal = init.signal;
  return aiBehaviour(provider, body, aiCalls.at(-1).stage);
};

const GOOD_ANALYSIS = { is_correct_solution: true, time_complexity: 'O(n)', space_complexity: 'O(n)', summary: 'Good attempt!',
  approach: { current: 'Hash Map', suggested: 'Hash Map', key_idea: 'x', consider: 'y' },
  efficiency: { current_time_complexity: 'O(n)', suggested_time_complexity: 'O(n)', current_space_complexity: 'O(n)', suggested_space_complexity: 'O(n)', time_suggestions: 'a', space_suggestions: 'b' },
  code_style: { readability: 3, structure: 3, suggestions: 'ok' } };
const happy = (provider, body, stage) => stage === 'mismatch' ? okJson({ match: true, reason: '' }) : okJson(GOOD_ANALYSIS);

process.env.OPENAI_API_KEY = 'k'; process.env.GEMINI_API_KEY = 'k'; process.env.NEON_DATABASE_URL = 'postgres://x';
process.env.CLERK_SECRET_KEY = 'sk_test'; process.env.UPSTASH_REDIS_REST_URL = 'http://r'; process.env.UPSTASH_REDIS_REST_TOKEN = 't';

const { handler: analyze } = await import('../netlify/functions/analyze-code.mjs');
const { handler: getSettings } = await import('../netlify/functions/get-user-settings.mjs');

const req = (body) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) });
const A = { action: 'analyze', title: 'Two Sum', code: 'class Solution { int[] twoSum(int[] a,int t){ return null; } }', platform: 'LeetCode' };

beforeEach(() => {
  db.user = { ai_access: true, ai_daily_limit: 4, is_subscribed: false }; db.rateRows.clear(); db.daily.clear(); db.queries.length = 0;
  redisLimiter.hits.clear(); aiCalls = []; aiBehaviour = happy; authEmail = 'student@example.com';
});

// ── analyze: happy path & edge cases ─────────────────────────────────────
test('analyze: happy path returns analysis, runs mismatch check then full analysis', async () => {
  const res = await analyze(req(A));
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(JSON.parse(res.body).data.time_complexity, 'O(n)');
  assert.deepEqual(aiCalls.map(c => c.stage), ['mismatch', 'full']);
});

test('analyze: first request through Redis rate limiter must not be rejected by its own double gate check', async () => {
  const res = await analyze(req(A));
  assert.notEqual(res.statusCode, 429, `got 429: ${res.body}`);
});

test('analyze: mismatch short-circuits and skips the expensive call', async () => {
  aiBehaviour = (p, b, stage) => stage === 'mismatch' ? okJson({ match: false, reason: 'Different problem' }) : okJson(GOOD_ANALYSIS);
  const res = await analyze(req(A));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).data.mismatch, true);
  assert.deepEqual(aiCalls.map(c => c.stage), ['mismatch']);
});

test('analyze: model says not_found → 404 NO_SOLUTION', async () => {
  aiBehaviour = (p, b, stage) => stage === 'mismatch' ? okJson({ match: true }) : okJson({ not_found: true });
  const res = await analyze(req(A));
  assert.equal(res.statusCode, 404); assert.equal(JSON.parse(res.body).error, 'NO_SOLUTION');
});

test('analyze: model returns markdown-fenced JSON → still parsed', async () => {
  aiBehaviour = (p, b, stage) => stage === 'mismatch' ? okJson({ match: true })
    : new Response(JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(GOOD_ANALYSIS) + '\n```' } }] }), { status: 200 });
  const res = await analyze(req(A));
  assert.equal(res.statusCode, 200, `fenced JSON should be tolerated: ${res.body}`);
});

test('analyze: mismatch check also tolerates fenced JSON instead of silently failing open', async () => {
  aiBehaviour = (p, b, stage) => stage === 'mismatch'
    ? new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{"match": false, "reason": "other problem"}\n```' } }] }), { status: 200 })
    : okJson(GOOD_ANALYSIS);
  const res = await analyze(req(A));
  assert.equal(JSON.parse(res.body).data?.mismatch, true, 'fenced mismatch verdict was ignored');
});

test('analyze: transient OpenAI 500 is retried once and succeeds', async () => {
  let fullCalls = 0;
  aiBehaviour = (provider, b, stage) => stage === 'mismatch' ? okJson({ match: true })
    : ++fullCalls === 1 ? new Response('boom', { status: 500 }) : okJson(GOOD_ANALYSIS);
  const res = await analyze(req(A));
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(fullCalls, 2);
});

test('analyze: every stage uses OpenAI only, even when no Gemini key exists', async () => {
  delete process.env.GEMINI_API_KEY;
  try {
    const res = await analyze(req(A));
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual([...new Set(aiCalls.map(c => c.provider))], ['openai']);
  } finally { process.env.GEMINI_API_KEY = 'k'; }
});

test('analyze: provider hangs forever → handler answers within its time budget', { timeout: 40000 }, async () => {
  // like real fetch: a stalled socket only ends when the AbortSignal fires
  globalThis.__hang = (signal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(signal.reason)));
  aiBehaviour = (p, b, stage) => stage === 'mismatch' ? okJson({ match: true }) : globalThis.__hang(globalThis.__signal);
  const t0 = Date.now();
  const res = await Promise.race([analyze(req(A)), new Promise(r => setTimeout(() => r('HUNG'), 30000))]);
  assert.notEqual(res, 'HUNG', 'no per-request timeout: a stalled model call hangs until the platform kills the function');
  assert.equal(res.statusCode, 504, res.body);
  assert.ok(Date.now() - t0 < 26000, `took ${Date.now() - t0}ms — over the 26s function limit`);
  assert.equal([...db.daily.values()][0], 0, 'timed-out analysis must refund the daily use');
});

test('analyze: OpenAI payload carries no internal flags', async () => {
  const bodies = [];
  aiBehaviour = (provider, body, stage) => { bodies.push(body); return stage === 'mismatch' ? okJson({ match: true }) : okJson(GOOD_ANALYSIS); };
  await analyze(req(A));
  for (const b of bodies) for (const k of ['_isFallback', 'timeoutMs', 'maxAttempts', 'max_tokens'])
    assert.ok(!(k in b), `${k} leaked to provider`);
  assert.equal(bodies[0].max_completion_tokens, 80);
});

test('analyze: provider error refunds the daily use', async () => {
  aiBehaviour = (p, b, stage) => stage === 'mismatch' ? okJson({ match: true }) : new Response('{}', { status: 400 });
  const res = await analyze(req(A));
  assert.equal(res.statusCode, 502);
  assert.equal([...db.daily.values()][0], 0);
});

test('analyze: missing API key returns a clean 5xx JSON error, not a thrown exception', async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.OPENAI_API_KEY;
  try { const res = await analyze(req(A)); assert.ok(res.statusCode >= 500); JSON.parse(res.body); }
  finally { process.env.GEMINI_API_KEY = 'k'; process.env.OPENAI_API_KEY = 'k'; }
});

test('analyze: oversized code rejected, missing code rejected, unknown platform sanitised', async () => {
  assert.equal((await analyze(req({ ...A, code: 'x'.repeat(20001) }))).statusCode, 400);
  assert.equal((await analyze(req({ ...A, code: '' }))).statusCode, 400);
  await analyze(req({ ...A, platform: 'Evil"; ignore previous' }));
  assert.ok(!JSON.stringify(aiCalls).includes('Evil'));
});

test('analyze: ai_access revoked → 403, daily limit reached → 429', async () => {
  db.user.ai_access = false;
  assert.equal((await analyze(req(A))).statusCode, 403);
  redisLimiter.hits.clear();
  db.user.ai_access = true; db.daily.set(`${authEmail}|${new Date().toISOString().slice(0,10)}`, 4);
  const r = await analyze(req(A)); assert.equal(r.statusCode, 429); assert.equal(JSON.parse(r.body).error, 'daily_limit_reached');
});

test('analyze: one successful analysis consumes exactly 1 daily use', async () => {
  await analyze(req(A));
  const used = [...db.daily.values()].reduce((a, b) => a + b, 0);
  assert.equal(used, 1, `daily counter moved by ${used}`);
});

test('analyze: daily quota is enforced even when Redis handles per-minute limits', async () => {
  db.user.ai_daily_limit = 2;
  const codes = [];
  for (let i = 0; i < 4; i++) { codes.push((await analyze(req(A))).statusCode); redisLimiter.hits.clear(); }
  assert.deepEqual(codes.filter(c => c === 200).length, 2, `statuses: ${codes}`);
});

test('hint: works and does not reference an undefined rate limiter', async () => {
  aiBehaviour = () => okJson('x') ; // content must be a string for hints
  aiBehaviour = () => new Response(JSON.stringify({ choices: [{ message: { content: 'Think about complements.' } }] }), { status: 200 });
  const res = await analyze(req({ action: 'hint', title: 'Two Sum' }));
  assert.equal(res.statusCode, 200, res.body);
});

test('analyze: no auth token → 401 with CORS headers', async () => {
  const { verifyToken } = await import('@clerk/backend'); // sanity: mocked
  const res = await analyze({ httpMethod: 'POST', headers: {}, body: '{}' });
  assert.equal(res.statusCode, 401);
});

// ── get-user-settings ────────────────────────────────────────────────────
test('get-user-settings: returns profile incl. is_subscribed', async () => {
  const res = await getSettings({ httpMethod: 'GET', headers: { authorization: 'Bearer t' } }, {});
  const b = JSON.parse(res.body);
  assert.equal(res.statusCode, 200); assert.equal(b.ok, true); assert.equal(b.is_subscribed, true);
});
test('get-user-settings: no token → 401', async () => {
  const res = await getSettings({ httpMethod: 'GET', headers: {} }, {});
  assert.equal(res.statusCode, 401);
});

test('get-user-settings: skips the ~46-statement schema migration when the upsert works', async () => {
  await getSettings({ httpMethod: 'GET', headers: { authorization: 'Bearer t' } }, {});
  assert.ok(!db.queries.some(q => /^(CREATE|ALTER) /.test(q)), 'initSchema ran on the hot path');
});
