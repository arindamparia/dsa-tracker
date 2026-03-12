let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isPomodoro = false;

// 25 minutes in ms default
let pomodoroDuration = 25 * 60 * 1000;

export function initStopwatch() {
  document.getElementById('sw-start').addEventListener('click', toggleStopwatch);
  document.getElementById('sw-reset').addEventListener('click', resetStopwatch);
  document.getElementById('sw-mode').addEventListener('click', toggleMode);
  
  const display = document.getElementById('sw-display');
  display.addEventListener('click', () => {
    if (isPomodoro && !timerInterval) {
      PomodoroModal.open();
    }
  });
}

export const PomodoroModal = {
  open() {
    const currentMins = Math.floor(pomodoroDuration / 60000);
    document.getElementById('f-pomodoro-mins').value = currentMins;
    document.getElementById('pomodoro-modal').classList.add('open');
    document.getElementById('f-pomodoro-mins').focus();
  },
  close() {
    document.getElementById('pomodoro-modal').classList.remove('open');
  },
  handleOverlayClick(e) {
    if (e.target === document.getElementById('pomodoro-modal')) this.close();
  },
  confirm() {
    const minInput = document.getElementById('f-pomodoro-mins').value;
    if (minInput && !isNaN(minInput) && parseInt(minInput) > 0) {
      pomodoroDuration = parseInt(minInput) * 60 * 1000;
      elapsedTime = pomodoroDuration;
      updateDisplay(elapsedTime);
      this.close();
    }
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
  btnMode.textContent = isPomodoro ? '🍅 Pomodoro' : '⏱️ Timer';
  
  if (isPomodoro) {
    elapsedTime = pomodoroDuration; // effectively counting down from this
  } else {
    elapsedTime = 0;
  }
  updateDisplay(elapsedTime);
}

function toggleStopwatch() {
  const btnStart = document.getElementById('sw-start');
  if (timerInterval) {
    // Pause
    clearInterval(timerInterval);
    timerInterval = null;
    btnStart.textContent = '▶️';
  } else {
    // Start
    startTime = Date.now();
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
          btnStart.textContent = '▶️';
          window.showToast("Pomodoro finished! Take a break. 🍵", "success");
        }
      } else {
        elapsedTime += diff;
      }
      updateDisplay(elapsedTime);
    }, 100); // 100ms intervals to accurately show tenths of a second
    btnStart.textContent = '⏸️';
  }
}

function resetStopwatch() {
  clearInterval(timerInterval);
  timerInterval = null;
  document.getElementById('sw-start').textContent = '▶️';
  if (isPomodoro) {
    elapsedTime = pomodoroDuration;
  } else {
    elapsedTime = 0;
  }
  updateDisplay(elapsedTime);
}
