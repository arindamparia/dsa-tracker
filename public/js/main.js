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
import './smart-queue.js';
import './weakness-heatmap.js';
import './mock-interview.js';

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

  document.documentElement.style.visibility = '';

  // Show user info in header once authenticated
  const email = getUserEmail();
  const name  = getUserName();
  const metaEl = document.getElementById('hdr-user-meta');
  if (metaEl && email) {
    metaEl.textContent = name || email;
    metaEl.title = email;
  }

  boot().then(() => {
    SRS.init();
    CompanyFilter.init();
    CompanyStats.render();
  });
})();
