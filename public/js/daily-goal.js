/**
 * Daily Goal — configurable daily target with SVG ring progress.
 *
 * Celebration fires ONLY when todayDone crosses from below goal to >= goal.
 * Page refresh does NOT re-trigger (baseline is set silently on first update).
 * Unchecking then re-checking DOES re-trigger (in-memory crossing detection).
 */
const GOAL_KEY = 'dsa_daily_goal';

function loadGoal() {
  try { return parseInt(localStorage.getItem(GOAL_KEY), 10) || 3; } catch { return 3; }
}
function saveGoal(n) {
  try { localStorage.setItem(GOAL_KEY, String(n)); } catch {}
}

// ── Motivational captions ─────────────────────────────────────────────────────

const CAPTIONS = [
  { h: 'Daily Goal Reached! 🎯', sub: '"Every action you take is a vote for the type of person you wish to become." — James Clear, Atomic Habits' },
  { h: 'Goal Crushed! 🔥',       sub: '"Enthusiasm is common. Endurance is rare." — Angela Duckworth, Grit' },
  { h: 'Mission Complete! 🚀',   sub: '"When you want something, all the universe conspires in helping you achieve it." — Paulo Coelho, The Alchemist' },
  { h: 'You Did It! ⚡',          sub: '"You have power over your mind — not outside events. Realize this, and you will find strength." — Marcus Aurelius, Meditations' },
  { h: 'Goal Hit! 🏆',           sub: '"A deep life is a good life." — Cal Newport, Deep Work' },
  { h: 'Unstoppable! 💪',        sub: '"We all have the ability to come from nothing to something." — David Goggins, Can\'t Hurt Me' },
];

// ── Confetti engine ───────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#06d6a0','#00b4d8','#f72585','#ffd166','#a8dadc',
  '#ffffff','#7b2ff7','#ff9f1c','#2ec4b6'
];
let _confettiRAF = null;

function spawnConfetti() {
  const particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: -10 - Math.random() * 120,
      r: 4 + Math.random() * 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      vy: 2.5 + Math.random() * 3.5,
      vx: (Math.random() - 0.5) * 3,
      spin: (Math.random() - 0.5) * 0.25,
      angle: Math.random() * Math.PI * 2,
      wobble: Math.random() * 10,
      wobbleSpeed: 0.05 + Math.random() * 0.08,
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
      opacity: 1,
    });
  }

  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  if (_confettiRAF) cancelAnimationFrame(_confettiRAF);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      p.y      += p.vy;
      p.x      += p.vx + Math.sin(p.wobble) * 0.8;
      p.wobble += p.wobbleSpeed;
      p.angle  += p.spin;
      if (p.y > canvas.height * 0.65) p.opacity = Math.max(0, p.opacity - 0.022);
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (p.opacity > 0 && p.y < canvas.height + 20) alive++;
    }
    if (alive > 0) { _confettiRAF = requestAnimationFrame(draw); }
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.remove(); _confettiRAF = null; }
  }
  draw();
}

// ── Center-page motivational caption ─────────────────────────────────────────

function showCenterCaption(extra) {
  document.getElementById('goal-center-caption')?.remove();

  const cap = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
  const div = document.createElement('div');
  div.id = 'goal-center-caption';
  div.className = extra > 0 ? 'goal-center-caption caption-extra' : 'goal-center-caption caption-met';
  div.innerHTML = `
    <div class="gcc-icon">${extra > 0 ? '🔥' : '🎯'}</div>
    <div class="gcc-heading">${cap.h}</div>
    <div class="gcc-sub">${cap.sub}</div>
    ${extra > 0 ? `<div class="gcc-bonus">+${extra} bonus problem${extra > 1 ? 's' : ''}!</div>` : ''}
  `;
  document.body.appendChild(div);

  // Force reflow to trigger CSS animation
  div.getBoundingClientRect();
  div.classList.add('gcc-show');

  setTimeout(() => {
    div.classList.remove('gcc-show');
    div.classList.add('gcc-hide');
    setTimeout(() => div.remove(), 600);
  }, 3500);
}

// ── Corner banner ─────────────────────────────────────────────────────────────

function showGoalBanner(extra) {
  document.getElementById('goal-banner')?.remove();
  const banner = document.createElement('div');
  banner.id = 'goal-banner';
  banner.className = extra > 0 ? 'goal-banner goal-banner-extra' : 'goal-banner goal-banner-met';
  banner.innerHTML = extra > 0
    ? `<span class="goal-banner-icon">🔥</span>
       <span class="goal-banner-text">Goal crushed! <strong>+${extra} bonus</strong> problem${extra > 1 ? 's' : ''}!</span>
       <button class="goal-banner-close" onclick="document.getElementById('goal-banner')?.remove()">✕</button>`
    : `<span class="goal-banner-icon">🎯</span>
       <span class="goal-banner-text">Daily goal reached! <strong>Keep going!</strong></span>
       <button class="goal-banner-close" onclick="document.getElementById('goal-banner')?.remove()">✕</button>`;
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.classList.add('goal-banner-hide');
    setTimeout(() => banner.remove(), 500);
  }, 6000);
}

