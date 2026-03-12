import { state } from './state.js';
import { persistSolution } from './progress.js';

let activeLcNumber = null;

export const SolutionModal = {
  open(lcNumber) {
    const q = state.questions.find(x => x.lc_number === lcNumber);
    if (!q) return;

    activeLcNumber = lcNumber;
    
    // Set text and title
    document.getElementById('sol-modal-title').textContent = `Solution: ${q.name}`;
    document.getElementById('sol-modal-sub').textContent = `LC #${q.lc_number} • ${q.difficulty}`;
    document.getElementById('f-sol-text').value = q.solution || '';

    // Open modal
    document.getElementById('solution-modal').classList.add('open');
    document.getElementById('f-sol-text').focus();
  },

  close() {
    activeLcNumber = null;
    document.getElementById('solution-modal').classList.remove('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('solution-modal')) this.close();
  },

  async save() {
    if (!activeLcNumber) return;
    const newValue = document.getElementById('f-sol-text').value;
    
    // 1. Visually update the minimized textarea immediately without waiting
    const cellTextArea = document.querySelector(`.sol-box[data-lc="${activeLcNumber}"]`);
    if (cellTextArea) {
      cellTextArea.value = newValue;
      cellTextArea.classList.toggle('has-content', newValue.length > 0);
    }

    // 2. Persist to cache and DB
    await persistSolution(activeLcNumber, newValue);
    
    this.close();
  }
};
