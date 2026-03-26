/**
 * SmartQueue — Adaptive Learning Algorithm
 *
 * Scores every unsolved problem using a weighted multi-factor model:
 *
 *   score =
 *     sectionWeakness    × 0.35   (% unsolved in section — weak areas first)
 *     difficultyStep     × 0.25   (prefer easy→medium→hard within a section)
 *     srsUrgency         × 0.20   (SRS-due problems bubble to top)
 *     companyRelevance   × 0.15   (boost if matches active company filter)
 *     notAttempted       × 0.05   (slight bonus for never-touched problems)
 *
 * This is similar in spirit to a multi-armed bandit: balancing
 * exploration (new weak areas) with exploitation (nearly-mastered sections).
 */
import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { animate } from './motion.js';

// srs due check
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30];

function isSRSDue(q) {
  if (!q.needs_review) return false;
  const idx = q.srs_interval_index || 0;
  const last = q.srs_last_reviewed_at ? new Date(q.srs_last_reviewed_at) : (q.solved_at ? new Date(q.solved_at) : null);
  if (!last) return true;
  const days = SRS_INTERVALS_DAYS[Math.min(idx, SRS_INTERVALS_DAYS.length - 1)];
  const dueAt = new Date(last.getTime() + days * 86400 * 1000);
  return Date.now() >= dueAt.getTime();
}

// section stats
function buildSectionStats() {
  const map = new Map();
  state.questions.forEach(q => {
    const sec = q.section || 'Other';
    if (!map.has(sec)) map.set(sec, { total: 0, done: 0, easy: 0, easyDone: 0, medium: 0, medDone: 0, hard: 0, hardDone: 0 });
    const s = map.get(sec);
    s.total++;
    if (q.is_done) s.done++;
    if (q.difficulty === 'Easy')   { s.easy++;   if (q.is_done) s.easyDone++;   }
    if (q.difficulty === 'Medium') { s.medium++;  if (q.is_done) s.medDone++;    }
    if (q.difficulty === 'Hard')   { s.hard++;    if (q.is_done) s.hardDone++;   }
  });
  return map;
}

// core scoring function
function scoreQuestion(q, secMap) {
  const sec = secMap.get(q.section || 'Other') || { total: 1, done: 0, easy: 1, easyDone: 0, medium: 0, medDone: 0 };

  // 1. Section weakness: (unsolved / total)  — higher = weaker section
  const weakness = sec.total ? (sec.total - sec.done) / sec.total : 0;

  // 2. Difficulty step: prefer Easy when easy < 80% done, then Medium, then Hard
  const easyPct   = sec.easy   ? sec.easyDone / sec.easy : 1;
  const mediumPct = sec.medium ? sec.medDone  / sec.medium : 1;
  let diffStep = 0;
  if (q.difficulty === 'Easy')   diffStep = easyPct < 0.8 ? 1.0 : 0.4;
  if (q.difficulty === 'Medium') diffStep = easyPct >= 0.8 && mediumPct < 0.8 ? 1.0 : 0.5;
  if (q.difficulty === 'Hard')   diffStep = easyPct >= 0.8 && mediumPct >= 0.8 ? 1.0 : 0.3;

  // 3. SRS urgency
  const srsBoost = isSRSDue(q) ? 1.0 : 0;

  // 4. Company relevance
  const companies = q.companies_asked || [];
  const companyBoost = (state.companyFilter && companies.includes(state.companyFilter)) ? 1.0 : 0;

  // 5. Never attempted (no solution, no notes)
  const notAttempted = !q.solution && !q.notes ? 1.0 : 0;

  return weakness * 0.35 + diffStep * 0.25 + srsBoost * 0.20 + companyBoost * 0.15 + notAttempted * 0.05;
}

const DIFF_ORDER = { Easy: 1, Medium: 2, Hard: 3 };

