/**
 * Logout confirmation modal.
 * On confirm: clears localStorage cache, then navigates to /logout
 * which the Netlify edge function handles by clearing the auth cookie
 * and redirecting back to the login page.
 */
import { Cache } from './cache.js';

const OVERLAY_ID  = 'logout-modal';
const LOGOUT_PATH = '/logout';

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

  confirm() {
    Cache.clear();                      // invalidate localStorage cache
    window.location.href = LOGOUT_PATH; // edge fn clears cookie → redirects to /
  },
};
