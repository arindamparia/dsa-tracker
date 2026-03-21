import { state } from './state.js';
import { Cache } from './cache.js';
import { showToast } from './toast.js';
import { updateStats } from './stats.js';
import { applyFilters } from './filters.js';
import { FocusMode } from './focus-mode.js';
import { CompanyFilter } from './company-filter.js';
import { SRS } from './spaced-repetition.js';
import { HardCelebration } from './hard-celebration.js';

export async function toggleCheck(lc, _si) {
  const q = state.questions.find(x => x.lc_number === lc);
  if (!q) return;
  const newDone = !q.is_done;
  q.is_done = newDone;
  
  if (newDone) {
    q.solved_at = new Date().toISOString();
  } else {
    q.solved_at = null; // Removed from today metrics
  }

  const chk = document.getElementById(`chk-${lc}`);
  chk.classList.add('saving');
  setTimeout(() => chk.classList.remove('saving'), 600);
  chk.classList.toggle('checked', newDone);
  const rowEl = document.getElementById(`row-${lc}`);
  rowEl.classList.toggle('done-row', newDone);
  // Solved-today badge: add/remove live without re-render
  if (newDone) {
    rowEl.classList.add('solved-today');
    const nameLink = rowEl.querySelector('.prob-name a');
    if (nameLink && !rowEl.querySelector('.today-badge')) {
      const badge = document.createElement('span');
      badge.className = 'today-badge';
      badge.textContent = 'TODAY';
      nameLink.after(badge);
    }
  } else {
    rowEl.classList.remove('solved-today');
    rowEl.querySelector('.today-badge')?.remove();
  }

  if (newDone && q.difficulty === 'Hard') {
    HardCelebration.fire(q.name); // Sets active flag so Daily Goal waits if it also triggers
  }

  updateStats();
  applyFilters({ preserveOpen: true });
  FocusMode._updateCount();
  CompanyFilter._updatePrepCount();
  SRS.render();

  try {
    const res = await fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lc_number: lc, 
        is_done: newDone, 
        solution: q.solution || '', 
        notes: q.notes || '',
        needs_review: q.needs_review || false,
        time_complexity: q.time_complexity || '',
        space_complexity: q.space_complexity || '',
        ai_analysis: q.ai_analysis || '',
        solved_at: q.solved_at || null,
        srs_interval_index: q.srs_interval_index || 0,
        srs_last_reviewed_at: q.srs_last_reviewed_at || null
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { is_done: newDone, solved_at: q.solved_at });
    // Suggest next problem after marking solved
    if (newDone) {
      window.SmartQueue?.onSolved(lc);
      setTimeout(() => window.SmartQueue?.suggestNext(q), 1200);
    }
  } catch (err) {
    showToast('⚠ Save failed: ' + err.message, 'error');
    // rollback
    q.is_done = !newDone;
    chk.classList.toggle('checked', !newDone);
    document.getElementById(`row-${lc}`).classList.toggle('done-row', !newDone);
    updateStats(); applyFilters({ preserveOpen: true });
  }
}

// ── Solution ──────────────────────────────────────────────────────

export function debounceSave(lc, el) {
  const code = el.value.trim();
  el.classList.toggle('has-content', code.length > 0);
  
  if (code.length > 0) {
    const codeHeuristicBase = /[{}[\]();=><+\-*/]/;
    const codeKeywords = /\b(class|public|private|def|return|int|std|vector|string|void|if|for|while|const|let|var|function)\b/;
    if (!(codeHeuristicBase.test(code) && codeKeywords.test(code))) {
      // Show an error and prevent saving, keeping the local value stranded until fixed
      showToast('⚠ Cannot save: Text does not look like valid code.', 'error');
      clearTimeout(state.saveTimers[lc]);
      return;
    }
  }

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
      body: JSON.stringify({ 
        lc_number: lc, 
        is_done: q.is_done || false, 
        solution: value, 
        notes: q.notes || '',
        needs_review: q.needs_review || false,
        time_complexity: q.time_complexity || '',
        space_complexity: q.space_complexity || '',
        ai_analysis: q.ai_analysis || '',
        solved_at: q.solved_at || null,
        srs_interval_index: q.srs_interval_index || 0,
        srs_last_reviewed_at: q.srs_last_reviewed_at || null
      }),
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
      body: JSON.stringify({ 
        lc_number: lc, 
        is_done: q.is_done || false, 
        solution: q.solution || '', 
        notes: value,
        needs_review: q.needs_review || false,
        time_complexity: q.time_complexity || '',
        space_complexity: q.space_complexity || '',
        ai_analysis: q.ai_analysis || '',
        solved_at: q.solved_at || null,
        srs_interval_index: q.srs_interval_index || 0,
        srs_last_reviewed_at: q.srs_last_reviewed_at || null
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { notes: value });
    showToast('Notes saved ✓', 'success');
  } catch (err) {
    showToast('⚠ Save failed: ' + err.message, 'error');
  }
}

// ── Review & Complexity ──────────────────────────────────────────

export async function toggleReview(lc, el) {
  const q = state.questions.find(x => x.lc_number === lc);
  if (!q) return;
  const newReview = !q.needs_review;
  q.needs_review = newReview;
  el.classList.toggle('active', newReview);
  
  try {
    const res = await fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lc_number: lc, 
        is_done: q.is_done || false, 
        solution: q.solution || '', 
        notes: q.notes || '',
        needs_review: newReview,
        time_complexity: q.time_complexity || '',
        space_complexity: q.space_complexity || '',
        ai_analysis: q.ai_analysis || '',
        solved_at: q.solved_at || null,
        srs_interval_index: q.srs_interval_index || 0,
        srs_last_reviewed_at: q.srs_last_reviewed_at || null
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { needs_review: newReview });
  } catch (err) {
    showToast('⚠ Save failed: ' + err.message, 'error');
    q.needs_review = !newReview;
    el.classList.toggle('active', !newReview);
  }
}

export async function saveComplexity(lc) {
  const q = state.questions.find(x => x.lc_number === lc);
  if (!q) return;

  const row = document.getElementById(`row-${lc}`);
  const timeSelect = row.querySelector('.complexity-select[data-type="time"]');
  const spaceSelect = row.querySelector('.complexity-select[data-type="space"]');
  
  const tVal = timeSelect ? timeSelect.value : '';
  const sVal = spaceSelect ? spaceSelect.value : '';

  q.time_complexity = tVal;
  q.space_complexity = sVal;

  try {
    const res = await fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lc_number: lc, 
        is_done: q.is_done || false, 
        solution: q.solution || '', 
        notes: q.notes || '',
        needs_review: q.needs_review || false,
        time_complexity: tVal,
        space_complexity: sVal,
        ai_analysis: q.ai_analysis || '',
        solved_at: q.solved_at || null,
        srs_interval_index: q.srs_interval_index || 0,
        srs_last_reviewed_at: q.srs_last_reviewed_at || null
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    Cache.updateEntry(lc, { time_complexity: tVal, space_complexity: sVal });
    showToast('Complexity saved ✓', 'success');
  } catch (err) {
    showToast('⚠ Complexity save failed: ' + err.message, 'error');
  }
}
