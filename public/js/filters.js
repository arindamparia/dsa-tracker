import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { animate } from './motion.js';

export function buildSearchIndex() {
  state.searchIndex = new Map(
    state.questions.map(q => [
      q.lc_number,
      `${q.name} ${q.lc_number} ${q.topic} ${(q.tags || []).join(' ')} ${(q.companies_asked || []).join(' ')}`.toLowerCase()
    ])
  );
}

function getSearchHaystack(q) {
  return state.searchIndex?.get(q.lc_number) ??
    `${q.name} ${q.lc_number} ${q.topic} ${(q.tags || []).join(' ')} ${(q.companies_asked || []).join(' ')}`.toLowerCase();
}

export function applyFiltersToSection(si) {
  const search   = document.getElementById('search')?.value.toLowerCase().trim() || '';
  const sections = groupBySections(state.questions);
  const sec      = sections[si];
  if (!sec) return;

  const isFiltered = search || state.diffFilter !== 'all' || state.statusFilter !== 'all' || state.companyFilter !== null;
  let visibleCount = 0;
  const total = sec.questions.length;

  sec.questions.forEach(q => {
    let show = true;
    if (state.diffFilter !== 'all' && q.difficulty !== state.diffFilter) show = false;
    if (state.statusFilter === 'done'   && !q.is_done)      show = false;
    if (state.statusFilter === 'undone' &&  q.is_done)      show = false;
    if (state.statusFilter === 'review' && !q.needs_review) show = false;
    if (state.companyFilter !== null) {
      if (!(q.companies_asked || []).includes(state.companyFilter)) show = false;
    }
    if (search && !getSearchHaystack(q).includes(search)) show = false;

    if (show) visibleCount++;
    const tr = document.getElementById(`row-${q.lc_number}`);
    if (tr) tr.classList.toggle('filtered-out', !show);
  });

  const scEl = document.getElementById(`sc-${si}`);
  if (scEl) {
    if (isFiltered) {
      scEl.textContent = `${visibleCount}/${total}`;
      scEl.classList.toggle('sc-filtered', visibleCount > 0);
      scEl.classList.toggle('sc-empty',    visibleCount === 0);
    } else {
      const doneCnt = sec.questions.filter(q => q.is_done).length;
      scEl.textContent = `${doneCnt}/${total}`;
      scEl.classList.remove('sc-filtered', 'sc-empty');
    }
  }
}

export function setDiffFilter(f, btn) {
  smoothTransition(() => {
    if (btn.classList.contains('active') && f !== 'all') {
      f = 'all';
      btn = document.querySelector('[data-group="diff"][data-filter="all"]');
    }
    state.diffFilter = f;
    document.querySelectorAll('[data-group="diff"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    animate(btn, { scale: [0.9, 1] }, { type: "spring", stiffness: 500, damping: 18 });
    applyFilters();
  });
}

export function setStatusFilter(f, btn) {
  smoothTransition(() => {
    if (btn.classList.contains('active') && f !== 'all') {
      f = 'all';
      btn = document.querySelector('[data-group="status"][data-filter="all"]');
    }
    state.statusFilter = f;
    document.querySelectorAll('[data-group="status"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    animate(btn, { scale: [0.9, 1] }, { type: "spring", stiffness: 500, damping: 18 });
    applyFilters();
  });
}

export function clearSearch() {
  const el = document.getElementById('search');
  el.value = '';
  applyFilters();
  el.focus({ preventScroll: true });
}
window.clearSearch = clearSearch;

export function applyFilters(options = {}) {
  const preserveOpen = options.preserveOpen || false;
  const search     = document.getElementById('search').value.toLowerCase().trim();
  document.getElementById('search-clear-btn')?.classList.toggle('hidden', !search);
  const sections   = groupBySections(state.questions);
  const isFiltered = search || state.diffFilter !== 'all' || state.statusFilter !== 'all' || state.companyFilter !== null;

  if (!preserveOpen) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));
  }

  let firstVisibleSec = null;

  sections.forEach((sec, si) => {
    let anyVisible = false;
    let visibleCount = 0;
    const total = sec.questions.length;

    sec.questions.forEach(q => {
      let show = true;

      if (state.diffFilter !== 'all' && q.difficulty !== state.diffFilter) show = false;
      if (state.statusFilter === 'done'   && !q.is_done) show = false;
      if (state.statusFilter === 'undone' &&  q.is_done) show = false;
      if (state.statusFilter === 'review' && !q.needs_review) show = false;
      if (state.companyFilter !== null) {
        if (!(q.companies_asked || []).includes(state.companyFilter)) show = false;
      }
      if (search && !getSearchHaystack(q).includes(search)) show = false;

      if (show) { anyVisible = true; visibleCount++; }

      const tr = document.getElementById(`row-${q.lc_number}`);
      if (tr) {
        tr.classList.toggle('filtered-out', !show);
      }
    });

    const scEl = document.getElementById(`sc-${si}`);
    if (scEl) {
      if (isFiltered) {
        scEl.textContent = `${visibleCount}/${total}`;
        scEl.classList.toggle('sc-filtered', visibleCount > 0);
        scEl.classList.toggle('sc-empty', visibleCount === 0);
      } else {
        const doneCnt = sec.questions.filter(q => q.is_done).length;
        scEl.textContent = `${doneCnt}/${total}`;
        scEl.classList.remove('sc-filtered', 'sc-empty');
      }
    }

    if (isFiltered && anyVisible) {
      const tbody = document.getElementById(`tbody-${si}`);
      if (tbody && tbody.dataset.loaded === 'false') {
         document.dispatchEvent(new CustomEvent('force-render-section', { detail: si }));
      }
    }

    const secEl = document.getElementById(`sec-${si}`);
    if (secEl) secEl.classList.toggle('section-no-match', isFiltered && !anyVisible);

    if (!preserveOpen && isFiltered && anyVisible && firstVisibleSec === null) {
      if (secEl) secEl.classList.remove('collapsed');
      firstVisibleSec = si;
    }
  });

  if (window.MockInterview?.isActive()) {
    window.MockInterview._applyFilter();
  }
}


