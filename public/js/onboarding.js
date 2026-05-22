// Onboarding tour — shown once to first-time users after login
// Triggered from main.js after boot() resolves

const STORAGE_KEY = 'dsa_onboarded_v1';

const CARDS = [
  {
    emoji: '🎯',
    gradient: 'linear-gradient(135deg, rgba(124,106,247,0.18) 0%, rgba(124,106,247,0.04) 100%)',
    accent: '#7c6af7',
    title: 'Your DSA Command Centre',
    body: 'Track every LeetCode, Codeforces & more problem in one place. Mark done, add notes, and see your mastery grow in real time.',
    tag: 'Getting Started',
  },
  {
    emoji: '🤖',
    gradient: 'linear-gradient(135deg, rgba(6,214,160,0.18) 0%, rgba(6,214,160,0.04) 100%)',
    accent: '#06d6a0',
    title: 'AI That Actually Teaches',
    body: 'Get Socratic hints that nudge you to think — not spoil. Submit code for a full breakdown: time/space complexity, approach vs optimal, style score.',
    tag: 'AI Features',
  },
  {
    emoji: '👻',
    gradient: 'linear-gradient(135deg, rgba(255,71,87,0.15) 0%, rgba(124,106,247,0.08) 100%)',
    accent: '#ff4757',
    title: 'Ghost Replay',
    body: 'Watch the optimal solution type itself live for Hard problems. Pick C++ or Java, follow the dry run, then quiz Snowy — your AI coding mentor.',
    tag: 'Premium',
  },
  {
    emoji: '🎤',
    gradient: 'linear-gradient(135deg, rgba(248,181,0,0.15) 0%, rgba(248,181,0,0.04) 100%)',
    accent: '#f8b500',
    title: 'Coding Round Mode',
    body: 'Simulate a real coding round: pick problem count, difficulty mix, and a time limit. Get a report card at the end — Excellent, Passed, or Needs Practice.',
    tag: 'Interview Prep',
  },
  {
    emoji: '🧠',
    gradient: 'linear-gradient(135deg, rgba(124,106,247,0.15) 0%, rgba(6,214,160,0.06) 100%)',
    accent: '#9180ff',
    title: 'Smart Queue & SRS',
    body: 'Press R to get your next problem ranked by your weakest topics, difficulty progression, and spaced repetition urgency. Never guess what to study next.',
    tag: 'Smart Study',
  },
  {
    emoji: '🏢',
    gradient: 'linear-gradient(135deg, rgba(6,214,160,0.12) 0%, rgba(124,106,247,0.08) 100%)',
    accent: '#06d6a0',
    title: 'Company Prep Mode',
    body: 'Filter by your target company and difficulty. See which topics they hit hardest, your coverage %, and study only what matters for your interview.',
    tag: 'Company Prep',
  },
];

function buildOverlay() {
  const el = document.createElement('div');
  el.id = 'onboarding-overlay';
  el.innerHTML = `
    <div id="onboarding-backdrop"></div>
    <div id="onboarding-modal" role="dialog" aria-modal="true" aria-label="Welcome to AlgoTracker">

      <!-- Progress dots -->
      <div id="onboarding-dots">
        ${CARDS.map((_, i) => `<span class="ob-dot" data-i="${i}"></span>`).join('')}
      </div>

      <!-- Card stack -->
      <div id="onboarding-cards">
        ${CARDS.map((c, i) => `
          <div class="ob-card" data-i="${i}" style="background:${c.gradient};border-color:${c.accent}22;">
            <span class="ob-tag" style="color:${c.accent};background:${c.accent}18;border-color:${c.accent}33;">${c.tag}</span>
            <div class="ob-emoji">${c.emoji}</div>
            <h2 class="ob-title">${c.title}</h2>
            <p class="ob-body">${c.body}</p>
          </div>
        `).join('')}
      </div>

      <!-- Navigation -->
      <div id="onboarding-nav">
        <button id="ob-prev" class="ob-btn ob-btn-ghost" aria-label="Previous">← Prev</button>
        <span id="ob-counter">1 / ${CARDS.length}</span>
        <button id="ob-next" class="ob-btn ob-btn-accent" aria-label="Next">Next →</button>
      </div>

      <!-- Skip -->
      <button id="ob-skip" aria-label="Skip onboarding">Skip tour</button>
    </div>
  `;
  return el;
}

