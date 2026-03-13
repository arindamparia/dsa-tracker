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
let sessionStartTime   = null;
let sessionStartDone   = 0;
let sessionStartSnapshot = new Map(); // lc_number → is_done at session start

let sessionTarget      = 'unsolved'; // 'unsolved', 'solved', 'all'

function getSectionsWithCounts() {
  const grouped = groupBySections(state.questions);
  const targetSelect = document.getElementById('focus-type-select');
  const target = targetSelect ? targetSelect.value : 'unsolved';
  
  return grouped.map(g => {
    let total = 0;
    let available = 0;
    for (const q of g.questions) {
      total++;
      if (target === 'unsolved' && !q.is_done) available++;
      if (target === 'solved' && q.is_done) available++;
      if (target === 'all') available++;
    }
    return { name: g.section, total, available, target };
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
    const disabled = s.available === 0;
    const labelMapping = { 'unsolved': 'unsolved', 'solved': 'solved', 'all': 'total problems' };
    
    return `
      <button class="focus-topic-item ${disabled ? 'disabled' : ''}"
        ${disabled ? 'disabled' : `onclick="FocusMode.start('${s.name.replace(/'/g, "\\'")}')" `}>
        <span class="focus-topic-name">${s.name}</span>
        <span class="focus-topic-meta">
          <span class="focus-topic-unsolved">${s.available} ${labelMapping[s.target]}</span>
          <span class="focus-topic-total">of ${s.total}</span>
        </span>
      </button>`;
  }).join('');
}

function applyFocusFilter(sectionName, target) {
  // Clear existing filters
  const searchEl = document.getElementById('search');
  if (searchEl) searchEl.value = '';

  document.body.classList.add('focus-active');

  // Expand all sections that have visible rows, collapse others
  document.querySelectorAll('.section').forEach(sec => {
    const titleEl = sec.querySelector('.section-title');
    const secTitle = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
    const match = secTitle === sectionName.toLowerCase();
    
    sec.classList.toggle('focus-section-hidden', !match);
    sec.classList.toggle('collapsed', !match);
    
    if (match) {
      sec.querySelectorAll('.q-table tr').forEach(tr => {
        const isDone = tr.classList.contains('done-row');
        
        let hideRow = false;
        if (target === 'unsolved' && isDone) hideRow = true;
        if (target === 'solved' && !isDone) hideRow = true;
        
        tr.classList.toggle('focus-hidden', hideRow);
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
  refreshList() {
    renderSectionList();
  },

  openPicker() {
    if (sessionSection) {
      // Already in a session — ask if they want to end it
      this.end();
      return;
    }
    
    // Default dropdown back to unsolved
    const sel = document.getElementById('focus-type-select');
    if (sel) sel.value = 'unsolved';
    
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
    
    const targetSelect = document.getElementById('focus-type-select');
    sessionTarget = targetSelect ? targetSelect.value : 'unsolved';

    // Snapshot all questions in this section so we know exactly which ones get solved
    sessionStartSnapshot = new Map(
      state.questions
        .filter(q => (q.section || 'Other') === sectionName)
        .map(q => [q.lc_number, q.is_done])
    );

    // Update UI
    const targetEmojis = { 'unsolved': '🎯', 'solved': '🔄', 'all': '📚' };
    const topicLabel = document.getElementById('focus-topic-label');
    if (topicLabel) topicLabel.innerHTML = `${targetEmojis[sessionTarget]} <strong>Focus Session:</strong> ${sectionName} <span style="opacity:0.6;font-size:11px;font-weight:400;margin-left:6px;">(${sessionTarget})</span>`;
    
    const bar = document.getElementById('focus-bar');
    if (bar) bar.classList.remove('hidden');
    this._updateCount();

    // Apply focus filter dynamically
    applyFocusFilter(sectionName, sessionTarget);

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

    const duration = Date.now() - sessionStartTime;

    // Compute exactly which problems were newly solved this session
    const solvedProblems = state.questions.filter(q =>
      (q.section || 'Other') === sessionSection &&
      q.is_done &&
      !sessionStartSnapshot.get(q.lc_number)
    );

    const easy   = solvedProblems.filter(q => q.difficulty === 'Easy').length;
    const medium = solvedProblems.filter(q => q.difficulty === 'Medium').length;
    const hard   = solvedProblems.filter(q => q.difficulty === 'Hard').length;
    const total  = solvedProblems.length;

    // Build solved list HTML
    const listHTML = solvedProblems.length > 0 ? `
      <div class="focus-solved-list">
        <div class="focus-solved-list-title">Solved this session</div>
        ${solvedProblems.map(q => `
          <div class="focus-solved-item">
            <span class="fsi-check">✓</span>
            <span class="fsi-name">${q.name}</span>
            <span class="fsi-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span>
            ${q.difficulty === 'Hard' ? '<span class="fsi-sword">⚔️</span>' : ''}
          </div>
        `).join('')}
      </div>` : '';

    const msg = total > 0
      ? 'Great work! Keep the momentum going 🚀'
      : 'No problems solved this time — reviewing counts too! 📖';

    // Show summary
    const body = document.getElementById('focus-summary-body');
    if (body) {
      body.innerHTML = `
        <div class="focus-summary-header">Session Complete</div>
        <div class="focus-summary-section-name">${sessionSection}</div>

        <div class="focus-summary-time">
          <span class="focus-summary-time-icon">⏱</span>
          <span class="focus-summary-time-val">${formatDuration(duration)}</span>
        </div>

        <div class="focus-diff-row">
          <div class="focus-diff-card easy-card">
            <div class="focus-diff-num">${easy}</div>
            <div class="focus-diff-label">Easy</div>
          </div>
          <div class="focus-diff-card medium-card">
            <div class="focus-diff-num">${medium}</div>
            <div class="focus-diff-label">Medium</div>
          </div>
          <div class="focus-diff-card hard-card">
            <div class="focus-diff-num">${hard}</div>
            <div class="focus-diff-label">Hard</div>
          </div>
        </div>

        ${listHTML}
        <div class="focus-summary-msg">${msg}</div>
      `;
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

    sessionSection       = null;
    sessionStartTime     = null;
    sessionStartDone     = 0;
    sessionStartSnapshot = new Map();
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
