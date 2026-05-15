/**
 * perf-watch.js — passive jank detector with periodic re-checks.
 *
 * Cycle:
 *   • First check: OBSERVE_WAIT ms after boot (let page settle).
 *   • Recurring: every CHECK_INTERVAL ms, but ONLY when the tab is visible.
 *     If the tab is hidden when a check is due, the check is deferred until
 *     the next time the tab gains focus (visibilitychange / focus events).
 *   • Each cycle observes for OBSERVE_DURATION ms then evaluates.
 *
 * Detection:
 *   • Primary  — Long Tasks API (PerformanceObserver 'longtask'), Chrome/Edge 58+ 2026.
 *     Counts tasks ≥ LONGTASK_MIN ms. Reliable, zero-overhead between tasks.
 *   • Fallback — rAF delta sampler (all browsers).
 *     Counts frames that took > FRAME_JANK_MS ms (≈ dropped frames).
 *     Jank counted only while page is visible so background-throttling doesn't skew results.
 *
 * Banner:
 *   • "Reduce Performance" → writes perf-override + reloads (steps down one tier).
 *   • "Ignore" → closes banner; no localStorage write, so next cycle can show it again.
 */

const OBSERVE_WAIT     = 6_000;        // ms — post-boot settle before first check
const OBSERVE_DURATION = 12_000;       // ms — observation window per cycle
const CHECK_INTERVAL   = 15 * 60_000;  // ms — 15 min between recurring checks
const LONGTASK_MIN     = 100;          // ms — only clearly user-noticeable tasks
const FRAME_JANK_MS    = 50;           // ms — a frame >50ms is a dropped frame
const JANK_THRESHOLD   = 3;           // events in one cycle needed to show banner

let _observing    = false; // guard: never run two observation windows at once
let _pendingCheck = false; // true when a check was skipped because tab was hidden

export function startPerfWatch() {
  const tier = window.__perfTier;
  if (tier === 'lite') return; // already on lowest tier, nothing to suggest

  // First check after the page settles
  setTimeout(() => _tryObserve(tier), OBSERVE_WAIT);

  // Recurring checks every 15 minutes
  setInterval(() => _tryObserve(tier), CHECK_INTERVAL);

  // Deferred check: if the tab was hidden when a check was due, run it on focus
  const onVisible = () => {
    if (_pendingCheck) {
      _pendingCheck = false;
      setTimeout(() => _tryObserve(tier), 1_000); // 1s settle after tab gains focus
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onVisible(); });
  window.addEventListener('focus', onVisible);
}

function _tryObserve(tier) {
  if (_observing) return;           // already in a cycle
  if (document.hidden) { _pendingCheck = true; return; } // tab not visible — defer
  _observing = true;
  _observe(tier, () => { _observing = false; });
}

function _observe(tier, onDone) {
  let jankCount    = 0;
  let usedLongTask = false;

  const _finish = () => {
    if (jankCount >= JANK_THRESHOLD && !document.getElementById('pjb')) {
      _showBanner(tier);
    }
    onDone?.();
  };

  // ── Primary: Long Tasks API (Chrome / Edge) ───────────────────────
  if ('PerformanceObserver' in window) {
    try {
      const obs = new PerformanceObserver(list => {
        if (document.hidden) return; // ignore background throttling
        for (const entry of list.getEntries()) {
          if (entry.duration >= LONGTASK_MIN) jankCount++;
        }
      });
      obs.observe({ entryTypes: ['longtask'] });
      usedLongTask = true;
      setTimeout(() => { obs.disconnect(); _finish(); }, OBSERVE_DURATION);
    } catch (_) { /* longtask unsupported — fall through */ }
  }

  // ── Fallback: rAF delta sampler (Safari / Firefox) ───────────────
  if (!usedLongTask) {
    let last = performance.now();
    const end = last + OBSERVE_DURATION;
    const sample = (now) => {
      if (!document.hidden && now - last > FRAME_JANK_MS) jankCount++;
      last = now;
      if (now < end) requestAnimationFrame(sample);
      else _finish();
    };
    requestAnimationFrame(sample);
  }
}

function _showBanner(currentTier) {
  if (document.getElementById('pjb')) return; // already visible

  const suggestTier = currentTier === 'full' ? 'standard' : 'lite';

  const el = document.createElement('div');
  el.id = 'pjb';
  el.innerHTML = `
    <span class="pjb-ico">⚡</span>
    <p class="pjb-msg">It feels like you're experiencing <strong>jitter</strong>. Reducing performance mode can make the site feel much smoother.</p>
    <div class="pjb-btns">
      <button class="pjb-go">Reduce Performance</button>
      <button class="pjb-ignore">Ignore</button>
    </div>`;

  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('pjb--visible')));

  const _hide = () => {
    el.classList.remove('pjb--visible');
    setTimeout(() => el.remove(), 350);
  };

  el.querySelector('.pjb-go').addEventListener('click', () => {
    localStorage.setItem('perf-override', suggestTier);
    location.reload();
  });

  // Ignore: just close — no localStorage, next cycle can show again if still janky
  el.querySelector('.pjb-ignore').addEventListener('click', _hide);
}
