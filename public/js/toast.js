/** Ephemeral bottom-right notifications. */
let _timer = null;

export function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = type ? `show ${type}` : 'show';
  clearTimeout(_timer);
  _timer = setTimeout(() => { t.className = ''; }, 2500);
}
