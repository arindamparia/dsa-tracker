/**
 * Similar Problems — inline tray showing related unsolved problems.
 *
 * Algorithm:
 *   +3 for same topic, +1 per shared tag.
 *   If results ≤ 3  → show directly (no LLM call).
 *   If results > 3  → ask LLM to pick the best 3 by true algorithmic pattern similarity.
 */
import { state } from './state.js';

const SIMILAR_LIMIT = 5; // max candidates fed to heuristic before LLM kicks in
const CACHE_KEY_PREFIX = 'dsa_similar_v1_';

function heuristicSimilar(question, allQuestions) {
  const srcTopic = (question.topic || '').toLowerCase();
  const srcTags  = new Set((question.tags || []).map(t => t.toLowerCase()));
  const srcDiff  = (question.difficulty || '').toLowerCase();
  const results  = [];

  for (const q of allQuestions) {
    if (q.lc_number === question.lc_number) continue;
    if (q.is_done) continue;

    let score = 0;
    if ((q.topic || '').toLowerCase() === srcTopic && srcTopic) score += 3;
    
    // Difficulty weighting logic
    const qDiff = (q.difficulty || '').toLowerCase();
    if (srcDiff === 'easy') {
      // Easy allows scaling up: exact match gets bonus, no penalty for medium/hard
      if (qDiff === 'easy') score += 2;
    } else if (srcDiff === 'medium') {
      // Medium leans towards Medium and Hard, strongly penalizes Easy
      if (qDiff === 'medium') score += 2;
      else if (qDiff === 'hard') score += 1;
      else if (qDiff === 'easy') score -= 2;
    } else if (srcDiff === 'hard') {
      // Hard leans heavily towards Hard, penalizes Easy and Medium
      if (qDiff === 'hard') score += 2;
      else if (qDiff === 'medium') score -= 1;
      else if (qDiff === 'easy') score -= 3;
    }

    for (const tag of (q.tags || [])) {
      if (srcTags.has(tag.toLowerCase())) score += 1;
    }
    
    // Only consider if there's at least some topical/tag match (score ignoring diff must be > 0)
    // Actually, let's just use the total score. If it's > 0, we can consider it.
    if (score > 0) results.push({ question: q, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, SIMILAR_LIMIT);
}

async function rankWithLLM(sourceQuestion, candidates) {
  try {
    const res = await fetch('/.netlify/functions/rank-similar-problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: sourceQuestion,
        candidates: candidates.map(c => c.question)
      })
    });
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.data?.picks)) return null;

    // picks is an array of 0-based indices into candidates
    return data.data.picks
      .filter(i => i >= 0 && i < candidates.length)
      .slice(0, 3)
      .map(i => candidates[i]);
  } catch {
    return null; // graceful fallback
  }
}

function createTray(lc, similar, loading = false) {
  const tray = document.createElement('tr');
  tray.className = 'similar-tray';
  tray.id = `similar-${lc}`;

  if (loading) {
    tray.innerHTML = `<td colspan="6" style="padding:0; border:none;">
      <div class="similar-tray-inner">
        <div class="similar-loading">🤖 Finding best matches...</div>
      </div>
    </td>`;
    return tray;
  }

  if (similar.length === 0) {
    tray.innerHTML = `<td colspan="6" style="padding:0; border:none;">
      <div class="similar-tray-inner">
        <div class="similar-empty">No similar unsolved problems found</div>
      </div>
    </td>`;
    return tray;
  }

  const items = similar.map(({ question: q, score }) => {
    const diffClass = q.difficulty.toLowerCase();
    // Exclude score from UI when it's LLM ranked (since score is undefined then)
    const scoreStr = score !== undefined ? ` — Base Score: ${score}` : '';
    return `
      <a href="${q.url}" target="_blank" rel="noopener" class="similar-item" title="LC ${q.lc_number}${scoreStr}">
        <span class="similar-item-name">${q.name}</span>
        <span class="similar-item-meta">
          <span class="diff-badge ${diffClass}" style="font-size:9px;padding:1px 6px;">${q.difficulty}</span>
          <span class="similar-item-topic">${q.topic}</span>
        </span>
      </a>`;
  }).join('');

  tray.innerHTML = `<td colspan="6" style="padding:0; border:none;">
    <div class="similar-tray-inner">
      <div class="similar-tray-header" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Similar unsolved problems:</span>
        <button class="similar-close-btn" onclick="SimilarProblems.toggle(${lc})">×</button>
      </div>
      <div class="similar-items">${items}</div>
    </div>
  </td>`;
  return tray;
}

export const SimilarProblems = {
  async toggle(lc) {
    const btn = document.getElementById(`sim-btn-${lc}`);
    if (btn) btn.disabled = true;

    const existing = document.getElementById(`similar-${lc}`);
    if (existing) { 
      existing.classList.remove('open');
      setTimeout(() => {
        existing.remove();
        if (btn) btn.disabled = false;
      }, 300);
      return; 
    }

    const q = state.questions.find(x => x.lc_number === lc);
    if (!q) { if (btn) btn.disabled = false; return; }

    const row = document.getElementById(`row-${lc}`);
    if (!row) { if (btn) btn.disabled = false; return; }

    const candidates = heuristicSimilar(q, state.questions);

    if (candidates.length <= 3) {
      // ≤3 results — show directly, no LLM needed
      const tray = createTray(lc, candidates);
      row.after(tray);
      requestAnimationFrame(() => {
        tray.classList.add('open');
        if (btn) btn.disabled = false;
      });
      return;
    }

    // Check DB cache first
    const cachedIndices = q.similar_problems;
    if (Array.isArray(cachedIndices) && cachedIndices.length > 0) {
      // Re-hydrate the full objects from the candidate list (or state if they fell out of top 5)
      const finalCandidates = cachedIndices
        .map(cachedLc => {
          const match = candidates.find(c => c.question.lc_number === cachedLc);
          if (match) return match;
          // If not in current heuristic top 5, grab from state
          const stateMatch = state.questions.find(x => x.lc_number === cachedLc);
          return stateMatch ? { question: stateMatch } : null;
        })
        .filter(Boolean);
        
      if (finalCandidates.length > 0) {
        const tray = createTray(lc, finalCandidates);
        row.after(tray);
        requestAnimationFrame(() => {
          tray.classList.add('open');
          if (btn) btn.disabled = false;
        });
        return;
      }
    }

    // >3 results and no cache — show loading state while LLM picks best 3
    const loadingTray = createTray(lc, [], true);
    row.after(loadingTray);
    requestAnimationFrame(() => loadingTray.classList.add('open'));

    const llmPicks = await rankWithLLM(q, candidates);

    const finalCandidates = llmPicks ?? candidates.slice(0, 3);
    
    // Swap HTML immediately to avoid animation jitter and tray collapse
    const resultTray = createTray(lc, finalCandidates);
    loadingTray.innerHTML = resultTray.innerHTML;
    if (btn) btn.disabled = false;

    if (llmPicks) {
      // Cache successful LLM results to DB in the QUESTIONS table
      const pickedLCs = finalCandidates.map(c => c.question.lc_number);
      q.similar_problems = pickedLCs;
      
      try {
        await fetch('/.netlify/functions/update-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lc_number: q.lc_number,
            similar_problems: pickedLCs
          })
        });
      } catch (err) {
        console.error('Failed to save similar problems to DB:', err);
      }
    }
  }
};

window.SimilarProblems = SimilarProblems;
