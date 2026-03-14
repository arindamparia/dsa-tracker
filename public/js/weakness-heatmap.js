/**
 * WeaknessHeatmap — section × difficulty grid.
 * Cell color intensity = unsolved / total (more red = more work needed).
 * Clicking a cell filters to that section + difficulty.
 */
import { state } from './state.js';
import { groupBySections } from './utils.js';

function buildHeatmapData() {
  const sections = groupBySections(state.questions);
  return sections.map(sec => {
    const counts = { Easy: { total: 0, done: 0 }, Medium: { total: 0, done: 0 }, Hard: { total: 0, done: 0 } };
    sec.questions.forEach(q => {
      if (!counts[q.difficulty]) return;
      counts[q.difficulty].total++;
      if (q.is_done) counts[q.difficulty].done++;
    });
    const total = sec.questions.length;
    const done  = sec.questions.filter(q => q.is_done).length;
    return { name: sec.section, total, done, counts };
  });
}

// Returns a CSS color based on solved fraction (0=red, 1=green)
function heatColor(done, total) {
  if (total === 0) return 'var(--surface3)';
  const pct = done / total;
  if (pct >= 0.9) return 'rgba(6,214,160,0.45)';
  if (pct >= 0.7) return 'rgba(6,214,160,0.22)';
  if (pct >= 0.5) return 'rgba(248,181,0,0.25)';
  if (pct >= 0.25) return 'rgba(255,100,50,0.28)';
  return 'rgba(255,71,87,0.30)';
}

function textColor(done, total) {
  if (total === 0) return 'var(--text-muted)';
  const pct = done / total;
  if (pct >= 0.7) return 'var(--easy)';
  if (pct >= 0.5) return 'var(--medium)';
  return 'var(--hard)';
}

function renderHeatmap() {
  const el = document.getElementById('heatmap-body');
  if (!el) return;
  const data = buildHeatmapData();
  const diffs = ['Easy', 'Medium', 'Hard'];

  el.innerHTML = `
    <div class="hm-grid">
      <div class="hm-row hm-header">
        <div class="hm-section-col"></div>
        ${diffs.map(d => `<div class="hm-diff-head hm-diff-${d.toLowerCase()}">${d}</div>`).join('')}
        <div class="hm-diff-head">Total</div>
      </div>
      ${data.map(sec => `
        <div class="hm-row">
          <div class="hm-section-col" title="${sec.name}">${sec.name}</div>
          ${diffs.map(d => {
            const c = sec.counts[d];
            const pct = c.total ? Math.round((c.done / c.total) * 100) : null;
            const safeSec = sec.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return `
              <div class="hm-cell ${c.total === 0 ? 'hm-empty' : ''}"
                   style="background:${heatColor(c.done, c.total)}"
                   onclick="WeaknessHeatmap.drillDown('${safeSec}','${d}')"
                   title="${sec.name} · ${d}: ${c.done}/${c.total} solved${c.total ? ' (' + pct + '%)' : ''}">
                ${c.total === 0
                  ? '<span class="hm-none">—</span>'
                  : `<span class="hm-num" style="color:${textColor(c.done, c.total)}">${pct}%</span>
                     <span class="hm-sub">${c.done}/${c.total}</span>`}
              </div>`;
          }).join('')}
          <div class="hm-cell hm-total-cell">
            <span class="hm-num" style="color:${textColor(sec.done, sec.total)}">${sec.total ? Math.round((sec.done/sec.total)*100) : 0}%</span>
            <span class="hm-sub">${sec.done}/${sec.total}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="hm-legend">
      <span class="hm-leg-item" style="background:rgba(255,71,87,0.30)">0–25%</span>
      <span class="hm-leg-item" style="background:rgba(255,100,50,0.28)">25–50%</span>
      <span class="hm-leg-item" style="background:rgba(248,181,0,0.25)">50–70%</span>
      <span class="hm-leg-item" style="background:rgba(6,214,160,0.22)">70–90%</span>
      <span class="hm-leg-item" style="background:rgba(6,214,160,0.45)">90–100%</span>
    </div>
  `;
}

export const WeaknessHeatmap = {
  open() {
    renderHeatmap();
    document.getElementById('heatmap-modal').classList.add('open');
  },

  close() {
    document.getElementById('heatmap-modal').classList.remove('open');
  },

  handleOverlay(e) {
    if (e.target === document.getElementById('heatmap-modal')) this.close();
  },

  drillDown(sectionName, difficulty) {
    this.close();

    // Set focus-type-select to 'unsolved' (heatmap weakness = unsolved problems)
    const focusSel = document.getElementById('focus-type-select');
    if (focusSel) focusSel.value = 'unsolved';

    // Pre-set the difficulty filter so focus session only shows that difficulty
    state.diffFilter = difficulty;
    document.querySelectorAll('[data-group="diff"]').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === difficulty));

    // Force-render the target section if not yet lazy-loaded
    const sections = groupBySections(state.questions);
    const si = sections.findIndex(s => s.section === sectionName);
    if (si !== -1) {
      const tbody = document.getElementById(`tbody-${si}`);
      if (tbody && tbody.dataset.loaded === 'false') {
        document.dispatchEvent(new CustomEvent('force-render-section', { detail: si }));
      }
    }

    // Start the full focus session (handles bar, stopwatch, section filter)
    window.FocusMode?.start(sectionName);

    // Apply diff filter on top so only chosen difficulty rows are visible
    import('./filters.js').then(({ applyFilters }) => {
      applyFilters({ preserveOpen: true });
    });
  },
};

window.WeaknessHeatmap = WeaknessHeatmap;
