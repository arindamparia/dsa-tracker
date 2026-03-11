/** Data fetching — boot from cache or API, hard refresh. */
import { state } from './state.js';
import { Cache } from './cache.js';
import { render } from './render.js';
import { showToast } from './toast.js';

export async function boot() {
  const cached = Cache.get();
  if (cached) { state.questions = cached; render(); return; }
  return bootFresh();
}

export async function bootFresh() {
  try {
    const res = await fetch('/.netlify/functions/get-questions', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    state.questions = data.questions;
    Cache.set(state.questions);
    render();
  } catch (err) {
    document.getElementById('sections').innerHTML =
      `<div class="error-msg">⚠ Failed to load: ${err.message}<br><br>
       <button class="btn-secondary" onclick="bootFresh()" style="margin:auto;display:block">Retry</button></div>`;
  }
}

export async function hardRefresh() {
  if (!confirm('Re-fetch all questions from the database?\nThis will override your local cache.')) return;
  Cache.clear();
  document.getElementById('sections').innerHTML =
    '<div class="loading-msg"><span class="loading-dots">Loading questions</span></div>';
  await bootFresh();
  showToast('Questions refreshed from database ✓', 'success');
}
