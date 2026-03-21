/** Data fetching — boot from cache or API, hard refresh. */
import { state } from './state.js';
import { Cache } from './cache.js';
import { render, renderSkeletonSections } from './render.js';
import { showToast } from './toast.js';

export async function boot() {
  const cached = Cache.get();
  if (cached) { state.questions = cached; render(); return; }
  return bootFresh();
}

export async function bootFresh() {
  renderSkeletonSections();
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

export const RefreshModal = {
  open() {
    document.getElementById('refresh-modal').classList.add('open');
  },
  close() {
    document.getElementById('refresh-modal').classList.remove('open');
  },
  handleOverlayClick(e) {
    if (e.target === document.getElementById('refresh-modal')) this.close();
  },
  async confirm() {
    this.close();
    Cache.clear();
    await bootFresh();
    showToast('Questions refreshed from database ✓', 'success');
  }
};
