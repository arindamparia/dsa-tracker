/** Updates stat cards, progress bar, and section mini-progress. */
import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { DailyGoal } from './daily-goal.js';

// ── Animated number counter ──────────────────────────────────────────────────
let _firstRender = true;
const _prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const _activeCounters = new WeakMap(); // el → rAF id, to cancel overlapping animations

function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

function animateNumber(el, target, duration = 0.6) {
  if (!el) return;
  if (_prefersReduced) { el.textContent = target; return; }
  const current = parseInt(el.textContent, 10) || 0;
  if (current === target) { el.textContent = target; return; }

  // Cancel any running counter on this element
  const prev = _activeCounters.get(el);
  if (prev) cancelAnimationFrame(prev);

  const start = performance.now();
  const durationMs = duration * 1000;
  function tick(now) {
    const t = Math.min((now - start) / durationMs, 1);
    el.textContent = Math.round(current + (target - current) * easeOutExpo(t));
    if (t < 1) { _activeCounters.set(el, requestAnimationFrame(tick)); }
    else { _activeCounters.delete(el); }
  }
  _activeCounters.set(el, requestAnimationFrame(tick));
}

function animatePct(el, target, duration = 0.6) {
  if (!el) return;
  if (_prefersReduced) { el.textContent = target + '%'; return; }
  const current = parseInt(el.textContent, 10) || 0;
  if (current === target) { el.textContent = target + '%'; return; }

  const prev = _activeCounters.get(el);
  if (prev) cancelAnimationFrame(prev);

  const start = performance.now();
  const durationMs = duration * 1000;
  function tick(now) {
    const t = Math.min((now - start) / durationMs, 1);
    el.textContent = Math.round(current + (target - current) * easeOutExpo(t)) + '%';
    if (t < 1) { _activeCounters.set(el, requestAnimationFrame(tick)); }
    else { _activeCounters.delete(el); }
  }
  _activeCounters.set(el, requestAnimationFrame(tick));
}

export function updateStats() {
  document.body.classList.remove('loading');
  const total = state.questions.length;
  let done = 0, easy = 0, easyTotal = 0, medium = 0, medTotal = 0, hard = 0, hardTotal = 0, notes = 0;
  
  const doneDates = new Set();
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  let todayDone = 0;

  state.questions.forEach(q => {
    if (q.difficulty === 'Easy')   easyTotal++;
    if (q.difficulty === 'Medium') medTotal++;
    if (q.difficulty === 'Hard')   hardTotal++;
    if (q.is_done) {
      done++;
      if (q.difficulty === 'Easy')   easy++;
      if (q.difficulty === 'Medium') medium++;
      if (q.difficulty === 'Hard')   hard++;
      
      if (q.solved_at) {
        const dateStr = new Date(q.solved_at).toLocaleDateString();
        doneDates.add(dateStr);
        if (dateStr === todayStr) {
          todayDone++;
        }
      }
    }
    if ((q.solution || q.notes || '').trim()) notes++;
  });

  // Compute streak from doneDates
  let currentStreak = 0;
  const msPerDay = 86400000;
  let checkDate = new Date(now);
  checkDate.setHours(0, 0, 0, 0);
  // If nothing done today, still check from yesterday so streak isn't broken mid-day
  while (true) {
    const ds = checkDate.toLocaleDateString();
    if (doneDates.has(ds)) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - msPerDay);
    } else if (ds === todayStr) {
      // today not done yet — still keep existing streak from yesterday
      checkDate = new Date(checkDate.getTime() - msPerDay);
    } else {
      break;
    }
  }

  // Resolve DOM elements
  const todayEl  = document.getElementById('hdr-today');
  const streakEl = document.getElementById('hdr-streak');

  smoothTransition(() => {
    const dur = _firstRender ? 0.8 : 0.4;

    document.getElementById('hdr-total').textContent    = total;
    animateNumber(document.getElementById('stat-done'), done, dur);
    document.getElementById('stat-of').textContent      = `of ${total}`;
    animateNumber(document.getElementById('stat-easy'), easy, dur);
    document.getElementById('stat-easy-of').textContent = `of ${easyTotal}`;
    animateNumber(document.getElementById('stat-medium'), medium, dur);
    document.getElementById('stat-med-of').textContent  = `of ${medTotal}`;
    animateNumber(document.getElementById('stat-hard'), hard, dur);
    document.getElementById('stat-hard-of').textContent = `of ${hardTotal}`;
    animateNumber(document.getElementById('stat-notes'), notes, dur);
    animateNumber(document.getElementById('stat-rem'), total - done, dur);

    if (todayEl) {
      animateNumber(todayEl, todayDone, dur);
      if (todayDone === 0) {
        todayEl.classList.remove('today-active');
      } else {
        todayEl.classList.add('today-active');
      }
      DailyGoal.update(todayDone);
    }

    if (streakEl) {
      streakEl.textContent = currentStreak > 0 ? `${currentStreak} Days` : '0 Days';
      if (currentStreak > 0) {
        streakEl.classList.add('streak-active');
      } else {
        streakEl.classList.remove('streak-active');
      }
    }

    const pct = total ? Math.round((done / total) * 100) : 0;
    animatePct(document.getElementById('prog-pct'), pct, dur);
    document.getElementById('prog-easy').style.width   = total ? (easy   / total * 100) + '%' : '0%';
    document.getElementById('prog-medium').style.width = total ? (medium / total * 100) + '%' : '0%';
    document.getElementById('prog-hard').style.width   = total ? (hard   / total * 100) + '%' : '0%';

    _firstRender = false;
  });
}
