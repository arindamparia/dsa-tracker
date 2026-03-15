/**
 * Version Check — polls HEAD /index.html every 5 min.
 * When Netlify redeploys, the ETag changes → shows refresh banner.
 */

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
let currentEtag = null;
let bannerShown = false;

async function getEtag() {
  try {
    const res = await fetch('/index.html', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return res.headers.get('etag') || res.headers.get('last-modified') || null;
  } catch {
    return null;
  }
}

function showUpdateBanner() {
  if (bannerShown) return;
  bannerShown = true;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <span class="update-banner-icon">🚀</span>
    <span class="update-banner-text">New version available</span>
    <button class="update-banner-btn" onclick="location.reload()">Refresh</button>
    <button class="update-banner-close" onclick="this.closest('#update-banner').remove()" aria-label="Dismiss">✕</button>
  `;
  document.body.appendChild(banner);

  // animate in
  requestAnimationFrame(() => banner.classList.add('update-banner-show'));
}

async function checkVersion() {
  const etag = await getEtag();
  if (!etag) return;

  if (currentEtag === null) {
    currentEtag = etag;
    return;
  }

  if (etag !== currentEtag) {
    showUpdateBanner();
  }
}

// Kick off
checkVersion();
setInterval(checkVersion, POLL_INTERVAL);

// Also check when user returns to a sleeping/backgrounded tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkVersion();
});
