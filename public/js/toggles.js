import { state } from './state.js';
import { smoothTransition } from './utils.js';
import { animate } from './motion.js';

const TOGGLE_CACHE_KEY = 'dsa_toggles';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THEME_KEY = 'dsa_theme';

function saveToggles() {
  const data = {
    hideTags: state.hideTags,
    hideSolution: state.hideSolution,
    hideNotes: state.hideNotes,
    hideCompanies: state.hideCompanies,
    timestamp: Date.now()
  };
  localStorage.setItem(TOGGLE_CACHE_KEY, JSON.stringify(data));
}

export function initToggles() {
  try {
    const cached = localStorage.getItem(TOGGLE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < ONE_DAY_MS) {
        state.hideTags = !!parsed.hideTags;
        state.hideSolution = !!parsed.hideSolution;
        state.hideNotes = !!parsed.hideNotes;
        state.hideCompanies = parsed.hideCompanies !== false;
      }
    }
  } catch {}

  document.body.classList.toggle('tags-hidden',      state.hideTags);
  document.body.classList.toggle('topic-hidden',     state.hideTags);
  document.body.classList.toggle('solution-hidden',  state.hideSolution);
  document.body.classList.toggle('notes-hidden',     state.hideNotes);
  document.body.classList.toggle('companies-hidden', state.hideCompanies);

  const btnTags      = document.getElementById('toggle-tags');
  const btnSol       = document.getElementById('toggle-sol');
  const btnNotes     = document.getElementById('toggle-notes');
  const btnCompanies = document.getElementById('toggle-companies');

  if (btnTags)      btnTags.classList.toggle('active', !state.hideTags);
  if (btnSol)       btnSol.classList.toggle('active', !state.hideSolution);
  if (btnNotes)     btnNotes.classList.toggle('active', !state.hideNotes);
  if (btnCompanies) btnCompanies.classList.toggle('active', !state.hideCompanies);
}

export function toggleTags(btn) {
  smoothTransition(() => {
    state.hideTags = !state.hideTags;
    document.body.classList.toggle('tags-hidden',   state.hideTags);
    document.body.classList.toggle('topic-hidden',  state.hideTags);
    btn.classList.toggle('active', !state.hideTags);
    saveToggles();
  });
}

export function toggleSolution(btn) {
  smoothTransition(() => {
    state.hideSolution = !state.hideSolution;
    document.body.classList.toggle('solution-hidden', state.hideSolution);
    btn.classList.toggle('active', !state.hideSolution);
    saveToggles();
  });
}

export function toggleNotes(btn) {
  smoothTransition(() => {
    state.hideNotes = !state.hideNotes;
    document.body.classList.toggle('notes-hidden', state.hideNotes);
    btn.classList.toggle('active', !state.hideNotes);
    saveToggles();
  });
}

export function toggleCompanies(btn) {
  smoothTransition(() => {
    state.hideCompanies = !state.hideCompanies;
    document.body.classList.toggle('companies-hidden', state.hideCompanies);
    btn.classList.toggle('active', !state.hideCompanies);
    saveToggles();
  });
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function toggleTheme() {
  const btn = document.getElementById('toggle-theme');
  if (btn) {
    animate(btn, { rotate: [0, 200, 360], scale: [1, 0.82, 1] }, { duration: 0.5, easing: [0.4, 0, 0.2, 1] });
  }

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const switchTheme = () => {
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem(THEME_KEY, 'light');
    }
  };

  if (!document.startViewTransition || window.innerWidth <= 768) {
    document.documentElement.classList.add('theme-fading');
    switchTheme();
    setTimeout(() => {
      document.documentElement.classList.remove('theme-fading');
    }, 350);
    return;
  }

  const rect = btn?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  document.documentElement.classList.add('theme-transition');
  const transition = document.startViewTransition(switchTheme);

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 500,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        pseudoElement: '::view-transition-new(root)'
      }
    );
  }).catch(() => {});

  transition.finished.then(() => {
    document.documentElement.classList.remove('theme-transition');
  }).catch(() => {
    document.documentElement.classList.remove('theme-transition');
  });
}
