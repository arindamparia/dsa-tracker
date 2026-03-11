/**
 * View toggle functions — hide/show tags and solution column globally.
 * Active button (teal) = that column is VISIBLE.
 * Inactive button (muted) = that column is HIDDEN.
 */
import { state } from './state.js';

export function toggleTags(btn) {
  state.hideTags = !state.hideTags;
  document.body.classList.toggle('tags-hidden', state.hideTags);
  btn.classList.toggle('active', !state.hideTags);
}

export function toggleSolution(btn) {
  state.hideSolution = !state.hideSolution;
  document.body.classList.toggle('solution-hidden', state.hideSolution);
  btn.classList.toggle('active', !state.hideSolution);
}
