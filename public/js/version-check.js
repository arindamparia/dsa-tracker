/**
 * Version Check — hybrid approach
 * 1. Polls HEAD /index.html every 5 mins to auto-detect any deploy via ETag changes.
 * 2. If ETag changes, fetches /version.json to check if it's a mandatory update.
 */
import { animate } from './motion.js';

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

async function getVersionInfo() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function showMandatoryUpdate(message) {
  if (bannerShown) return;
  bannerShown = true;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '999999';
  overlay.innerHTML = `
    <div class="modal" style="max-width:340px;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">🚨</div>
      <div class="modal-title">Critical Update Required</div>
      <div class="modal-sub" style="margin-bottom:20px;">
        ${message || 'A breaking change or critical fix has been deployed. You must reload to continue using the app.'}
      </div>
      <button class="btn-submit" onclick="location.reload(true)" style="width:100%">Reload to Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showUpdateBanner(message) {
  if (bannerShown) return;
  bannerShown = true;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <span class="update-banner-icon">🚀</span>
    <span class="update-banner-text">${message || 'New version available'}</span>
    <button class="update-banner-btn" onclick="location.reload(true)">Refresh</button>
    <button class="update-banner-close" onclick="this.closest('#update-banner').remove()" aria-label="Dismiss">✕</button>
  `;
  document.body.appendChild(banner);
  banner.style.pointerEvents = 'auto';
  const isMobile = window.innerWidth <= 600;
  animate(banner,
    { opacity: [0, 1], transform: isMobile
        ? ['translateY(80px)', 'translateY(0)']
        : ['translateX(-50%) translateY(80px)', 'translateX(-50%) translateY(0)'] },
    { type: "spring", stiffness: 300, damping: 25 }
  );
}

async function checkVersion() {
  const etag = await getEtag();
  if (!etag) return;

  if (currentEtag === null) {
    currentEtag = etag;
    return;
  }

  // If a deploy occurred
  if (etag !== currentEtag) {
    const info = await getVersionInfo();
    
    if (info && info.force_refresh) {
      showMandatoryUpdate(info.message);
    } else {
      showUpdateBanner(info ? info.message : 'New version available');
    }
    
    // Update ETag so we don't keep triggering
    currentEtag = etag;
  }
}

// Kick off
checkVersion();
setInterval(checkVersion, POLL_INTERVAL);

// Also check when user returns to a sleeping/backgrounded tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkVersion();
});
