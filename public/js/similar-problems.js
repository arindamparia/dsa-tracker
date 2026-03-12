/**
 * Similar Problems — inline tray showing related unsolved problems.
 *
 * Scoring: +3 for same topic, +1 for each shared tag.
 * Only suggests unsolved problems. Shows up to 5 results.
 */
import { state } from './state.js';

function findSimilar(question, allQuestions, limit = 5) {
  const srcTopic = (question.topic || '').toLowerCase();
  const srcTags  = new Set((question.tags || []).map(t => t.toLowerCase()));
  const results  = [];

  for (const q of allQuestions) {
    if (q.lc_number === question.lc_number) continue; // skip self
    if (q.is_done) continue; // only unsolved

    let score = 0;
    if ((q.topic || '').toLowerCase() === srcTopic && srcTopic) score += 3;
    for (const tag of (q.tags || [])) {
      if (srcTags.has(tag.toLowerCase())) score += 1;
    }
    if (score > 0) results.push({ question: q, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function createTray(lc, similar) {
  const tray = document.createElement('tr');
  tray.className = 'similar-tray';
  tray.id = `similar-${lc}`;

  if (similar.length === 0) {
    tray.innerHTML = `<td colspan="6" class="similar-tray-inner">
      <div class="similar-empty">No similar unsolved problems found</div>
    </td>`;
    return tray;
  }

  const items = similar.map(({ question: q, score }) => {
    const diffClass = q.difficulty.toLowerCase();
    return `
      <a href="${q.url}" target="_blank" rel="noopener" class="similar-item" title="LC ${q.lc_number} — Score: ${score}">
        <span class="similar-item-name">${q.name}</span>
        <span class="similar-item-meta">
          <span class="diff-badge ${diffClass}" style="font-size:9px;padding:1px 6px;">${q.difficulty}</span>
          <span class="similar-item-topic">${q.topic}</span>
        </span>
      </a>`;
  }).join('');

  tray.innerHTML = `<td colspan="6" class="similar-tray-inner">
    <div class="similar-tray-header">Similar unsolved problems:</div>
    <div class="similar-items">${items}</div>
  </td>`;
  return tray;
}

export const SimilarProblems = {
  toggle(lc) {
    const existing = document.getElementById(`similar-${lc}`);
    if (existing) {
      existing.remove();
      return;
    }

    const q = state.questions.find(x => x.lc_number === lc);
    if (!q) return;

    const similar = findSimilar(q, state.questions);
    const row = document.getElementById(`row-${lc}`);
    if (!row) return;

    const tray = createTray(lc, similar);
    row.after(tray);

    // Animate in
    requestAnimationFrame(() => tray.classList.add('open'));
  }
};
