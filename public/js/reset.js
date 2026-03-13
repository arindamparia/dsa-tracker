/** Reset all progress (checkboxes + solutions) across all questions. */
import { state } from './state.js';
import { render } from './render.js';
import { showToast } from './toast.js';

export const ResetModal = {
  open() {
    document.getElementById('reset-modal').classList.add('open');
  },
  
  close() {
    document.getElementById('reset-modal').classList.remove('open');
  },
  
  handleOverlayClick(e) {
    if (e.target === document.getElementById('reset-modal')) this.close();
  },

  async confirm() {
    // Hide modal directly
    this.close();
    
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
    
    showToast('Resetting progress...', 'info');
    await Promise.allSettled(promises);
    showToast('Progress reset ✓', 'success');
  }
};
