import { animate, stagger } from './motion.js';
import { lockScroll, unlockScroll } from './utils.js';
import { initAuth, getToken, getUserEmail, getUserName } from './auth.js';
import { boot, bootFresh, RefreshModal } from './data.js';
import { Cache, UserCache, HintCache, SimilarCache } from './cache.js';
import { state } from './state.js';
import { toggleSection, preloadSection } from './render.js';
import { setDiffFilter, setStatusFilter, applyFilters, pickRandom } from './filters.js';
import { toggleCheck, debounceSave, debounceNotesSave, toggleReview, saveComplexity } from './progress.js';
import { initToggles, initTheme, toggleTags, toggleSolution, toggleNotes, toggleCompanies, toggleTheme } from './toggles.js';
import { AddQuestionModal } from './modal-add.js';
import { SolutionModal } from './modal-solution.js';
import { ReportModal } from './modal-report.js';
import { Logout } from './modal-logout.js';
import { ResetModal } from './reset.js';
import { showToast } from './toast.js';
import { initStopwatch, PomodoroModal } from './stopwatch.js';
import { initReveal } from './reveal.js';
import { initMotivation } from './quotes.js';
import { SRS } from './spaced-repetition.js';
import { MasteryChart } from './mastery-chart.js';
import { DailyGoal } from './daily-goal.js';
import { FocusMode } from './focus-mode.js';
import { SimilarProblems } from './similar-problems.js';
import { AI } from './ai.js';
import { CompanyFilter } from './company-filter.js';
import { CompanyStats } from './company-stats.js';
import { UserSettings, UserProfile } from './user-settings.js';
import './smart-queue.js';
import './weakness-heatmap.js';
import { restoreSession } from './mock-interview.js';
import { AmbientSound } from './ambient.js';
import { initPWAInstall, registerSW } from './pwa-install.js';
import { startPerfWatch } from './perf-watch.js';
import { FeedbackModal, ViewFeedbackModal } from './feedback.js';

/* ── Admin Panel ──────────────────────────────────────────────────
   I got tired of deploying to send an announcement. This adds a button 
   only I can see (state.userRole === 'ADMIN') to broadcast messages.
   Total jugaad, but it works.
   ─────────────────────────────────────────────────────────────── */
