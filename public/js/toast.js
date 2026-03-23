/** Ephemeral bottom-right notifications. */
import { animate } from './motion.js';

let _timer = null;
let _hideAnim = null;

export function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = type || '';

  clearTimeout(_timer);
  _hideAnim?.stop();

  animate(t, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, easing: 'ease-out' });

  _timer = setTimeout(() => {
    _hideAnim = animate(t, { opacity: 0, y: 10 }, { duration: 0.25, easing: 'ease-in' });
  }, 2500);
}
