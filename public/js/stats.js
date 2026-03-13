/** Updates stat cards, progress bar, and section mini-progress. */
import { state } from './state.js';
import { groupBySections, smoothTransition } from './utils.js';
import { DailyGoal } from './daily-goal.js';

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

  smoothTransition(() => {
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

    if (todayEl) {
      todayEl.textContent = todayDone;
      const todayFill = document.getElementById('today-fill');
      
      if (todayDone === 0) {
        todayEl.classList.remove('today-active');
        if(todayFill) todayFill.style.width = '0%';
      } else {
        todayEl.classList.add('today-active');
        if(todayFill) todayFill.style.width = Math.min((todayDone / 5) * 100, 100) + '%';
      }
      DailyGoal.update(todayDone);
    }

    if (streakEl) {
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
  });
}
