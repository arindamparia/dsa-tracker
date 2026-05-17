import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { updateStats } from './stats.js';
import { applyFilters, applyFiltersToSection } from './filters.js';
import { animate, stagger } from './motion.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

const TITLE_WIDTHS = [140, 180, 110, 160, 130, 170, 120];

export function renderSkeletonSections(count = 7) {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const isOpen = i < 2;
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
  _companyCountMap = null;
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

    const cpaBtnHtml = window.CPAlgorithms?.hasLinks(sec.section)
      ? `<button class="cpa-btn" data-section="${escapeHtml(sec.section)}"
           onclick="event.stopPropagation();CPAlgorithms.openPopover(this)"
           title="Reference: cp-algorithms.com" aria-label="Open cp-algorithms.com reference">⚡</button>`
      : '';

    el.innerHTML = `
      <div class="section-sticky">
        <div class="section-header" onclick="toggleSection(${si})" onmouseenter="preloadSection(${si})">
          <span class="section-num">${String(si + 1).padStart(2, '0')}</span>
          <span class="section-title">${sec.section}</span>
          <div class="section-meta">
            <span class="section-count" id="sc-${si}">${done}/${total}</span>
            <div class="section-progress-mini"><div class="section-progress-mini-fill" id="sp-${si}" style="width:${pct}%"></div></div>
            ${cpaBtnHtml}
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
  if (q.solved_at) {
    const today = new Date().toDateString();
    if (new Date(q.solved_at).toDateString() === today) tr.classList.add('solved-today');
  }

  const tags     = Array.isArray(q.tags) ? q.tags : [];
  const tagHtml  = tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');

  const COMPANY_VISIBLE = 4;
  const companiesRaw = Array.isArray(q.companies_asked) ? q.companies_asked : [];
  const companyCountMap = getCompanyCountMap();
  const companies = [...companiesRaw].sort((a, b) => (companyCountMap.get(b) || 0) - (companyCountMap.get(a) || 0));
  let companyHtml = '';
  if (companies.length > 0) {
    const visible = companies.slice(0, COMPANY_VISIBLE);
    const hidden  = companies.slice(COMPANY_VISIBLE);
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

  const safeName       = escapeHtml(q.name);
  const safeTopic      = escapeHtml(q.topic);
  const safeDifficulty = escapeHtml(q.difficulty);
  const safeUrl = (q.url || '').match(/^https?:\/\//) ? escapeHtml(q.url) : '#';
  
  let pName = 'LeetCode';
  if (q.url) {
    const u = q.url.toLowerCase();
    if (u.includes('codeforces')) pName = 'Codeforces';
    else if (u.includes('atcoder')) pName = 'AtCoder';
    else if (u.includes('cses')) pName = 'CSES';
    else if (u.includes('geeksforgeeks')) pName = 'GeeksforGeeks';
    else if (u.includes('spoj')) pName = 'SPOJ';
    else if (u.includes('hackerrank')) pName = 'HackerRank';
    else if (u.includes('hackerearth')) pName = 'HackerEarth';
    else if (u.includes('codewars')) pName = 'Codewars';
    else if (u.includes('exercism')) pName = 'Exercism';
    else if (u.includes('codingame')) pName = 'CodinGame';
    else if (u.includes('projecteuler')) pName = 'Project Euler';
    else if (u.includes('codechef')) pName = 'CodeChef';
    else if (u.includes('codingninjas') || u.includes('naukri.com/code360')) pName = 'CodingNinjas';
  }

  const pSlug = pName.toLowerCase().replace(/\s+/g, '');
  const platformHtml = `<span class="platform-tag ${escapeHtml(pSlug)}">${escapeHtml(pName)}</span>`;

  tr.innerHTML = `
    <td class="check-cell">
      <div class="custom-check ${q.is_done ? 'checked' : ''}" id="chk-${q.lc_number}"
           onclick="toggleCheck(${q.lc_number}, ${si})" title="Mark complete"></div>
    </td>
    <td class="prob-name">
      <span class="review-star ${q.needs_review ? 'active' : ''}" onclick="toggleReview(${q.lc_number}, this)" title="Needs Review">★</span>
      <a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block">${safeName}</a>${todayBadge}
      <span class="topic-tag">${safeTopic}</span> ${platformHtml}
      <button class="similar-btn" id="sim-btn-${q.lc_number}" onclick="SimilarProblems.toggle(${q.lc_number})" title="Find similar unsolved problems">Similar →</button>
      <button class="ai-btn ai-hint-btn" id="ai-hint-btn-${q.lc_number}" onclick="AI.getHint(${q.lc_number})" title="Get a small hint">💡 Hint</button>
      ${tagHtml ? `<span class="tag-pills-wrap"><br>${tagHtml}</span>` : ''}
      ${companyHtml ? `<br>${companyHtml}` : ''}
    </td>
    <td class="diff-cell"><span class="diff-badge ${q.difficulty.toLowerCase()}">${safeDifficulty}</span></td>
    <td class="sol-cell">
      <div class="sol-cell-wrap">
        <div class="sol-actions-row">
          <button class="ai-btn ai-analyze-btn" id="ai-analyze-btn-${q.lc_number}" onclick="AI.analyze(${q.lc_number})" title="Analyze Complexity &amp; Quality">🤖 Analyze Code</button>
          ${q.difficulty === 'Hard' ? `<div style="display:flex;align-items:center;gap:4px;margin-left:auto;">
            <select id="ghost-lang-${q.lc_number}" class="form-select" style="padding:4px 8px;font-size:11px;min-height:26px;border-color:rgba(124,106,247,0.3);width:auto;">
              <option value="C++" selected>C++</option>
              <option value="Java">Java</option>
            </select>
            <button class="ai-btn" style="background:rgba(124,106,247,0.1);border-color:rgba(124,106,247,0.4);color:#c4baff;" onclick="GhostEngine.summon(${q.lc_number}, '${(q.name || '').replace(/'/g, "\\'")}', document.getElementById('ghost-lang-${q.lc_number}').value, '${pName.replace(/'/g, "\\'")}', '${q.difficulty}')" title="Watch AI Ghost solve it">👻 Summon Ghost</button>
          </div>` : ''}
        </div>
        <div style="position: relative;">
          <button class="expand-btn" onclick="SolutionModal.open(${q.lc_number})" title="View / Edit in Full Screen">⤢</button>
          <textarea class="sol-box ${solRaw ? 'has-content' : ''}"
            placeholder="Paste or write solution code..."
            data-lc="${q.lc_number}"
            oninput="debounceSave(${q.lc_number}, this)"
          >${solRaw}</textarea>
        </div>
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

function getStickyOffset() {
  const ctrl = document.querySelector('.controls');
  if (ctrl && window.innerWidth <= 768) return ctrl.offsetHeight;
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--controls-h')) || 126;
}

// Custom smooth scroll: ease-out cubic, completes in ~200ms.
// When Lenis is active we delegate to it — running two competing rAF scroll loops causes jitter.
// Falls back to our own rAF loop before Lenis loads or on lite tier (where Lenis isn't started).
function smoothScrollTo(target, offset = 0) {
  if (window.__lenis) {
    const targetY = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + offset;
    const dist = Math.abs(targetY - window.scrollY);
    const dur = Math.min(Math.max(dist * 0.0003, 0.12), 0.26);
    window.__lenis.scrollTo(target, {
      offset: offset,
      duration: dur,
      easing: t => 1 - Math.pow(1 - t, 3),
    });
    return;
  }
  const startY = window.scrollY;
  const targetY = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + offset;
  const dist   = targetY - startY;
  if (Math.abs(dist) < 2) return;
  const duration = Math.min(Math.max(Math.abs(dist) * 0.3, 120), 260);
  const startTime = performance.now();
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const p = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + dist * easeOutCubic(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function toggleSection(si) {
  const clicked = document.getElementById(`sec-${si}`);
  const isNowCollapsed = clicked.classList.contains('collapsed');
  const isLite = window.__perfTier === 'lite';

  const header = clicked.querySelector('.section-header');
  if (header) {
    header.classList.add('no-hover-temp');
    setTimeout(() => header.classList.remove('no-hover-temp'), 1000);
  }

  if (isNowCollapsed) {
    // ── Opening a Section ──
    if (isLite) {
      document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));
      clicked.classList.remove('collapsed');
      renderSection(si);
      const controlsH = getStickyOffset();
      const y = clicked.getBoundingClientRect().top + window.scrollY - controlsH;
      window.scrollTo({ top: y, behavior: 'instant' });
    } else {
      const controlsH = getStickyOffset();
      const initialTop = clicked.getBoundingClientRect().top;
      
      // Suspend Lenis and force native instant scroll for our rAF loop
      if (window.__lenis) window.__lenis.stop();
      const htmlStyle = document.documentElement.style;
      const oldBehavior = htmlStyle.scrollBehavior;
      htmlStyle.scrollBehavior = 'auto';
      
      // Trigger collapse of other sections and expansion of target
      document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));
      clicked.classList.remove('collapsed');
      renderSection(si);
      
      // ====================================================================================
      // 🚨 CRITICAL: ACTIVE VISUAL TRACKING ALGORITHM (DO NOT MODIFY) 🚨
      // ====================================================================================
      // This logic mathematically tethers the viewport to the element during the 0.38s CSS
      // grid transition. Because the section *above* this one is collapsing, the target 
      // element's physical Y coordinate is violently shifting on every frame. 
      // Do NOT replace this with window.scrollTo, scrollIntoView, or Lenis, as they will 
      // fail due to the massive asynchronous layout shifts and scroll anchoring behaviors.
      // ====================================================================================
      
      const duration = 400; // slightly longer than the 0.38s CSS transition
      const startTime = performance.now();
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
      
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const p = easeOutCubic(progress);
        
        // Target where the header SHOULD be on screen right now
        const targetScreenY = initialTop + (controlsH - initialTop) * p;
        
        // Where the header ACTUALLY is (affected by CSS grid collapse above it)
        const currentActualY = clicked.getBoundingClientRect().top;
        
        // Instantly counter-scroll the viewport to correct any drift caused by the layout shift
        const diff = currentActualY - targetScreenY;
        if (Math.abs(diff) > 0.5) {
          window.scrollBy(0, diff);
        }
        
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Restore smooth scroll engine
          htmlStyle.scrollBehavior = oldBehavior;
          if (window.__lenis) window.__lenis.start();
        }
      };
      requestAnimationFrame(step);
      // ====================================================================================
      // 🚨 END OF ACTIVE VISUAL TRACKING 🚨
      // ====================================================================================
    }
  } else {
    // ── Closing a Section ──
    document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));
    // Do not scroll. Let Chrome's native scroll anchoring handle the document shrinking.
  }
}

