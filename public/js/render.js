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

  const tags     = Array.isArray(q.tags) ? q.tags : [];
  const tagHtml  = tags.map(t => `<span class="tag-pill">${t}</span>`).join('');
  const solRaw   = q.solution || '';
  const notesRaw = q.notes    || '';

  tr.innerHTML = `
    <td class="check-cell">
      <div class="custom-check ${q.is_done ? 'checked' : ''}" id="chk-${q.lc_number}"
           onclick="toggleCheck(${q.lc_number}, ${si})" title="Mark complete"></div>
    </td>
    <td class="prob-name">
      <span class="review-star ${q.needs_review ? 'active' : ''}" onclick="toggleReview(${q.lc_number}, this)" title="Needs Review">★</span>
      <a href="${q.url}" target="_blank" rel="noopener" style="display:inline-block">${q.name}</a>
      <span class="topic-tag">${q.topic}</span>
      <button class="similar-btn" id="sim-btn-${q.lc_number}" onclick="SimilarProblems.toggle(${q.lc_number})" title="Find similar unsolved problems">Similar →</button>
      <button class="ai-btn ai-hint-btn" id="ai-hint-btn-${q.lc_number}" onclick="AI.getHint(${q.lc_number})" title="Get a small hint">💡 Hint</button>
      ${tagHtml ? `<span class="tag-pills-wrap"><br>${tagHtml}</span>` : ''}
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
        ${(q.ai_analysis && q.ai_analysis.trim() !== '') ? `
        <div class="ai-fb-container" id="ai-fb-container-${q.lc_number}">
          <button class="ai-fb-toggle" onclick="AI.toggleFeedback(${q.lc_number})">
            <span class="fb-icon">🤖</span> AI Review <span class="fb-arrow">▼</span>
          </button>
          <div class="ai-fb-content" id="ai-fb-content-${q.lc_number}" style="display: none;">
            <div class="ai-fb-box"><strong>🤖 Approach & Edge Cases:</strong> ${q.ai_analysis}</div>
          </div>
        </div>
        ` : ''}
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
  smoothTransition(() => {
    const clicked = document.getElementById(`sec-${si}`);
    const isNowCollapsed = clicked.classList.contains('collapsed');

    // Close all sections first (accordion behaviour)
    document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));

    // If it was collapsed, open it; if it was already open, leave it closed
    if (isNowCollapsed) {
      clicked.classList.remove('collapsed');
      renderSection(si);
    }
  });

  // Scroll into view if opened (accounting for sticky header ~80px)
  if (isNowCollapsed) {
    requestAnimationFrame(() => {
      const clicked = document.getElementById(`sec-${si}`);
      const y = clicked.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
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
    'O(1)', 'O(log n)', 'O(log(m+n))', 'O(n)', 'O(n log n)', 
    'O(n+m)', 'O(V+E)', 'O(n²)', 'O(n³)', 'O(2^n)', 'O(n!)'
  ];
  return opts.map(o => `<option value="${o}" ${selected === o ? 'selected' : ''}>${o}</option>`).join('');
}
