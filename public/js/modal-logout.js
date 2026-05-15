/**
 * Logout confirmation modal.
 * On confirm: clears localStorage cache, then signs out via Clerk.
 * Clerk clears the session cookie; after signOut() the page reloads
 * and Clerk JS redirects to the sign-in page automatically.
 */
import { signOut } from './auth.js';
import { lockScroll, unlockScroll } from './utils.js';

const OVERLAY_ID = 'logout-modal';

export const Logout = {
  open() {
    lockScroll();
    document.getElementById(OVERLAY_ID).classList.add('open');
  },

  close() {
    document.getElementById(OVERLAY_ID).classList.remove('open');
    unlockScroll();
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById(OVERLAY_ID)) this.close();
  },

  async confirm() {
    localStorage.clear();
    await signOut();
  },
};
