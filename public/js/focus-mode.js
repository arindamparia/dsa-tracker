/**
 * Focus Mode — distraction-free study sessions.
 *
 * User picks one or more sections → UI hides header/stats, filters to
 * those sections, starts a timer. On end, shows a summary.
 */
import { state } from './state.js';
import { groupBySections, lockScroll, unlockScroll } from './utils.js';
import { toggleStopwatch, resetStopwatch, setStopwatchLock } from './stopwatch.js';

let sessionSections    = [];        // array of section names (was single string)
let sessionStartTime   = null;
let sessionStartSnapshot = new Map(); // lc_number → is_done at session start
let sessionTarget      = 'unsolved'; // 'unsolved', 'solved', 'all'

let selectedSections   = new Set(); // sections toggled in picker (pre-start)

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
      if (target === 'solved'   &&  q.is_done) available++;
      if (target === 'all') available++;
    }
    return { name: g.section, total, available, target };
  });
}

function renderSectionList() {
  const el = document.getElementById('focus-topic-list');
  if (!el) return;
  const sections = getSectionsWithCounts();
  const labelMapping = { 'unsolved': 'unsolved', 'solved': 'solved', 'all': 'total problems' };

  el.innerHTML = sections.map(s => {
    const disabled   = s.available === 0;
    const isSelected = selectedSections.has(s.name);
    return `
      <button class="focus-topic-item ${disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}"
        ${disabled ? 'disabled' : `onclick="FocusMode.toggleSection('${s.name.replace(/'/g, "\\'")}')"`}>
        <span class="focus-topic-check">${isSelected ? '✓' : ''}</span>
        <span class="focus-topic-name">${s.name}</span>
        <span class="focus-topic-meta">
          <span class="focus-topic-unsolved">${s.available} ${labelMapping[s.target]}</span>
          <span class="focus-topic-total">of ${s.total}</span>
        </span>
      </button>`;
  }).join('');

  // Update start button label
  const startBtn = document.getElementById('focus-start-btn');
  if (startBtn) {
    startBtn.disabled = selectedSections.size === 0;
    startBtn.textContent = selectedSections.size > 1
      ? `Start Session (${selectedSections.size} sections)`
      : 'Start Session';
  }
}

function applyFocusFilter(sections, target) {
  const sectionSet = new Set(sections.map(s => s.toLowerCase()));

  // Clear search
  const searchEl = document.getElementById('search');
  if (searchEl) searchEl.value = '';

  document.body.classList.add('focus-active');

  document.querySelectorAll('.section').forEach(sec => {
    const titleEl  = sec.querySelector('.section-title');
    const secTitle = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
    const match    = sectionSet.has(secTitle);

    sec.classList.toggle('focus-section-hidden', !match);
    sec.classList.toggle('collapsed', !match);

    if (match) {
      sec.querySelectorAll('.q-table tr').forEach(tr => {
        const isDone = tr.classList.contains('done-row');
        let hideRow = false;
        if (target === 'unsolved' && isDone)  hideRow = true;
        if (target === 'solved'   && !isDone) hideRow = true;
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

  toggleSection(sectionName) {
    if (selectedSections.has(sectionName)) {
      selectedSections.delete(sectionName);
    } else {
      selectedSections.add(sectionName);
    }
    renderSectionList();
  },

  openPicker() {
    if (sessionSections.length) {
      this.end();
      return;
    }
    selectedSections.clear();
    const sel = document.getElementById('focus-type-select');
    if (sel) sel.value = 'unsolved';
    renderSectionList();
    lockScroll();
    document.getElementById('focus-picker-modal').classList.add('open');
  },

  closePicker() {
    document.getElementById('focus-picker-modal').classList.remove('open');
    unlockScroll();
  },

  handlePickerOverlay(e) {
    if (e.target === document.getElementById('focus-picker-modal')) this.closePicker();
  },

  startSelected() {
    if (selectedSections.size === 0) return;
    this.start([...selectedSections]);
  },

  // Accepts a single section name (string) or array of names
  start(sections) {
    this.closePicker();
    const sectionList = Array.isArray(sections) ? sections : [sections];
    sessionSections  = sectionList;
    selectedSections.clear();
    sessionStartTime = Date.now();

    const targetSelect = document.getElementById('focus-type-select');
    sessionTarget = targetSelect ? targetSelect.value : 'unsolved';

    // Snapshot questions in all chosen sections
    sessionStartSnapshot = new Map(
      state.questions
        .filter(q => sectionList.includes(q.section || 'Other'))
        .map(q => [q.lc_number, q.is_done])
    );

    // Bar label: "Two Pointers" or "Two Pointers +2 more"
    const labelText = sectionList.length === 1
      ? sectionList[0]
      : `${sectionList[0]} +${sectionList.length - 1} more`;
    const topicLabel = document.getElementById('focus-topic-label');
    if (topicLabel) topicLabel.innerHTML = `${labelText} <span style="opacity:0.6;font-size:11px;font-weight:400;margin-left:6px;">(${sessionTarget})</span>`;

    const bar = document.getElementById('focus-bar');
    if (bar) bar.classList.remove('hidden');
    this._updateCount();

    applyFocusFilter(sectionList, sessionTarget);

    // Start stopwatch (switch to stopwatch mode if needed)
    const modeBtn = document.getElementById('sw-mode');
    if (modeBtn && modeBtn.textContent === '⏱') {
      resetStopwatch();
    } else if (modeBtn) {
      modeBtn.click();
      resetStopwatch();
    }
    toggleStopwatch('start');
    setStopwatchLock(true);

    if (window.showToast) window.showToast(`Focus session started: ${labelText}`, 'success');
  },

  end() {
    if (!sessionSections.length) return;

    const duration = Date.now() - sessionStartTime;

    // Compute exactly which problems were newly solved this session (across all sections)
    const solvedProblems = state.questions.filter(q =>
      sessionSections.includes(q.section || 'Other') &&
      q.is_done &&
      sessionStartSnapshot.has(q.lc_number) &&
      !sessionStartSnapshot.get(q.lc_number)
    );

    const easy   = solvedProblems.filter(q => q.difficulty === 'Easy').length;
    const medium = solvedProblems.filter(q => q.difficulty === 'Medium').length;
    const hard   = solvedProblems.filter(q => q.difficulty === 'Hard').length;
    const total  = solvedProblems.length;

    const sessionLabel = sessionSections.length === 1
      ? sessionSections[0]
      : sessionSections.join(', ');

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

    const body = document.getElementById('focus-summary-body');
    if (body) {
      body.innerHTML = `
        <div class="focus-summary-header">Session Complete</div>
        <div class="focus-summary-section-name">${sessionLabel}</div>

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
    lockScroll();
    document.getElementById('focus-summary-modal').classList.add('open');

    // Restore UI
    document.getElementById('focus-bar')?.classList.add('hidden');
    removeFocusFilter();

    toggleStopwatch('stop');
    setStopwatchLock(false);
    resetStopwatch();

    sessionSections      = [];
    sessionStartTime     = null;
    sessionStartSnapshot = new Map();
  },

  closeSummary() {
    document.getElementById('focus-summary-modal').classList.remove('open');
    unlockScroll();
  },

  handleSummaryOverlay(e) {
    if (e.target === document.getElementById('focus-summary-modal')) this.closeSummary();
  },

  isActive() { return sessionSections.length > 0; },

  _updateCount() {
    if (!sessionSections.length) return;
    const solved = state.questions.filter(q =>
      sessionSections.includes(q.section || 'Other') &&
      q.is_done &&
      sessionStartSnapshot.has(q.lc_number) &&
      !sessionStartSnapshot.get(q.lc_number)
    ).length;
    const countEl = document.getElementById('focus-solved-count');
    if (countEl) countEl.textContent = `${solved} solved`;
  },
};
