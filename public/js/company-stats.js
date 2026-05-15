/** Company readiness panel — per-company progress grid. */
import { state } from './state.js';

// Weighted score: Hard=3pts, Medium=2pts, Easy=1pt
function readinessScore(qs) {
  const weights = { Easy: 1, Medium: 2, Hard: 3 };
  let total = 0, done = 0;
  qs.forEach(q => {
    const w = weights[q.difficulty] || 1;
    total += w;
    if (q.is_done) done += w;
  });
  return total ? Math.round((done / total) * 100) : 0;
}

function readinessLabel(score) {
  if (score >= 80) return { text: 'Interview Ready', cls: 'rs-ready' };
  if (score >= 55) return { text: 'On Track', cls: 'rs-track' };
  if (score >= 30) return { text: 'Needs Work', cls: 'rs-needs' };
  return { text: 'Just Starting', cls: 'rs-start' };
}

function buildCompanyStats() {
  const map = new Map();
  state.questions.forEach(q => {
    (q.companies_asked || []).forEach(c => {
      if (!map.has(c)) map.set(c, { total: 0, done: 0, qs: [] });
      const e = map.get(c);
      e.total++;
      if (q.is_done) e.done++;
      e.qs.push(q);
    });
  });
  // Sort by total count desc — product companies naturally bubble to top
  return [...map.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, s]) => ({
      name, total: s.total, done: s.done,
      score: readinessScore(s.qs),
      label: readinessLabel(readinessScore(s.qs))
    }));
}

const PAGE = 20;

function buildCardHTML(c) {
  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  const color = pct >= 80 ? 'var(--easy)' : pct >= 50 ? 'var(--medium)' : 'var(--hard)';
  const isActive = window.state?.companyFilter === c.name;
  const safeName = c.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeLabel = c.label.text.replace(/'/g, "\\'");
  return `
    <div class="cs-card${isActive ? ' active' : ''}"
         onclick="CompanyFilter.confirmReadiness('${safeName}', ${c.done}, ${c.total}, '${safeLabel}')"
         title="${c.name}: ${c.done}/${c.total} solved · Readiness ${c.score}%">
      <div class="cs-card-name">${c.name}</div>
      <div class="cs-pct" style="color:${color}">${pct}%</div>
      <div class="cs-bar-track">
        <div class="cs-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="cs-card-sub">${c.done}/${c.total}</div>
      <div class="cs-readiness ${c.label.cls}">${c.label.text}</div>
    </div>`;
}

export const CompanyStats = {
  _open: false,
  _shown: PAGE,
  _companies: [],

  toggle() {
    this._open = !this._open;
    const body    = document.getElementById('company-stats-body');
    const chevron = document.getElementById('company-stats-chevron');
    if (!body) return;
    body.classList.toggle('open', this._open);
    if (chevron) chevron.classList.toggle('rotated', this._open);
    if (this._open) this.render();
  },

  render() {
    const body = document.getElementById('company-stats-body');
    if (!body) return;
    this._companies = buildCompanyStats();
    this._shown = PAGE;

    const countEl = document.getElementById('company-stats-count');
    if (countEl) countEl.textContent = `${this._companies.length} companies`;

    if (this._companies.length === 0) {
      body.innerHTML = '<div class="cs-empty">No company data yet.</div>';
      return;
    }

    body.innerHTML = '<div class="cs-grid" id="cs-grid"></div><div class="cs-pagination" id="cs-pagination"></div>';
    this._renderPage();
  },

  _renderPage() {
    const grid = document.getElementById('cs-grid');
    const pg   = document.getElementById('cs-pagination');
    if (!grid || !pg) return;

    const slice = this._companies.slice(0, this._shown);
    grid.innerHTML = slice.map(buildCardHTML).join('');

    const total = this._companies.length;
    const remaining = total - this._shown;
    const canShowMore = remaining > 0;
    const canShowLess = this._shown > PAGE;

    if (!canShowMore && !canShowLess) { pg.innerHTML = ''; return; }

    pg.innerHTML = `
      <div class="cs-pg-row">
        ${canShowMore ? `<button class="cs-pg-btn" onclick="CompanyStats.showMore()">Show ${Math.min(remaining, PAGE)} more <span class="cs-pg-hint">(${remaining} left)</span></button>` : ''}
        ${canShowLess ? `<button class="cs-pg-btn cs-pg-less" onclick="CompanyStats.showLess()">Show less</button>` : ''}
      </div>`;
  },

  showMore() {
    this._shown = Math.min(this._shown + PAGE, this._companies.length);
    this._renderPage();
  },

  showLess() {
    this._shown = PAGE;
    this._renderPage();
    document.getElementById('cs-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  refreshIfOpen() {
    if (this._open) this.render();
  },
};
