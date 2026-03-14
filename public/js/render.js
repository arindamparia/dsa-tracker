/** DOM construction — sections, rows, section dropdown. */
import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { updateStats } from './stats.js';
import { applyFilters } from './filters.js';

export function render() {
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
  const tagHtml  = tags.map(t => `<span class="tag-pill">${t}</span>`).join('');

  // Company pills — sorted by total question count desc (same order as filter dropdown)
  const COMPANY_VISIBLE = 4;
  const companiesRaw = Array.isArray(q.companies_asked) ? q.companies_asked : [];
  const companyCountMap = new Map();
  state.questions.forEach(q2 => (q2.companies_asked || []).forEach(c => companyCountMap.set(c, (companyCountMap.get(c) || 0) + 1)));
  const companies = [...companiesRaw].sort((a, b) => (companyCountMap.get(b) || 0) - (companyCountMap.get(a) || 0));
  let companyHtml = '';
  if (companies.length > 0) {
    const visible = companies.slice(0, COMPANY_VISIBLE);
    const hidden  = companies.slice(COMPANY_VISIBLE);
    const visiblePills = visible.map(c => {
      const safe = c.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<span class="company-pill" onclick="CompanyFilter.select('${safe}')" title="Filter by ${c}">${c}</span>`;
    }).join('');
    const hiddenPills = hidden.map(c => {
      const safe = c.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<span class="company-pill cp-hidden" onclick="CompanyFilter.select('${safe}')" title="Filter by ${c}">${c}</span>`;
    }).join('');
    const moreBtn = hidden.length > 0
      ? `<span class="company-pill-more" onclick="event.stopPropagation();CompanyFilter.toggleMore(${q.lc_number})">+${hidden.length} more</span>`
      : '';
    companyHtml = `<span class="company-pills-wrap" id="cpw-${q.lc_number}">${visiblePills}${hiddenPills}${moreBtn}</span>`;
  }
  const solRaw   = q.solution || '';
  const notesRaw = q.notes    || '';
  const todayBadge = tr.classList.contains('solved-today')
    ? '<span class="today-badge">TODAY</span>' : '';

  tr.innerHTML = `
    <td class="check-cell">
      <div class="custom-check ${q.is_done ? 'checked' : ''}" id="chk-${q.lc_number}"
           onclick="toggleCheck(${q.lc_number}, ${si})" title="Mark complete"></div>
    </td>
    <td class="prob-name">
      <span class="review-star ${q.needs_review ? 'active' : ''}" onclick="toggleReview(${q.lc_number}, this)" title="Needs Review">★</span>
      <a href="${q.url}" target="_blank" rel="noopener" style="display:inline-block">${q.name}</a>${todayBadge}
      <span class="topic-tag">${q.topic}</span>
      <button class="similar-btn" id="sim-btn-${q.lc_number}" onclick="SimilarProblems.toggle(${q.lc_number})" title="Find similar unsolved problems">Similar →</button>
      <button class="ai-btn ai-hint-btn" id="ai-hint-btn-${q.lc_number}" onclick="AI.getHint(${q.lc_number})" title="Get a small hint">💡 Hint</button>
      ${tagHtml ? `<span class="tag-pills-wrap"><br>${tagHtml}</span>` : ''}
      ${companyHtml ? `<br>${companyHtml}` : ''}
    </td>
    <td class="diff-cell"><span class="diff-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span></td>
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
  const tbody = document.getElementById(`tbody-${si}`);
  if (!tbody || tbody.dataset.loaded !== 'false') return;
  
  tbody.dataset.loaded = 'loading';
  // Yield to main thread to keep hover ultra-smooth, then build DOM quietly
  setTimeout(() => { doRender(si, tbody); }, 10);
}

export function renderSection(si, sync = false) {
  const tbody = document.getElementById(`tbody-${si}`);
  if (!tbody || tbody.dataset.loaded !== 'false') return;
  
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
  applyFilters({ preserveOpen: true });
}

document.addEventListener('force-render-section', (e) => {
  renderSection(e.detail, true);
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

  let contentHtml = '';
  if (isRich) {
    contentHtml = `
      <div class="ai-rich-fb">
        <div class="ai-rich-section approach-section">
          <div class="ai-rich-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="ai-rich-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>
            Approach
          </div>
          <div class="ai-rich-row"><span class="ai-rich-key">Current:</span> <span class="ai-rich-val">${data.approach.current}</span></div>
          <div class="ai-rich-row"><span class="ai-rich-key">Suggested:</span> <span class="ai-rich-val suggested">${data.approach.suggested}</span></div>
          <div class="ai-rich-row"><span class="ai-rich-key">Key Idea:</span> <span class="ai-rich-val">${data.approach.key_idea}</span></div>
          <div class="ai-rich-row"><span class="ai-rich-key">Consider:</span> <span class="ai-rich-val consideration">${data.approach.consider}</span></div>
        </div>
        
        <div class="ai-rich-section efficiency-section">
          <div class="ai-rich-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="ai-rich-icon"><path d="M13 3L4 14h7v7l9-11h-7z" fill="currentColor"/></svg>
            Efficiency
          </div>
          <div class="ai-rich-row"><span class="ai-rich-key">Current complexity:</span> <span class="ai-rich-complexity">${data.efficiency.current_complexity}</span></div>
          <div class="ai-rich-row"><span class="ai-rich-key">Suggested complexity:</span> <span class="ai-rich-complexity optimal">${data.efficiency.suggested_complexity}</span></div>
          <div class="ai-rich-row"><span class="ai-rich-key">Suggestions:</span> <span class="ai-rich-val bold-val">${data.efficiency.suggestions}</span></div>
        </div>
      </div>
    `;
  } else {
    contentHtml = `<div class="ai-fb-box"><strong>🤖 Approach & Edge Cases:</strong> ${payload}</div>`;
  }

  return `
    <div class="ai-fb-container" id="ai-fb-container-${lc}">
      <button class="ai-fb-toggle" onclick="AI.toggleFeedback(${lc})">
        <span class="fb-icon">🤖</span> AI Review <span class="fb-arrow">▼</span>
      </button>
      <div class="ai-fb-content" id="ai-fb-content-${lc}" style="display: none;">
        ${contentHtml}
      </div>
    </div>
  `;
}
