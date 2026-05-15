// PWA install prompt for Android (beforeinstallprompt) and iOS Safari (manual)
export function initPWAInstall() {
  // Don't show if already installed as standalone
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;

  // Don't show if user previously dismissed (7 days for Safari, 3 days for others)
  const isSafariBrowser = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|fxios/i.test(navigator.userAgent);
  const dismissed = localStorage.getItem('dsa_pwa_dismissed');
  if (dismissed) {
    const daysSince = (Date.now() - parseInt(dismissed)) / 86400000;
    if (daysSince < (isSafariBrowser ? 7 : 3)) return;
  }

  let deferredPrompt = null;
  let bannerShown = false;

  // Android / Chrome: capture the native install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!bannerShown) showBanner('android');
  });

  // iOS Safari detection (includes iPadOS which reports as Mac + touch)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|fxios/i.test(navigator.userAgent);

  if (isSafari) {
    // iOS Safari: "Add to Home Screen", macOS Safari: "Add to Dock"
    setTimeout(() => { if (!bannerShown) showBanner(isIOS ? 'ios' : 'macos-safari'); }, 3000);
  }

  // Also listen for successful install
  window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) removeBanner(banner);
  });

  function showBanner(platform) {
    bannerShown = true;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-banner';

    const icon = document.createElement('div');
    icon.className = 'pwa-banner-icon';
    icon.innerHTML = `<svg viewBox="0 0 32 32" width="36" height="36"><rect width="32" height="32" rx="7" fill="#0e0e1a"/><line x1="16" y1="13" x2="9.5" y2="21.5" stroke="#7c6af7" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/><line x1="16" y1="13" x2="22.5" y2="21.5" stroke="#7c6af7" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/><circle cx="16" cy="8.5" r="4.8" fill="#7c6af7"/><circle cx="9.5" cy="24" r="3.8" fill="#7c6af7"/><circle cx="22.5" cy="24" r="3.8" fill="#7c6af7"/></svg>`;

    const text = document.createElement('div');
    text.className = 'pwa-banner-text';

    if (platform === 'ios') {
      // Safari share icon (box with arrow)
      const shareIcon = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-2px;" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5"/></svg>`;
      text.innerHTML = `<strong>Install AlgoTracker</strong><span>Tap ${shareIcon} then <b>"Add to Home Screen"</b></span>`;
    } else if (platform === 'macos-safari') {
      text.innerHTML = `<strong>Install AlgoTracker</strong><span>Go to <b>File → Add to Dock</b> for quick access</span>`;
    } else {
      text.innerHTML = `<strong>Install AlgoTracker</strong><span>Add to your home screen for quick access</span>`;
    }

    const actions = document.createElement('div');
    actions.className = 'pwa-banner-actions';

    if (platform === 'android') {
      const installBtn = document.createElement('button');
      installBtn.className = 'pwa-install-btn';
      installBtn.textContent = 'Install';
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (outcome === 'accepted') {
            removeBanner(banner);
            return;
          }
        }
      });
      actions.appendChild(installBtn);
    }

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'pwa-dismiss-btn';
    dismissBtn.textContent = platform === 'android' ? 'Not now' : 'Got it';
    dismissBtn.addEventListener('click', () => {
      localStorage.setItem('dsa_pwa_dismissed', Date.now().toString());
      removeBanner(banner);
    });
    actions.appendChild(dismissBtn);

    banner.append(icon, text, actions);
    document.body.appendChild(banner);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      banner.classList.add('visible');
    }));
  }

  function removeBanner(banner) {
    banner.classList.remove('visible');
    banner.addEventListener('transitionend', () => banner.remove(), { once: true });
  }
}

// Register service worker
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
