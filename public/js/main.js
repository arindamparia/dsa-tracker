/**
 * Entry point.
 *
 * Responsibilities:
 *  1. Import all modules
 *  2. Expose functions to `window` for inline onclick/oninput handlers
 *     (required because ES modules are not global by default)
 *  3. Register keyboard shortcuts
 *  4. Kick off the boot sequence (after Clerk auth)
 */
import { initAuth, getToken, getUserEmail, getUserName } from './auth.js'; // getToken used by fetch interceptor below
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

// ── Window bindings for inline HTML handlers ──────────────────────
// Data
window.boot         = boot;
window.bootFresh    = bootFresh;
window.RefreshModal = RefreshModal;

// Render
window.toggleSection  = toggleSection;
window.preloadSection = preloadSection;

// Filters & Actions
window.setDiffFilter   = setDiffFilter;
window.setStatusFilter = setStatusFilter;
window.applyFilters    = applyFilters;
window.pickRandom      = pickRandom;

// Progress
window.toggleCheck       = toggleCheck;
window.debounceSave      = debounceSave;
window.debounceNotesSave = debounceNotesSave;
window.toggleReview      = toggleReview;
window.saveComplexity    = saveComplexity;

// View toggles
window.toggleTags       = toggleTags;
window.toggleSolution   = toggleSolution;
window.toggleNotes      = toggleNotes;
window.toggleCompanies  = toggleCompanies;
window.toggleTheme      = toggleTheme;

// Misc
window.ResetModal   = ResetModal;
window.showToast    = showToast;
window.PomodoroModal = PomodoroModal;

// Add Question modal (called via onclick="openModal()" etc.)
window.openModal          = () => AddQuestionModal.open();
window.closeModal         = () => AddQuestionModal.close();
window.handleOverlayClick = (e) => AddQuestionModal.handleOverlayClick(e);
window.submitQuestion     = () => AddQuestionModal.submit();

// Solution modal
window.SolutionModal      = SolutionModal;

// Report modal
window.ReportModal        = ReportModal;

// Logout modal (called via onclick="confirmLogout()" and onclick="Logout.close()" etc.)
window.confirmLogout = () => Logout.open();
window.Logout        = Logout; // exposes Logout.close() / Logout.confirm() used in HTML

// ── New feature bindings ──────────────────────────────────────────
window.SRS              = SRS;
window.MasteryChart     = MasteryChart;
window.DailyGoal        = DailyGoal;
window.FocusMode        = FocusMode;
window.SimilarProblems  = SimilarProblems;
window.AI               = AI;
window.CompanyFilter    = CompanyFilter;
window.CompanyStats     = CompanyStats;
window.UserSettings     = UserSettings;
window.state            = state; // needed by company-stats.js for companyFilter check

// ── Keyboard shortcuts ────────────────────────────────────────────
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

  // Enter → click the primary button of the active modal (skip if typing in a textarea)
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    const overlay = document.querySelector('.modal-overlay.open');
    if (overlay) {
      const btn = overlay.querySelector('.btn-submit') || overlay.querySelector('.btn-danger');
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      return;
    }
  }

  if (inInput) return; // don't hijack typing

  // s or / → focus search
  if (e.key === 's' || e.key === '/') {
    e.preventDefault();
    document.getElementById('search')?.focus();
  }
  // r → smart pick
  if (e.key === 'r') { pickRandom(); }
  // f → focus mode picker
  if (e.key === 'f') { FocusMode.openPicker(); }
  // m → mock interview
  if (e.key === 'm') { window.MockInterview?.openConfig(); }
  // h → heatmap
  if (e.key === 'h') { window.WeaknessHeatmap?.open(); }
});

// ── Goal-changed event (avoids circular import with stats.js) ────
document.addEventListener('goal-changed', () => {
  // Re-run updateStats to refresh the ring
  import('./stats.js').then(m => m.updateStats());
});

// ── Global fetch interceptor — append Clerk Bearer token ──────────
// Intercepts all /.netlify/functions/ calls and adds Authorization header.
// Clerk auto-refreshes tokens; getToken() always returns a valid JWT.
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

// ── BFCache: reload on restore so data is always fresh ────────────
// pagehide (in index.html inline script) re-inserts the loader overlay
// so the BFCache snapshot is dark. Here we reload on restore.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

// ── Boot ──────────────────────────────────────────────────────────
initStopwatch();
initReveal();
initMotivation();
initToggles();
initTheme();
DailyGoal.init();

