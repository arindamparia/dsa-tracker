/**
 * Entry point.
 *
 * Responsibilities:
 *  1. Import all modules
 *  2. Expose functions to `window` for inline onclick/oninput handlers
 *     (required because ES modules are not global by default)
 *  3. Register keyboard shortcuts
 *  4. Kick off the boot sequence
 */
import { boot, bootFresh, RefreshModal } from './data.js';
import { toggleSection, preloadSection } from './render.js';
import { setDiffFilter, setStatusFilter, applyFilters, pickRandom } from './filters.js';
import { toggleCheck, debounceSave, debounceNotesSave, toggleReview, saveComplexity } from './progress.js';
import { initToggles, toggleTags, toggleSolution, toggleNotes } from './toggles.js';
import { AddQuestionModal } from './modal-add.js';
import { SolutionModal } from './modal-solution.js';
import { ReportModal } from './modal-report.js';
import { Logout } from './modal-logout.js';
import { confirmClear } from './reset.js';
import { showToast } from './toast.js';
import { initStopwatch, PomodoroModal } from './stopwatch.js';
import { initTimerNudge } from './timer-nudge.js';
import { initReveal } from './reveal.js';
import { initMotivation } from './quotes.js';
import { SRS } from './spaced-repetition.js';
import { MasteryChart } from './mastery-chart.js';
import { DailyGoal } from './daily-goal.js';
import { FocusMode } from './focus-mode.js';
import { SimilarProblems } from './similar-problems.js';
import { AI } from './ai.js';

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
window.toggleTags     = toggleTags;
window.toggleSolution = toggleSolution;
window.toggleNotes    = toggleNotes;

// Misc
window.confirmClear = confirmClear;
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

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    AddQuestionModal.close();
    Logout.close();
    MasteryChart.close();
    DailyGoal.closeEditor();
    FocusMode.closePicker();
    FocusMode.closeSummary();
  }
});

// ── Goal-changed event (avoids circular import with stats.js) ────
document.addEventListener('goal-changed', () => {
  // Re-run updateStats to refresh the ring
  import('./stats.js').then(m => m.updateStats());
});

// ── Boot ──────────────────────────────────────────────────────────
initStopwatch();
initTimerNudge();
initReveal();
initMotivation();
initToggles();
DailyGoal.init();
boot().then(() => {
  // SRS needs questions to be loaded first
  SRS.init();
});