export function preloadSection(si) {
  if (window.MockInterview?.isActive()) return;
  const tbody = document.getElementById(`tbody-${si}`);
  if (!tbody || tbody.dataset.loaded !== 'false') return;

  tbody.dataset.loaded = 'loading';
  setTimeout(() => { doRender(si, tbody); }, 10);
}

export function renderSection(si, sync = false) {
  const tbody = document.getElementById(`tbody-${si}`);
  if (!tbody) return;
  if (sync  && tbody.dataset.loaded === 'true')  return;
  if (!sync && tbody.dataset.loaded !== 'false') return;

  tbody.dataset.loaded = 'loading';

  if (sync) {
     doRender(si, tbody, true);
     return;
  }

  // Lite + standard: skip skeletons + 40ms delay — expand and render immediately
  // (standard keeps row stagger in _afterRender; lite skips it too)
  if (window.__perfTier === 'lite' || window.__perfTier === 'standard') {
    doRender(si, tbody);
    return;
  }

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

  setTimeout(() => {
    smoothTransition(() => doRender(si, tbody));
  }, 40);
}

function _afterRender(si, tbody, skipStagger) {
  if (window.MockInterview?.isActive()) {
    tbody.querySelectorAll('.ai-hint-btn, .ai-analyze-btn').forEach(b => {
      b.disabled = true;
      b.title = 'AI disabled during mock interview';
    });
    window.MockInterview._markInterviewRows();
  }
  applyFiltersToSection(si);

  if (!skipStagger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      && window.__perfTier !== 'lite') {
    const rows = tbody.querySelectorAll('tr:not(.filtered-out)');
    if (rows.length > 0 && rows.length <= 40) {
      animate(rows, { opacity: [0, 1], y: [12, 0] }, { duration: 0.3, easing: 'ease-out', delay: stagger(0.03) });
    }
  }
}