// Auth must complete before API calls are made
(async () => {
  const authed = await initAuth();
  if (!authed) return; // Clerk is redirecting to welcome page

  // ── Clear caches on user switch (any logout path) ────────────────────────
  // Compares current Clerk user against last known user stored in localStorage.
  // If they differ, all caches are wiped so the new user never sees stale data.
  const currentUserEmail = getUserEmail();
  const lastUserEmail = localStorage.getItem('dsa_last_user');
  if (currentUserEmail && lastUserEmail && lastUserEmail !== currentUserEmail) {
    Cache.clear(); UserCache.clear(); HintCache.clear(); SimilarCache.clear();
  }
  if (currentUserEmail) localStorage.setItem('dsa_last_user', currentUserEmail);

  // ── Cross-tab auth sync ──────────────────────────────────────────────────
  // Clerk uses BroadcastChannel internally, so addListener fires in ALL tabs
  // when the session changes — even tabs that didn't trigger the change.
  // Strategy: don't forcefully redirect mid-session. Instead, mark the session
  // as stale and handle it on the next user interaction (click/keydown/submit).
  if (window._clerk) {
    const myUserId = window._clerk.user?.id ?? null;
    let _staleAction = null; // 'logout' | 'switch' — set when auth changes in another tab

    window._clerk.addListener(({ user }) => {
      const newUserId = user?.id ?? null;
      if (!newUserId && myUserId) {
        _staleAction = 'logout';
      } else if (newUserId && myUserId && newUserId !== myUserId) {
        _staleAction = 'switch';
      }
    });

    // On next user interaction, clear caches and navigate.
    // capture:true means this fires BEFORE the button's own handler — no stale API calls.
    const IGNORED_KEYS = new Set(['Alt','Control','Meta','Shift','Tab','Escape','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']);
    const handleStaleInteraction = (e) => {
      if (!_staleAction) return;
      // Don't intercept window-switching / system keys — those aren't app interactions
      if (e.type === 'keydown' && (IGNORED_KEYS.has(e.key) || e.altKey || e.ctrlKey || e.metaKey)) return;
      e.stopImmediatePropagation(); // prevent the original handler from running
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

  // Set up header/watermark before page is revealed
  const email = getUserEmail();
  const name  = getUserName();
  const metaEl = document.getElementById('hdr-user-meta');
  if (metaEl && email) {
    metaEl.textContent = name || email;
    metaEl.title = email;
  }

  // Watermark with user email to deter content theft.
  // Email is XML-escaped before embedding into SVG to prevent injection.
  // Angle, tile size, and offset are randomised on every page load so the
  // pattern never looks identical across sessions.
  const wmEl = document.getElementById('watermark');
  if (wmEl && email) {
    const safeEmail = email
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Randomise each session: angle ∈ [-35, -15], tile W ∈ [540, 660], tile H ∈ [230, 290]
    const angle  = -(15 + Math.floor(Math.random() * 21));         // -15 to -35
    const tileW  = 540 + Math.floor(Math.random() * 121);          // 540–660
    const tileH  = 230 + Math.floor(Math.random() * 61);           // 230–290
    const cx = tileW / 2, cy = tileH / 2;
    // Random phase offset so the grid starts at a different position each load
    const offX   = Math.floor(Math.random() * tileW);
    const offY   = Math.floor(Math.random() * tileH);

    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">` +
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="monospace" font-size="13" fill="#000000" ` +
      `transform="rotate(${angle},${cx},${cy})">${safeEmail}</text></svg>`
    );
    wmEl.style.backgroundImage = `url("data:image/svg+xml,${svg}")`;
    // On mobile the CSS centres a single instance; random offset only on desktop
    if (window.innerWidth > 768) {
      wmEl.style.backgroundPosition = `${offX}px ${offY}px`;
    }
  }

  // Reveal the page only after initial content is in the DOM (no blank flash).
  // The overlay (#page-loader) covers the page during auth+render, then fades out.
  const revealPage = () => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('page-loader-ready');
      // Guarantee DOM removal even if transitionend never fires (e.g. tab hidden
      // during transition leaves it in the DOM with opacity:0, causing compositor
      // layer flashes when switching back to the window).
      const remove = () => loader.remove();
      loader.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 500); // 300ms transition + 200ms buffer
    }
  };

  await boot(revealPage);

  // Post-boot: non-critical features that run after content is visible
  if (state.userRole === 'ADMIN') {
    document.getElementById('btn-add-question')?.style.setProperty('display', '');
  }
  SRS.init();
  CompanyFilter.init();
  CompanyStats.render();

  // Restore mock interview session if one was active before page refresh
  if (restoreSession()) window.MockInterview.resume();
})();
