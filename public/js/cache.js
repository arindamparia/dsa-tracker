/**
 * localStorage cache with a 30-day TTL.
 * Hard Refresh bypasses it; Logout.confirm() clears it entirely.
 */
const KEY    = 'dsa_questions';
const TS_KEY = 'dsa_cache_ts';
const TTL    = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export const Cache = {
  get() {
    try {
      const ts = parseInt(localStorage.getItem(TS_KEY) || '0', 10);
      if (Date.now() - ts > TTL) return null; // expired
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(questions) {
    try {
      localStorage.setItem(KEY, JSON.stringify(questions));
      localStorage.setItem(TS_KEY, String(Date.now()));
    } catch {} // storage full — silently skip
  },

  updateEntry(lc_number, patch) {
    try {
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
    localStorage.removeItem(KEY);
    localStorage.removeItem(TS_KEY);
  },
};
