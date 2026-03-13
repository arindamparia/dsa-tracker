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

function saveToggles() {
  const data = {
    hideTags: state.hideTags,
    hideSolution: state.hideSolution,
    hideNotes: state.hideNotes,
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
      }
    }
  } catch (err) {
    console.error('Failed to parse toggle cache', err);
  }

  // Apply state to DOM initially
  document.body.classList.toggle('tags-hidden',   state.hideTags);
  document.body.classList.toggle('topic-hidden',  state.hideTags);
  document.body.classList.toggle('solution-hidden', state.hideSolution);
  document.body.classList.toggle('notes-hidden', state.hideNotes);

  const btnTags = document.getElementById('toggle-tags');
  const btnSol = document.getElementById('toggle-sol');
  const btnNotes = document.getElementById('toggle-notes');

  if (btnTags) btnTags.classList.toggle('active', !state.hideTags);
  if (btnSol) btnSol.classList.toggle('active', !state.hideSolution);
  if (btnNotes) btnNotes.classList.toggle('active', !state.hideNotes);
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
