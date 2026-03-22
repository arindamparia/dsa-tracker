/** DOM construction — sections, rows, section dropdown. */
import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { updateStats } from './stats.js';
import { applyFilters, applyFiltersToSection } from './filters.js';

/** Escape a string for safe insertion into HTML text content or attributes. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Module-level company count map (rebuilt once per render()) ────────────
let _companyCountMap = null;
function getCompanyCountMap() {
  if (_companyCountMap) return _companyCountMap;
  _companyCountMap = new Map();
  state.questions.forEach(q =>
    (q.companies_asked || []).forEach(c =>
      _companyCountMap.set(c, (_companyCountMap.get(c) || 0) + 1)
    )
  );
  return _companyCountMap;
}
import { buildAIReviewHTML } from './ai.js';

const SKELETON_ROW = `
  <tr class="skeleton-row">
    <td class="check-cell"><div class="skeleton-box skeleton-check"></div></td>
    <td class="prob-name">
      <div class="skeleton-box skeleton-text"></div>
      <div class="skeleton-box skeleton-text-sub"></div>
    </td>
    <td class="diff-cell"><div class="skeleton-box skeleton-badge"></div></td>
    <td class="sol-cell"><div class="skeleton-box skeleton-textarea"></div></td>
    <td class="notes-cell"><div class="skeleton-box skeleton-textarea"></div></td>
    <td class="spacer-cell"></td>
  </tr>`;

const COLGROUP_HTML = `
  <colgroup>
    <col class="check-cell">
    <col class="prob-name">
    <col class="diff-cell">
    <col class="sol-cell">
    <col class="notes-cell">
    <col class="spacer-cell">
  </colgroup>`;

const COL_HEADERS_HTML = `
  <div class="section-col-headers">
    <span class="th-check">✓</span>
    <span class="th-problem">Problem</span>
    <span class="th-diff">Difficulty</span>
    <span class="th-col sol-cell">Solution</span>
    <span class="th-col notes-cell">Notes</span>
    <span class="th-spacer"></span>
  </div>`;

// Width variations so skeleton sections don't look identical
const TITLE_WIDTHS = [140, 180, 110, 160, 130, 170, 120];

export function renderSkeletonSections(count = 7) {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const isOpen = i < 2; // first 2 sections are open showing rows
    const el = document.createElement('div');
    el.className = `section skeleton-section${isOpen ? '' : ' collapsed'}`;
    el.innerHTML = `
      <div class="section-sticky">
        <div class="section-header">
          <span class="skeleton-box skeleton-section-num"></span>
          <span class="skeleton-box skeleton-section-title" style="width:${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}px"></span>
          <div class="section-meta">
            <span class="skeleton-box skeleton-section-count"></span>
            <div class="section-progress-mini"><div class="section-progress-mini-fill" style="width:0%"></div></div>
            <span class="chevron" style="opacity:0.25">▾</span>
          </div>
        </div>
        ${COL_HEADERS_HTML}
      </div>
      <div class="section-body">
        <div class="section-body-inner">
          <table class="q-table">
            ${COLGROUP_HTML}
            <tbody>${isOpen ? Array(4).fill(SKELETON_ROW).join('') : ''}</tbody>
          </table>
        </div>
      </div>`;
    container.appendChild(el);
  }
}

export function render() {
  _companyCountMap = null; // invalidate cache on full re-render
  const container = document.getElementById('sections');
  container.innerHTML = '';
  const sections = groupBySections(state.questions);

  sections.forEach((sec, si) => {
    const el = document.createElement('div');
    el.className = 'section collapsed';
    el.id = `sec-${si}`;
    const done  = sec.questions.filter(q => q.is_done).length;
    const total = sec.questions.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;

    el.innerHTML = `
      <div class="section-sticky">
        <div class="section-header" onclick="toggleSection(${si})" onmouseenter="preloadSection(${si})">
          <span class="section-num">${String(si + 1).padStart(2, '0')}</span>
          <span class="section-title">${sec.section}</span>
          <div class="section-meta">
            <span class="section-count" id="sc-${si}">${done}/${total}</span>
            <div class="section-progress-mini"><div class="section-progress-mini-fill" id="sp-${si}" style="width:${pct}%"></div></div>
            <span class="chevron">▾</span>
          </div>
        </div>
        <div class="section-col-headers">
          <span class="th-check">✓</span>
          <span class="th-problem">Problem</span>
          <span class="th-diff">Difficulty</span>
          <span class="th-col sol-cell">Solution</span>
          <span class="th-col notes-cell">Notes</span>
          <span class="th-spacer"></span>
        </div>
      </div>
      <div class="section-body">
        <div class="section-body-inner">
          <table class="q-table">
            <colgroup>
              <col class="check-cell">
              <col class="prob-name">
              <col class="diff-cell">
              <col class="sol-cell">
              <col class="notes-cell">
              <col class="spacer-cell">
            </colgroup>
            <tbody id="tbody-${si}"></tbody>
          </table>
        </div>
      </div>`;
    container.appendChild(el);

    const tbody = document.getElementById(`tbody-${si}`);
    tbody.dataset.loaded = 'false';
  });

  updateStats();
  populateSectionDropdown();
  applyFilters();
}

export function buildRow(q, si) {
  const tr = document.createElement('tr');
  tr.id = `row-${q.lc_number}`;
  tr.dataset.diff  = q.difficulty;
  tr.dataset.name  = q.name.toLowerCase();
  tr.dataset.topic = (q.topic || '').toLowerCase();
  tr.dataset.lc    = String(q.lc_number);
  tr.dataset.si    = si;
  if (q.is_done) tr.classList.add('done-row');
  // Solved-today highlight: bright left border if marked done today
  if (q.solved_at) {
    const today = new Date().toDateString();
    if (new Date(q.solved_at).toDateString() === today) tr.classList.add('solved-today');
  }

  const tags     = Array.isArray(q.tags) ? q.tags : [];
  const tagHtml  = tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');

  // Company pills — sorted by total question count desc (same order as filter dropdown)
  // Uses pre-computed map (getCompanyCountMap) to avoid O(N) rebuild per row.
  const COMPANY_VISIBLE = 4;
  const companiesRaw = Array.isArray(q.companies_asked) ? q.companies_asked : [];
  const companyCountMap = getCompanyCountMap();
  const companies = [...companiesRaw].sort((a, b) => (companyCountMap.get(b) || 0) - (companyCountMap.get(a) || 0));
  let companyHtml = '';
  if (companies.length > 0) {
    const visible = companies.slice(0, COMPANY_VISIBLE);
    const hidden  = companies.slice(COMPANY_VISIBLE);
    // Use data-company attributes instead of inline onclick to prevent XSS.
    // Clicks handled by delegated listener at bottom of this file.
    const visiblePills = visible.map(c => {
      const esc = escapeHtml(c);
      return `<span class="company-pill" data-company="${esc}" title="Filter by ${esc}">${esc}</span>`;
    }).join('');
    const hiddenPills = hidden.map(c => {
      const esc = escapeHtml(c);
      return `<span class="company-pill cp-hidden" data-company="${esc}" title="Filter by ${esc}">${esc}</span>`;
    }).join('');
    const moreBtn = hidden.length > 0
      ? `<span class="company-pill-more" data-lc="${q.lc_number}">+${hidden.length} more</span>`
      : '';
    companyHtml = `<span class="company-pills-wrap" id="cpw-${q.lc_number}">${visiblePills}${hiddenPills}${moreBtn}</span>`;
  }
  const solRaw   = q.solution || '';
  const notesRaw = q.notes    || '';
  const todayBadge = tr.classList.contains('solved-today')
    ? '<span class="today-badge">TODAY</span>' : '';

  // Escape all DB-sourced strings before embedding into innerHTML.
  const safeName       = escapeHtml(q.name);
  const safeTopic      = escapeHtml(q.topic);
  const safeDifficulty = escapeHtml(q.difficulty);
  // URL: server validates http/https; escape for attribute safety.
  const safeUrl = (q.url || '').match(/^https?:\/\//) ? escapeHtml(q.url) : '#';

  tr.innerHTML = `
    <td class="check-cell">
      <div class="custom-check ${q.is_done ? 'checked' : ''}" id="chk-${q.lc_number}"
           onclick="toggleCheck(${q.lc_number}, ${si})" title="Mark complete"></div>
    </td>
    <td class="prob-name">
      <span class="review-star ${q.needs_review ? 'active' : ''}" onclick="toggleReview(${q.lc_number}, this)" title="Needs Review">★</span>
      <a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block">${safeName}</a>${todayBadge}
      <span class="topic-tag">${safeTopic}</span>
      <button class="similar-btn" id="sim-btn-${q.lc_number}" onclick="SimilarProblems.toggle(${q.lc_number})" title="Find similar unsolved problems">Similar →</button>
      <button class="ai-btn ai-hint-btn" id="ai-hint-btn-${q.lc_number}" onclick="AI.getHint(${q.lc_number})" title="Get a small hint">💡 Hint</button>
      ${tagHtml ? `<span class="tag-pills-wrap"><br>${tagHtml}</span>` : ''}
      ${companyHtml ? `<br>${companyHtml}` : ''}
    </td>
    <td class="diff-cell"><span class="diff-badge ${q.difficulty.toLowerCase()}">${safeDifficulty}</span></td>
    <td class="sol-cell">
      <div class="sol-cell-wrap">
        <div class="sol-actions-row">
          <button class="expand-btn" onclick="SolutionModal.open(${q.lc_number})" title="View / Edit in Full Screen">⤢</button>
          <button class="ai-btn ai-analyze-btn" id="ai-analyze-btn-${q.lc_number}" onclick="AI.analyze(${q.lc_number})" title="Analyze Complexity & Quality">🤖 Analyze Code</button>
        </div>
        <textarea class="sol-box ${solRaw ? 'has-content' : ''}"
          placeholder="Paste or write solution code..."
          data-lc="${q.lc_number}"
          oninput="debounceSave(${q.lc_number}, this)"
        >${solRaw}</textarea>
        ${renderAIAnalysisHTML(q.lc_number, q.ai_analysis)}
      </div>
    </td>
    <td class="notes-cell">
      <div class="complexity-row">
        <select class="complexity-select" data-lc="${q.lc_number}" data-type="time" onchange="saveComplexity(${q.lc_number})">
          <option value="">Time O(?)</option>
          ${buildComplexityOptions(q.time_complexity)}
        </select>
        <select class="complexity-select" data-lc="${q.lc_number}" data-type="space" onchange="saveComplexity(${q.lc_number})">
          <option value="">Space O(?)</option>
          ${buildComplexityOptions(q.space_complexity)}
        </select>
      </div>
      <textarea class="notes-box ${notesRaw ? 'has-content' : ''}"
        placeholder="Approach, complexity, edge cases..."
        data-lc="${q.lc_number}"
        oninput="debounceNotesSave(${q.lc_number}, this)"
      >${notesRaw}</textarea>
    </td>
    <td class="spacer-cell"></td>
`;
  return tr;
}

export function toggleSection(si) {
  // Read BEFORE the transition — smoothTransition callback has its own scope
  const clicked = document.getElementById(`sec-${si}`);
  const isNowCollapsed = clicked.classList.contains('collapsed');

  smoothTransition(() => {
    // Close all sections first (accordion behaviour)
    document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));

    // If it was collapsed, open it; if it was already open, leave it closed
    if (isNowCollapsed) {
      clicked.classList.remove('collapsed');
      renderSection(si);
    }
  });

  // Scroll into view after animation completes (grid transition = 0.38s)
  if (isNowCollapsed) {
    setTimeout(() => {
      const el = document.getElementById(`sec-${si}`);
      if (!el) return;
      const controlsH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--controls-h')) || 126;
      const y = el.getBoundingClientRect().top + window.scrollY - controlsH;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 420); // slightly longer than the 0.38s grid transition
  }
}

export function preloadSection(si) {
  if (window.MockInterview?.isActive()) return; // block during interview
  const tbody = document.getElementById(`tbody-${si}`);
  if (!tbody || tbody.dataset.loaded !== 'false') return;

  tbody.dataset.loaded = 'loading';
  // Yield to main thread to keep hover ultra-smooth, then build DOM quietly
  setTimeout(() => { doRender(si, tbody); }, 10);
}

export function renderSection(si, sync = false) {
  const tbody = document.getElementById(`tbody-${si}`);
  if (!tbody) return;
  // sync (force-render): proceed unless already fully rendered
  // async (lazy): only proceed if not yet started
  if (sync  && tbody.dataset.loaded === 'true')  return;
  if (!sync && tbody.dataset.loaded !== 'false') return;

  tbody.dataset.loaded = 'loading';

  if (sync) {
     doRender(si, tbody);
     return;
  }

  // Show skeleton
  tbody.innerHTML = Array(3).fill(`
    <tr class="skeleton-row">
      <td class="check-cell"><div class="skeleton-box skeleton-check"></div></td>
      <td class="prob-name">
        <div class="skeleton-box skeleton-text"></div>
        <div class="skeleton-box skeleton-text-sub"></div>
      </td>
      <td class="diff-cell"><div class="skeleton-box skeleton-badge"></div></td>
      <td class="sol-cell"><div class="skeleton-box skeleton-textarea"></div></td>
      <td class="notes-cell"><div class="skeleton-box skeleton-textarea"></div></td>
      <td class="spacer-cell"></td>
    </tr>
  `).join('');

  // Let browser paint skeleton, then render actual rows
  setTimeout(() => {
    doRender(si, tbody);
  }, 40);
}

function doRender(si, tbody) {
  const sections = groupBySections(state.questions);
  const sec = sections[si];
  if (!sec) return;
  
  const frag = document.createDocumentFragment();
  sec.questions.forEach(q => frag.appendChild(buildRow(q, si)));
  
  tbody.innerHTML = '';
  tbody.appendChild(frag);
  tbody.dataset.loaded = 'true';
  // Disable AI buttons during mock interview
  if (window.MockInterview?.isActive()) {
    tbody.querySelectorAll('.ai-hint-btn, .ai-analyze-btn').forEach(b => {
      b.disabled = true;
      b.title = 'AI disabled during mock interview';
    });
    window.MockInterview._markInterviewRows();
  }
  // Only re-filter the newly rendered section — avoids full DOM scan of all sections.
  applyFiltersToSection(si);
}

document.addEventListener('force-render-section', (e) => {
  renderSection(e.detail, true);
});

// ── Company pill click delegation ─────────────────────────────────────────
// Replaces inline onclick handlers to prevent XSS from DB-sourced company names.
document.addEventListener('click', (e) => {
  const pill = e.target.closest('.company-pill[data-company]');
  if (pill) {
    window.CompanyFilter?.select(pill.dataset.company);
    return;
  }
  const more = e.target.closest('.company-pill-more[data-lc]');
  if (more) {
    e.stopPropagation();
    window.CompanyFilter?.toggleMore(parseInt(more.dataset.lc, 10));
  }
});

/**
 * Populates the "Section" dropdown in the Add Question modal.
 * Lives here because it depends on state.questions + groupBySections.
 */
