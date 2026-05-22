import { lsSet, lsGet, lsRemove } from './storage.js';

const KEY    = 'dsa_questions';
const TS_KEY = 'dsa_cache_ts';
const TTL    = 30 * 24 * 60 * 60 * 1000;

const PROGRESS_TS_KEY = 'dsa_progress_ts';
const PROGRESS_TTL    = 15 * 60 * 1000; // 15 minutes

const USER_KEY    = 'dsa_user_profile';
const USER_TS_KEY = 'dsa_user_ts';
const USER_TTL    = 5 * 60 * 1000;

export const UserCache = {
  get() {
    try {
      const ts = lsGet(USER_TS_KEY, 0);
      if (Date.now() - ts > USER_TTL) return null;
      return lsGet(USER_KEY, null);
    } catch { return null; }
  },

  set(profile) {
    lsSet(USER_KEY, profile);
    lsSet(USER_TS_KEY, Date.now());
  },

  clear() {
    lsRemove(USER_KEY);
    lsRemove(USER_TS_KEY);
  },
};

const SIMILAR_KEY = 'dsa_similar_v2';

export const SimilarCache = {
  get(lc) {
    try {
      const map = lsGet(SIMILAR_KEY, {});
      const val = map[String(lc)];
      return Array.isArray(val) && val.length > 0 ? val : null;
    } catch { return null; }
  },

  set(lc, pickedLCs) {
    try {
      const map = lsGet(SIMILAR_KEY, {});
      map[String(lc)] = pickedLCs;
      lsSet(SIMILAR_KEY, map);
    } catch {}
  },

  clear() {
    lsRemove(SIMILAR_KEY);
  },
};

const HINT_KEY = 'dsa_hints_v1';

export const HintCache = {
  get(lc) {
    try {
      const map = lsGet(HINT_KEY, {});
      return map[String(lc)] || null;
    } catch { return null; }
  },

  set(lc, hintStr) {
    try {
      const map = lsGet(HINT_KEY, {});
      map[String(lc)] = hintStr;
      lsSet(HINT_KEY, map);
    } catch {}
  },

  clear() {
    lsRemove(HINT_KEY);
  },
};

let _memCache = null;

export const Cache = {
  get() {
    try {
      if (_memCache) return _memCache;
      const ts = lsGet(TS_KEY, 0);
      if (Date.now() - ts > TTL) return null;
      _memCache = lsGet(KEY, null);
      return _memCache;
    } catch { return null; }
  },

  set(questions) {
    try {
      _memCache = questions;
      lsSet(KEY, questions);
      lsSet(TS_KEY, Date.now());
    } catch {}
  },

  updateEntry(lc_number, patch) {
    try {
      if (_memCache) {
        const idx = _memCache.findIndex(q => q.lc_number === lc_number);
        if (idx !== -1) _memCache[idx] = { ..._memCache[idx], ...patch };
      }
      const questions = lsGet(KEY);
      if (!questions) return;
      const idx = questions.findIndex(q => q.lc_number === lc_number);
      if (idx !== -1) {
        questions[idx] = { ...questions[idx], ...patch };
        lsSet(KEY, questions);
      }
    } catch {}
  },

  isProgressStale() {
    const ts = lsGet(PROGRESS_TS_KEY, 0);
    return Date.now() - ts > PROGRESS_TTL;
  },

  touchProgress() {
    lsSet(PROGRESS_TS_KEY, Date.now());
  },

  clear() {
    _memCache = null;
    lsRemove(KEY);
    lsRemove(TS_KEY);
    lsRemove(PROGRESS_TS_KEY);
  },
};