// ── Ring SVG ──────────────────────────────────────────────────────────────────

function buildRingSVG(pct, extra) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 1));
  const color  = pct >= 1 ? 'var(--easy)' : 'var(--accent)';
  const extraRing = extra > 0
    ? `<circle cx="34" cy="34" r="34" fill="none"
         stroke="var(--easy)" stroke-width="2" opacity="0.25"
         stroke-dasharray="4 6" />`
    : '';
  return `
    <svg class="goal-ring-svg" viewBox="0 0 68 68" width="68" height="68">
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="4" />
      ${extraRing}
      <circle cx="34" cy="34" r="${r}" fill="none"
        stroke="${color}" stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 34 34)"
        class="goal-ring-progress" />
    </svg>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export const DailyGoal = {
  _goal: 3,
  /**
   * _lastNotifiedDone tracks what todayDone was on the PREVIOUS update call.
   * On the very first call (page load), we set it silently to the current count
   * so we don't celebrate just because of a refresh.
   * _initialized becomes true after that first silent baseline pass.
   */
  _lastNotifiedDone: -1,
  _initialized: false,

  init() {
    this._goal = loadGoal();
    this._renderRing(0, 0);
    this._updateLabel(0);
    this._updateBar(0);
  },

  /** Called by updateStats() every time today's count changes */
  update(todayDone) {
    const goal  = this._goal;
    const pct   = goal > 0 ? todayDone / goal : 0;
    const extra = goal > 0 ? Math.max(0, todayDone - goal) : 0;

    this._renderRing(pct, extra);
    this._updateLabel(todayDone, extra);
    this._updateBar(pct);

    const card = document.querySelector('.today-card');
    if (card) {
      card.classList.toggle('goal-met',   pct >= 1 && extra === 0);
      card.classList.toggle('goal-extra', extra > 0);
    }

    if (!this._initialized) {
      // First call on page load — set baseline silently, no celebration
      this._lastNotifiedDone = todayDone;
      this._initialized = true;
      return;
    }

    // Crossing detection: previous count was below goal, current is at/above
    const justCrossed = this._lastNotifiedDone < goal && todayDone >= goal;
    if (goal > 0 && justCrossed) {
      const trigger = () => {
        spawnConfetti();
        showCenterCaption(extra);
        showGoalBanner(extra);
      };
      if (window._isHardCelebrationActive) {
        window._pendingDailyGoalCelebration = trigger;
      } else {
        trigger();
      }
    }

    this._lastNotifiedDone = todayDone;
  },

  _renderRing(pct, extra = 0) {
    const wrap = document.getElementById('daily-goal-ring');
    if (!wrap) return;
    if (this._goal <= 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = buildRingSVG(pct, extra);
  },

  _updateLabel(todayDone, extra = 0) {
    const label = document.getElementById('daily-goal-label');
    if (!label) return;
    if (this._goal <= 0) {
      label.textContent = 'click to set goal';
      label.className = '';
    } else if (extra > 0) {
      label.innerHTML = `<span>${todayDone} / ${this._goal}</span><span class="goal-bonus-tag">+${extra} bonus 🔥</span>`;
      label.className = 'goal-label-extra';
    } else {
      label.textContent = `${todayDone} / ${this._goal} daily goal`;
      label.className = todayDone >= this._goal ? 'goal-label-met' : '';
    }
  },

  _updateBar(pct) {
    const fill = document.getElementById('today-fill');
    if (!fill) return;
    fill.style.width = this._goal > 0 ? Math.min(pct * 100, 100) + '%' : '0%';
    fill.classList.toggle('bar-goal-met', pct >= 1);
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
    const cur  = parseInt(input.value, 10) || 0;
    input.value = Math.max(1, Math.min(20, cur + dir));
  },

  saveFromEditor() {
    const input = document.getElementById('goal-input');
    const val   = Math.max(1, Math.min(20, parseInt(input?.value, 10) || 3));
    this._goal  = val;
    saveGoal(val);
    // Reset _lastNotifiedDone so crossing fires if todayDone >= new goal,
    // but keep _initialized = true so the check runs (not silently skipped).
    this._lastNotifiedDone = -1;
    this.closeEditor();
    if (window.showToast) window.showToast(`Daily goal set to ${val} ✓`, 'success');
    document.dispatchEvent(new CustomEvent('goal-changed'));
  }
};
