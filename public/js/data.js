import { state } from './state.js';
import { Cache, UserCache } from './cache.js';
import { render, renderSkeletonSections } from './render.js';
import { showToast } from './toast.js';
import { buildSearchIndex } from './filters.js';
import { smoothTransition } from './utils.js';

function applyUserProfile(data) {
  state.isSubscribed     = data.is_subscribed     ?? false;
  state.remindersEnabled = data.reminders_enabled ?? false;
  state.reminderEmail    = data.reminder_email    ?? null;
  state.userName         = data.user_name         ?? null;
  state.userPhone        = data.user_phone        ?? null;
  state.userRole         = data.user_role         ?? 'USER';
}

export async function refreshUserSettings() {
  try {
    const res  = await fetch('/.netlify/functions/get-user-settings', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok) return;
    applyUserProfile(data);
    UserCache.set({
      reminders_enabled: data.reminders_enabled,
      reminder_email:    data.reminder_email,
      user_name:         data.user_name,
      user_phone:        data.user_phone,
    });
    const metaEl = document.getElementById('hdr-user-meta');
    if (metaEl && state.userName) metaEl.textContent = state.userName;
  } catch {}
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !UserCache.get()) {
    refreshUserSettings();
  }
});

export async function boot(onReady) {
  const cachedProfile = UserCache.get();
  if (cachedProfile) applyUserProfile(cachedProfile);

  const cached = Cache.get();
  if (cached) {
    state.questions = cached;
    buildSearchIndex();
    smoothTransition(() => {
      renderSkeletonSections();
      onReady?.();
    });
    await refreshUserSettings();
    if (state.questions.length) {
      smoothTransition(() => render());
    }
  } else {
    await bootFresh(onReady);
  }
}

export async function bootFresh(onReady) {
  smoothTransition(() => {
    renderSkeletonSections();
    onReady?.();
  });
  try {
    const res = await fetch('/.netlify/functions/get-questions', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    state.questions = data.questions;
    buildSearchIndex();
    applyUserProfile(data);
    Cache.set(state.questions);
    UserCache.set({
      reminders_enabled: data.reminders_enabled,
      reminder_email:    data.reminder_email,
      user_name:         data.user_name,
      user_phone:        data.user_phone,
    });
    smoothTransition(() => render());
  } catch (err) {
    document.getElementById('sections').innerHTML =
      `<div class="error-msg">⚠ Something went wrong. Please check your connection and try again.<br><br>
       <button class="btn-secondary" onclick="bootFresh()" style="margin:auto;display:block">Try Again</button></div>`;
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
  confirm() {
    this.close();
    Cache.clear();
    setTimeout(async () => {
      await bootFresh();
      showToast('Questions updated ✓', 'success');
    }, 250);
  }
};
