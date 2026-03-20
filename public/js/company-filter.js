/** Company filter dropdown + prep mode banner logic. */
import { state } from './state.js';
import { applyFilters } from './filters.js';
import { toggleStopwatch, resetStopwatch, setStopwatchLock } from './stopwatch.js';

/**
 * Builds sorted company list from state.questions.
 * Sorted by total question count descending — companies with more questions
 * appear first (naturally puts FAANG/top product companies at top).
 */
function buildCompanyMap() {
  const map = new Map();
  state.questions.forEach(q => {
    (q.companies_asked || []).forEach(c => {
      if (!map.has(c)) map.set(c, { total: 0, done: 0 });
      const e = map.get(c);
      e.total++;
      if (q.is_done) e.done++;
    });
  });
  return [...map.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, s]) => ({ name, total: s.total, done: s.done }));
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ── Prep session state (module-level) ────────────────────────────
let prepSessionCompany   = null;
let prepSessionStartTime = null;
let prepSessionSnapshot  = new Map(); // lc_number → is_done at session start

export const CompanyFilter = {
  _open: false,
  _query: '',

  getCompanies() {
    return buildCompanyMap();
  },

  // ── Filter dropdown ────────────────────────────────────────────
  toggle() {
    if (prepSessionCompany) {
      if (window.showToast) window.showToast('Exit prep mode before changing company.', 'error');
      return;
    }
    this._open = !this._open;
    const dd = document.getElementById('company-dropdown');
    if (!dd) return;
    dd.classList.toggle('open', this._open);
    if (this._open) {
      this._query = '';
      const si = document.getElementById('company-search-input');
      if (si) { si.value = ''; setTimeout(() => si.focus(), 50); }
      this.renderList();
      setTimeout(() => document.addEventListener('click', CompanyFilter._handleOutside, { once: true }), 0);
    }
  },

  _handleOutside(e) {
    const wrap = document.getElementById('company-filter-wrap');
    if (wrap && !wrap.contains(e.target)) {
      CompanyFilter._open = false;
      document.getElementById('company-dropdown')?.classList.remove('open');
    } else if (CompanyFilter._open) {
      setTimeout(() => document.addEventListener('click', CompanyFilter._handleOutside, { once: true }), 0);
    }
  },

  close() {
    this._open = false;
    document.getElementById('company-dropdown')?.classList.remove('open');
  },

  search(q) {
    this._query = q.toLowerCase();
    this.renderList();
  },

  renderList() {
    const list = document.getElementById('company-list');
    if (!list) return;
    const companies = this.getCompanies();
    const filtered = this._query
      ? companies.filter(c => c.name.toLowerCase().includes(this._query))
      : companies;

    if (filtered.length === 0) {
      list.innerHTML = '<div class="company-list-empty">No companies found</div>';
      return;
    }

    list.innerHTML = filtered.map(c => {
      const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
      const isActive = state.companyFilter === c.name;
      const barColor = pct >= 80 ? 'var(--easy)' : pct >= 50 ? 'var(--medium)' : 'var(--hard)';
      const safeName = c.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="company-list-item${isActive ? ' active' : ''}"
             onclick="CompanyFilter.select('${safeName}')">
          <div class="cli-top">
            <span class="cli-name">${c.name}</span>
            <span class="cli-count">${c.done}/${c.total}</span>
          </div>
          <div class="cli-bar-track">
            <div class="cli-bar-fill" style="width:${pct}%;background:${barColor}"></div>
          </div>
        </div>`;
    }).join('');
  },

  select(company) {
    if (prepSessionCompany) {
      if (window.showToast) window.showToast('Exit prep mode before changing company.', 'error');
      return;
    }
    // Toggle off if already active
    if (state.companyFilter === company) {
      state.companyFilter = null;
      this.close();
      this._sync();
      applyFilters();
      return;
    }
    state.companyFilter = company;
    this.close();
    this._sync();
    applyFilters();
  },

  clear() {
    state.companyFilter = null;
    // If prep session is active, end it silently without showing summary
    if (prepSessionCompany) {
      document.getElementById('company-prep-bar')?.classList.add('hidden');
      toggleStopwatch('stop');
      setStopwatchLock(false);
      resetStopwatch();
      prepSessionCompany   = null;
      prepSessionStartTime = null;
      prepSessionSnapshot  = new Map();
    }
    document.body.classList.remove('company-prep-active');
    this._sync();
    applyFilters();
  },

  // ── Prep mode picker ───────────────────────────────────────────
  openPicker() {
    if (prepSessionCompany) {
      // Already in a prep session — end it first
      this.endPrep();
      return;
    }
    this._renderPickerList('');
    const searchEl = document.getElementById('company-prep-search');
    if (searchEl) { searchEl.value = ''; setTimeout(() => searchEl.focus(), 50); }
    document.getElementById('company-prep-modal')?.classList.add('open');
  },

  closePicker() {
    document.getElementById('company-prep-modal')?.classList.remove('open');
  },

  handlePickerOverlay(e) {
    if (e.target === document.getElementById('company-prep-modal')) this.closePicker();
  },

  filterPicker(query) {
    this._renderPickerList(query.toLowerCase());
  },

  _renderPickerList(query) {
    const list = document.getElementById('company-prep-list');
    if (!list) return;
    let companies = this.getCompanies();
    if (query) companies = companies.filter(c => c.name.toLowerCase().includes(query));

    if (companies.length === 0) {
      list.innerHTML = '<div class="company-list-empty">No companies found</div>';
      return;
    }

    list.innerHTML = companies.map(c => {
      const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
      const color = pct >= 80 ? 'var(--easy)' : pct >= 50 ? 'var(--medium)' : 'var(--hard)';
      const safe = c.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <button class="focus-topic-item" onclick="CompanyFilter.startPrep('${safe}')">
          <span class="focus-topic-name">${c.name}</span>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace">${c.done}/${c.total} solved</div>
            <div style="color:${color};font-size:15px;font-weight:800;font-family:'Syne',sans-serif;line-height:1.2">${pct}%</div>
          </div>
        </button>`;
    }).join('');
  },

  // ── Prep session ──────────────────────────────────────────────
  startPrep(company) {
    const target = company || state.companyFilter;
    if (!target) return;
    this.closePicker();

    // Set filter
    state.companyFilter = target;
    prepSessionCompany   = target;
    prepSessionStartTime = Date.now();

    // Snapshot current solved state for all questions tagged with this company
    prepSessionSnapshot = new Map(
      state.questions
        .filter(q => (q.companies_asked || []).includes(target))
        .map(q => [q.lc_number, q.is_done])
    );

    // Update prep bar label and show it
    const labelEl = document.getElementById('company-prep-label');
    if (labelEl) labelEl.textContent = target;
    document.getElementById('company-prep-bar')?.classList.remove('hidden');

    document.body.classList.add('company-prep-active');
    this._sync();
    applyFilters();
    this._updatePrepCount();

    // Auto-start and lock the stopwatch (same as Focus Mode)
    const modeBtn = document.getElementById('sw-mode');
    if (modeBtn && modeBtn.textContent !== '⏱') {
      modeBtn.click();
    }
    resetStopwatch();
    toggleStopwatch('start');
    setStopwatchLock(true);

    if (window.showToast) window.showToast(`🏢 Company Prep: ${target}`, 'success');
  },

  endPrep() {
    if (!prepSessionCompany) {
      document.body.classList.remove('company-prep-active');
      return;
    }

    const duration = Date.now() - prepSessionStartTime;
    const company  = prepSessionCompany;

    // Find newly solved problems during this session
    const solvedProblems = state.questions.filter(q =>
      (q.companies_asked || []).includes(company) &&
      q.is_done &&
      !prepSessionSnapshot.get(q.lc_number)
    );

    const easy   = solvedProblems.filter(q => q.difficulty === 'Easy').length;
    const medium = solvedProblems.filter(q => q.difficulty === 'Medium').length;
    const hard   = solvedProblems.filter(q => q.difficulty === 'Hard').length;
    const total  = solvedProblems.length;

    const listHTML = total > 0 ? `
      <div class="focus-solved-list">
        <div class="focus-solved-list-title">Solved this session</div>
        ${solvedProblems.map(q => `
          <div class="focus-solved-item">
            <span class="fsi-check">✓</span>
            <span class="fsi-name">${q.name}</span>
            <span class="fsi-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span>
            ${q.difficulty === 'Hard' ? '<span class="fsi-sword">⚔️</span>' : ''}
          </div>`).join('')}
      </div>` : '';

    const msg = total > 0
      ? 'Great prep session! Keep the momentum 🚀'
      : 'Reviewing and analyzing counts too! 📖';

    const body = document.getElementById('company-prep-summary-body');
    if (body) {
      body.innerHTML = `
        <div class="focus-summary-header">Prep Session Complete</div>
        <div class="focus-summary-section-name">${company}</div>
        <div class="focus-summary-time">
          <span class="focus-summary-time-icon">⏱</span>
          <span class="focus-summary-time-val">${formatDuration(duration)}</span>
        </div>
        <div class="focus-diff-row">
          <div class="focus-diff-card easy-card"><div class="focus-diff-num">${easy}</div><div class="focus-diff-label">Easy</div></div>
          <div class="focus-diff-card medium-card"><div class="focus-diff-num">${medium}</div><div class="focus-diff-label">Medium</div></div>
          <div class="focus-diff-card hard-card"><div class="focus-diff-num">${hard}</div><div class="focus-diff-label">Hard</div></div>
        </div>
        ${listHTML}
        <div class="focus-summary-msg">${msg}</div>`;
    }
    document.getElementById('company-prep-summary-modal')?.classList.add('open');

    // Hide prep bar and restore UI
    document.getElementById('company-prep-bar')?.classList.add('hidden');
    document.body.classList.remove('company-prep-active');

    // Stop and unlock the stopwatch
    toggleStopwatch('stop');
    setStopwatchLock(false);
    resetStopwatch();

    // Clear company filter
    state.companyFilter = null;
    this._sync();
    applyFilters();

    prepSessionCompany   = null;
    prepSessionStartTime = null;
    prepSessionSnapshot  = new Map();
  },

  closeSummary() {
    document.getElementById('company-prep-summary-modal')?.classList.remove('open');
  },

  // ── Readiness confirm modal ────────────────────────────────────
  confirmReadiness(company, done, total, labelText) {
    if (prepSessionCompany) {
      if (window.showToast) window.showToast('Exit prep mode before switching company.', 'error');
      return;
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    const color = pct >= 80 ? 'var(--easy)' : pct >= 50 ? 'var(--medium)' : 'var(--hard)';
    const modal = document.getElementById('company-readiness-confirm-modal');
    const body  = document.getElementById('company-readiness-confirm-body');
    if (!modal || !body) return;
    const safe = company.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    body.innerHTML = `
      <div class="crc-company">${company}</div>
      <div class="crc-score" style="color:${color}">${pct}%</div>
      <div class="crc-label">${labelText}</div>
      <div class="crc-sub">${done} / ${total} problems solved</div>
      <div class="crc-actions">
        <button class="btn-secondary" onclick="CompanyFilter.selectFromReadiness('${safe}')">Just Filter</button>
        <button class="btn-submit" onclick="CompanyFilter.startPrepFromReadiness('${safe}')" style="background:var(--accent)">Start Prep Mode</button>
      </div>
    `;
    modal.classList.add('open');
  },

  closeReadinessConfirm() {
    document.getElementById('company-readiness-confirm-modal')?.classList.remove('open');
  },

  selectFromReadiness(company) {
    this.closeReadinessConfirm();
    state.companyFilter = company;
    this._sync();
    applyFilters();
    if (window.CompanyStats) window.CompanyStats.refreshIfOpen();
    document.querySelector('.controls')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  startPrepFromReadiness(company) {
    this.closeReadinessConfirm();
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.startPrep(company);
  },

  handleSummaryOverlay(e) {
    if (e.target === document.getElementById('company-prep-summary-modal')) this.closeSummary();
  },

  /** Called from progress.toggleCheck to update solved count during prep session */
  _updatePrepCount() {
    if (!prepSessionCompany) return;
    const solved = state.questions.filter(q =>
      (q.companies_asked || []).includes(prepSessionCompany) &&
      q.is_done &&
      !prepSessionSnapshot.get(q.lc_number)
    ).length;
    const countEl = document.getElementById('company-prep-count');
    if (countEl) countEl.textContent = `${solved} solved`;
  },



  // Called from company-pill "+N more" button
  toggleMore(lcNumber) {
    const wrap = document.getElementById(`cpw-${lcNumber}`);
    if (!wrap) return;
    const isExpanded = wrap.classList.toggle('cp-expanded');
    const moreBtn = wrap.querySelector('.company-pill-more');
    const hiddenPills = wrap.querySelectorAll('.company-pill.cp-hidden');
    hiddenPills.forEach(p => p.classList.toggle('cp-visible', isExpanded));
    if (moreBtn) moreBtn.textContent = isExpanded ? '▴ less' : `+${hiddenPills.length} more`;
  },

  _sync() {
    const label = document.getElementById('company-filter-label');
    const btn   = document.getElementById('company-filter-btn');
    if (!label || !btn) return;

    const clearBtn = document.getElementById('company-clear-btn');
    if (state.companyFilter) {
      label.textContent = state.companyFilter;
      btn.classList.add('active');
      clearBtn?.classList.remove('hidden');
    } else {
      label.textContent = '🏢 Company';
      btn.classList.remove('active');
      clearBtn?.classList.add('hidden');
      document.body.classList.remove('company-prep-active');
    }
  },

  init() {
    this._sync();
  },
};
