/** Updates stat cards, progress bar, and section mini-progress. */
import { state } from './state.js';
import { groupBySections } from './utils.js';

export function updateSectionMeta(si) {
  const sections = groupBySections(state.questions);
  const sec = sections[si];
  if (!sec) return;
  const done  = sec.questions.filter(q => q.is_done).length;
  const total = sec.questions.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const sc = document.getElementById(`sc-${si}`);
  const sp = document.getElementById(`sp-${si}`);
  if (sc) sc.textContent = `${done}/${total}`;
  if (sp) sp.style.width = pct + '%';
}

export function updateStats() {
  const total = state.questions.length;
  let done = 0, easy = 0, easyTotal = 0, medium = 0, medTotal = 0, hard = 0, hardTotal = 0, notes = 0;
  
  const doneDates = new Set();

  state.questions.forEach(q => {
    if (q.difficulty === 'Easy')   easyTotal++;
    if (q.difficulty === 'Medium') medTotal++;
    if (q.difficulty === 'Hard')   hardTotal++;
    if (q.is_done) {
      done++;
      if (q.difficulty === 'Easy')   easy++;
      if (q.difficulty === 'Medium') medium++;
      if (q.difficulty === 'Hard')   hard++;
      
      if (q.updated_at) {
        doneDates.add(new Date(q.updated_at).toLocaleDateString());
      }
    }
    if ((q.solution || q.notes || '').trim()) notes++;
  });

  document.getElementById('hdr-total').textContent    = total;
  document.getElementById('stat-done').textContent    = done;
  document.getElementById('stat-of').textContent      = `of ${total}`;
  document.getElementById('stat-easy').textContent    = easy;
  document.getElementById('stat-easy-of').textContent = `of ${easyTotal}`;
  document.getElementById('stat-medium').textContent  = medium;
  document.getElementById('stat-med-of').textContent  = `of ${medTotal}`;
  document.getElementById('stat-hard').textContent    = hard;
  document.getElementById('stat-hard-of').textContent = `of ${hardTotal}`;
  document.getElementById('stat-notes').textContent   = notes;
  document.getElementById('stat-rem').textContent     = total - done;

  // Streak Calculation
  const streakEl = document.getElementById('hdr-streak');
  if (streakEl) {
    let currentStreak = 0;
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    
    // check yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();

    let checkDate = new Date(now);
    
    if (doneDates.has(todayStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (doneDates.has(yesterdayStr)) {
      // didn't do it today yet, but streak is kept alive by yesterday
      currentStreak++;
      checkDate = yesterday;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    if (currentStreak > 0) {
      while (true) {
        if (doneDates.has(checkDate.toLocaleDateString())) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    streakEl.textContent = `${currentStreak} Day Streak`;
  }

  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('prog-pct').textContent            = pct + '%';
  document.getElementById('prog-easy').style.width   = total ? (easy   / total * 100) + '%' : '0%';
  document.getElementById('prog-medium').style.width = total ? (medium / total * 100) + '%' : '0%';
  document.getElementById('prog-hard').style.width   = total ? (hard   / total * 100) + '%' : '0%';
}