const AdminPanel = {
  _id: 'admin-panel-modal',
  _searchTimer: null,
  _userCache: null,

  open() {
    lockScroll();
    document.getElementById(this._id).classList.add('open');
  },
  close() {
    this.closeUserManager();
    document.getElementById(this._id).classList.remove('open');
    unlockScroll();
  },
  handleOverlayClick(e) {
    if (e.target === document.getElementById(this._id)) this.close();
  },

  openUserManager() {
    const drawer = document.getElementById('ap-user-manager');
    const grid   = document.querySelector('.admin-panel-grid');
    if (drawer) drawer.style.display = 'block';
    if (grid)   grid.style.display   = 'none';
    this._userCache = null;
    const searchEl = document.getElementById('ap-user-search');
    if (searchEl) searchEl.value = '';
    this.searchUsers('');
  },

  closeUserManager() {
    const drawer = document.getElementById('ap-user-manager');
    const grid   = document.querySelector('.admin-panel-grid');
    if (drawer) drawer.style.display = 'none';
    if (grid)   grid.style.display   = '';
  },

  onSearchInput(val) {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.searchUsers(val.trim()), 300);
  },

  async searchUsers(q) {
    const list = document.getElementById('ap-user-list');
    if (!list) return;

    // Show skeleton shimmer while fetching
    list.innerHTML = Array(4).fill(0).map(() => `
      <div class="ap-skeleton-row" style="display:flex;align-items:center;gap:12px;background:var(--surface3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--skeleton-base, rgba(255,255,255,0.06));flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="height:12px;width:55%;border-radius:4px;background:var(--skeleton-base, rgba(255,255,255,0.06));margin-bottom:7px;"></div>
          <div style="height:10px;width:75%;border-radius:4px;background:var(--skeleton-base, rgba(255,255,255,0.04));"></div>
        </div>
        <div style="width:44px;height:24px;border-radius:12px;background:var(--skeleton-base, rgba(255,255,255,0.06));flex-shrink:0;"></div>
      </div>`
    ).join('');

    // Pulse the skeletons
    list.querySelectorAll('.ap-skeleton-row').forEach((el, i) => {
      el.animate(
        [{ opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 }],
        { duration: 1400, delay: i * 120, iterations: Infinity, easing: 'ease-in-out' }
      );
    });

    try {
      const url  = '/.netlify/functions/admin-users' + (q ? `?q=${encodeURIComponent(q)}` : '');
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      this._userCache = data.users;
      this.renderUsers(data.users);
    } catch (err) {
      list.innerHTML = `<div style="text-align:center;padding:28px;color:var(--hard);font-size:13px;">\u26a0 ${err.message}</div>`;
    }
  },

  _buildUserCard(u) {
    const initial  = (u.name || u.email || '?')[0].toUpperCase();
    const name     = u.name || '\u2014';
    const lastSeen = u.last_active ? _apTimeAgo(new Date(u.last_active)) : 'never';
    const aiOn     = u.ai_access;
    const dailyLim = u.ai_daily_limit ?? 4;
    const safeKey  = u.email.replace(/[^a-z0-9]/gi, '_');
    const roleChip = u.role === 'ADMIN'
      ? `<span style="font-size:9px;font-weight:700;letter-spacing:0.05em;background:rgba(255,71,87,0.12);color:#ff4757;border:1px solid rgba(255,71,87,0.3);border-radius:10px;padding:1px 7px;">ADMIN</span>`
      : '';

    const el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;gap:12px;background:var(--surface3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;opacity:0;transform:translateY(8px);transition:opacity 0.22s ease,transform 0.22s ease;';
    el.innerHTML = `
      <div style="width:36px;height:36px;border-radius:50%;background:rgba(124,106,247,0.15);border:1px solid rgba(124,106,247,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#7c6af7;flex-shrink:0;">${initial}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <span style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;" title="${name}">${name}</span>
          ${roleChip}
        </div>
        <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${u.email}">${u.email}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;opacity:0.65;">Active ${lastSeen} &nbsp;&middot;&nbsp; Daily limit: <b style="color:var(--text-dim);">${dailyLim}/day</b></div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">AI</span>
          <button onclick="AdminPanel.setAIAccess('${u.email}', ${!aiOn})"
            style="width:44px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:background 0.25s;background:${aiOn ? '#06d6a0' : 'var(--border2)'};position:relative;outline:none;"
            title="${aiOn ? 'Revoke AI access' : 'Grant AI access'}"
            id="ap-ai-tog-${safeKey}"
          ><span style="position:absolute;top:2px;left:${aiOn ? '22px' : '2px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:left 0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.3);" id="ap-ai-knob-${safeKey}"></span></button>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">Limit</span>
          <select onchange="AdminPanel.setDailyLimit('${u.email}', +this.value)"
            style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:11px;padding:2px 5px;outline:none;cursor:pointer;">
            ${[1,2,3,4,5,6,8,10,15,20].map(n => `<option value="${n}"${n === dailyLim ? ' selected' : ''}>${n}/day</option>`).join('')}
          </select>
        </div>
      </div>`;
    return el;
  },

  renderUsers(users) {
    const list  = document.getElementById('ap-user-list');
    const total = document.getElementById('ap-user-total');
    if (!list) return;
    if (total) total.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;

    if (users.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-muted);font-size:13px;">No users found</div>`;
      return;
    }

    // Clear list and insert cards staggered via RAF — no layout thrashing
    list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const cards = users.map(u => this._buildUserCard(u));
    cards.forEach(c => fragment.appendChild(c));
    list.appendChild(fragment); // single DOM write

    // Animate in each card with a staggered delay using RAF
    cards.forEach((card, i) => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, i * 40); // 40ms stagger — fast enough to feel fluid, slow enough to see
      });
    });
  },

  async setAIAccess(email, value) {
    const safeKey = email.replace(/[^a-z0-9]/gi, '_');
    const btn = document.getElementById(`ap-ai-tog-${safeKey}`);
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    try {
      const res  = await fetch('/.netlify/functions/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_ai_access', target_email: email, value }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (this._userCache) {
        const u = this._userCache.find(x => x.email === email);
        if (u) u.ai_access = value;
        this.renderUsers(this._userCache);
      }
      showToast(`AI access ${value ? 'granted \u2713' : 'revoked'} \u2014 ${email}`, value ? 'success' : 'info');
    } catch (err) {
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      showToast(`Failed: ${err.message}`, 'error');
    }
  },

  async setDailyLimit(email, limit) {
    try {
      const res  = await fetch('/.netlify/functions/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_daily_limit', target_email: email, value: limit }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (this._userCache) {
        const u = this._userCache.find(x => x.email === email);
        if (u) u.ai_daily_limit = limit;
      }
      showToast(`Daily limit \u2192 ${limit}/day \u2014 ${email}`, 'success');
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  },

  async sendBroadcast() {
    const btn = document.getElementById('ap-broadcast-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending\u2026'; }
    try {
      const res  = await fetch('/.netlify/functions/trigger-broadcast', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showToast(`Broadcast sent to ${data.sent} / ${data.total} users`, 'success');
      } else {
        showToast(data.error || 'Broadcast failed', 'error');
      }
    } catch (err) {
      showToast('Broadcast failed', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
    }
  },
};

function _apTimeAgo(date) {
  const s = Math.floor((Date.now() - date) / 1000);
  if (s < 60)      return 'just now';
  if (s < 3600)    return `${Math.floor(s/60)}m ago`;
  if (s < 86400)   return `${Math.floor(s/3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`;
  return `${Math.floor(s/2592000)}mo ago`;
}

/* ── Deferred CSS loader ──────────────────────────────────────────
   Lighthouse was yelling at me about render-blocking CSS. We rip out 
   all the heavy widget CSS from the <head> and inject it here after the 
   first paint. Speeds up the initial load by a lot.
   ─────────────────────────────────────────────────────────────── */
function _loadCSS(name) {
  const href = `css/${name}.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadDeferredCSS() {
  // Always load these after first render (they power always-visible widgets)
  ['ambient', 'mastery-chart', 'focus-mode', 'company',
   'mock-interview', 'weakness-heatmap', 'learning-material',
   'smart-queue',  // card is created dynamically on interaction, never in initial HTML
  ].forEach(_loadCSS);
}

// If the user has 'lite' mode on, intercept every smooth scroll request and 
// snap it instantly. Much easier than passing a prop down 50 different components.
if (window.__perfTier === 'lite') {
  const _origSIV = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(arg) {
    if (arg && typeof arg === 'object' && arg.behavior === 'smooth') {
      arg = { ...arg, behavior: 'instant' };
    }
    return _origSIV.call(this, arg);
  };
}

window.boot              = boot;
window.bootFresh         = bootFresh;
window.RefreshModal      = RefreshModal;
window.toggleSection     = toggleSection;
window.preloadSection    = preloadSection;
window.setDiffFilter     = setDiffFilter;
window.setStatusFilter   = setStatusFilter;
window.applyFilters      = applyFilters;
window.pickRandom        = pickRandom;
window.toggleCheck       = toggleCheck;
window.debounceSave      = debounceSave;
window.debounceNotesSave = debounceNotesSave;
window.toggleReview      = toggleReview;
window.saveComplexity    = saveComplexity;
window.toggleTags        = toggleTags;
window.toggleSolution    = toggleSolution;
window.toggleNotes       = toggleNotes;
window.toggleCompanies   = toggleCompanies;
window.toggleTheme       = toggleTheme;
window.ResetModal        = ResetModal;
window.showToast         = showToast;
window.PomodoroModal     = PomodoroModal;
window.openModal         = () => AddQuestionModal.open();
window.closeModal        = () => AddQuestionModal.close();
window.handleOverlayClick = (e) => AddQuestionModal.handleOverlayClick(e);
window.submitQuestion    = () => AddQuestionModal.submit();
window.SolutionModal     = SolutionModal;
window.ReportModal       = ReportModal;
window.confirmLogout     = () => Logout.open();
window.Logout            = Logout;
window.SRS               = SRS;
window.MasteryChart      = MasteryChart;
window.DailyGoal         = DailyGoal;
window.FocusMode         = FocusMode;
window.SimilarProblems   = SimilarProblems;
window.AI                = AI;
window.CompanyFilter     = CompanyFilter;
window.CompanyStats      = CompanyStats;
window.UserSettings      = UserSettings;
window.UserProfile       = UserProfile;
window.AdminPanel        = AdminPanel;
window.FeedbackModal     = FeedbackModal;
window.ViewFeedbackModal = ViewFeedbackModal;
window.state             = state;

document.addEventListener('keydown', e => {
  const inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

  if (e.key === 'Escape') {
    AdminPanel.close();
    FeedbackModal.close();
    ViewFeedbackModal.close();
    AddQuestionModal.close();
    Logout.close();
    MasteryChart.close();
    DailyGoal.closeEditor();
    FocusMode.closePicker();
    FocusMode.closeSummary();
    CompanyFilter.closePicker();
    CompanyFilter.closeSummary();
    ResetModal.close();
    UserSettings.close();
    UserProfile.close();
    window.WeaknessHeatmap?.close();
    window.MockInterview?.closeConfig();
    window.MockInterview?.closeSummary();
    return;
  }

  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    const overlay = document.querySelector('.modal-overlay.open');
    if (overlay) {
      const btn = overlay.querySelector('.btn-submit') || overlay.querySelector('.btn-danger');
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      return;
    }
  }

  if (inInput) return;

  if (e.key === 's' || e.key === '/') {
    e.preventDefault();
    document.getElementById('search')?.focus({ preventScroll: true });
  }
  if (e.key === 'r') pickRandom();
  if (e.key === 'f') FocusMode.openPicker();
  if (e.key === 'm') window.MockInterview?.openConfig();
  if (e.key === 'h') window.WeaknessHeatmap?.open();
});

document.addEventListener('goal-changed', () => {
  import('./stats.js').then(m => m.updateStats());
});

// Lenis smooth scroll — applies to all tiers.
// Chrome native scrolling on Windows causes 8-10 repaints per frame (wheel storm) 
// which absolutely tanks performance. This batches it into one rAF callback. 
// It's literally the only way to stop scroll jank on cheap Windows laptops. Don't touch it bhai.
// lite: 0.4s expo-out — snappy, barely perceptible ease; all backdrop-filter also killed in CSS
// standard/full: 0.7s expo-out — polished momentum feel
// smoothTouch:false keeps position:fixed elements stable on touch.
import('https://cdn.jsdelivr.net/npm/lenis@1.3.1/dist/lenis.mjs').then(({ default: Lenis }) => {
  const lenis = new Lenis({
    duration:        window.__perfTier === 'lite' ? 0.35 : 0.55,
    easing:          t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel:     true,
    smoothTouch:     false,
    wheelMultiplier: 1.2,
    // Don't intercept wheel events inside any modal content box so native scroll works
    prevent: (node) => node.closest('.modal') !== null,
  });
  window.__lenis = lenis;
  (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());

  // Suppress hover effects while scrolling — prevents paint/composite work from
  // section hover states toggling as sections scroll under the pointer.
  let _scrollEndTimer;
  lenis.on('scroll', () => {
    if (!document.documentElement.classList.contains('is-scrolling')) {
      document.documentElement.classList.add('is-scrolling');
    }
    clearTimeout(_scrollEndTimer);
    _scrollEndTimer = setTimeout(() => {
      document.documentElement.classList.remove('is-scrolling');
    }, 150);
  });
});

(function () {
  const _fetch = window.fetch;
  window.fetch = async function (url, options = {}) {
    if (typeof url === "string" && url.startsWith("/.netlify/functions/")) {
      const token = await getToken();
      if (token) {
        options = { ...options };
        options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
      }
    }
    return _fetch.call(this, url, options);
  };
})();

window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
});

initStopwatch();
initReveal();
initMotivation();
initToggles();
initTheme();
DailyGoal.init();
AmbientSound.init();
registerSW();
initPWAInstall();

(async () => {
  const authed = await initAuth();
  if (!authed) return;

  const currentUserEmail = getUserEmail();
  const lastUserEmail = localStorage.getItem('dsa_last_user');
  if (currentUserEmail && lastUserEmail && lastUserEmail !== currentUserEmail) {
    Cache.clear(); UserCache.clear(); HintCache.clear(); SimilarCache.clear();
  }
  if (currentUserEmail) localStorage.setItem('dsa_last_user', currentUserEmail);

  if (window._clerk) {
    const myUserId = window._clerk.user?.id ?? null;
    let _staleAction = null;

    window._clerk.addListener(({ user }) => {
      const newUserId = user?.id ?? null;
      if (!newUserId && myUserId) {
        _staleAction = 'logout';
      } else if (newUserId && myUserId && newUserId !== myUserId) {
        _staleAction = 'switch';
      }
    });

    const IGNORED_KEYS = new Set(['Alt','Control','Meta','Shift','Tab','Escape','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']);
    const handleStaleInteraction = (e) => {
      if (!_staleAction) return;
      if (e.type === 'keydown' && (IGNORED_KEYS.has(e.key) || e.altKey || e.ctrlKey || e.metaKey)) return;
      e.stopImmediatePropagation();
      Cache.clear(); UserCache.clear(); HintCache.clear(); SimilarCache.clear();
      if (_staleAction === 'logout') {
        window.location.href = '/welcome.html';
      } else {
        window.location.reload();
      }
    };
    document.addEventListener('click',   handleStaleInteraction, { capture: true });
    document.addEventListener('keydown',  handleStaleInteraction, { capture: true });
    document.addEventListener('submit',   handleStaleInteraction, { capture: true });
  }

  const email = getUserEmail();
  const name  = getUserName();
  const metaEl = document.getElementById('hdr-user-meta');
  if (metaEl && email) {
    // Prefer DB-cached image_url (persisted from Clerk, updated on every login)
    // Fall back to live Clerk session imageUrl, then initials.
    const cachedProfile = UserCache.get();
    const imgUrl  = cachedProfile?.image_url || window._clerk?.user?.imageUrl || null;
    const initial = (name || email || '?')[0].toUpperCase();
    const avatar  = imgUrl
      ? `<img class="hdr-avatar" src="${imgUrl}" alt="" />`
      : `<span class="hdr-avatar hdr-avatar-init">${initial}</span>`;
    metaEl.innerHTML = `${avatar}<span class="hdr-chip-name">${name || email}</span>`;
    metaEl.title = email;
    metaEl.style.cursor = 'pointer';
    metaEl.addEventListener('click', () => UserProfile.open());
  }

  const wmEl = document.getElementById('watermark');
  if (wmEl && email) {
    const safeEmail = email
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const angle  = -(15 + Math.floor(Math.random() * 21));
    const tileW  = 540 + Math.floor(Math.random() * 121);
    const tileH  = 230 + Math.floor(Math.random() * 61);
    const cx = tileW / 2, cy = tileH / 2;
    const offX   = Math.floor(Math.random() * tileW);
    const offY   = Math.floor(Math.random() * tileH);

    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">` +
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="monospace" font-size="13" fill="#000000" ` +
      `transform="rotate(${angle},${cx},${cy})">${safeEmail}</text></svg>`
    );
    wmEl.style.backgroundImage = `url("data:image/svg+xml,${svg}")`;
    if (window.innerWidth > 768) {
      wmEl.style.backgroundPosition = `${offX}px ${offY}px`;
    }
  }

  const revealPage = async () => {
    // Deliberate 1-second presentation delay so the user always sees the terminal animation
    await new Promise(r => setTimeout(r, 300));

    // Wait for all non-blocking CSS preloads to be applied before showing the page.
    // CSS files download in parallel while JS is booting; they're almost always done
    // before this point, but we guard against slow connections or cache misses.
    const pendingCSS = [...document.querySelectorAll('link[as="style"]')].filter(l => !l.sheet);
    if (pendingCSS.length) {
      await Promise.race([
        Promise.all(pendingCSS.map(l => new Promise(r => l.addEventListener('load', r, { once: true })))),
        new Promise(r => setTimeout(r, 2000)), // 2s safety timeout — never hold the loader indefinitely
      ]);
    }

    const loader = document.getElementById('page-loader');

    const entrance = [
      document.querySelector('header'),
      document.querySelector('.study-tools-bar'),
      document.querySelector('.motivation-box'),
      document.querySelector('.top-stats'),
      document.querySelector('.global-progress'),
      document.querySelector('.controls'),
      document.getElementById('sections'),
    ].filter(Boolean);

    // Skip entrance animation on lite/standard tier or reduced-motion preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        || window.__perfTier !== 'full';

    if (!prefersReduced) {
      entrance.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; });
    }

    if (loader) {
      await animate(loader, { opacity: 0 }, { duration: 0.15, easing: 'ease-out' }).finished;
      loader.remove();
    }

    if (prefersReduced) return;

    animate(
      entrance,
      { opacity: [0, 1], y: [20, 0] },
      { duration: 0.45, easing: [0.22, 1, 0.36, 1], delay: stagger(0.06) }
    );

    const featureBtns = document.querySelectorAll('.btn-feature');
    if (featureBtns.length) {
      featureBtns.forEach(b => { b.style.opacity = '0'; b.style.transform = 'translateY(10px) scale(0.95)'; });
      setTimeout(() => {
        animate(
          featureBtns,
          { opacity: [0, 1], y: [10, 0], scale: [0.95, 1] },
          { duration: 0.4, easing: [0.22, 1, 0.36, 1], delay: stagger(0.05) }
        );
      }, 150);
    }
  };

  // Load deferred CSS NOW — concurrently with boot()'s auth+data network request.
  // boot() takes ~300-800ms; deferred CSS (~54KB) downloads in ~50ms on 4G.
  // Both finish before revealPage() dismisses the loader, so the page appears
  // fully styled the moment it becomes visible. No FOUC possible.
  loadDeferredCSS();

  await boot(revealPage);

  // Start passive jank detector — shows a suggestion banner if the device struggles
  startPerfWatch();

  if (state.userRole === 'ADMIN') {
    document.getElementById('btn-admin-panel')?.style.setProperty('display', '');
  } else {
    document.getElementById('btn-feedback-header')?.style.setProperty('display', '');
    document.getElementById('btn-feedback-settings-wrap')?.style.setProperty('display', '');
  }
  SRS.init();
  CompanyFilter.init();
  CompanyStats.render();

  if (restoreSession()) window.MockInterview.resume();

  // Skip background image on lite tier (saves ~200KB network on low-end devices)
  if (window.__perfTier !== 'lite') {
    const hideBg = localStorage.getItem('dsa_hide_bg');
    const isMobile = window.innerWidth <= 768;
    const shouldHide = hideBg === '1' || (hideBg === null && isMobile);
    if (!shouldHide) {
      const bgUrl = 'https://res.cloudinary.com/dnju7wfma/image/upload/f_auto,q_auto,w_1920/bg_lnzb9t.png';
      const img = new Image();
      img.onload = () => {
        const root = document.documentElement;
        root.style.setProperty('--bg-image', `url('${bgUrl}')`);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => root.classList.add('bg-loaded'));
        });
      };
      img.src = bgUrl;
    }
  }
})();
