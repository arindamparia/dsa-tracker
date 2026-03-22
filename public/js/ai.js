import { state } from './state.js';
import { saveComplexity, saveAIAnalysis } from './progress.js';

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

// ── Shared HTML builder (also imported by render.js for page-load rendering) ──

function renderStars(n) {
  n = Math.max(0, Math.min(3, n || 0));
  return `<span class="air-stars">${'★'.repeat(n)}<span class="air-stars-empty">${'☆'.repeat(3 - n)}</span></span>`;
}

// Map a complexity string to one of 5 curve indices (0=fastest … 4=slowest)
function complexityIndex(label) {
  if (!label) return -1;
  const l = label.toLowerCase().replace(/\s+/g, '');
  if (l === 'o(1)')                                          return 0;
  if (/o\(log/.test(l) && !/nlog/.test(l))                  return 1; // O(log n), O(log(m+n))
  if (/o\(sqrt/.test(l))                                     return 1; // O(sqrt(n)) ≈ O(log n)
  if (/^o\(n\)$|^o\(n\+m\)$|^o\(v\+e\)$/.test(l))         return 2; // O(n), O(n+m), O(V+E)
  if (/nlog/.test(l))                                        return 3; // O(n log n), O(n log m)
  if (/n[²2³3]|n\^[23]|[a-z]\*[a-z]|n(?!log)[a-z]/.test(l)) return 4; // O(n²), O(n³), O(m*n), O(n*k), O(nk), O(nm)…
  if (/2\^n|n!|n\^n/.test(l))                               return 5; // O(2^n), O(n!), O(n^n)
  return -1; // custom — no highlight
}

function complexityGraph(label) {
  const safe = (label || '?').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hi   = complexityIndex(label);

  // Each entry: [SVG path from origin (10,60), r, g, b]
  // Origin = bottom-left (10,60). SVG y is inverted — smaller y = higher on chart.
  // Colors: green (fast) → yellow → red (slow), matching standard Big-O reference charts.
  const curves = [
    ['M10,60 L94,60',                              6, 214, 160],  // O(1)      — flat
    ['M10,60 C12,40 26,33 94,28',                  6, 214, 160],  // O(log n)  — rises fast then levels off
    ['M10,60 L94,10',                            136, 208,   0],  // O(n)      — linear diagonal
    ['M10,60 Q28,50 55,24 Q76,11 94,6',          248, 181,   0],  // O(n log n)— slightly above linear
    ['M10,60 Q13,59 28,50 Q55,26 94,4',          255,  71,  87],  // O(n²)     — steep parabola
    ['M10,60 Q12,59 18,52 Q26,30 38,4',          180,   0,  50],  // O(2^n)    — nearly vertical (exponential)
  ];

  const paths = curves.map(([d, r, g, b], i) => {
    const active = hi === i;
    return `<path d="${d}" stroke="rgba(${r},${g},${b},${active ? '1' : '0.2'})" stroke-width="${active ? '2.5' : '1.2'}" fill="none" stroke-linecap="round"/>`;
  }).join('');

  return `<div class="air-graph-wrap">
    <div class="air-graph-label">${safe}</div>
    <svg viewBox="0 0 102 66" class="air-graph-svg" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="4"  x2="10" y2="62" stroke="rgba(255,255,255,0.14)" stroke-width="0.8"/>
      <line x1="10" y1="62" x2="98" y2="62" stroke="rgba(255,255,255,0.14)" stroke-width="0.8"/>
      ${paths}
    </svg>
  </div>`;
}

// Tab switcher for Time / Space panels inside the efficiency section
window.airSwitchTab = function(btn, tab) {
  const section = btn.closest('.air-eff-section');
  section.querySelectorAll('.air-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  section.querySelectorAll('.air-tab-panel').forEach(p => { p.style.display = 'none'; });
  section.querySelector(`.air-${tab}-panel`).style.display = '';
};

export function buildAIReviewHTML(_lc, data) {
  if (!data) return '';

  const ap  = data.approach   || {};
  const eff = data.efficiency || {};
  const sty = data.code_style && typeof data.code_style.readability === 'number' ? data.code_style : null;

  const hasSummary = !!data.summary;

  const tc  = eff.current_time_complexity   || eff.current_complexity   || '—';
  const stc = eff.suggested_time_complexity || eff.suggested_complexity || '—';
  const sc  = eff.current_space_complexity  || '—';
  const ssc = eff.suggested_space_complexity || '—';

  // Backward-compat: old saves have a single `suggestions`; new ones have split fields
  const timeSugg  = eff.time_suggestions  || eff.suggestions || '';
  const spaceSugg = eff.space_suggestions || '';

  return `
    <div class="air-card">
      <div class="air-header">
        <div class="air-chips">
          <span class="air-chip">✓ Approach</span>
          <span class="air-chip">✓ Efficiency</span>
          ${sty ? '<span class="air-chip">✓ Code Style</span>' : ''}
        </div>
      </div>

      ${hasSummary ? `<div class="air-summary">${data.summary}</div>` : ''}
      <div class="air-divider"></div>

      <div class="air-section">
        <div class="air-stitle air-stitle-approach">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>
          Approach
        </div>
        ${ap.current   ? `<div class="air-row"><span class="air-key">Current:</span><span class="air-val">${ap.current}</span></div>` : ''}
        ${ap.suggested ? `<div class="air-row"><span class="air-key">Suggested:</span><span class="air-val air-green">${ap.suggested}</span></div>` : ''}
        ${ap.key_idea  ? `<div class="air-row air-row-wrap"><span class="air-key">Key Idea:</span><span class="air-val">${ap.key_idea}</span></div>` : ''}
        ${ap.consider  ? `<div class="air-row air-row-wrap"><span class="air-key">Consider:</span><span class="air-val air-dim">${ap.consider}</span></div>` : ''}
      </div>
      <div class="air-divider"></div>

      <div class="air-section air-eff-section">
        <div class="air-stitle air-stitle-eff">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h7v7l9-11h-7z" fill="currentColor"/></svg>
          Efficiency
        </div>
        <div class="air-eff-tabs">
          <button class="air-tab active" onclick="airSwitchTab(this,'time')">⏱ Time</button>
          <button class="air-tab" onclick="airSwitchTab(this,'space')">📦 Space</button>
        </div>

        <div class="air-tab-panel air-time-panel">
          <div class="air-eff-inner">
            <div class="air-eff-left">
              <div class="air-row"><span class="air-key">Current:</span><span class="air-cplx">${tc}</span></div>
              <div class="air-row"><span class="air-key">Optimal:</span><span class="air-cplx air-green">${stc}</span></div>
              ${timeSugg ? `<div class="air-row air-row-wrap"><span class="air-key">Notes:</span><span class="air-val">${timeSugg}</span></div>` : ''}
            </div>
            ${complexityGraph(stc)}
          </div>
        </div>

        <div class="air-tab-panel air-space-panel" style="display:none">
          <div class="air-eff-inner">
            <div class="air-eff-left">
              <div class="air-row"><span class="air-key">Current:</span><span class="air-cplx">${sc}</span></div>
              <div class="air-row"><span class="air-key">Optimal:</span><span class="air-cplx air-green">${ssc}</span></div>
              ${spaceSugg ? `<div class="air-row air-row-wrap"><span class="air-key">Notes:</span><span class="air-val">${spaceSugg}</span></div>` : ''}
            </div>
            ${complexityGraph(ssc)}
          </div>
        </div>
      </div>

      ${sty ? `
      <div class="air-divider"></div>
      <div class="air-section">
        <div class="air-stitle air-stitle-style">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>
          Code Style
        </div>
        <div class="air-row"><span class="air-key">Readability:</span>${renderStars(sty.readability)}</div>
        <div class="air-row"><span class="air-key">Structure:</span>${renderStars(sty.structure)}</div>
        ${sty.suggestions ? `<div class="air-row air-row-wrap"><span class="air-key">Suggestions:</span><span class="air-val air-dim">${sty.suggestions}</span></div>` : ''}
      </div>` : ''}
    </div>`;
}

export const AI = {
  _notSubscribedToast() {
    if (window.showToast) window.showToast('🔒 AI features require a subscription.', 'error');
  },

  async fetchAI(action, lc_number, code = '') {
    if (!state.isSubscribed) { this._notSubscribedToast(); return null; }

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
        if (res.status === 403 || data.error === 'subscription_required') {
          this._notSubscribedToast();
          return null;
        }
        throw new Error(data.error || 'Failed to fetch AI response');
      }

      return data.data;

    } catch (err) {
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
      summary:    analysis.summary,
      approach:   analysis.approach,
      efficiency: analysis.efficiency,
      code_style: analysis.code_style,
    });

    const q = state.questions.find(x => x.lc_number === lc);
    if (q) {
      // Always persist the AI analysis to DB + localStorage immediately after generation
      const oldReview = (q.ai_analysis || '').trim();
      if (oldReview !== richPayload.trim()) {
        await saveAIAnalysis(lc, richPayload.trim());
      }

      // Save complexity selects if they changed
      const complexityChanged = (q.time_complexity || '') !== tVal || (q.space_complexity || '') !== sVal;
      if (complexityChanged) {
        q.time_complexity = tVal;
        q.space_complexity = sVal;
        saveComplexity(lc);
      }
    }

    // Display feedback in an expandable section below the code box
    AI.renderFeedback(lc, richPayload);
  },

  renderFeedback(lc, feedbackPayload) {
    if (!feedbackPayload) return;

    let data = null;
    let isRich = false;
    try {
      data = JSON.parse(feedbackPayload);
      if (data && data.approach && data.efficiency) isRich = true;
    } catch {}

    const solWrap = document.querySelector(`#row-${lc} .sol-cell-wrap`);
    if (!solWrap) return;

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
        <div class="ai-fb-content" id="ai-fb-content-${lc}" style="display:none;"></div>
      `;
      solWrap.appendChild(fbDiv);
    }

    const contentDiv = document.getElementById(`ai-fb-content-${lc}`);
    if (contentDiv) {
      contentDiv.innerHTML = isRich
        ? buildAIReviewHTML(lc, data)
        : `<div class="ai-fb-box"><strong>🤖 Approach & Edge Cases:</strong> ${feedbackPayload}</div>`;

      contentDiv.style.display = 'block';
      document.querySelector(`#ai-fb-container-${lc} .ai-fb-toggle`)?.classList.add('open');
    }
  },

  toggleFeedback(lc) {
    const contentDiv = document.getElementById(`ai-fb-content-${lc}`);
    const toggleBtn  = document.querySelector(`#ai-fb-container-${lc} .ai-fb-toggle`);
    if (!contentDiv) return;
    const open = contentDiv.style.display === 'none';
    contentDiv.style.display = open ? 'block' : 'none';
    toggleBtn?.classList.toggle('open', open);
  },

};

window.AI = AI;




