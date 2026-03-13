/** Difficulty / status / search filters. */
import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';

export function setDiffFilter(f, btn) {
  smoothTransition(() => {
    // Clicking an active filter again resets to 'all'
    if (btn.classList.contains('active') && f !== 'all') {
      f = 'all';
      btn = document.querySelector('[data-group="diff"][data-filter="all"]');
    }
    state.diffFilter = f;
    document.querySelectorAll('[data-group="diff"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
}

export function setStatusFilter(f, btn) {
  smoothTransition(() => {
    // Clicking an active filter again resets to 'all'
    if (btn.classList.contains('active') && f !== 'all') {
      f = 'all';
      btn = document.querySelector('[data-group="status"][data-filter="all"]');
    }
    state.statusFilter = f;
    document.querySelectorAll('[data-group="status"]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
}

export function applyFilters(options = {}) {
  const preserveOpen = options.preserveOpen || false;
  const search     = document.getElementById('search').value.toLowerCase().trim();
  const sections   = groupBySections(state.questions);
  const isFiltered = search || state.diffFilter !== 'all' || state.statusFilter !== 'all';

  // Collapse all sections first (accordion rule) unless told to preserve open ones
  if (!preserveOpen) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));
  }

  let firstVisibleSec = null;

  sections.forEach((sec, si) => {
    let anyVisible = false;
    sec.questions.forEach(q => {
      let show = true;

      if (state.diffFilter !== 'all' && q.difficulty !== state.diffFilter) show = false;
      if (state.statusFilter === 'done'   && !q.is_done) show = false;
      if (state.statusFilter === 'undone' &&  q.is_done) show = false;
      if (state.statusFilter === 'review' && !q.needs_review) show = false;
      if (search) {
        const haystack = `${q.name} ${q.lc_number} ${q.topic} ${(q.tags || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) show = false;
      }

      if (show) anyVisible = true;

      const tr = document.getElementById(`row-${q.lc_number}`);
      if (tr) {
        tr.classList.toggle('filtered-out', !show);
      }
    });

    // If section needs to be visible but isn't loaded yet, force it to render synchronously
    if (isFiltered && anyVisible) {
      const tbody = document.getElementById(`tbody-${si}`);
      if (tbody && tbody.dataset.loaded === 'false') {
         document.dispatchEvent(new CustomEvent('force-render-section', { detail: si }));
      }
    }

    // When filtered, auto-expand only the first section with results
    if (!preserveOpen && isFiltered && anyVisible && firstVisibleSec === null) {
      const secEl = document.getElementById(`sec-${si}`);
      if (secEl) secEl.classList.remove('collapsed');
      firstVisibleSec = si;
    }
  });
}


export function pickRandom() {
  const unsolved = state.questions.filter(q => !q.is_done);
  if (unsolved.length === 0) {
    if (window.showToast) window.showToast('You have solved everything! 🎉', 'success');
    return;
  }
  const choice = unsolved[Math.floor(Math.random() * unsolved.length)];

  // Find which section index this question belongs to
  // (groupBySections doesn't attach sectionIndex to questions, so we compute it here)
  const sections = groupBySections(state.questions);
  const si = sections.findIndex(sec =>
    sec.section === choice.section && sec.section_order === choice.section_order
  );

  // Reset filters silently (no intermediate applyFilters calls)
  document.getElementById('search').value = '';
  state.diffFilter   = 'all';
  state.statusFilter = 'all';
  document.querySelectorAll('[data-group="diff"]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-group="status"]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-group="diff"][data-filter="all"]')?.classList.add('active');
  document.querySelector('[data-group="status"][data-filter="all"]')?.classList.add('active');

  // applyFilters collapses all (no filter active) — then immediately open target section
  smoothTransition(() => {
    applyFilters();
    if (si !== -1) {
      const secEl = document.getElementById(`sec-${si}`);
      if (secEl) secEl.classList.remove('collapsed');
    }
  });

  // Wait for section open animation (380ms), then scroll + show pointer
  const tr = document.getElementById(`row-${choice.lc_number}`);
  if (tr) {
    tr.style.backgroundColor = 'rgba(124,106,247,0.2)';

    setTimeout(() => {
      // Scroll instantly so getBoundingClientRect() gives the final settled position
      tr.scrollIntoView({ behavior: 'instant', block: 'center' });

      // Read rect immediately after instant scroll — position is accurate
      const rect = tr.getBoundingClientRect();
      const pointer = document.createElement('div');
      pointer.id = 'random-pointer';

      // Remove any previous pointer
      document.getElementById('random-pointer')?.remove();

      pointer.style.cssText = `
        position: fixed;
        left: 8px;
        top: ${rect.top + rect.height / 2}px;
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
        z-index: 9999;
        white-space: nowrap;
        animation: fadeInOut 3.5s ease forwards;
      `;
      pointer.innerHTML = `
        <span style="font-size:18px;animation:bouncePoint 0.55s ease-in-out infinite;">👉</span>
        <span>Solve this!</span>
      `;
      document.body.appendChild(pointer);
      setTimeout(() => pointer.remove(), 3500);
    }, 420);

    setTimeout(() => tr.style.backgroundColor = '', 3500);
  }
}

