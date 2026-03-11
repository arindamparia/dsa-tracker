/** Checkbox toggling and solution/notes persistence. */
import { state } from './state.js';
import { Cache } from './cache.js';
import { showToast } from './toast.js';
import { updateSectionMeta, updateStats } from './stats.js';
import { applyFilters } from './filters.js';

export async function toggleCheck(lc, si) {
  const q = state.questions.find(x => x.lc_number === lc);
  if (!q) return;
  const newDone = !q.is_done;
  q.is_done = newDone;

  const chk = document.getElementById(`chk-${lc}`);
  chk.classList.add('saving');
  setTimeout(() => chk.classList.remove('saving'), 600);
  chk.classList.toggle('checked', newDone);
  document.getElementById(`row-${lc}`).classList.toggle('done-row', newDone);

  updateSectionMeta(si);
  updateStats();
  applyFilters();

  try {
    const res = await fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lc_number: lc, is_done: newDone, solution: q.solution || '', notes: q.notes || '' }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { is_done: newDone });
  } catch (err) {
    showToast('⚠ Save failed: ' + err.message, 'error');
    // rollback
    q.is_done = !newDone;
    chk.classList.toggle('checked', !newDone);
    document.getElementById(`row-${lc}`).classList.toggle('done-row', !newDone);
    updateSectionMeta(si); updateStats(); applyFilters();
  }
}

// ── Solution ──────────────────────────────────────────────────────

export function debounceSave(lc, el) {
  el.classList.toggle('has-content', el.value.length > 0);
  const q = state.questions.find(x => x.lc_number === lc);
  if (q) q.solution = el.value;
  clearTimeout(state.saveTimers[lc]);
  state.saveTimers[lc] = setTimeout(() => persistSolution(lc, el.value), 800);
  updateStats();
}

export async function persistSolution(lc, value) {
  const q = state.questions.find(x => x.lc_number === lc);
  if (!q) return;
  try {
    const res = await fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lc_number: lc, is_done: q.is_done || false, solution: value, notes: q.notes || '' }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { solution: value });
    showToast('Solution saved ✓', 'success');
  } catch (err) {
    showToast('⚠ Save failed: ' + err.message, 'error');
  }
}

// ── Notes ─────────────────────────────────────────────────────────

export function debounceNotesSave(lc, el) {
  el.classList.toggle('has-content', el.value.length > 0);
  const q = state.questions.find(x => x.lc_number === lc);
  if (q) q.notes = el.value;
  clearTimeout(state.notesTimers[lc]);
  state.notesTimers[lc] = setTimeout(() => persistNotes(lc, el.value), 800);
}

export async function persistNotes(lc, value) {
  const q = state.questions.find(x => x.lc_number === lc);
  if (!q) return;
  try {
    const res = await fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lc_number: lc, is_done: q.is_done || false, solution: q.solution || '', notes: value }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { notes: value });
    showToast('Notes saved ✓', 'success');
  } catch (err) {
    showToast('⚠ Save failed: ' + err.message, 'error');
  }
}
