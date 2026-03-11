/** DOM construction — sections, rows, section dropdown. */
import { state } from './state.js';
import { groupBySections } from './utils.js';
import { updateStats } from './stats.js';
import { applyFilters } from './filters.js';

export function render() {
  const container = document.getElementById('sections');
  container.innerHTML = '';
  const sections = groupBySections(state.questions);

  sections.forEach((sec, si) => {
    const el = document.createElement('div');
    el.className = 'section';
    el.id = `sec-${si}`;
    const done  = sec.questions.filter(q => q.is_done).length;
    const total = sec.questions.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;

    el.innerHTML = `
      <div class="section-header" onclick="toggleSection(${si})">
        <span class="section-num">${String(si + 1).padStart(2, '0')}</span>
        <span class="section-title">${sec.section}</span>
        <div class="section-meta">
          <span class="section-count" id="sc-${si}">${done}/${total}</span>
          <div class="section-progress-mini"><div class="section-progress-mini-fill" id="sp-${si}" style="width:${pct}%"></div></div>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="section-body">
        <table class="q-table">
          <thead><tr>
            <th class="check-cell">✓</th>
            <th style="width:52px">#</th>
            <th>Problem</th>
            <th style="width:90px">Difficulty</th>
            <th class="sol-cell">Solution</th>
            <th class="notes-cell">Notes</th>
          </tr></thead>
          <tbody id="tbody-${si}"></tbody>
        </table>
      </div>`;
    container.appendChild(el);

    const tbody = document.getElementById(`tbody-${si}`);
    sec.questions.forEach(q => tbody.appendChild(buildRow(q, si)));
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
    <td class="lc-num">${q.lc_number}</td>
    <td class="prob-name">
      <a href="${q.url}" target="_blank" rel="noopener">${q.name}</a>
      <span class="topic-tag">${q.topic}</span>
      ${tagHtml ? `<span class="tag-pills-wrap"><br>${tagHtml}</span>` : ''}
    </td>
    <td><span class="diff-badge ${q.difficulty.toLowerCase()}">${q.difficulty}</span></td>
    <td class="sol-cell">
      <textarea class="sol-box ${solRaw ? 'has-content' : ''}"
        placeholder="// Java solution..."
        data-lc="${q.lc_number}"
        oninput="debounceSave(${q.lc_number}, this)"
      >${solRaw}</textarea>
    </td>
    <td class="notes-cell">
      <textarea class="notes-box ${notesRaw ? 'has-content' : ''}"
        placeholder="Approach, complexity, edge cases..."
        data-lc="${q.lc_number}"
        oninput="debounceNotesSave(${q.lc_number}, this)"
      >${notesRaw}</textarea>
    </td>`;
  return tr;
}

export function toggleSection(si) {
  document.getElementById(`sec-${si}`).classList.toggle('collapsed');
}

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