function injectStyles() {
  if (document.getElementById('onboarding-styles')) return;
  const s = document.createElement('style');
  s.id = 'onboarding-styles';
  s.textContent = `
    #onboarding-overlay {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: ob-fade-in 0.35s ease forwards;
    }
    @keyframes ob-fade-in { from { opacity:0 } to { opacity:1 } }

    #onboarding-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.82);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    #onboarding-modal {
      position: relative; z-index: 1;
      width: 100%; max-width: 460px;
      background: var(--surface2, #18181f);
      border: 1px solid var(--border, #2a2a38);
      border-radius: 24px;
      padding: 32px 28px 24px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,106,247,0.1);
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      animation: ob-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    @keyframes ob-slide-up {
      from { opacity:0; transform:translateY(28px) scale(0.97) }
      to   { opacity:1; transform:translateY(0)    scale(1)    }
    }

    /* Dots */
    #onboarding-dots {
      display: flex; gap: 6px; justify-content: center; margin-bottom: 24px;
    }
    .ob-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--border2, #363648);
      transition: width 0.3s ease, background 0.3s ease, border-radius 0.3s ease;
    }
    .ob-dot.active {
      width: 22px; border-radius: 3px;
      background: var(--accent, #7c6af7);
    }

    /* Cards */
    #onboarding-cards { position: relative; min-height: 240px; }
    .ob-card {
      position: absolute; inset: 0;
      border: 1px solid transparent;
      border-radius: 16px;
      padding: 24px;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      opacity: 0; pointer-events: none;
      transform: translateX(40px);
      transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1);
    }
    .ob-card.active {
      opacity: 1; pointer-events: auto; transform: translateX(0);
    }
    .ob-card.exit-left  { opacity:0; transform: translateX(-40px); }

    .ob-tag {
      display: inline-block; font-size: 10px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      padding: 3px 10px; border-radius: 20px; border: 1px solid;
      margin-bottom: 14px;
    }
    .ob-emoji {
      font-size: 48px; line-height: 1; margin-bottom: 12px;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
    }
    .ob-title {
      font-size: 20px; font-weight: 700; color: var(--text, #e8e8f0);
      margin: 0 0 10px; line-height: 1.3;
    }
    .ob-body {
      font-size: 14px; color: var(--text-dim, #9898b0);
      line-height: 1.65; margin: 0;
    }

    /* Nav */
    #onboarding-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 28px; gap: 12px;
    }
    #ob-counter {
      font-size: 12px; color: var(--text-muted, #6b6b85); letter-spacing: 0.05em; white-space:nowrap;
    }
    .ob-btn {
      padding: 9px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; transition: opacity 0.2s, transform 0.15s;
      white-space: nowrap;
    }
    .ob-btn:hover { opacity:0.88; transform:scale(1.02); }
    .ob-btn:active { transform:scale(0.97); }
    .ob-btn-ghost {
      background: var(--surface3, #1e1e28);
      color: var(--text-muted, #6b6b85);
      border: 1px solid var(--border, #2a2a38);
    }
    .ob-btn-ghost:disabled { opacity: 0.3; pointer-events: none; }
    .ob-btn-accent {
      background: var(--accent, #7c6af7); color: #fff;
      box-shadow: 0 4px 16px rgba(124,106,247,0.35);
    }
    .ob-btn-finish {
      background: linear-gradient(135deg, #06d6a0, #7c6af7);
      color: #fff;
      box-shadow: 0 4px 20px rgba(6,214,160,0.3);
    }

    /* Skip */
    #ob-skip {
      display: block; width: 100%; margin-top: 14px;
      background: none; border: none; cursor: pointer;
      font-size: 12px; color: var(--text-muted, #6b6b85);
      padding: 4px; transition: color 0.2s;
    }
    #ob-skip:hover { color: var(--text-dim, #9898b0); }

    /* Mobile */
    @media (max-width: 500px) {
      #onboarding-modal { padding: 24px 18px 18px; border-radius: 20px; }
      .ob-emoji { font-size: 40px; }
      .ob-title { font-size: 18px; }
      .ob-btn   { padding: 8px 16px; font-size: 12px; }
    }
  `;
  document.head.appendChild(s);
}

