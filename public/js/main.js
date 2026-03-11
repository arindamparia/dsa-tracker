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
import { boot, bootFresh, hardRefresh } from './data.js';
import { toggleSection } from './render.js';
import { setDiffFilter, setStatusFilter, applyFilters } from './filters.js';
import { toggleCheck, debounceSave, debounceNotesSave } from './progress.js';
import { toggleTags, toggleSolution } from './toggles.js';
import { AddQuestionModal } from './modal-add.js';
import { Logout } from './modal-logout.js';
import { confirmClear } from './reset.js';
import { showToast } from './toast.js';

// ── Window bindings for inline HTML handlers ──────────────────────
// Data
window.boot         = boot;
window.bootFresh    = bootFresh;
window.hardRefresh  = hardRefresh;

// Render
window.toggleSection = toggleSection;

// Filters
window.setDiffFilter   = setDiffFilter;
window.setStatusFilter = setStatusFilter;
window.applyFilters    = applyFilters;

// Progress
window.toggleCheck       = toggleCheck;
window.debounceSave      = debounceSave;
window.debounceNotesSave = debounceNotesSave;

// View toggles
window.toggleTags     = toggleTags;
window.toggleSolution = toggleSolution;

// Misc
window.confirmClear = confirmClear;
window.showToast    = showToast;

// Add Question modal (called via onclick="openModal()" etc.)
window.openModal          = () => AddQuestionModal.open();
window.closeModal         = () => AddQuestionModal.close();
window.handleOverlayClick = (e) => AddQuestionModal.handleOverlayClick(e);
window.submitQuestion     = () => AddQuestionModal.submit();

// Logout modal (called via onclick="confirmLogout()" and onclick="Logout.close()" etc.)
window.confirmLogout = () => Logout.open();
window.Logout        = Logout; // exposes Logout.close() / Logout.confirm() used in HTML

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { AddQuestionModal.close(); Logout.close(); }
});

// ── Boot ──────────────────────────────────────────────────────────
boot();
