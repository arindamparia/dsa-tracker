import { state } from './state.js';
import { saveComplexity } from './progress.js';

/**
 * Normalizes AI-returned complexity strings to exactly match our accepted option values:
 * 'O(1)', 'O(log n)', 'O(log(m+n))', 'O(n)', 'O(n log n)',
 * 'O(n+m)', 'O(V+E)', 'O(n²)', 'O(n³)', 'O(2^n)', 'O(n!)'
 */
export function normalizeComplexity(raw) {
  if (!raw) return '';
  let s = raw.trim();

  // Strip markdown bold/italic and backticks, lowercase for matching
  s = s.replace(/[*_`]/g, '').trim();

  // Map common textual variants to canonical form
  const aliases = [
    // O(1)
    [/^O\s*\(\s*1\s*\)$/i, 'O(1)'],
    // O(log n)
    [/^O\s*\(\s*log\s*2?\s*n\s*\)$/i, 'O(log n)'],
    [/^O\s*\(\s*log\s*n\s*\)$/i, 'O(log n)'],
    // O(log(m+n))
    [/^O\s*\(\s*log\s*\(?\s*m\s*\+\s*n\s*\)?\s*\)$/i, 'O(log(m+n))'],
    // O(n)
    [/^O\s*\(\s*n\s*\)$/i, 'O(n)'],
    // O(n log n)
    [/^O\s*\(\s*n\s*log\s*2?\s*n\s*\)$/i, 'O(n log n)'],
    [/^O\s*\(\s*n\s*\*\s*log\s*n\s*\)$/i, 'O(n log n)'],
    [/^O\s*\(\s*nlogn\s*\)$/i, 'O(n log n)'],
    // O(n+m)
    [/^O\s*\(\s*n\s*\+\s*m\s*\)$/i, 'O(n+m)'],
    [/^O\s*\(\s*m\s*\+\s*n\s*\)$/i, 'O(n+m)'],
    // O(V+E)
    [/^O\s*\(\s*V\s*\+\s*E\s*\)$/i, 'O(V+E)'],
    // O(n²)  ← accepts n^2, n**2, n*n, n2, n²
    [/^O\s*\(\s*n\s*[\^\*]{1,2}\s*2\s*\)$/i, 'O(n²)'],
    [/^O\s*\(\s*n\s*\*\s*n\s*\)$/i, 'O(n²)'],
    [/^O\s*\(\s*n\s*2\s*\)$/i, 'O(n²)'],
    [/^O\s*\(\s*n²\s*\)$/i, 'O(n²)'],
    // O(n³)
    [/^O\s*\(\s*n\s*[\^\*]{1,2}\s*3\s*\)$/i, 'O(n³)'],
    [/^O\s*\(\s*n³\s*\)$/i, 'O(n³)'],
    // O(2^n)
    [/^O\s*\(\s*2\s*\^\s*n\s*\)$/i, 'O(2^n)'],
    [/^O\s*\(\s*2\s*\*\*\s*n\s*\)$/i, 'O(2^n)'],
    // O(n!)
    [/^O\s*\(\s*n\s*!\s*\)$/i, 'O(n!)'],
  ];

  for (const [pattern, canonical] of aliases) {
    if (pattern.test(s)) return canonical;
  }

  // If it already exactly matches one of our options, return as-is
  const accepted = ['O(1)', 'O(log n)', 'O(log(m+n))', 'O(n)', 'O(n log n)',
                    'O(n+m)', 'O(V+E)', 'O(n²)', 'O(n³)', 'O(2^n)', 'O(n!)'];
  if (accepted.includes(s)) return s;

  // Unknown — return empty so select falls back to O(?)
  return '';
}

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

    // Normalize AI complexity output to our accepted option values before applying
    const timeNorm  = normalizeComplexity(analysis.time_complexity);
    const spaceNorm = normalizeComplexity(analysis.space_complexity);

    // Update UI selects safely by dispatching change logic or directly updating DOM + DB
    const timeSelect = document.querySelector(`select.complexity-select[data-lc="${lc}"][data-type="time"]`);
    const spaceSelect = document.querySelector(`select.complexity-select[data-lc="${lc}"][data-type="space"]`);

    let tVal = '', sVal = '';

    if (timeSelect) {
      timeSelect.value = timeNorm;
      tVal = timeSelect.value;
    }

    if (spaceSelect) {
      spaceSelect.value = spaceNorm;
      sVal = spaceSelect.value;
    }

    // Call the existing complexity save logic or just hit the API ourselves:
    if (tVal || sVal || analysis.feedback) {
      const q = state.questions.find(x => x.lc_number === lc);
      if (q) {
        let changed = false;
        if ((q.time_complexity || '') !== tVal) changed = true;
        if ((q.space_complexity || '') !== sVal) changed = true;
        
        const oldReview = (q.ai_analysis || '').trim();
        const newReview = (analysis.feedback || '').trim();
        if (oldReview !== newReview) changed = true;

        if (changed) {
          q.time_complexity = tVal;
          q.space_complexity = sVal;
          q.ai_analysis = analysis.feedback;
          saveComplexity(lc);
        } else if (window.showToast) {
          // If nothing changed in DB but we still want to confirm it finished thinking:
          window.showToast(`🤖 Analysis complete! No new changes to save.`, 'info');
        }
      }
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




