// Ghost Replay pipeline: generate-ghost-background (writer) + check-ghost-cache (long-poll reader).
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const cache = new Map();             // "lc|lang" -> json_data
let questionDifficulty = 'Hard';
const key = (lc, lang) => `${lc}|${lang}`;

const fakeSql = async (strings, ...v) => {
  const q = strings.join('?').replace(/\s+/g, ' ').trim();
  if (q.startsWith('SELECT difficulty')) return [{ difficulty: questionDifficulty }];
  if (q.startsWith('INSERT INTO ai_rate_limits')) return [{ count: 1 }];
  if (q.startsWith('INSERT INTO ghost_cache')) {
    const [lc, lang, lock, staleBefore] = v; const k = key(lc, lang); const cur = cache.get(k);
    if (!cur) { cache.set(k, JSON.parse(lock)); return [{}]; }
    const takeable = cur.status === 'failed' || (cur.status === 'generating' && cur.started_at < staleBefore);
    if (takeable) { cache.set(k, JSON.parse(lock)); return [{}]; }
    return [];
  }
  if (q.startsWith('UPDATE ghost_cache')) {
    const failedWrite = q.includes("json_data->>'status' = 'generating'");
    const [json, lc, lang] = v; const k = key(lc, lang);
    if (failedWrite) { if (cache.get(k)?.status === 'generating') cache.set(k, JSON.parse(json)); }
    else cache.set(k, json);
    return [];
  }
  if (q.startsWith('SELECT json_data')) { const [lc, lang] = v; return cache.has(key(lc, lang)) ? [{ json_data: cache.get(key(lc, lang)) }] : []; }
  if (q.startsWith('DELETE FROM ghost_cache')) { const [lc, lang] = v; cache.delete(key(lc, lang)); return []; }
  return [];
};

let aiCalls = []; let aiImpl;
const published = [];                       // { channel, event, data, cacheAtPublish }
let pusherShouldFail = false;
mock.module('pusher', { exports: { default: class { constructor(o) { this.o = o; }
  async trigger(channel, event, data) {
    if (pusherShouldFail) throw new Error('pusher down');
    published.push({ channel, event, data, cacheAtPublish: structuredClone([...cache.entries()]) });
  } } } });
Object.assign(process.env, { PUSHER_APP_ID: '1', PUSHER_KEY: 'pk', PUSHER_SECRET: 'ps', PUSHER_CLUSTER: 'ap2' });
mock.module('@neondatabase/serverless', { exports: { neon: () => fakeSql } });
mock.module('@clerk/backend', { exports: { verifyToken: async () => ({ sub: 'u', email: 'a@b.c' }), createClerkClient: () => ({}) } });
mock.module('../netlify/functions/ai-service.mjs', { exports: {
  parseAIJson: (s) => JSON.parse(s),
  callAI: async (feature, messages, options) => { aiCalls.push({ feature, options }); return aiImpl(); },
} });
process.env.NEON_DATABASE_URL = 'x'; process.env.CLERK_SECRET_KEY = 'sk';

const { handler: generate } = await import('../netlify/functions/generate-ghost-background.mjs');
const { handler: check } = await import('../netlify/functions/check-ghost-cache.mjs');

const GOOD = { optimal_code: 'class Solution {}', time_complexity: 'O(n)', space_complexity: 'O(1)', intuition: 'i', naive_approach: 'n', dry_run: [{ step: 1, variable_state: 'x', description: 'd' }] };
const ok = (obj) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });
const post = (body) => ({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) });
const REQ = { lcNumber: 25, title: 'Reverse Nodes in k-Group', language: 'Java', platform: 'LeetCode', difficulty: 'Hard' };
const K = key(25, 'Java');

beforeEach(() => { published.length = 0; pusherShouldFail = false; cache.clear(); aiCalls = []; aiImpl = async () => ok(GOOD); questionDifficulty = 'Hard'; });

test('generate: Hard problem uses the large model with a long timeout (not the 12s default) and caches the replay', async () => {
  const res = await generate(post(REQ));
  assert.equal(res.statusCode, 200);
  assert.equal(aiCalls[0].feature, 'generate_ghost_hard');
  assert.ok(aiCalls[0].options.timeoutMs >= 60000, `timeoutMs=${aiCalls[0].options.timeoutMs}`);
  assert.equal(cache.get(K).optimal_code, GOOD.optimal_code);
});

test('generate: model choice follows stored difficulty, not what the client claims', async () => {
  await generate(post({ ...REQ, difficulty: 'Easy' }));
  assert.equal(aiCalls[0].feature, 'generate_ghost_hard');
});

test('generate: non-Hard problems are rejected', async () => {
  questionDifficulty = 'Easy';
  assert.equal((await generate(post(REQ))).statusCode, 403);
  assert.equal(aiCalls.length, 0);
});

test('generate: AI error marks the row failed (so waiting clients stop) instead of vanishing', async () => {
  aiImpl = async () => { throw Object.assign(new Error('timed out'), { status: 504 }); };
  const res = await generate(post(REQ));
  assert.equal(res.statusCode, 504);
  assert.equal(cache.get(K).status, 'failed');
});

test('generate: incomplete model output is never cached as a usable replay', async () => {
  aiImpl = async () => ok({ time_complexity: 'O(n)' });          // no optimal_code / dry_run
  const res = await generate(post(REQ));
  assert.equal(res.statusCode, 502);
  assert.equal(cache.get(K).status, 'failed');
});

test('generate: not_found verdict is cached as a legitimate result', async () => {
  aiImpl = async () => ok({ not_found: true });
  await generate(post(REQ));
  assert.equal(cache.get(K).not_found, true);
});

