/**
 * MockInterview — timed interview simulation.
 *
 * User configures:
 *   - Problem mix (e.g. 1 Easy + 2 Medium + 1 Hard)
 *   - Optional company or section filter
 *   - Time limit (30/45/60/90 min)
 *
 * During the session:
 *   - AI Hint + Analyze buttons are disabled
 *   - Countdown timer shown in bar (not the stopwatch)
 *   - On time-up or "Submit": report card with score + solved list
 */
import { state } from './state.js';
import { groupBySections } from './utils.js';
import { toggleStopwatch, resetStopwatch, setStopwatchLock } from './stopwatch.js';

let session = null; // active session state
let _countdownInterval = null;

function pickProblems({ easyN, mediumN, hardN, company, section, includeSolved }) {
  const pool = state.questions.filter(q => {
    if (!includeSolved && q.is_done) return false;
    if (company && !(q.companies_asked || []).includes(company)) return false;
    if (section && q.section !== section) return false;
    return true;
  });

  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  const easy   = shuffle(pool.filter(q => q.difficulty === 'Easy')).slice(0, easyN);
  const medium = shuffle(pool.filter(q => q.difficulty === 'Medium')).slice(0, mediumN);
  const hard   = shuffle(pool.filter(q => q.difficulty === 'Hard')).slice(0, hardN);

  return [...easy, ...medium, ...hard];
}

function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateCountdown() {
  if (!session) return;
  const remaining = session.endsAt - Date.now();
  const el = document.getElementById('mi-countdown');
  if (el) {
    el.textContent = formatTime(remaining);
    el.classList.toggle('mi-urgent', remaining < 5 * 60 * 1000); // red last 5 min
  }
  if (remaining <= 0) MockInterview.end(true);
}

function buildProblemList(problems) {
  return problems.map(q => {
    const safeLc = q.lc_number;
    return `
      <div class="mi-problem-item" id="mi-prob-${safeLc}">
        <div class="mi-prob-check ${q._solved ? 'solved' : ''}" id="mi-chk-${safeLc}"></div>
        <a href="${q.url}" target="_blank" rel="noopener" class="mi-prob-name">${q.name}</a>
        <span class="diff-badge ${q.difficulty.toLowerCase()}" style="font-size:10px">${q.difficulty}</span>
      </div>`;
  }).join('');
}

