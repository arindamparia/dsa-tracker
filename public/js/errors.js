/**
 * Central error handler.
 *
 * Usage: handleError(err, 'Friendly message for the user')
 *
 * Rules:
 *  - AbortError (cancelled in-flight request) → always silent
 *  - Network failure (TypeError / offline) → connection message
 *  - Everything else → the caller-supplied friendly message
 *  - Never exposes err.message or technical details to the user
 */
import { showToast } from './toast.js';

export function handleError(err, message = 'Something went wrong. Please try again.') {
  if (!err || err.name === 'AbortError') return;

  const msg = (!navigator.onLine || (err instanceof TypeError && /fetch|network/i.test(err.message)))
    ? 'No internet connection. Please check your connection and try again.'
    : message;

  showToast(msg, 'error');
}
