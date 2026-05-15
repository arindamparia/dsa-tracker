/** Reset all progress (checkboxes + solutions) across all questions. */
import { state } from './state.js';
import { render } from './render.js';
import { showToast } from './toast.js';
import { handleError } from './errors.js';
import { smoothTransition, lockScroll, unlockScroll } from './utils.js';

export const ResetModal = {
  open() {
    const input = document.getElementById('reset-confirm-input');
    const btn   = document.getElementById('reset-confirm-btn');
    if (input) input.value = '';
    if (btn)   btn.disabled = true;
    lockScroll();
    document.getElementById('reset-modal').classList.add('open');
    setTimeout(() => input?.focus({ preventScroll: true }), 50);
  },

  close() {
    document.getElementById('reset-modal').classList.remove('open');
    unlockScroll();
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('reset-modal')) this.close();
  },

  onType(val) {
    const btn = document.getElementById('reset-confirm-btn');
    if (btn) btn.disabled = val !== 'RESET';
  },

  async confirm() {
    // Hide modal directly
    this.close();
    
    // Optimistically clear UI after modal closes
    setTimeout(() => {
      state.questions.forEach(q => { q.is_done = false; q.solution = ''; q.notes = ''; });
      smoothTransition(() => render());
    }, 250);

    // Persist each reset in parallel
    const promises = state.questions.map(q =>
      fetch('/.netlify/functions/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lc_number: q.lc_number, is_done: false, solution: '', notes: '' }),
      })
    );
    
    showToast('Resetting progress...', 'info');
    const results = await Promise.allSettled(promises);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      handleError(new Error('partial'), `Reset incomplete — ${failed} item${failed > 1 ? 's' : ''} couldn't be saved. Please try again.`);
    } else {
      showToast('Progress reset ✓', 'success');
    }
  }
};