export function populateSectionDropdown() {
  const sel      = document.getElementById('f-section');
  const existing = new Set([...sel.options].map(o => o.value).filter(Boolean));
  groupBySections(state.questions).forEach(s => {
    if (!existing.has(s.section)) {
      const opt = document.createElement('option');
      opt.value = s.section; opt.textContent = s.section;
      sel.appendChild(opt);
    }
  });
}

function buildComplexityOptions(selected) {
  const opts = [
    'O(1)', 'O(log n)', 'O(sqrt(n))', 'O(log(m+n))', 'O(n)', 
    'O(n log n)', 'O(n log m)', 'O(n+m)', 'O(m * n)', 'O(V+E)', 
    'O(n²)', 'O(n³)', 'O(2^n)', 'O(2^n * n²)', 'O(n!)', 'O(n^n)'
  ];
  if (selected && !opts.includes(selected)) {
    opts.push(selected);
  }
  return opts.map(o => `<option value="${o}" ${selected === o ? 'selected' : ''}>${o}</option>`).join('');
}

function renderAIAnalysisHTML(lc, payload) {
  if (!payload || !payload.trim()) return '';

  let data = null;
  let isRich = false;
  try {
    data = JSON.parse(payload);
    if (data && data.approach && data.efficiency) isRich = true;
  } catch {}

  const contentHtml = isRich
    ? buildAIReviewHTML(lc, data)
    : `<div class="ai-fb-box"><strong>🤖 Approach & Edge Cases:</strong> ${payload}</div>`;

  return `
    <div class="ai-fb-container" id="ai-fb-container-${lc}">
      <button class="ai-fb-toggle" onclick="AI.toggleFeedback(${lc})">
        <span class="fb-icon">🤖</span> AI Review <span class="fb-arrow">▼</span>
      </button>
      <div class="ai-fb-content" id="ai-fb-content-${lc}" style="display:none;">
        ${contentHtml}
      </div>
    </div>`;
}
