import { animate, stagger } from './motion.js';
import { lockScroll, unlockScroll } from './utils.js';
import { initAuth, getToken, getUserEmail, getUserName } from './auth.js';
import { boot, bootFresh, RefreshModal } from './data.js';
import { Cache, UserCache, HintCache, SimilarCache } from './cache.js';
import { state } from './state.js';
import { toggleSection, preloadSection } from './render.js';
import { setDiffFilter, setStatusFilter, applyFilters, pickRandom } from './filters.js';
import { toggleCheck, debounceSave, debounceNotesSave, toggleReview, saveComplexity } from './progress.js';
import { initToggles, initTheme, toggleTags, toggleSolution, toggleNotes, toggleCompanies, toggleTheme } from './toggles.js';
import { AddQuestionModal } from './modal-add.js';
import { SolutionModal } from './modal-solution.js';
import { ReportModal } from './modal-report.js';
import { Logout } from './modal-logout.js';
import { ResetModal } from './reset.js';
import { showToast } from './toast.js';
import { initStopwatch, PomodoroModal } from './stopwatch.js';
import { initReveal } from './reveal.js';
import { initMotivation } from './quotes.js';
import { SRS } from './spaced-repetition.js';
import { MasteryChart } from './mastery-chart.js';
import { DailyGoal } from './daily-goal.js';
import { FocusMode } from './focus-mode.js';
import { SimilarProblems } from './similar-problems.js';
import { AI } from './ai.js';
import { CompanyFilter } from './company-filter.js';
import { CompanyStats } from './company-stats.js';
import { UserSettings, UserProfile } from './user-settings.js';
import './smart-queue.js';
import './weakness-heatmap.js';
import { restoreSession } from './mock-interview.js';
import { AmbientSound } from './ambient.js';
import { initPWAInstall, registerSW } from './pwa-install.js';
import { startPerfWatch } from './perf-watch.js';
import { FeedbackModal, ViewFeedbackModal } from './feedback.js';

/* ── Admin Panel ──────────────────────────────────────────────────
   I got tired of deploying to send an announcement. This adds a button 
   only I can see (state.userRole === 'ADMIN') to broadcast messages.
   Total jugaad, but it works.
   ─────────────────────────────────────────────────────────────── */
const AdminPanel = {
  _id: 'admin-panel-modal',
  open() {
    lockScroll();
    document.getElementById(this._id).classList.add('open');
  },
  close() {
    document.getElementById(this._id).classList.remove('open');
    unlockScroll();
  },
  handleOverlayClick(e) {
    if (e.target === document.getElementById(this._id)) this.close();
  },
  async sendBroadcast() {
    const btn = document.getElementById('ap-broadcast-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res  = await fetch('/.netlify/functions/trigger-broadcast', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Broadcast sent to ${data.sent} / ${data.total} users`, 'success');
      } else {
        showToast(data.error || 'Broadcast failed', 'error');
      }
    } catch (err) {
      showToast('Broadcast failed', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
    }
  },
};

/* ── Deferred CSS loader ──────────────────────────────────────────
   Lighthouse was yelling at me about render-blocking CSS. We rip out 
   all the heavy widget CSS from the <head> and inject it here after the 
   first paint. Speeds up the initial load by a lot.
   ─────────────────────────────────────────────────────────────── */
