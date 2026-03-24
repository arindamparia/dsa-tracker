import { animate, stagger } from './motion.js';
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
import { UserSettings } from './user-settings.js';
import './smart-queue.js';
import './weakness-heatmap.js';
import { restoreSession } from './mock-interview.js';
import { AmbientSound } from './ambient.js';

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
window.state             = state;

document.addEventListener('keydown', e => {
  const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

  if (e.key === 'Escape') {
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
    metaEl.textContent = name || email;
    metaEl.title = email;
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

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReduced) {
      entrance.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; });
    }

    if (loader) {
      await animate(loader, { opacity: 0 }, { duration: 0.3, easing: 'ease-out' }).finished;
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

  await boot(revealPage);

  if (state.userRole === 'ADMIN') {
    document.getElementById('btn-add-question')?.style.setProperty('display', '');
  }
  SRS.init();
  CompanyFilter.init();
  CompanyStats.render();

  if (restoreSession()) window.MockInterview.resume();

  // Lazy-load the background image after the page is already visible
  const hideBg = localStorage.getItem('dsa_hide_bg');
  const isMobile = window.innerWidth <= 768;
  const shouldHide = hideBg === '1' || (hideBg === null && isMobile);
  if (!shouldHide) {
    const img = new Image();
    img.onload = () => {
      const root = document.documentElement;
      // Set image first (opacity is still 0 from CSS default)
      root.style.setProperty('--bg-image', "url('/images/bg.png')");
      // Kick off the fade-in on the next paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.style.setProperty('--bg-opacity', '0.15');
        });
      });
    };
    img.src = '/images/bg.png';
  }
})();
