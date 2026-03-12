import { state } from './state.js';
import { saveComplexity } from './progress.js';

export const AI = {
  async fetchAI(action, lc_number, code = '') {
    const q = state.questions.find(x => String(x.lc_number) === String(lc_number));
    if (!q) {
      if (window.showToast) window.showToast(`Error: Could not find question data for LC# ${lc_number}`, 'error');
      return null;
    }

    try {
      if (window.showToast) window.showToast('🤖 Asking AI...', 'info');

      const res = await fetch('/.netlify/functions/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, title: q.name, code })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI response');
      }

      return data.data;

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast(`⚠ AI Error: ${err.message}`, 'error');
      return null;
    }
  },

  async getHint(lc) {
    const hintBtn = document.getElementById(`ai-hint-btn-${lc}`);
    let originalText = '';
    if (hintBtn) {
      originalText = hintBtn.innerHTML;
      hintBtn.disabled = true;
      hintBtn.innerHTML = '⏳ Thinking...';
      hintBtn.classList.add('loading');
    }

    const currentHint = document.getElementById(`ai-hint-box-${lc}`);
    if (currentHint) currentHint.remove();

    const hintStr = await this.fetchAI('hint', lc);
    
    if (hintBtn) {
      hintBtn.disabled = false;
      hintBtn.innerHTML = originalText;
      hintBtn.classList.remove('loading');
    }

    if (!hintStr) return;

    // Display under the problem name
    const probTd = document.querySelector(`#row-${lc} .prob-name`);
    if (probTd) {
      const hintDiv = document.createElement('div');
      hintDiv.id = `ai-hint-box-${lc}`;
      hintDiv.className = 'ai-hint-box';
      hintDiv.innerHTML = `<strong>💡 AI Hint:</strong> ${hintStr}`;
      probTd.appendChild(hintDiv);
    }
  },

  async analyze(lc) {
    const textarea = document.querySelector(`textarea.sol-box[data-lc="${lc}"]`);
    const code = textarea ? textarea.value.trim() : '';

    if (!code) {
      if (window.showToast) window.showToast('Please paste a solution to analyze.', 'error');
      return;
    }

    // Quick heuristic to check if the string actually looks like code (Java, C++, Python, JS etc)
    // Matches common syntax characters, brackets, or keywords
    const codeHeuristicBase = /[{}[\]();=><+\-*/]/;
    const codeKeywords = /\b(class|public|private|def|return|int|std|vector|string|void|if|for|while|const|let|var|function)\b/;
    
    if (!(codeHeuristicBase.test(code) && codeKeywords.test(code))) {
      if (window.showToast) window.showToast('⚠ This does not look like code. Please paste valid C++, Java, JS, or Python code to analyze.', 'error');
      return;
    }

    const analyzeBtn = document.getElementById(`ai-analyze-btn-${lc}`);
    let originalText = '';
    if (analyzeBtn) {
      originalText = analyzeBtn.innerHTML;
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = '⏳ Analyzing...';
      analyzeBtn.classList.add('loading');
    }

    const analysis = await this.fetchAI('analyze', lc, code);
    
    if (analyzeBtn) {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = originalText;
      analyzeBtn.classList.remove('loading');
    }

    if (!analysis) return;

    // Update UI selects safely by dispatching change logic or directly updating DOM + DB
    const timeSelect = document.querySelector(`select.complexity-select[data-lc="${lc}"][data-type="time"]`);
    const spaceSelect = document.querySelector(`select.complexity-select[data-lc="${lc}"][data-type="space"]`);

    let tVal = '', sVal = '';

    if (timeSelect) {
      timeSelect.value = analysis.time_complexity;
      // If the model gave a wildly different string not in our exact options, it'll fallback to "", but 4o-mini is smart enough.
      // E.g. we can force fallback by injecting it if missing
      if (!timeSelect.value && analysis.time_complexity) {
         const opt = document.createElement('option');
         opt.value = analysis.time_complexity;
         opt.textContent = analysis.time_complexity;
         timeSelect.appendChild(opt);
         timeSelect.value = analysis.time_complexity;
      }
      tVal = timeSelect.value;
    }

    if (spaceSelect) {
      spaceSelect.value = analysis.space_complexity;
      if (!spaceSelect.value && analysis.space_complexity) {
         const opt = document.createElement('option');
         opt.value = analysis.space_complexity;
         opt.textContent = analysis.space_complexity;
         spaceSelect.appendChild(opt);
         spaceSelect.value = analysis.space_complexity;
      }
      sVal = spaceSelect.value;
    }

    // Call the existing complexity save logic or just hit the API ourselves:
    if (tVal || sVal || analysis.feedback) {
      const q = state.questions.find(x => x.lc_number === lc);
      if (q) {
        q.time_complexity = tVal;
        q.space_complexity = sVal;
        q.ai_analysis = analysis.feedback;
        saveComplexity(lc);
      }
    }

    if (window.showToast) {
       window.showToast(`🤖 Analysis complete! Time: ${tVal}, Space: ${sVal}`, 'success');
    }

    // Display feedback in an expandable section below the code box
    AI.renderFeedback(lc, analysis.feedback);
  },

  renderFeedback(lc, feedbackText) {
    if (!feedbackText) return;
    
    const solWrap = document.querySelector(`#row-${lc} .sol-cell-wrap`);
    if (solWrap) {
       let fbDiv = document.getElementById(`ai-fb-container-${lc}`);
       if (!fbDiv) {
         fbDiv = document.createElement('div');
         fbDiv.id = `ai-fb-container-${lc}`;
         fbDiv.className = 'ai-fb-container';
         fbDiv.style.marginTop = '8px';
         fbDiv.innerHTML = `
           <button class="ai-fb-toggle" onclick="AI.toggleFeedback(${lc})">
             <span class="fb-icon">🤖</span> AI Review <span class="fb-arrow">▼</span>
           </button>
           <div class="ai-fb-content" id="ai-fb-content-${lc}" style="display: none;"></div>
         `;
         solWrap.appendChild(fbDiv);
       }
       const contentDiv = document.getElementById(`ai-fb-content-${lc}`);
       if (contentDiv) {
         contentDiv.innerHTML = `<div class="ai-fb-box"><strong>🤖 Approach & Edge Cases:</strong> ${feedbackText}</div>`;
         // Auto-expand if we just generated it
         contentDiv.style.display = 'block';
         const toggleBtn = document.querySelector(`#ai-fb-container-${lc} .ai-fb-toggle`);
         if (toggleBtn) toggleBtn.classList.add('open');
       }
    }
  },

  toggleFeedback(lc) {
    const contentDiv = document.getElementById(`ai-fb-content-${lc}`);
    const toggleBtn = document.querySelector(`#ai-fb-container-${lc} .ai-fb-toggle`);
    if (contentDiv) {
      if (contentDiv.style.display === 'none') {
        contentDiv.style.display = 'block';
        if (toggleBtn) toggleBtn.classList.add('open');
      } else {
        contentDiv.style.display = 'none';
        if (toggleBtn) toggleBtn.classList.remove('open');
      }
    }
  }
};

window.AI = AI;
