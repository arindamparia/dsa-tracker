/**
 * Spaced Repetition System (SRS) — Smart Review Queue.
 *
 * Tracks review intervals in localStorage. Problems that are is_done
 * with a solved_at date are eligible. Intervals: 1 → 3 → 7 → 14 → 30 days.
 * After all intervals pass the problem is considered "mastered".
 */
import { state } from './state.js';

const SRS_KEY    = 'dsa_srs_state';
const INTERVALS  = [1, 3, 7, 14, 30]; // days

// Removed localStorage helpers since we use the database now

/* ── Core logic ───────────────────────────────────── */

function getDueProblems(questions) {
  const now  = new Date();
  const due  = [];

  for (const q of questions) {
    if (!q.is_done || !q.solved_at) continue;

    const solvedAt = new Date(q.solved_at);
    const intervalIndex = q.srs_interval_index || 0;
    const lastReviewedAt = q.srs_last_reviewed_at;

    if (!lastReviewedAt) {
      // Never reviewed — due if solved_at + 1 day ≤ now
      const firstDue = new Date(solvedAt);
      firstDue.setDate(firstDue.getDate() + INTERVALS[0]);
      if (now >= firstDue) {
        due.push({ question: q, intervalIndex: 0, daysSinceSolved: daysBetween(solvedAt, now) });
      }
      continue;
    }

    // Already at or past the final interval → mastered
    if (intervalIndex >= INTERVALS.length) continue;

    const lastReview = new Date(lastReviewedAt);
    const nextInterval = INTERVALS[intervalIndex];
    const nextDue    = new Date(lastReview);
    nextDue.setDate(nextDue.getDate() + nextInterval);

    if (now >= nextDue) {
      due.push({ question: q, intervalIndex: intervalIndex, daysSinceSolved: daysBetween(solvedAt, now) });
    }
  }

  // Sort: most overdue first
  due.sort((a, b) => b.daysSinceSolved - a.daysSinceSolved);
  return due;
}

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function intervalLabel(idx) {
  if (idx >= INTERVALS.length) return 'Mastered';
  return `Review #${idx + 1} of ${INTERVALS.length}`;
}

/* ── Public API ───────────────────────────────────── */

export const SRS = {
  markReviewed(lc) {
    const q = state.questions.find(x => x.lc_number === lc);
    if (!q) return;

    q.srs_interval_index = (q.srs_interval_index || 0) + 1;
    q.srs_last_reviewed_at = new Date().toISOString();

    // Re-render instantly for UI responsiveness
    this.render();
    if (window.showToast) window.showToast('Marked as reviewed ✓', 'success');

    // Persist quietly in background
    fetch('/.netlify/functions/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        lc_number: lc, 
        is_done: q.is_done || false, 
        solution: q.solution || '', 
        notes: q.notes || '',
        needs_review: q.needs_review || false,
        time_complexity: q.time_complexity || '',
        space_complexity: q.space_complexity || '',
        solved_at: q.solved_at || null,
        srs_interval_index: q.srs_interval_index,
        srs_last_reviewed_at: q.srs_last_reviewed_at
      }),
    }).catch(() => {
    });
  },

  render() {
    const container = document.getElementById('review-queue');
    if (!container) return;

    const due = getDueProblems(state.questions);

    if (due.length === 0) {
      container.classList.remove('has-items');
      container.innerHTML = '';
      return;
    }

    container.classList.add('has-items');

    const cards = due.slice(0, 8).map(({ question: q, intervalIndex, daysSinceSolved }) => {
      const diffClass = q.difficulty.toLowerCase();
      const daysAgo   = daysSinceSolved === 0 ? 'today' :
                        daysSinceSolved === 1 ? '1 day ago' :
                        `${daysSinceSolved}d ago`;
      return `
        <div class="srs-card">
          <div class="srs-card-top">
            <span class="srs-diff ${diffClass}">${q.difficulty}</span>
            <span class="srs-interval">${intervalLabel(intervalIndex)}</span>
          </div>
          <div class="srs-name">${q.name}</div>
          <div class="srs-meta">
            <span class="srs-topic">${q.topic}</span>
            <span class="srs-ago">Solved ${daysAgo}</span>
          </div>
          <div class="srs-actions">
            <a href="${q.url}" target="_blank" rel="noopener" class="srs-link">Open ↗</a>
            <button class="srs-reviewed-btn" onclick="SRS.markReviewed(${q.lc_number})">Reviewed ✓</button>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="srs-header">
        <div class="srs-header-left">
          <span class="srs-icon">📋</span>
          <span class="srs-title">Review Queue</span>
          <span class="srs-badge">${due.length}</span>
        </div>
        <span class="srs-subtitle">Spaced repetition — revisit solved problems to strengthen recall</span>
      </div>
      <div class="srs-cards">${cards}</div>`;
  },

  /** No need to prune anymore since data lives on the question row in DB */
  prune() {},

  init() {
    this.render();
  }
};
