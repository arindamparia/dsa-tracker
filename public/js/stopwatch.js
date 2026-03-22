let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isPomodoro = false;
let isLocked = false; // Used to lock controls when managed externally (Focus Mode)

// 25 minutes in ms default
let pomodoroDuration = 25 * 60 * 1000;

export function initStopwatch() {
  document.getElementById('sw-start').addEventListener('click', () => { if (!isLocked) toggleStopwatch() });
  document.getElementById('sw-reset').addEventListener('click', () => { if (!isLocked) resetStopwatch() });
  document.getElementById('sw-mode').addEventListener('click', () => { if (!isLocked) toggleMode() });

  // Minimize button
  document.getElementById('sw-minimize').addEventListener('click', () => toggleMinimize());

  // Click the minimized pill to restore
  document.getElementById('timer-hang').addEventListener('click', (e) => {
    const hang = document.getElementById('timer-hang');
    if (hang.classList.contains('minimized') && e.target === document.getElementById('sw-display')) {
      toggleMinimize();
    }
  });

  // Restore minimized state from localStorage
  if (localStorage.getItem('dsa_timer_minimized') === '1') {
    document.getElementById('timer-hang').classList.add('minimized');
  }

  const display = document.getElementById('sw-display');
  display.addEventListener('click', () => {
    const hang = document.getElementById('timer-hang');
    if (hang.classList.contains('minimized')) return; // handled above
    if (isPomodoro && !timerInterval) PomodoroModal.open();
  });
}

function toggleMinimize() {
  const hang = document.getElementById('timer-hang');
  const minimized = hang.classList.toggle('minimized');
  localStorage.setItem('dsa_timer_minimized', minimized ? '1' : '0');
}

export const PomodoroModal = {
  open() {
    const totalMins = Math.round(pomodoroDuration / 60000);
    const hrs  = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const hrsEl  = document.getElementById('f-pomodoro-hrs');
    const minsEl = document.getElementById('f-pomodoro-mins');
    const errEl  = document.getElementById('f-pomodoro-error');
    if (hrsEl)  hrsEl.value  = hrs  > 0 ? hrs  : '';
    if (minsEl) minsEl.value = mins > 0 ? mins : (hrs === 0 ? '25' : '');
    if (errEl)  errEl.textContent = '';
    document.getElementById('pomodoro-modal').classList.add('open');

    // Enforce integer-only clamping live as user types
    [hrsEl, minsEl].forEach(el => {
      if (!el) return;
      el.oninput = () => {
        // Strip decimals immediately
        let raw = el.value.replace(/[^0-9]/g, '');
        const num = parseInt(raw, 10);
        const max = parseInt(el.max, 10);
        if (!isNaN(num) && num > max) raw = String(max);
        if (raw !== el.value) el.value = raw;
        if (errEl) errEl.textContent = '';
      };
      el.onkeydown = (e) => {
        // Block dot, comma, minus, e (scientific notation)
        if (['.', ',', '-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
      };
    });

    // Wire +/- step buttons
    document.querySelectorAll('.pomo-step-btn').forEach(btn => {
      btn.onclick = () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const dir = parseInt(btn.dataset.dir, 10);
        const min = parseInt(target.min, 10);
        const max = parseInt(target.max, 10);
        const cur = parseInt(target.value, 10) || 0;
        const next = Math.max(min, Math.min(max, cur + dir));
        target.value = next;
        if (errEl) errEl.textContent = '';
      };
    });

    if (minsEl) minsEl.focus();
  },
  close() {
    document.getElementById('pomodoro-modal').classList.remove('open');
  },
  handleOverlayClick(e) {
    if (e.target === document.getElementById('pomodoro-modal')) this.close();
  },
  confirm() {
    const hrsRaw  = document.getElementById('f-pomodoro-hrs')?.value  ?? '0';
    const minsRaw = document.getElementById('f-pomodoro-mins')?.value ?? '0';
    const errEl   = document.getElementById('f-pomodoro-error');

    const hrs  = Math.floor(Math.max(0, Math.min(5,  parseInt(hrsRaw,  10) || 0)));
    const mins = Math.floor(Math.max(0, Math.min(59, parseInt(minsRaw, 10) || 0)));
    const totalMins = hrs * 60 + mins;

    if (totalMins < 1) {
      if (errEl) errEl.textContent = 'Set at least 1 minute.';
      return;
    }
    if (hrs > 5 || (hrs === 5 && mins > 0)) {
      if (errEl) errEl.textContent = 'Maximum is 5 hours 0 minutes.';
      return;
    }

    pomodoroDuration = totalMins * 60 * 1000;
    elapsedTime = pomodoroDuration;
    updateDisplay(elapsedTime);
    this.close();
  }
};

function updateDisplay(time) {
  const display = document.getElementById('sw-display');
  const totalSeconds = Math.floor(time / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((time % 1000) / 100); // 0-9
  
  let text = '';
  if (hours > 0) {
    text += `${hours}h ${minutes}m `;
  } else if (minutes > 0) {
    text += `${minutes}m `;
  }
  text += `${seconds}.${millis}s`;
  
  display.textContent = text;
  display.style.cursor = (isPomodoro && !timerInterval) ? 'pointer' : 'default';
  display.title = (isPomodoro && !timerInterval) ? 'Click to edit duration' : '';
}

function toggleMode() {
  if (timerInterval) return; // don't switch while running
  isPomodoro = !isPomodoro;
  const btnMode = document.getElementById('sw-mode');
  btnMode.textContent = isPomodoro ? '🍅' : '⏱';
  
  if (isPomodoro) {
    elapsedTime = pomodoroDuration; // effectively counting down from this
  } else {
    elapsedTime = 0;
  }
  updateDisplay(elapsedTime);
}

export function toggleStopwatch(forceState = null) {
  const btnStart = document.getElementById('sw-start');
  
  if (forceState === 'start' && timerInterval) return;
  if (forceState === 'stop' && !timerInterval) return;

  if (timerInterval) {
    // Pause
    clearInterval(timerInterval);
    timerInterval = null;
    btnStart.textContent = '▶';
  } else {
    // Start
    startTime = Date.now();
    btnStart.textContent = '⏸'; // Moved up so UI immediately reflects it
    
    timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      startTime = now;
      
      if (isPomodoro) {
        elapsedTime -= diff;
        if (elapsedTime <= 0) {
          elapsedTime = 0;
          clearInterval(timerInterval);
          timerInterval = null;
          btnStart.textContent = '▶';
          if (window.showToast) window.showToast("Pomodoro finished! Take a break. 🍵", "success");
        }
      } else {
        elapsedTime += diff;
      }
      updateDisplay(elapsedTime);
    }, 100); // 100ms intervals to accurately show tenths of a second
  }
}

export function resetStopwatch() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById('sw-start').textContent = '▶';
  if (isPomodoro) {
    elapsedTime = pomodoroDuration;
  } else {
    elapsedTime = 0;
  }
  updateDisplay(elapsedTime);
}

export function setStopwatchLock(locked) {
  isLocked = locked;
  const ctrls = document.querySelectorAll('.sw-btn');
  ctrls.forEach(c => {
    c.style.opacity = locked ? '0.3' : '1';
    c.style.cursor = locked ? 'not-allowed' : 'pointer';
  });
}
