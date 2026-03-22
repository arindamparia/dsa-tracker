/**
 * Similar Problems — inline tray showing related unsolved problems.
 *
 * Algorithm:
 *   +3 for same topic, +1 per shared tag.
 *   If results ≤ 3  → show directly (no LLM call).
 *   If results > 3  → ask LLM to pick the best 3 by true algorithmic pattern similarity.
 */
import { state } from './state.js';
import { SimilarCache, Cache } from './cache.js';

const SIMILAR_LIMIT = 5; // max candidates fed to heuristic before LLM kicks in

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

    // Build O(1) lookup maps once — used by all three cache layers below
    const candidateMap = new Map(candidates.map(c => [c.question.lc_number, c]));
    const stateMap     = new Map(state.questions.map(x => [x.lc_number, x]));

    // Helper: re-hydrate LC numbers → candidate objects
    const hydrate = (lcArr) => lcArr
      .map(cachedLc => {
        const match = candidateMap.get(cachedLc);
        if (match) return match;
        const sq = stateMap.get(cachedLc);
        return sq ? { question: sq } : null;
      })
      .filter(Boolean);

    // Layer 1: localStorage
    const lsHit = SimilarCache.get(lc);
    if (lsHit) {
      const hydratedLs = hydrate(lsHit);
      if (hydratedLs.length > 0) {
        const tray = createTray(lc, hydratedLs);
        row.after(tray);
        requestAnimationFrame(() => { tray.classList.add('open'); if (btn) btn.disabled = false; });
        return;
      }
    }

    // Layer 2: DB (via state.questions, loaded from DB on fresh fetch)
    const dbHit = q.similar_problems;
    if (Array.isArray(dbHit) && dbHit.length > 0) {
      const hydratedDb = hydrate(dbHit);
      if (hydratedDb.length > 0) {
        SimilarCache.set(lc, dbHit); // backfill localStorage
        const tray = createTray(lc, hydratedDb);
        row.after(tray);
        requestAnimationFrame(() => { tray.classList.add('open'); if (btn) btn.disabled = false; });
        return;
      }
    }

    // Layer 3: LLM
    const loadingTray = createTray(lc, [], true);
    row.after(loadingTray);
    requestAnimationFrame(() => loadingTray.classList.add('open'));

    const llmPicks = await rankWithLLM(q, candidates);
    const finalCandidates = llmPicks ?? candidates.slice(0, 3);

    const resultTray = createTray(lc, finalCandidates);
    loadingTray.innerHTML = resultTray.innerHTML;
    if (btn) btn.disabled = false;

    if (llmPicks) {
      const pickedLCs = finalCandidates.map(c => c.question.lc_number);
      // Save to all layers
      SimilarCache.set(lc, pickedLCs);                              // localStorage
      Cache.updateEntry(q.lc_number, { similar_problems: pickedLCs }); // main cache
      q.similar_problems = pickedLCs;                               // in-memory state
      fetch('/.netlify/functions/update-question', {                // DB (shared)
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lc_number: q.lc_number, similar_problems: pickedLCs }),
      }).catch(() => {});
    }
  }
};

window.SimilarProblems = SimilarProblems;
