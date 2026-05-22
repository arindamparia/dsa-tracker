// ── Obfuscated localStorage wrapper ──────────────────────────────────────────
// All values are base64-encoded so they are not trivially readable or editable
// in browser DevTools. This is obfuscation (not encryption) — the goal is to
// prevent casual tampering with cached data.
//
// lsSet(key, value)    — stores any JS value (object, array, string, number)
// lsGet(key, fallback) — returns the decoded value, or fallback if missing
// lsRemove(key)        — removes the key
//
// Salt: a random 4-char prefix is mixed into every write so the same value
// produces a different encoded string each time — defeats pattern recognition.
// Format stored: "<4-char-salt><base64(salt + JSON(value))>"
//
// Migration: if a stored value cannot be decoded (old plain-text format from
// before this module was added), lsGet falls back to plain JSON.parse so
// existing data is not lost. The next lsSet call re-encodes it.

const _SALT_LEN = 4;

function _salt() {
  return Math.random().toString(36).slice(2, 2 + _SALT_LEN).padEnd(_SALT_LEN, '0');
}

function _encode(value) {
  const s = _salt();
  return s + btoa(encodeURIComponent(s + JSON.stringify(value)));
}

function _decode(raw) {
  try {
    const s     = raw.slice(0, _SALT_LEN);
    const inner = decodeURIComponent(atob(raw.slice(_SALT_LEN)));
    return JSON.parse(inner.slice(_SALT_LEN)); // strip embedded salt prefix
  } catch {
    // Legacy plain-text fallback
    try { return JSON.parse(raw); } catch { return raw; }
  }
}

export function lsSet(key, value) {
  try { localStorage.setItem(key, _encode(value)); } catch {}
}

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? _decode(raw) : fallback;
  } catch { return fallback; }
}

export function lsRemove(key) {
  localStorage.removeItem(key);
}
