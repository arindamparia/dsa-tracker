import { state } from './state.js';
import { Cache, UserCache } from './cache.js';
import { render, renderSkeletonSections } from './render.js';
import { showToast } from './toast.js';
import { buildSearchIndex } from './filters.js';
import { smoothTransition, lockScroll, unlockScroll } from './utils.js';

const PROGRESS_FIELDS = ['is_done','solution','notes','needs_review','time_complexity',
  'space_complexity','ai_analysis','srs_interval_index','srs_last_reviewed_at','updated_at','solved_at'];

async function revalidateProgress() {
  if (!window._clerk?.user) return;
  try {
    const res = await fetch('/.netlify/functions/get-progress', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.progress)) return;

    const map = Object.fromEntries(data.progress.map(p => [p.lc_number, p]));

    let changed = false;
    for (const q of state.questions) {
      const p = map[q.lc_number];
      if (!p) continue;
      for (const f of PROGRESS_FIELDS) {
        if (q[f] !== p[f]) { q[f] = p[f]; changed = true; }
      }
    }

    Cache.touchProgress();
    if (changed) {
      Cache.set(state.questions);
      smoothTransition(() => render());
    }
  } catch {}
}

function applyUserProfile(data) {
  state.isSubscribed     = data.is_subscribed     ?? false;
  state.remindersEnabled = data.reminders_enabled ?? false;
  state.reminderEmail    = data.reminder_email    ?? null;
  state.userName         = data.user_name         ?? null;
  state.userPhone        = data.user_phone        ?? null;
  state.userRole         = data.user_role         ?? 'USER';
  state.clerkName        = data.clerk_name        ?? null;
}

export async function refreshUserSettings() {
  if (!window._clerk?.user) return;
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
      clerk_name:        data.clerk_name,
      user_role:         data.user_role,
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
    // Render immediately from cache — don't block on user settings
    if (state.questions.length) {
      smoothTransition(() => render());
    }
    // Background progress revalidation if stale (>15 min)
    if (Cache.isProgressStale()) {
      revalidateProgress();
    }
    // Fire-and-forget — only affects admin buttons + header name, not content
    refreshUserSettings();
  } else {
    await bootFresh(onReady);
  }
}

export async function bootFresh(onReady) {
  if (!window._clerk?.user) return;
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
    Cache.set(state.questions);
    Cache.touchProgress(); // fresh load counts as progress revalidation
    smoothTransition(() => render());
    // Fire-and-forget — only affects admin buttons + header name, not content
    refreshUserSettings();
  } catch (err) {
    document.getElementById('sections').innerHTML =
      `<div class="error-msg">⚠ Something went wrong. Please check your connection and try again.<br><br>
       <button class="btn-secondary" onclick="bootFresh()" style="margin:auto;display:block">Try Again</button></div>`;
  }
}

export const RefreshModal = {
  open() {
    lockScroll();
    document.getElementById('refresh-modal').classList.add('open');
  },
  close() {
    document.getElementById('refresh-modal').classList.remove('open');
    unlockScroll();
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