export function pickRandom() {
  const unsolved = state.questions.filter(q => !q.is_done);
  if (unsolved.length === 0) {
    if (window.showToast) window.showToast('You have solved everything! 🎉', 'success');
    return;
  }
  window.SmartQueue?.advancePick();
  const choice = window.SmartQueue?.recommend(1)[0]
    ?? unsolved[Math.floor(Math.random() * unsolved.length)];

  const sections = groupBySections(state.questions);
  const si = sections.findIndex(sec =>
    sec.section === choice.section && sec.section_order === choice.section_order
  );

  document.getElementById('search').value = '';
  document.getElementById('search-clear-btn')?.classList.add('hidden');
  state.diffFilter   = 'all';
  state.statusFilter = 'all';
  state.companyFilter = null;
  document.querySelectorAll('[data-group="diff"]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-group="status"]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-group="diff"][data-filter="all"]')?.classList.add('active');
  document.querySelector('[data-group="status"][data-filter="all"]')?.classList.add('active');
  const cfLabel = document.getElementById('company-filter-label');
  if (cfLabel) cfLabel.textContent = '🏢 Company';
  document.getElementById('company-filter-btn')?.classList.remove('active');
  document.getElementById('company-clear-btn')?.classList.add('hidden');

  smoothTransition(() => {
    applyFilters();
    if (si === -1) return;

    const secEl = document.getElementById(`sec-${si}`);
    if (!secEl) return;

    secEl.classList.remove('collapsed');

    const tbody = document.getElementById(`tbody-${si}`);
    if (tbody && tbody.dataset.loaded === 'false') {
      document.dispatchEvent(new CustomEvent('force-render-section', { detail: si }));
    }

    requestAnimationFrame(() => {
      const tr = document.getElementById(`row-${choice.lc_number}`);
      if (!tr) return;

      tr.style.backgroundColor = 'rgba(124,106,247,0.2)';
      setTimeout(() => tr.style.backgroundColor = '', 7000);

      setTimeout(() => {
        tr.scrollIntoView({ behavior: 'smooth', block: 'center' });

        document.getElementById('random-pointer')?.remove();
        const pointer = document.createElement('div');
        pointer.id = 'random-pointer';
        pointer.style.cssText = `
          position: fixed;
          left: 14px;
          transform: translateY(-50%) scale(0.85);
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(12,12,22,0.92);
          border: 1px solid rgba(124,106,247,0.5);
          border-radius: 10px;
          padding: 6px 12px 6px 8px;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: rgba(200,180,255,0.95);
          box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(124,106,247,0.3);
          pointer-events: none;
          z-index: 999999;
          white-space: nowrap;
          animation: fadeInOut 6s ease forwards;
        `;
        pointer.innerHTML = `
          <span style="font-size:18px;animation:bouncePoint 0.55s ease-in-out infinite;">👉</span>
          <span>Solve this!</span>
        `;
        document.body.appendChild(pointer);

        let tracking = true;
        function updatePointerPosition() {
          if (!tracking) return;
          const rect = tr.getBoundingClientRect();
          pointer.style.top = (rect.top + rect.height / 2) + 'px';
          requestAnimationFrame(updatePointerPosition);
        }
        requestAnimationFrame(updatePointerPosition);

        setTimeout(() => { tracking = false; pointer.remove(); }, 6000);
      }, 350);
    });
  });
}
