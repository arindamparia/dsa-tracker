/**
 * Logout confirmation modal.
 * On confirm: clears localStorage cache, then signs out via Clerk.
 * Clerk clears the session cookie; after signOut() the page reloads
 * and Clerk JS redirects to the sign-in page automatically.
 */
import { Cache, UserCache, HintCache, SimilarCache } from './cache.js';
import { signOut } from './auth.js';

const OVERLAY_ID = 'logout-modal';

export const Logout = {
  open() {
    document.getElementById(OVERLAY_ID).classList.add('open');
  },

  close() {
    document.getElementById(OVERLAY_ID).classList.remove('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById(OVERLAY_ID)) this.close();
  },

  async confirm() {
    Cache.clear();
    UserCache.clear();
    HintCache.clear();
    SimilarCache.clear();
    await signOut();
  },
};
