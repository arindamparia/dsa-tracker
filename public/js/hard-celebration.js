/**
 * Hard Problem Celebration — "Boss Defeated" ⚔️
 * Fires when a Hard difficulty problem is marked as solved.
 */
import { animate, spring } from './motion.js';

const HARD_QUOTES = [
  { q: 'The harder the battle, the sweeter the victory.',           attr: '— Les Brown' },
  { q: 'It always seems impossible until it\'s done.',              attr: '— Nelson Mandela' },
  { q: 'Do not pray for an easy life; pray for strength to endure a difficult one.', attr: '— Bruce Lee' },
  { q: 'Difficult roads often lead to beautiful destinations.',      attr: '— Zig Ziglar' },
  { q: 'Fall seven times, stand up eight.',                         attr: '— Japanese Proverb' },
  { q: 'Champions keep playing until they get it right.',           attr: '— Billie Jean King' },
  { q: 'Success is not final, failure is not fatal — it is the courage to continue that counts.', attr: '— Winston Churchill' },
  { q: 'The expert in anything was once a beginner.',               attr: '— Helen Hayes' },
];

// ── Screen flash ──────────────────────────────────────────────────────────────

async function doScreenFlash() {
  const flash = document.createElement('div');
  flash.id = 'hard-flash';
  flash.style.cssText = `
    position: fixed; inset: 0; z-index: 9998; pointer-events: none;
    background: radial-gradient(ellipse at center, rgba(255,100,0,0.18) 0%, rgba(180,0,0,0.1) 60%, transparent 100%);
    opacity: 0;
  `;
  document.body.appendChild(flash);
  await animate(flash, { opacity: [0, 1] }, { duration: 0.18, easing: 'ease-in' }).finished;
  await animate(flash, { opacity: 0 }, { duration: 0.5, easing: 'ease-out' }).finished;
  flash.remove();
}

// ── Ember particles ───────────────────────────────────────────────────────────

const EMBER_COLORS = ['#ff6b35','#ff9f1c','#ffd166','#ff4444','#ffaa00','#fff0a0'];
let _emberRAF = null;

function spawnEmbers() {
  const canvas  = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const cx  = canvas.width / 2;
  const cy  = canvas.height / 2;

  const particles = Array.from({ length: 90 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: 2 + Math.random() * 3.5,
      color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
      gravity: 0.18 + Math.random() * 0.1,
      life: 1,
      decay: 0.016 + Math.random() * 0.014,
    };
  });

  if (_emberRAF) cancelAnimationFrame(_emberRAF);
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.life -= p.decay;
      if (p.life <= 0) continue;
      alive++;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (alive > 0) { _emberRAF = requestAnimationFrame(draw); }
    else { canvas.remove(); _emberRAF = null; }
  }
  draw();
}

// ── Center modal ──────────────────────────────────────────────────────────────

function showHardModal(problemName) {
  document.getElementById('hard-modal')?.remove();

  const { q, attr } = HARD_QUOTES[Math.floor(Math.random() * HARD_QUOTES.length)];

  const div = document.createElement('div');
  div.id = 'hard-modal';
  div.className = 'hard-modal';
  div.innerHTML = `
    <div class="hm-sword">⚔️</div>
    <div class="hm-eyebrow">HARD PROBLEM CONQUERED</div>
    <div class="hm-name">${problemName}</div>
    <div class="hm-divider"></div>
    <div class="hm-quote">"${q}"</div>
    <div class="hm-attr">${attr}</div>
  `;
  document.body.appendChild(div);

  animate(div,
    { opacity: [0, 1], scale: [0.75, 1] },
    { duration: 0.5, easing: spring({ stiffness: 300, damping: 20 }) }
  );

  setTimeout(async () => {
    await animate(div, { opacity: 0, scale: 0.88 }, { duration: 0.55, easing: 'ease-in' }).finished;
    div.remove();
    window._isHardCelebrationActive = false;
    if (window._pendingDailyGoalCelebration) {
      window._pendingDailyGoalCelebration();
      window._pendingDailyGoalCelebration = null;
    }
  }, 4500);
}

// ── Public API ────────────────────────────────────────────────────────────────

export const HardCelebration = {
  fire(problemName) {
    window._isHardCelebrationActive = true;
    doScreenFlash();
    spawnEmbers();
    showHardModal(problemName);
  }
};

window.HardCelebration = HardCelebration;
