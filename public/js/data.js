/** Data fetching — boot from cache or API, hard refresh. */
import { state } from './state.js';
import { Cache, UserCache } from './cache.js';
import { render, renderSkeletonSections } from './render.js';
import { showToast } from './toast.js';

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
      is_subscribed:     data.is_subscribed,
      reminders_enabled: data.reminders_enabled,
      reminder_email:    data.reminder_email,
      user_name:         data.user_name,
      user_phone:        data.user_phone,
      user_role:         data.user_role,
    });
    const metaEl = document.getElementById('hdr-user-meta');
    if (metaEl && state.userName) metaEl.textContent = state.userName;
  } catch {}
}

export async function boot() {
  const cachedProfile = UserCache.get();
  if (cachedProfile) applyUserProfile(cachedProfile);

  const cached = Cache.get();
  if (cached) {
    state.questions = cached;
    render();
    if (!cachedProfile) await refreshUserSettings();
  } else {
    await bootFresh();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !UserCache.get()) {
      refreshUserSettings();
    }
  });
}

export async function bootFresh() {
  renderSkeletonSections();
  try {
    const res = await fetch('/.netlify/functions/get-questions', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    state.questions = data.questions;
    applyUserProfile(data);
    Cache.set(state.questions);
    UserCache.set({
      is_subscribed:     data.is_subscribed,
      reminders_enabled: data.reminders_enabled,
      reminder_email:    data.reminder_email,
      user_name:         data.user_name,
      user_phone:        data.user_phone,
      user_role:         data.user_role,
    });
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
