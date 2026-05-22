// smoothTransition: intentionally bypasses View Transitions API to prevent
// Chrome's compositing flicker when a position:fixed background image is active.
// The theme toggle (circular clip) calls startViewTransition directly and is unaffected.
// CSS transitions on .section-body / .section-col-headers handle visual smoothness.
export function smoothTransition(cb) {
  cb();
}

// Scroll lock counter — multiple callers can lock independently; scroll only
// restores when every caller has unlocked (prevents premature unlock).
let _scrollLockCount = 0;
export function lockScroll() {
  _scrollLockCount++;
  document.body.style.overflow = 'hidden';
  window.__lenis?.stop();
}
export function unlockScroll() {
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if (_scrollLockCount === 0) {
    document.body.style.overflow = '';
    window.__lenis?.start();
  }
}

// ── Plugin guard ─────────────────────────────────────────────────────────────
// Prevents browser extensions (Grammarly, LanguageTool, etc.) from injecting
// into inputs, which causes layout jitter and console errors.
// Usage: add class="no-plugins" to any <textarea> or <input>.
// Call initPluginGuards() once at app boot — MutationObserver handles all
// elements added dynamically after that (e.g. per-question sol-box rows).
const _PLUGIN_ATTRS = {
  'data-gramm':              'false',
  'data-gramm_editor':       'false',
  'data-enable-grammarly':   'false',
  'spellcheck':              'false',
};

function _applyGuards(el) {
  for (const [attr, val] of Object.entries(_PLUGIN_ATTRS)) {
    el.setAttribute(attr, val);
  }
}

export function initPluginGuards() {
  document.querySelectorAll('.no-plugins').forEach(_applyGuards);
  new MutationObserver(mutations => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('.no-plugins')) _applyGuards(node);
        node.querySelectorAll('.no-plugins').forEach(_applyGuards);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

export function groupBySections(questions) {
  const map = new Map();
  for (const q of questions) {
    const key = `${q.section_order}|||${q.section}`;
    if (!map.has(key)) {
      map.set(key, { section: q.section, section_order: q.section_order, questions: [] });
    }
    map.get(key).questions.push(q);
  }
  return [...map.values()].sort((a, b) => a.section_order - b.section_order);
}
