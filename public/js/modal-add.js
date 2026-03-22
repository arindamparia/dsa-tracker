/** Add Question modal — open / close / submit. */
import { state } from './state.js';
import { render, populateSectionDropdown } from './render.js';
import { groupBySections } from './utils.js';
import { showToast } from './toast.js';

const OVERLAY_ID = 'modal';

export const AddQuestionModal = {
  open() {
    document.getElementById(OVERLAY_ID).classList.add('open');
    document.getElementById('f-lc').focus();
  },

  close() {
    document.getElementById(OVERLAY_ID).classList.remove('open');
    ['f-lc', 'f-name', 'f-url', 'f-topic', 'f-tags', 'f-section-new']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('f-diff').value    = '';
    document.getElementById('f-section').value = '';
    const errEl = document.getElementById('f-error');
    errEl.textContent = '';
    errEl.classList.remove('show');
    document.getElementById('f-submit').disabled = false;
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById(OVERLAY_ID)) this.close();
  },

  async submit() {
    const errEl = document.getElementById('f-error');
    const btn   = document.getElementById('f-submit');
    errEl.classList.remove('show');

    const lc         = parseInt(document.getElementById('f-lc').value);
    const name       = document.getElementById('f-name').value.trim();
    const url        = document.getElementById('f-url').value.trim();
    const topic      = document.getElementById('f-topic').value.trim();
    const difficulty = document.getElementById('f-diff').value;
    const sectionSel = document.getElementById('f-section').value;
    const sectionNew = document.getElementById('f-section-new').value.trim();
    const section    = sectionNew || sectionSel;
    const tags       = document.getElementById('f-tags').value.trim();

    if (!lc || !name || !url || !topic || !difficulty || !section) {
      errEl.textContent = 'All required fields (*) must be filled.';
      errEl.classList.add('show'); return;
    }
    // Validate URL using the URL constructor (throws on invalid input)
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad scheme');
      if (url.length > 500) throw new Error('too long');
    } catch {
      errEl.textContent = 'Please enter a valid URL starting with https://';
      errEl.classList.add('show'); return;
    }

    btn.disabled = true; btn.textContent = 'Adding...';

    try {
      const sections    = groupBySections(state.questions);
      const existingSec = sections.find(s => s.section === section);
      const section_order = existingSec
        ? existingSec.section_order
        : (Math.max(...sections.map(s => s.section_order), 0) + 1);

      const res  = await fetch('/.netlify/functions/add-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lc_number: lc, name, url, topic, difficulty, section, section_order, tags }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const newQ = { ...data.question, is_done: false, solution: '', notes: '' };
      state.questions.push(newQ);
      state.questions.sort((a, b) => a.section_order - b.section_order || a.lc_number - b.lc_number);

      this.close();
      render();
      showToast(`✓ LC #${lc} "${name}" added!`, 'success');

      setTimeout(() => {
        const el = document.getElementById(`row-${lc}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = 'Add Question';
    }
  },
};
