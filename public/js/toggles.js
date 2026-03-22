/**
 * View toggle functions — hide/show tags and solution column globally.
 * Active button (teal) = that column is VISIBLE.
 * Inactive button (muted) = that column is HIDDEN.
 */
import { state } from './state.js';
import { smoothTransition } from './utils.js';

// Cache keys and 24-hour expiration threshold
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
      // Check 24-hour expiration
      if (Date.now() - parsed.timestamp < ONE_DAY_MS) {
        state.hideTags = !!parsed.hideTags;
        state.hideSolution = !!parsed.hideSolution;
        state.hideNotes = !!parsed.hideNotes;
        state.hideCompanies = parsed.hideCompanies !== false; // default hidden
      }
    }
  } catch {
  }

  // Apply state to DOM initially
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

// ── Theme (dark / light) ──────────────────────────────────────────────────
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem(THEME_KEY, 'light');
  }
  const btn = document.getElementById('toggle-theme');
  if (btn) {
    btn.classList.add('theme-fab-spin');
    btn.addEventListener('animationend', () => btn.classList.remove('theme-fab-spin'), { once: true });
  }
}
