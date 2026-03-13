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
    [/^O\s*\(\s*n\s*!\s*\)$/i, 'O(n!)'],
    // O(n^n)
    [/^O\s*\(\s*n\s*\^\s*n\s*\)$/i, 'O(n^n)'],
    // O(sqrt(n))
    [/^O\s*\(\s*sqrt\s*\(?\s*n\s*\)?\s*\)$/i, 'O(sqrt(n))'],
    // O(2^n * n^2) (e.g. TSP DP)
    [/^O\s*\(\s*2\s*\^\s*n\s*\*?\s*n\s*\^\s*2\s*\)$/i, 'O(2^n * n²)'],
    // O(n * log(m))
    [/^O\s*\(\s*n\s*\*?\s*log\s*\(?\s*m\s*\)?\s*\)$/i, 'O(n log m)'],
    // O(m * n)
    [/^O\s*\(\s*m\s*\*?\s*n\s*\)$/i, 'O(m * n)'],
    [/^O\s*\(\s*n\s*\*?\s*m\s*\)$/i, 'O(m * n)'],
  ];

  for (const [pattern, canonical] of aliases) {
    if (pattern.test(s)) return canonical;
  }

  // If it already exactly matches one of our options, return as-is
  const accepted = [
    'O(1)', 'O(log n)', 'O(sqrt(n))', 'O(log(m+n))', 'O(n)', 
    'O(n log n)', 'O(n log m)', 'O(n+m)', 'O(m * n)', 'O(V+E)', 
    'O(n²)', 'O(n³)', 'O(2^n)', 'O(2^n * n²)', 'O(n!)', 'O(n^n)'
  ];
  if (accepted.includes(s)) return s;

  // New behaviour: If AI generated a highly custom complexity, preserve it but clean it
  let custom = raw.trim().replace(/[*_`]/g, '').toUpperCase();
  // Ensure it starts with O(...) if missing
  if (!custom.startsWith('O(')) custom = `O(${custom})`;
  return custom;
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

    if (timeSelect && timeNorm !== undefined) {
      // If we got a custom complexity not present in the native HTML dropdown, we must append it first
      if (timeNorm && !Array.from(timeSelect.options).some(o => o.value === timeNorm)) {
        timeSelect.appendChild(new Option(timeNorm, timeNorm));
      }
      timeSelect.value = timeNorm;
      tVal = timeSelect.value;
    }

    if (spaceSelect && spaceNorm !== undefined) {
      if (spaceNorm && !Array.from(spaceSelect.options).some(o => o.value === spaceNorm)) {
        spaceSelect.appendChild(new Option(spaceNorm, spaceNorm));
      }
      spaceSelect.value = spaceNorm;
      sVal = spaceSelect.value;
    }

    // Stringify the payload objects so they can be saved safely into MongoDB/Postgres as Text
    const richPayload = JSON.stringify({
      approach: analysis.approach,
      efficiency: analysis.efficiency
    });

    // Call the existing complexity save logic or just hit the API ourselves:
    if (tVal || sVal || (analysis.approach && analysis.efficiency)) {
      const q = state.questions.find(x => x.lc_number === lc);
      if (q) {
        let changed = false;
        if ((q.time_complexity || '') !== tVal) changed = true;
        if ((q.space_complexity || '') !== sVal) changed = true;
        
        const oldReview = (q.ai_analysis || '').trim();
        const newReview = richPayload.trim();
        if (oldReview !== newReview) changed = true;

        if (changed) {
          q.time_complexity = tVal;
          q.space_complexity = sVal;
          q.ai_analysis = newReview;
          saveComplexity(lc);
        } else if (window.showToast) {
           window.showToast(`🤖 Analysis complete! No new changes to save.`, 'info');
        }
      }
    }

    // Display feedback in an expandable section below the code box
    AI.renderFeedback(lc, richPayload);
  },

  renderFeedback(lc, feedbackPayload) {
    if (!feedbackPayload) return;
    
    // Attempt parsing structured AI JSON. Fallback to basic string text if legacy.
    let data = null;
    let isRich = false;
    try {
      data = JSON.parse(feedbackPayload);
      if (data && data.approach && data.efficiency) isRich = true;
    } catch {
      // Legacy text fallback
    }
    
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
         if (isRich) {
           contentDiv.innerHTML = `
             <div class="ai-rich-fb">
               <div class="ai-rich-section approach-section">
                 <div class="ai-rich-title">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="ai-rich-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>
                   Approach
                 </div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Current:</span> <span class="ai-rich-val">${data.approach.current}</span></div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Suggested:</span> <span class="ai-rich-val suggested">${data.approach.suggested}</span></div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Key Idea:</span> <span class="ai-rich-val">${data.approach.key_idea}</span></div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Consider:</span> <span class="ai-rich-val consideration">${data.approach.consider}</span></div>
               </div>
               
               <div class="ai-rich-section efficiency-section">
                 <div class="ai-rich-title">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="ai-rich-icon"><path d="M13 3L4 14h7v7l9-11h-7z" fill="currentColor"/></svg>
                   Efficiency
                 </div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Current complexity:</span> <span class="ai-rich-complexity">${data.efficiency.current_complexity}</span></div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Suggested complexity:</span> <span class="ai-rich-complexity optimal">${data.efficiency.suggested_complexity}</span></div>
                 <div class="ai-rich-row"><span class="ai-rich-key">Suggestions:</span> <span class="ai-rich-val bold-val">${data.efficiency.suggestions}</span></div>
               </div>
             </div>
           `;
         } else {
           contentDiv.innerHTML = `<div class="ai-fb-box"><strong>🤖 Approach & Edge Cases:</strong> ${feedbackPayload}</div>`;
         }
         
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