test('generate: live lock blocks duplicates; failed and stale locks are taken over', async () => {
  cache.set(K, { status: 'generating', started_at: Date.now() });
  await generate(post(REQ)); assert.equal(aiCalls.length, 0, 'duplicate run must abort');

  cache.set(K, { status: 'failed', failed_at: Date.now() });
  await generate(post(REQ)); assert.equal(aiCalls.length, 1, 'failed row must be retried');
  assert.equal(cache.get(K).optimal_code, GOOD.optimal_code);

  aiCalls = []; cache.set(K, { status: 'generating', started_at: Date.now() - 6 * 60 * 1000 });
  await generate(post(REQ)); assert.equal(aiCalls.length, 1, 'stale lock must be taken over');
});

test('generate: existing finished replay is never regenerated', async () => {
  cache.set(K, GOOD);
  await generate(post(REQ)); assert.equal(aiCalls.length, 0);
});

// ── check-ghost-cache ────────────────────────────────────────────────────
test('check: plain call answers immediately for miss / generating / failed / done', async () => {
  const t0 = Date.now();
  assert.equal(JSON.parse((await check(post(REQ))).body).status, 'pending');
  cache.set(K, { status: 'generating', started_at: Date.now() });
  assert.equal(JSON.parse((await check(post(REQ))).body).status, 'generating');
  cache.set(K, { status: 'failed' });
  assert.equal(JSON.parse((await check(post(REQ))).body).status, 'pending', 'failed row → retry on a fresh check');
  cache.set(K, GOOD);
  assert.equal(JSON.parse((await check(post(REQ))).body).ok, true);
  assert.ok(Date.now() - t0 < 500, 'non-wait checks must not block');
});

test('check (long-poll): returns as soon as generation finishes — not on a fixed interval', async () => {
  cache.set(K, { status: 'generating', started_at: Date.now() });
  setTimeout(() => cache.set(K, GOOD), 2000);
  const t0 = Date.now();
  const res = JSON.parse((await check(post({ ...REQ, wait: true }))).body);
  const took = Date.now() - t0;
  assert.equal(res.ok, true);
  assert.ok(took >= 1900 && took < 4000, `returned after ${took}ms`);
});

test('check (long-poll): failure is surfaced immediately; not_found → 404', async () => {
  cache.set(K, { status: 'generating', started_at: Date.now() });
  setTimeout(() => cache.set(K, { status: 'failed' }), 500);
  const t0 = Date.now();
  assert.equal(JSON.parse((await check(post({ ...REQ, wait: true }))).body).status, 'failed');
  assert.ok(Date.now() - t0 < 3000);

  cache.set(K, { not_found: true });
  const r = await check(post({ ...REQ, wait: true }));
  assert.equal(r.statusCode, 404);
});

test('check (long-poll): stale lock is reported as failed, not waited on', async () => {
  cache.set(K, { status: 'generating', started_at: Date.now() - 6 * 60 * 1000 });
  const res = JSON.parse((await check(post({ ...REQ, wait: true }))).body);
  assert.equal(res.status, 'failed');
});

// ── Pusher publishing ────────────────────────────────────────────────────
const { ghostChannel } = await import('../netlify/functions/ghost-events.mjs');

test('channel names are Pusher-legal for every language (C++, C#, Python 3 …)', () => {
  for (const lang of ['C++', 'C#', 'Python 3', 'Java', 'JavaScript'])
    assert.match(ghostChannel(25, lang), /^[A-Za-z0-9_\-=@,.;]+$/, lang);
  assert.notEqual(ghostChannel(25, 'C++'), ghostChannel(25, 'C#'));
});

test('publish: ghost-ready is sent only AFTER the replay is saved, with no replay content in the payload', async () => {
  await generate(post(REQ));
  assert.equal(published.length, 1);
  const ev = published[0];
  assert.equal(ev.event, 'ghost-ready');
  assert.equal(ev.channel, ghostChannel(25, 'Java'));
  const stored = new Map(ev.cacheAtPublish).get(K);
  assert.equal(stored.optimal_code, GOOD.optimal_code, 'client would re-fetch before data existed');
  assert.ok(!JSON.stringify(ev.data).includes('class Solution'), 'code must not travel through Pusher');
});

test('publish: failures are announced too, so waiting clients stop immediately', async () => {
  aiImpl = async () => { throw Object.assign(new Error('x'), { status: 502 }); };
  await generate(post(REQ));
  assert.deepEqual(published.map(p => p.event), ['ghost-failed']);
});

test('publish: not_found verdict is announced as ready (client then re-fetches the 404)', async () => {
  aiImpl = async () => ok({ not_found: true });
  await generate(post(REQ));
  assert.deepEqual(published.map(p => p.event), ['ghost-ready']);
});

test('publish: a Pusher outage never fails or loses the generation', async () => {
  pusherShouldFail = true;
  const res = await generate(post(REQ));
  assert.equal(res.statusCode, 200);
  assert.equal(cache.get(K).optimal_code, GOOD.optimal_code);
});

test('publish: duplicate/aborted runs and rejected requests publish nothing', async () => {
  cache.set(K, { status: 'generating', started_at: Date.now() });
  await generate(post(REQ));
  questionDifficulty = 'Easy';
  await generate(post(REQ));
  assert.equal(published.length, 0);
});

test('check: pending/generating responses carry the channel + public key; secret never leaks', async () => {
  const r = JSON.parse((await check(post(REQ))).body);
  assert.deepEqual(r.realtime, { key: 'pk', cluster: 'ap2', channel: ghostChannel(25, 'Java') });
  assert.ok(!JSON.stringify(r).includes('ps'));
  delete process.env.PUSHER_SECRET;
  try { assert.equal(JSON.parse((await check(post(REQ))).body).realtime, null, 'unconfigured → client long-polls'); }
  finally { process.env.PUSHER_SECRET = 'ps'; }
});
