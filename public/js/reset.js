/** Reset all progress (checkboxes + solutions) across all questions. */
import { state } from './state.js';
import { render } from './render.js';
import { showToast } from './toast.js';

export async function confirmClear() {
  if (!confirm('Reset ALL progress (checkboxes + solutions)? Questions remain in DB.')) return;

  // Optimistically clear UI
  state.questions.forEach(q => { q.is_done = false; q.solution = ''; q.notes = ''; });
  render();

  // Persist each reset in parallel
  const promises = state.questions.map(q =>
    fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lc_number: q.lc_number, is_done: false, solution: '', notes: '' }),
    })
  );
  await Promise.allSettled(promises);
  showToast('Progress reset ✓', 'success');
}
