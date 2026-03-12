/**
 * Daily Goal — configurable daily target with SVG ring progress.
 *
 * Persists goal in localStorage. The "Solved Today" stat card
 * becomes interactive: shows a ring + celebration when goal is met.
 */
const GOAL_KEY = 'dsa_daily_goal';

function loadGoal() {
  try { return parseInt(localStorage.getItem(GOAL_KEY), 10) || 0; } catch { return 0; }
}

function saveGoal(n) {
  try { localStorage.setItem(GOAL_KEY, String(n)); } catch {}
}

function buildRingSVG(pct) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 1));
  const color = pct >= 1 ? 'var(--easy)' : 'var(--accent)';

  return `
    <svg class="goal-ring-svg" viewBox="0 0 68 68" width="68" height="68">
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="4" />
      <circle cx="34" cy="34" r="${r}" fill="none"
        stroke="${color}" stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 34 34)"
        class="goal-ring-progress" />
    </svg>`;
}

export const DailyGoal = {
  _goal: 0,

  init() {
    this._goal = loadGoal();
    this._renderRing(0);
    this._updateLabel(0);
  },

  /** Called by updateStats() with today's count */
  update(todayDone) {
    if (this._goal <= 0) {
      this._renderRing(0);
      this._updateLabel(todayDone);
      return;
    }
    const pct = todayDone / this._goal;
    this._renderRing(pct);
    this._updateLabel(todayDone);

    // Celebration state
    const card = document.querySelector('.today-card');
    if (!card) return;
    card.classList.toggle('goal-met', pct >= 1);
  },

  _renderRing(pct) {
    const wrap = document.getElementById('daily-goal-ring');
    if (!wrap) return;
    if (this._goal <= 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = buildRingSVG(pct);
  },

  _updateLabel(todayDone) {
    const label = document.getElementById('daily-goal-label');
    if (!label) return;
    if (this._goal <= 0) {
      label.textContent = 'click to set goal';
    } else {
      label.textContent = `${todayDone} / ${this._goal} daily goal`;
    }
  },

  openEditor() {
    const input = document.getElementById('goal-input');
    if (input) input.value = this._goal || 3;
    document.getElementById('goal-editor-modal').classList.add('open');
    if (input) input.focus();
  },

  closeEditor() {
    document.getElementById('goal-editor-modal').classList.remove('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('goal-editor-modal')) this.closeEditor();
  },

  adjust(dir) {
    const input = document.getElementById('goal-input');
    if (!input) return;
    const cur = parseInt(input.value, 10) || 0;
    const next = Math.max(1, Math.min(20, cur + dir));
    input.value = next;
  },

  saveFromEditor() {
    const input = document.getElementById('goal-input');
    const val = Math.max(1, Math.min(20, parseInt(input?.value, 10) || 3));
    this._goal = val;
    saveGoal(val);
    this.closeEditor();
    // Trigger a stats refresh to update the ring
    if (window.showToast) window.showToast(`Daily goal set to ${val} ✓`, 'success');
    // Re-import updateStats would create circular dep — instead dispatch custom event
    document.dispatchEvent(new CustomEvent('goal-changed'));
  }
};