export const MockInterview = {
  openConfig() {
    if (session) { this._showBar(); return; }

    // Populate company list — sorted by question count descending (same as company filter)
    const companyCountMap = new Map();
    state.questions.forEach(q => {
      (q.companies_asked || []).forEach(c => companyCountMap.set(c, (companyCountMap.get(c) || 0) + 1));
    });
    const companies = [...companyCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    const sections  = groupBySections(state.questions).map(s => s.section);

    const cmpOpts = ['<option value="">Any company</option>',
      ...companies.map(c => `<option value="${c.replace(/"/g, '&quot;')}">${c}</option>`)].join('');
    const secOpts = ['<option value="">Any section</option>',
      ...sections.map(s => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`)].join('');

    document.getElementById('mi-company-select').innerHTML = cmpOpts;
    document.getElementById('mi-section-select').innerHTML = secOpts;

    // Pre-fill company if one is active
    if (state.companyFilter) {
      const sel = document.getElementById('mi-company-select');
      sel.value = state.companyFilter;
    }

    document.getElementById('mi-config-modal').classList.add('open');
  },

  closeConfig() {
    document.getElementById('mi-config-modal').classList.remove('open');
  },

  handleConfigOverlay(e) {
    if (e.target === document.getElementById('mi-config-modal')) this.closeConfig();
  },

  start() {
    const easyN   = parseInt(document.getElementById('mi-easy-count').value)   || 0;
    const mediumN = parseInt(document.getElementById('mi-medium-count').value) || 0;
    const hardN   = parseInt(document.getElementById('mi-hard-count').value)   || 0;
    const company       = document.getElementById('mi-company-select').value;
    const section       = document.getElementById('mi-section-select').value;
    const minutes       = parseInt(document.getElementById('mi-time-select').value) || 60;
    const includeSolved = document.getElementById('mi-include-solved').checked;

    if (easyN + mediumN + hardN === 0) {
      window.showToast?.('Pick at least 1 problem', 'error'); return;
    }

    const problems = pickProblems({ easyN, mediumN, hardN, company, section, includeSolved });
    if (problems.length === 0) {
      window.showToast?.('No unsolved problems match that filter', 'error'); return;
    }

    const actualTotal = problems.length;
    session = {
      problems,
      startedAt:    Date.now(),
      endsAt:       Date.now() + minutes * 60 * 1000,
      minutes,
      snapshotDone: new Map(problems.map(q => [q.lc_number, q.is_done])),
    };

    this.closeConfig();
    document.body.classList.add('mock-interview-active');

    // Lock stopwatch and start counting elapsed time
    const modeBtn = document.getElementById('sw-mode');
    if (modeBtn && modeBtn.textContent !== '⏱') modeBtn.click();
    resetStopwatch();
    toggleStopwatch('start');
    setStopwatchLock(true);

    // Build sidebar
    const sidebar = document.getElementById('mi-sidebar');
    if (sidebar) {
      sidebar.innerHTML = buildProblemList(problems);
    }

    // Show bar
    const bar = document.getElementById('mi-bar');
    if (bar) bar.classList.remove('hidden');
    document.getElementById('mi-bar-label').textContent =
      `🎯 Mock Interview — ${actualTotal} problem${actualTotal > 1 ? 's' : ''}`;

    // Start countdown
    updateCountdown();
    _countdownInterval = setInterval(updateCountdown, 1000);

    // Disable AI buttons
    document.querySelectorAll('.ai-hint-btn, .ai-analyze-btn').forEach(b => {
      b.disabled = true;
      b.title = 'AI disabled during mock interview';
    });

    // Filter view to only session problems
    this._applyFilter();

    window.showToast?.(`Interview started — ${minutes} min clock running`, 'success');
  },

  end(timeUp = false) {
    if (!session) return;

    clearInterval(_countdownInterval);
    _countdownInterval = null;

    // Compute results
    const solved = session.problems.filter(q =>
      q.is_done && !session.snapshotDone.get(q.lc_number)
    );
    const attempted = session.problems.filter(q => q.solution && q.solution.trim().length > 10);
    const duration  = Date.now() - session.startedAt;

    const easy   = solved.filter(q => q.difficulty === 'Easy').length;
    const medium = solved.filter(q => q.difficulty === 'Medium').length;
    const hard   = solved.filter(q => q.difficulty === 'Hard').length;
    const total  = session.problems.length;
    const score  = Math.round((solved.length / total) * 100);

    // Rating
    const rating = score >= 80 ? { text: '🏆 Excellent', cls: 'mi-excellent' }
                 : score >= 60 ? { text: '✅ Passed', cls: 'mi-passed' }
                 : score >= 40 ? { text: '📈 Needs Practice', cls: 'mi-needs' }
                 : { text: '💪 Keep Going', cls: 'mi-start' };

    const minutesTaken = Math.round(duration / 60000);

    // Summary HTML
    const summaryBody = document.getElementById('mi-summary-body');
    if (summaryBody) {
      summaryBody.innerHTML = `
        <div class="mi-summary-header">
          ${timeUp ? '⏰ Time\'s Up!' : 'Session Complete'}
        </div>
        <div class="mi-rating ${rating.cls}">${rating.text}</div>
        <div class="mi-score-big">${solved.length} / ${total}</div>
        <div class="mi-score-sub">problems solved · ${minutesTaken} min</div>

        <div class="focus-diff-row" style="margin:16px 0">
          <div class="focus-diff-card easy-card"><div class="focus-diff-num">${easy}</div><div class="focus-diff-label">Easy</div></div>
          <div class="focus-diff-card medium-card"><div class="focus-diff-num">${medium}</div><div class="focus-diff-label">Medium</div></div>
          <div class="focus-diff-card hard-card"><div class="focus-diff-num">${hard}</div><div class="focus-diff-label">Hard</div></div>
        </div>

        ${solved.length > 0 ? `
          <div class="focus-solved-list">
            <div class="focus-solved-list-title">Solved</div>
            ${solved.map(q => `
              <div class="focus-solved-item">
                <span class="fsi-check">✓</span>
                <span class="fsi-name">${q.name}</span>
                <span class="fsi-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span>
              </div>`).join('')}
          </div>` : ''}

        ${session.problems.filter(q => !solved.includes(q)).length > 0 ? `
          <div class="focus-solved-list" style="margin-top:8px">
            <div class="focus-solved-list-title" style="color:var(--text-dim)">Unsolved</div>
            ${session.problems.filter(q => !solved.includes(q)).map(q => `
              <div class="focus-solved-item" style="opacity:0.5">
                <span class="fsi-check" style="color:var(--text-muted)">○</span>
                <span class="fsi-name">${q.name}</span>
                <span class="fsi-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span>
              </div>`).join('')}
          </div>` : ''}
      `;
    }

    document.getElementById('mi-summary-modal').classList.add('open');

    // Restore UI
    document.getElementById('mi-bar')?.classList.add('hidden');
    document.body.classList.remove('mock-interview-active');

    // Unlock and stop stopwatch
    toggleStopwatch('stop');
    setStopwatchLock(false);

    // Re-enable AI buttons
    document.querySelectorAll('.ai-hint-btn, .ai-analyze-btn').forEach(b => {
      b.disabled = false;
      b.title = b.classList.contains('ai-hint-btn') ? 'Get a small hint' : 'Analyze Complexity & Quality';
    });

    // Remove filter
    import('./filters.js').then(m => m.applyFilters());

    session = null;
  },

  closeSummary() {
    document.getElementById('mi-summary-modal').classList.remove('open');
  },

  handleSummaryOverlay(e) {
    if (e.target === document.getElementById('mi-summary-modal')) this.closeSummary();
  },

  _applyFilter() {
    if (!session) return;
    const lcSet = new Set(session.problems.map(q => q.lc_number));
    document.querySelectorAll('.q-table tbody tr').forEach(tr => {
      const lc = parseInt(tr.id?.replace('row-', ''));
      tr.classList.toggle('mi-hidden', !lcSet.has(lc));
    });
    // Show only sections with interview problems; expand them so rows are visible
    const sections = groupBySections(state.questions);
    document.querySelectorAll('.section').forEach(sec => {
      const si = parseInt(sec.id?.replace('sec-', ''));
      const secData = sections[si];
      if (!secData) return;
      const hasProb = secData.questions.some(q => lcSet.has(q.lc_number));
      sec.classList.toggle('section-no-match', !hasProb);
      if (hasProb) sec.classList.remove('collapsed');
    });
  },

  step(id, dir) {
    const el = document.getElementById(id);
    if (!el) return;
    const val = (parseInt(el.value) || 0) + dir;
    el.value = Math.min(parseInt(el.max), Math.max(parseInt(el.min), val));
  },

  _showBar() {
    document.getElementById('mi-bar')?.classList.remove('hidden');
  },

  isActive() { return !!session; },
};

window.MockInterview = MockInterview;
