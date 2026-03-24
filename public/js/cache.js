const KEY    = 'dsa_questions';
const TS_KEY = 'dsa_cache_ts';
const TTL    = 30 * 24 * 60 * 60 * 1000;

const USER_KEY    = 'dsa_user_profile';
const USER_TS_KEY = 'dsa_user_ts';
const USER_TTL    = 5 * 60 * 1000;

export const UserCache = {
  get() {
    try {
      const ts = parseInt(localStorage.getItem(USER_TS_KEY) || '0', 10);
      if (Date.now() - ts > USER_TTL) return null;
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(profile) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
      localStorage.setItem(USER_TS_KEY, String(Date.now()));
    } catch {}
  },

  clear() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_TS_KEY);
  },
};

const SIMILAR_KEY = 'dsa_similar_v2';

export const SimilarCache = {
  get(lc) {
    try {
      const raw = localStorage.getItem(SIMILAR_KEY);
      const val = raw ? JSON.parse(raw)[String(lc)] : null;
      return Array.isArray(val) && val.length > 0 ? val : null;
    } catch { return null; }
  },

  set(lc, pickedLCs) {
    try {
      const raw = localStorage.getItem(SIMILAR_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[String(lc)] = pickedLCs;
      localStorage.setItem(SIMILAR_KEY, JSON.stringify(map));
    } catch {}
  },

  clear() {
    localStorage.removeItem(SIMILAR_KEY);
  },
};

const HINT_KEY = 'dsa_hints_v1';

export const HintCache = {
  get(lc) {
    try {
      const raw = localStorage.getItem(HINT_KEY);
      return raw ? (JSON.parse(raw)[String(lc)] || null) : null;
    } catch { return null; }
  },

  set(lc, hintStr) {
    try {
      const raw = localStorage.getItem(HINT_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[String(lc)] = hintStr;
      localStorage.setItem(HINT_KEY, JSON.stringify(map));
    } catch {}
  },

  clear() {
    localStorage.removeItem(HINT_KEY);
  },
};

let _memCache = null;

export const Cache = {
  get() {
    try {
      if (_memCache) return _memCache;
      const ts = parseInt(localStorage.getItem(TS_KEY) || '0', 10);
      if (Date.now() - ts > TTL) return null;
      const raw = localStorage.getItem(KEY);
      _memCache = raw ? JSON.parse(raw) : null;
      return _memCache;
    } catch { return null; }
  },

  set(questions) {
    try {
      _memCache = questions;
      localStorage.setItem(KEY, JSON.stringify(questions));
      localStorage.setItem(TS_KEY, String(Date.now()));
    } catch {}
  },

  updateEntry(lc_number, patch) {
    try {
      if (_memCache) {
        const idx = _memCache.findIndex(q => q.lc_number === lc_number);
        if (idx !== -1) _memCache[idx] = { ..._memCache[idx], ...patch };
      }
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const questions = JSON.parse(raw);
      const idx = questions.findIndex(q => q.lc_number === lc_number);
      if (idx !== -1) {
        questions[idx] = { ...questions[idx], ...patch };
        localStorage.setItem(KEY, JSON.stringify(questions));
      }
    } catch {}
  },

  clear() {
    _memCache = null;
    localStorage.removeItem(KEY);
    localStorage.removeItem(TS_KEY);
  },
};
