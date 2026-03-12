/** Difficulty / status / search filters. */
import { state } from './state.js';
import { groupBySections } from './utils.js';

export function setDiffFilter(f, btn) {
  state.diffFilter = f;
  document.querySelectorAll('[data-group="diff"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

export function setStatusFilter(f, btn) {
  state.statusFilter = f;
  document.querySelectorAll('[data-group="status"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

export function applyFilters() {
  const search     = document.getElementById('search').value.toLowerCase().trim();
  const sections   = groupBySections(state.questions);
  const isFiltered = search || state.diffFilter !== 'all' || state.statusFilter !== 'all';

  sections.forEach((sec, si) => {
    let anyVisible = false;
    sec.questions.forEach(q => {
      const tr = document.getElementById(`row-${q.lc_number}`);
      if (!tr) return;
      let show = true;

      if (state.diffFilter !== 'all' && q.difficulty !== state.diffFilter) show = false;
      if (state.statusFilter === 'done'   && !q.is_done) show = false;
      if (state.statusFilter === 'undone' &&  q.is_done) show = false;
      if (search) {
        const haystack = `${q.name} ${q.lc_number} ${q.topic} ${(q.tags || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) show = false;
      }

      tr.classList.toggle('filtered-out', !show);
      if (show) anyVisible = true;
    });

    const secEl = document.getElementById(`sec-${si}`);
    if (secEl && isFiltered) secEl.classList.toggle('collapsed', !anyVisible);
  });
}

export function pickRandom() {
  const unsolved = state.questions.filter(q => !q.is_done);
  if (unsolved.length === 0) {
    if (window.showToast) window.showToast('You have solved everything! 🎉', 'success');
    return;
  }
  const choice = unsolved[Math.floor(Math.random() * unsolved.length)];
  
  // Clear search and show all to ensure row is visible
  document.getElementById('search').value = '';
  setDiffFilter('all', document.querySelector('.filter-btn[data-group="diff"]'));
  setStatusFilter('all', document.querySelector('.filter-btn[data-group="status"]'));
  
  // Expand section
  const secEl = document.getElementById(`sec-${choice.sectionIndex}`);
  if (secEl) secEl.classList.remove('collapsed');
  
  // Scroll to row and highlight slightly
  const tr = document.getElementById(`row-${choice.lc_number}`);
  if (tr) {
    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tr.style.backgroundColor = 'rgba(124,106,247,0.2)';
    setTimeout(() => tr.style.backgroundColor = '', 1500);
  }
}
