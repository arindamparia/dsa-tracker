/**
 * Focus Mode — distraction-free study sessions.
 *
 * User picks a topic → UI hides header/stats, filters to unsolved
 * problems in that topic, starts a timer. On end, shows a summary.
 */
import { state } from './state.js';
import { groupBySections } from './utils.js';
import { toggleStopwatch, resetStopwatch, setStopwatchLock } from './stopwatch.js';

let sessionSection     = null;
let sessionStartTime = null;
let sessionStartDone = 0;   // done count at session start for the chosen section

function getSectionsWithCounts() {
  const grouped = groupBySections(state.questions);
  return grouped.map(g => {
    let total = 0;
    let unsolved = 0;
    for (const q of g.questions) {
      total++;
      if (!q.is_done) unsolved++;
    }
    return { name: g.section, total, unsolved };
  });
}

function getSectionDoneCount(sectionName) {
  return state.questions.filter(q => (q.section || 'Other') === sectionName && q.is_done).length;
}

function renderSectionList() {
  const el = document.getElementById('focus-topic-list');
  if (!el) return;
  const sections = getSectionsWithCounts();

  el.innerHTML = sections.map(s => {
    const disabled = s.unsolved === 0;
    return `
      <button class="focus-topic-item ${disabled ? 'disabled' : ''}"
        ${disabled ? 'disabled' : `onclick="FocusMode.start('${s.name.replace(/'/g, "\\'")}')" `}>
        <span class="focus-topic-name">${s.name}</span>
        <span class="focus-topic-meta">
          <span class="focus-topic-unsolved">${s.unsolved} unsolved</span>
          <span class="focus-topic-total">of ${s.total}</span>
        </span>
      </button>`;
  }).join('');
}

function applyFocusFilter(sectionName) {
  // Clear existing filters
  const searchEl = document.getElementById('search');
  if (searchEl) searchEl.value = '';

  // Set search to the topic name so applyFilters shows matching rows
  // Actually, let's use a custom class-based approach for precision
  document.body.classList.add('focus-active');

  // Expand all sections that have visible rows, collapse others
  document.querySelectorAll('.section').forEach(sec => {
    // Only difference is we check the section title text against the chosen section
    const titleEl = sec.querySelector('.section-title');
    const secTitle = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
    const match = secTitle === sectionName.toLowerCase();
    
    sec.classList.toggle('focus-section-hidden', !match);
    sec.classList.toggle('collapsed', !match); // auto-expand the matching section
    
    // Within the visible section, filter rows so ONLY undone problems show
    if (match) {
      sec.querySelectorAll('.q-table tr').forEach(tr => {
        const isDone = tr.classList.contains('done-row');
        tr.classList.toggle('focus-hidden', isDone);
      });
    }
  });
}

function removeFocusFilter() {
  document.body.classList.remove('focus-active');
  document.querySelectorAll('.q-table tr').forEach(tr => tr.classList.remove('focus-hidden'));
  document.querySelectorAll('.section').forEach(sec => {
    sec.classList.remove('focus-section-hidden');
    sec.classList.add('collapsed');
  });
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs  = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export const FocusMode = {
  openPicker() {
    if (sessionSection) {
      // Already in a session — ask if they want to end it
      this.end();
      return;
    }
    renderSectionList();
    document.getElementById('focus-picker-modal').classList.add('open');
  },

  closePicker() {
    document.getElementById('focus-picker-modal').classList.remove('open');
  },

  handlePickerOverlay(e) {
    if (e.target === document.getElementById('focus-picker-modal')) this.closePicker();
  },

  start(sectionName) {
    this.closePicker();
    sessionSection   = sectionName;
    sessionStartTime = Date.now();
    sessionStartDone = getSectionDoneCount(sectionName);

    // Update UI
    const topicLabel = document.getElementById('focus-topic-label');
    if (topicLabel) topicLabel.textContent = sectionName;
    const bar = document.getElementById('focus-bar');
    if (bar) bar.classList.remove('hidden');
    this._updateCount();

    // Apply focus filter
    applyFocusFilter(sectionName);

    // Auto-start the stopwatch and lock it
    const modeBtn = document.getElementById('sw-mode');
    if (modeBtn && modeBtn.textContent === '⏱') {
      // It's in stopwatch mode, good
      resetStopwatch();
    } else if (modeBtn) {
      // It's in pomodoro mode, force click to toggle it back to stopwatch
      modeBtn.click();
      resetStopwatch();
    }
    
    toggleStopwatch('start');
    setStopwatchLock(true);

    if (window.showToast) window.showToast(`Focus session started: ${sectionName}`, 'success');
  },

  end() {
    if (!sessionSection) return;

    const duration   = Date.now() - sessionStartTime;
    const currentDone = getSectionDoneCount(sessionSection);
    const solved     = currentDone - sessionStartDone;

    // Show summary
    const body = document.getElementById('focus-summary-body');
    if (body) {
      body.innerHTML = `
        <div class="focus-summary-stats">
          <div class="focus-summary-stat">
            <div class="focus-summary-stat-value">${solved}</div>
            <div class="focus-summary-stat-label">Problems Solved</div>
          </div>
          <div class="focus-summary-stat">
            <div class="focus-summary-stat-value">${formatDuration(duration)}</div>
            <div class="focus-summary-stat-label">Time Spent</div>
          </div>
        </div>
        <div class="focus-summary-topic">Section: <strong>${sessionSection}</strong></div>
        ${solved > 0
          ? `<div class="focus-summary-msg">Great work! Keep the momentum going 🚀</div>`
          : `<div class="focus-summary-msg">No problems solved this time — that's okay, review counts too! 📖</div>`
        }`;
    }
    document.getElementById('focus-summary-modal').classList.add('open');

    // Restore UI
    const bar = document.getElementById('focus-bar');
    if (bar) bar.classList.add('hidden');
    removeFocusFilter();

    // Stop and unlock the stopwatch
    toggleStopwatch('stop');
    setStopwatchLock(false);
    resetStopwatch();

    sessionSection   = null;
    sessionStartTime = null;
    sessionStartDone = 0;
  },

  closeSummary() {
    document.getElementById('focus-summary-modal').classList.remove('open');
  },

  handleSummaryOverlay(e) {
    if (e.target === document.getElementById('focus-summary-modal')) this.closeSummary();
  },

  isActive() { return !!sessionSection; },

  /** Called from progress.toggleCheck to update solved count during session */
  _updateCount() {
    if (!sessionSection) return;
    const currentDone = getSectionDoneCount(sessionSection);
    const solved = currentDone - sessionStartDone;
    const countEl = document.getElementById('focus-solved-count');
    if (countEl) countEl.textContent = `${solved} solved`;
  }
};