export function maybeShowOnboarding() {
  // Only show once, only for logged-in users
  if (localStorage.getItem(STORAGE_KEY)) return;
  if (!window._clerk?.user) return;

  injectStyles();
  const overlay = buildOverlay();
  document.body.appendChild(overlay);

  let current = 0;

  const cards   = overlay.querySelectorAll('.ob-card');
  const dots    = overlay.querySelectorAll('.ob-dot');
  const counter = overlay.querySelector('#ob-counter');
  const prevBtn = overlay.querySelector('#ob-prev');
  const nextBtn = overlay.querySelector('#ob-next');
  const skipBtn = overlay.querySelector('#ob-skip');

  function goTo(idx, direction = 1) {
    const prev = current;
    current = idx;

    // Animate out
    cards[prev].classList.add(direction > 0 ? 'exit-left' : 'exit-right');
    cards[prev].classList.remove('active');

    // Animate in
    cards[current].style.transform = direction > 0 ? 'translateX(40px)' : 'translateX(-40px)';
    requestAnimationFrame(() => {
      cards[current].classList.add('active');
      cards[current].style.transform = '';
    });

    // Clean up exit class after transition
    setTimeout(() => cards[prev].classList.remove('exit-left', 'exit-right'), 380);

    // Update dots
    dots.forEach((d, i) => d.classList.toggle('active', i === current));

    // Update counter
    counter.textContent = `${current + 1} / ${CARDS.length}`;

    // Prev button
    prevBtn.disabled = current === 0;

    // Next button — last card becomes "Let's Go!"
    if (current === CARDS.length - 1) {
      nextBtn.textContent = "Let's Go! 🚀";
      nextBtn.classList.add('ob-btn-finish');
      nextBtn.classList.remove('ob-btn-accent');
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.classList.remove('ob-btn-finish');
      nextBtn.classList.add('ob-btn-accent');
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    overlay.style.animation = 'ob-fade-in 0.25s ease reverse forwards';
    setTimeout(() => overlay.remove(), 260);
  }

  // Init first card
  cards[0].classList.add('active');
  dots[0].classList.add('active');
  prevBtn.disabled = true;

  nextBtn.addEventListener('click', () => {
    if (current === CARDS.length - 1) dismiss();
    else goTo(current + 1, 1);
  });

  prevBtn.addEventListener('click', () => {
    if (current > 0) goTo(current - 1, -1);
  });

  skipBtn.addEventListener('click', dismiss);

  // Dot click navigation
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (i !== current) goTo(i, i > current ? 1 : -1);
    });
  });

  // Keyboard navigation
  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (current < CARDS.length - 1) goTo(current + 1, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (current > 0) goTo(current - 1, -1);
    } else if (e.key === 'Escape' || e.key === 'Enter') {
      if (e.key === 'Enter' && current === CARDS.length - 1) dismiss();
      else if (e.key === 'Escape') dismiss();
    }
  }
  document.addEventListener('keydown', onKey);
  overlay.querySelector('#onboarding-modal')._cleanup = () =>
    document.removeEventListener('keydown', onKey);
}