function _loadCSS(name) {
  const href = `css/${name}.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadDeferredCSS() {
  // Always load these after first render (they power always-visible widgets)
  ['ambient', 'mastery-chart', 'focus-mode', 'company',
   'mock-interview', 'weakness-heatmap', 'learning-material',
   'smart-queue',  // card is created dynamically on interaction, never in initial HTML
  ].forEach(_loadCSS);
}

// If the user has 'lite' mode on, intercept every smooth scroll request and 
// snap it instantly. Much easier than passing a prop down 50 different components.
if (window.__perfTier === 'lite') {
  const _origSIV = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(arg) {
    if (arg && typeof arg === 'object' && arg.behavior === 'smooth') {
      arg = { ...arg, behavior: 'instant' };
    }
    return _origSIV.call(this, arg);
  };
}

window.boot              = boot;
window.bootFresh         = bootFresh;
window.RefreshModal      = RefreshModal;
window.toggleSection     = toggleSection;
window.preloadSection    = preloadSection;
window.setDiffFilter     = setDiffFilter;
window.setStatusFilter   = setStatusFilter;
window.applyFilters      = applyFilters;
window.pickRandom        = pickRandom;
window.toggleCheck       = toggleCheck;
window.debounceSave      = debounceSave;
window.debounceNotesSave = debounceNotesSave;
window.toggleReview      = toggleReview;
window.saveComplexity    = saveComplexity;
window.toggleTags        = toggleTags;
window.toggleSolution    = toggleSolution;
window.toggleNotes       = toggleNotes;
window.toggleCompanies   = toggleCompanies;
window.toggleTheme       = toggleTheme;
window.ResetModal        = ResetModal;
window.showToast         = showToast;
window.PomodoroModal     = PomodoroModal;
window.openModal         = () => AddQuestionModal.open();
window.closeModal        = () => AddQuestionModal.close();
window.handleOverlayClick = (e) => AddQuestionModal.handleOverlayClick(e);
window.submitQuestion    = () => AddQuestionModal.submit();
window.SolutionModal     = SolutionModal;
window.ReportModal       = ReportModal;
window.confirmLogout     = () => Logout.open();
window.Logout            = Logout;
window.SRS               = SRS;
window.MasteryChart      = MasteryChart;
window.DailyGoal         = DailyGoal;
window.FocusMode         = FocusMode;
window.SimilarProblems   = SimilarProblems;
window.AI                = AI;
window.CompanyFilter     = CompanyFilter;
window.CompanyStats      = CompanyStats;
window.UserSettings      = UserSettings;
window.UserProfile       = UserProfile;
window.AdminPanel        = AdminPanel;
window.FeedbackModal     = FeedbackModal;
window.ViewFeedbackModal = ViewFeedbackModal;
window.state             = state;

document.addEventListener('keydown', e => {
  const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

  if (e.key === 'Escape') {
    AdminPanel.close();
    FeedbackModal.close();
    ViewFeedbackModal.close();
    AddQuestionModal.close();
    Logout.close();
    MasteryChart.close();
    DailyGoal.closeEditor();
    FocusMode.closePicker();
    FocusMode.closeSummary();
    CompanyFilter.closePicker();
    CompanyFilter.closeSummary();
    ResetModal.close();
    UserSettings.close();
    UserProfile.close();
    window.WeaknessHeatmap?.close();
    window.MockInterview?.closeConfig();
    window.MockInterview?.closeSummary();
    return;
  }

  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    const overlay = document.querySelector('.modal-overlay.open');
    if (overlay) {
      const btn = overlay.querySelector('.btn-submit') || overlay.querySelector('.btn-danger');
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      return;
    }
  }

  if (inInput) return;

  if (e.key === 's' || e.key === '/') {
    e.preventDefault();
    document.getElementById('search')?.focus({ preventScroll: true });
  }
  if (e.key === 'r') pickRandom();
  if (e.key === 'f') FocusMode.openPicker();
  if (e.key === 'm') window.MockInterview?.openConfig();
  if (e.key === 'h') window.WeaknessHeatmap?.open();
});

document.addEventListener('goal-changed', () => {
  import('./stats.js').then(m => m.updateStats());
});

// Lenis smooth scroll — applies to all tiers.
// Chrome native scrolling on Windows causes 8-10 repaints per frame (wheel storm) 
// which absolutely tanks performance. This batches it into one rAF callback. 
// It's literally the only way to stop scroll jank on cheap Windows laptops. Don't touch it bhai.
// lite: 0.4s expo-out — snappy, barely perceptible ease; all backdrop-filter also killed in CSS
// standard/full: 0.7s expo-out — polished momentum feel
// smoothTouch:false keeps position:fixed elements stable on touch.
import('https://cdn.jsdelivr.net/npm/lenis@1.3.1/dist/lenis.mjs').then(({ default: Lenis }) => {
  const lenis = new Lenis({
    duration:        window.__perfTier === 'lite' ? 0.35 : 0.55,
    easing:          t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel:     true,
    smoothTouch:     false,
    wheelMultiplier: 1.2,
    // Don't intercept wheel events inside any modal content box so native scroll works
    prevent: (node) => node.closest('.modal') !== null,
  });
  window.__lenis = lenis;
  (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());

  // Suppress hover effects while scrolling — prevents paint/composite work from
  // section hover states toggling as sections scroll under the pointer.
  let _scrollEndTimer;
  lenis.on('scroll', () => {
    if (!document.documentElement.classList.contains('is-scrolling')) {
      document.documentElement.classList.add('is-scrolling');
    }
    clearTimeout(_scrollEndTimer);
    _scrollEndTimer = setTimeout(() => {
      document.documentElement.classList.remove('is-scrolling');
    }, 150);
  });
});

(function () {
  const _fetch = window.fetch;
  window.fetch = async function (url, options = {}) {
    if (typeof url === "string" && url.startsWith("/.netlify/functions/")) {
      const token = await getToken();
      if (token) {
        options = { ...options };
        options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
      }
    }
    return _fetch.call(this, url, options);
  };
})();

window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

initStopwatch();
initReveal();
initMotivation();
initToggles();
initTheme();
DailyGoal.init();
AmbientSound.init();
registerSW();
initPWAInstall();

(async () => {
  const authed = await initAuth();
  if (!authed) return;

  const currentUserEmail = getUserEmail();
  const lastUserEmail = localStorage.getItem('dsa_last_user');
  if (currentUserEmail && lastUserEmail && lastUserEmail !== currentUserEmail) {
    Cache.clear(); UserCache.clear(); HintCache.clear(); SimilarCache.clear();
  }
  if (currentUserEmail) localStorage.setItem('dsa_last_user', currentUserEmail);

  if (window._clerk) {
    const myUserId = window._clerk.user?.id ?? null;
    let _staleAction = null;

    window._clerk.addListener(({ user }) => {
      const newUserId = user?.id ?? null;
      if (!newUserId && myUserId) {
        _staleAction = 'logout';
      } else if (newUserId && myUserId && newUserId !== myUserId) {
        _staleAction = 'switch';
      }
    });

    const IGNORED_KEYS = new Set(['Alt','Control','Meta','Shift','Tab','Escape','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']);
    const handleStaleInteraction = (e) => {
      if (!_staleAction) return;
      if (e.type === 'keydown' && (IGNORED_KEYS.has(e.key) || e.altKey || e.ctrlKey || e.metaKey)) return;
      e.stopImmediatePropagation();
      Cache.clear(); UserCache.clear(); HintCache.clear(); SimilarCache.clear();
      if (_staleAction === 'logout') {
        window.location.href = '/welcome.html';
      } else {
        window.location.reload();
      }
    };
    document.addEventListener('click',   handleStaleInteraction, { capture: true });
    document.addEventListener('keydown',  handleStaleInteraction, { capture: true });
    document.addEventListener('submit',   handleStaleInteraction, { capture: true });
  }

  const email = getUserEmail();
  const name  = getUserName();
  const metaEl = document.getElementById('hdr-user-meta');
  if (metaEl && email) {
    // Prefer DB-cached image_url (persisted from Clerk, updated on every login)
    // Fall back to live Clerk session imageUrl, then initials.
    const cachedProfile = UserCache.get();
    const imgUrl  = cachedProfile?.image_url || window._clerk?.user?.imageUrl || null;
    const initial = (name || email || '?')[0].toUpperCase();
    const avatar  = imgUrl
      ? `<img class="hdr-avatar" src="${imgUrl}" alt="" />`
      : `<span class="hdr-avatar hdr-avatar-init">${initial}</span>`;
    metaEl.innerHTML = `${avatar}<span class="hdr-chip-name">${name || email}</span>`;
    metaEl.title = email;
    metaEl.style.cursor = 'pointer';
    metaEl.addEventListener('click', () => UserProfile.open());
  }

  const wmEl = document.getElementById('watermark');
  if (wmEl && email) {
    const safeEmail = email
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const angle  = -(15 + Math.floor(Math.random() * 21));
    const tileW  = 540 + Math.floor(Math.random() * 121);
    const tileH  = 230 + Math.floor(Math.random() * 61);
    const cx = tileW / 2, cy = tileH / 2;
    const offX   = Math.floor(Math.random() * tileW);
    const offY   = Math.floor(Math.random() * tileH);

    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">` +
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="monospace" font-size="13" fill="#000000" ` +
      `transform="rotate(${angle},${cx},${cy})">${safeEmail}</text></svg>`
    );
    wmEl.style.backgroundImage = `url("data:image/svg+xml,${svg}")`;
    if (window.innerWidth > 768) {
      wmEl.style.backgroundPosition = `${offX}px ${offY}px`;
    }
  }

  const revealPage = async () => {
    // Deliberate 1-second presentation delay so the user always sees the terminal animation
    await new Promise(r => setTimeout(r, 300));

    // Wait for all non-blocking CSS preloads to be applied before showing the page.
    // CSS files download in parallel while JS is booting; they're almost always done
    // before this point, but we guard against slow connections or cache misses.
    const pendingCSS = [...document.querySelectorAll('link[as="style"]')].filter(l => !l.sheet);
    if (pendingCSS.length) {
      await Promise.race([
        Promise.all(pendingCSS.map(l => new Promise(r => l.addEventListener('load', r, { once: true })))),
        new Promise(r => setTimeout(r, 2000)), // 2s safety timeout — never hold the loader indefinitely
      ]);
    }

    const loader = document.getElementById('page-loader');

    const entrance = [
      document.querySelector('header'),
      document.querySelector('.study-tools-bar'),
      document.querySelector('.motivation-box'),
      document.querySelector('.top-stats'),
      document.querySelector('.global-progress'),
      document.querySelector('.controls'),
      document.getElementById('sections'),
    ].filter(Boolean);

    // Skip entrance animation on lite/standard tier or reduced-motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        || window.__perfTier !== 'full';

    if (!prefersReduced) {
      entrance.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; });
    }

    if (loader) {
      await animate(loader, { opacity: 0 }, { duration: 0.15, easing: 'ease-out' }).finished;
      loader.remove();
    }

    if (prefersReduced) return;

    animate(
      entrance,
      { opacity: [0, 1], y: [20, 0] },
      { duration: 0.45, easing: [0.22, 1, 0.36, 1], delay: stagger(0.06) }
    );

    const featureBtns = document.querySelectorAll('.btn-feature');
    if (featureBtns.length) {
      featureBtns.forEach(b => { b.style.opacity = '0'; b.style.transform = 'translateY(10px) scale(0.95)'; });
      setTimeout(() => {
        animate(
          featureBtns,
          { opacity: [0, 1], y: [10, 0], scale: [0.95, 1] },
          { duration: 0.4, easing: [0.22, 1, 0.36, 1], delay: stagger(0.05) }
        );
      }, 150);
    }
  };

  // Load deferred CSS NOW — concurrently with boot()'s auth+data network request.
  // boot() takes ~300-800ms; deferred CSS (~54KB) downloads in ~50ms on 4G.
  // Both finish before revealPage() dismisses the loader, so the page appears
  // fully styled the moment it becomes visible. No FOUC possible.
  loadDeferredCSS();

  await boot(revealPage);

  // Start passive jank detector — shows a suggestion banner if the device struggles
  startPerfWatch();

  if (state.userRole === 'ADMIN') {
    document.getElementById('btn-admin-panel')?.style.setProperty('display', '');
  } else {
    document.getElementById('btn-feedback-header')?.style.setProperty('display', '');
    document.getElementById('btn-feedback-settings-wrap')?.style.setProperty('display', '');
  }
  SRS.init();
  CompanyFilter.init();
  CompanyStats.render();

  if (restoreSession()) window.MockInterview.resume();

  // Skip background image on lite tier (saves ~200KB network on low-end devices)
  if (window.__perfTier !== 'lite') {
    const hideBg = localStorage.getItem('dsa_hide_bg');
    const isMobile = window.innerWidth <= 768;
    const shouldHide = hideBg === '1' || (hideBg === null && isMobile);
    if (!shouldHide) {
      const bgUrl = 'https://res.cloudinary.com/dnju7wfma/image/upload/f_auto,q_auto,w_1920/bg_lnzb9t.png';
      const img = new Image();
      img.onload = () => {
        const root = document.documentElement;
        root.style.setProperty('--bg-image', `url('${bgUrl}')`);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => root.classList.add('bg-loaded'));
        });
      };
      img.src = bgUrl;
    }
  }
})();