// public api
export const SmartQueue = {
  // Session-level exclusion: questions picked but not solved yet
  _excluded: new Set(),
  _lastPickedLc: null,

  /**
   * Call before each pickRandom to rotate away from the last suggestion.
   * Resets after 20 ignores to avoid exhausting the pool.
   */
  advancePick() {
    if (this._lastPickedLc) {
      this._excluded.add(this._lastPickedLc);
      if (this._excluded.size > 20) this._excluded.clear();
    }
  },

  /**
   * When a question is solved, clear it from the exclusion list
   * so it doesn't take up a slot.
   */
  onSolved(lc_number) {
    this._excluded.delete(lc_number);
    this._lastPickedLc = null;
  },

  /**
   * Returns the top N recommended unsolved problems, sorted by score desc.
   * Excludes session-ignored questions unless pool is exhausted.
   */
  recommend(n = 5) {
    const secMap = buildSectionStats();
    const unsolved = state.questions.filter(q => !q.is_done);

    // Try excluding already-seen picks; fall back to full pool if too few remain
    const pool = unsolved.filter(q => !this._excluded.has(q.lc_number));
    const source = pool.length > 0 ? pool : unsolved;

    const results = source
      .map(q => ({ ...q, _score: scoreQuestion(q, secMap) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, n);

    if (results.length > 0) this._lastPickedLc = results[0].lc_number;
    return results;
  },

  /**
   * Suggest next problem after solving one.
   * Prioritises: same topic → same section → similar difficulty → smart score.
   */
  suggestNext(justSolvedQ) {
    const secMap = buildSectionStats();
    const solvedDiff = DIFF_ORDER[justSolvedQ.difficulty] || 2;

    // Build lookup sets for fast membership checks
    const linkedToSolved = new Set(justSolvedQ.similar_problems || []);
    // Also flag questions that list justSolvedQ as one of their similars (reverse link)
    const reverseLinkSet = new Set(
      state.questions
        .filter(q => (q.similar_problems || []).includes(justSolvedQ.lc_number))
        .map(q => q.lc_number)
    );

    const suggestion = state.questions
      .filter(q => !q.is_done)
      .map(q => {
        let bonus = 0;
        // Explicitly linked similar problem → highest bonus
        if (linkedToSolved.has(q.lc_number) || reverseLinkSet.has(q.lc_number)) bonus += 0.40;
        // Same topic → strong signal
        if (q.topic && q.topic === justSolvedQ.topic)                            bonus += 0.25;
        // Same section → medium signal
        if (q.section === justSolvedQ.section)                                   bonus += 0.10;
        // Difficulty: same = 0.20, one step harder = 0.10, easier = 0
        const qDiff = DIFF_ORDER[q.difficulty] || 2;
        if (qDiff === solvedDiff)          bonus += 0.20;
        else if (qDiff === solvedDiff + 1) bonus += 0.10;

        return { ...q, _score: scoreQuestion(q, secMap) + bonus };
      })
      .sort((a, b) => b._score - a._score)[0];

    if (!suggestion) return;
    this._showSuggestionCard(suggestion);
  },

  _jumpTo(q) {
    const sections = groupBySections(state.questions);
    const si = sections.findIndex(s => s.section === q.section && s.section_order === q.section_order);
    if (si === -1) return;

    smoothTransition(() => {
      // Clear all filters so the row is visible
      state.diffFilter   = 'all';
      state.statusFilter = 'all';
      if (window.updateDiffUI) window.updateDiffUI('all');
      if (window.updateStatusUI) window.updateStatusUI('all');

      // Apply filters then expand the section
      import('./filters.js').then(m => {
        m.applyFilters();

        const secEl = document.getElementById(`sec-${si}`);
        if (!secEl) return;
        secEl.classList.remove('collapsed');

        const tbody = document.getElementById(`tbody-${si}`);
        if (tbody && tbody.dataset.loaded === 'false') {
          document.dispatchEvent(new CustomEvent('force-render-section', { detail: si }));
        }

        requestAnimationFrame(() => {
          const tr = document.getElementById(`row-${q.lc_number}`);
          if (!tr) return;

          tr.style.backgroundColor = 'rgba(124,106,247,0.2)';
          setTimeout(() => tr.style.backgroundColor = '', 7000);

          setTimeout(() => {
            tr.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Pointer arrow (same as pickRandom)
            document.getElementById('random-pointer')?.remove();
            const pointer = document.createElement('div');
            pointer.id = 'random-pointer';
            pointer.style.cssText = `
              position:fixed; left:14px; transform:translateY(-50%) scale(0.85);
              display:flex; align-items:center; gap:6px;
              background:rgba(12,12,22,0.92);
              border:1px solid rgba(124,106,247,0.5); border-radius:10px;
              padding:6px 12px 6px 8px; font-family:'Syne',sans-serif;
              font-size:13px; font-weight:700; color:rgba(200,180,255,0.95);
              box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 12px rgba(124,106,247,0.3);
              pointer-events:none; z-index:999999; white-space:nowrap;
              animation:fadeInOut 6s ease forwards;
            `;
            pointer.innerHTML = `<span style="font-size:18px;animation:bouncePoint 0.55s ease-in-out infinite;">👉</span><span>Solve this!</span>`;
            document.body.appendChild(pointer);

            let tracking = true;
            function track() {
              if (!tracking) return;
              const rect = tr.getBoundingClientRect();
              pointer.style.top = (rect.top + rect.height / 2) + 'px';
              requestAnimationFrame(track);
            }
            requestAnimationFrame(track);
            setTimeout(() => { tracking = false; pointer.remove(); }, 6000);
          }, 350);
        });
      });
    });
  },

  _suggestionTimer: null,

  _showSuggestionCard(q) {
    clearTimeout(this._suggestionTimer);
    let card = document.getElementById('smart-suggestion-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'smart-suggestion-card';
      document.body.appendChild(card);
    }
    const diffClass = q.difficulty.toLowerCase();
    card.innerHTML = `
      <div class="ssc-label">Next up 🧠</div>
      <div class="ssc-name">${q.name}</div>
      <div class="ssc-meta">
        <span class="diff-badge ${diffClass}" style="font-size:10px">${q.difficulty}</span>
        <span class="ssc-section">${q.section}</span>
      </div>
      <button class="ssc-go" onclick="SmartQueue._jumpTo(window._sscQ)">Go →</button>
      <button class="ssc-dismiss" onclick="SmartQueue._dismissCard()">✕</button>
    `;
    window._sscQ = q;
    card.style.pointerEvents = 'auto';
    animate(card,
      { opacity: [0, 1], y: [80, 0] },
      { type: "spring", stiffness: 300, damping: 25 }
    );
    this._suggestionTimer = setTimeout(() => this._dismissCard(), 8000);
  },

  _dismissCard() {
    const card = document.getElementById('smart-suggestion-card');
    if (!card) return;
    animate(card, { opacity: 0, y: 80 }, { duration: 0.3, easing: 'ease-in' })
      .finished.then(() => card.remove());
  },
};

window.SmartQueue = SmartQueue;
