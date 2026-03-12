/** Updates stat cards, progress bar, and section mini-progress. */
import { state } from './state.js';
import { groupBySections } from './utils.js';
import { DailyGoal } from './daily-goal.js';

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
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  let todayDone = 0;

  state.questions.forEach(q => {
    if (q.difficulty === 'Easy')   easyTotal++;
    if (q.difficulty === 'Medium') medTotal++;
    if (q.difficulty === 'Hard')   hardTotal++;
    if (q.is_done) {
      done++;
      if (q.difficulty === 'Easy')   easy++;
      if (q.difficulty === 'Medium') medium++;
      if (q.difficulty === 'Hard')   hard++;
      
      if (q.solved_at) {
        const dateStr = new Date(q.solved_at).toLocaleDateString();
        doneDates.add(dateStr);
        if (dateStr === todayStr) {
          todayDone++;
        }
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
  const todayEl = document.getElementById('hdr-today');
  
  if (todayEl) {
    todayEl.textContent = todayDone;
    // target the subtext and progress fill as well
    const todayFill = document.getElementById('today-fill');
    
    if (todayDone === 0) {
      todayEl.classList.remove('today-active');
      if(todayFill) todayFill.style.width = '0%';
    } else {
      todayEl.classList.add('today-active');
      // just a fun visual mapping for the progress bar (maxes visually at 5 problems)
      if(todayFill) todayFill.style.width = Math.min((todayDone / 5) * 100, 100) + '%';
    }
    // Update daily goal ring
    DailyGoal.update(todayDone);
  }

  if (streakEl) {
    let currentStreak = 0;
    
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
    
    // Update text formatting
    streakEl.textContent = currentStreak;
    if (currentStreak > 0) {
      streakEl.classList.add('streak-active');
    } else {
      streakEl.classList.remove('streak-active');
    }
  }

  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('prog-pct').textContent            = pct + '%';
  document.getElementById('prog-easy').style.width   = total ? (easy   / total * 100) + '%' : '0%';
  document.getElementById('prog-medium').style.width = total ? (medium / total * 100) + '%' : '0%';
  document.getElementById('prog-hard').style.width   = total ? (hard   / total * 100) + '%' : '0%';
}