function doRender(si, tbody, skipStagger = false) {
  const sections = groupBySections(state.questions);
  const sec = sections[si];
  if (!sec) return;

  const qs = sec.questions;
  const batchSize = window.__perfTier === 'lite' ? 8
                  : window.__perfTier === 'standard' ? 20 : 40;

  // Bump generation so any in-flight rIC callbacks from a previous render bail out
  const gen = (tbody._renderGen = (tbody._renderGen || 0) + 1);

  // Small sections or forced-sync: build everything at once (fast path)
  if (skipStagger || qs.length <= batchSize) {
    const frag = document.createDocumentFragment();
    qs.forEach(q => frag.appendChild(buildRow(q, si)));
    tbody.innerHTML = '';
    tbody.appendChild(frag);
    tbody.dataset.loaded = 'true';
    _afterRender(si, tbody, skipStagger);
    return;
  }

  // Large sections: first batch synchronously (so View Transition has rows immediately),
  // remaining batches via requestIdleCallback to avoid blocking the main thread.
  tbody.innerHTML = '';
  let i = 0;

  const firstFrag = document.createDocumentFragment();
  while (i < qs.length && i < batchSize) {
    firstFrag.appendChild(buildRow(qs[i++], si));
  }
  tbody.appendChild(firstFrag);

  const renderBatch = (deadline) => {
    if (tbody._renderGen !== gen) return; // cancelled by a newer sync render
    const frag = document.createDocumentFragment();
    while (i < qs.length && (deadline.timeRemaining() > 4 || deadline.didTimeout)) {
      frag.appendChild(buildRow(qs[i++], si));
    }
    tbody.appendChild(frag);
    if (i < qs.length) {
      requestIdleCallback(renderBatch, { timeout: 500 });
    } else {
      tbody.dataset.loaded = 'true';
      _afterRender(si, tbody, skipStagger);
    }
  };

  requestIdleCallback(renderBatch, { timeout: 300 });
}

document.addEventListener('force-render-section', (e) => {
  renderSection(e.detail, true);
});

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
    : `<div class="ai-fb-box"><strong>🤖 Approach &amp; Edge Cases:</strong> ${payload}</div>`;

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
