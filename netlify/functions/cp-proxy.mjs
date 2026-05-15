/**
 * cp-proxy — The glorious hack to embed cp-algorithms.com.
 *
 * Why: cp-algorithms blocks iframes with X-Frame-Options. We fetch it 
 * server-side here and rewrite the URLs so the browser thinks it's ours. Full desi proxy.
 *
 * Security: Only allows cp-algorithms URLs. Everything else gets a 403.
 * AI helped me write the regex here because frankly, life is too short and I needed chai.
 */

const ALLOWED_ORIGIN = 'https://cp-algorithms.com';
const CACHE_SECONDS  = 3600; // 1 hour

export const handler = async (event) => {
  /* ── CORS pre-flight ──────────────────────────────────────── */
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  const targetUrl = event.queryStringParameters?.url || '';
  const themeParam = event.queryStringParameters?.theme || '';

  /* ── Allowlist check ─────────────────────────────────────── */
  if (!targetUrl.startsWith(ALLOWED_ORIGIN + '/')) {
    return { statusCode: 403, body: 'Forbidden: only cp-algorithms.com URLs are allowed.' };
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent'     : 'Mozilla/5.0 (compatible; AlgoTracker/1.0)',
        'Accept'         : 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    let html = await upstream.text();

    /* ── Dark mode injection (stops the blinding white flash) ────────── */
    if (themeParam === 'dark') {
      html = html.replace('data-md-color-scheme="cpalgo"', 'data-md-color-scheme="slate"');
    }

    /* ── Rewrite root-relative paths → absolute so assets load ── */
    // Handles href="/...", src="/...", url(/...) patterns.
    html = html
      .replace(/(href|src|action)="\/(?!\/)/g,   `$1="${ALLOWED_ORIGIN}/`)
      .replace(/url\(\/(?!\/)/g,                  `url(${ALLOWED_ORIGIN}/`)
      .replace(/(href|src)='\/(?!\/)/g,            `$1='${ALLOWED_ORIGIN}/`);

    /* ── Nuke MkDocs JS to stop it from breaking our iframe ── *
     * MkDocs tries to be smart and redirects the page if the URL doesn't match.
     * Since we are proxying, it freaks out and redirects to localhost. 
     * We just aggressively strip their JS bundles out. The HTML/CSS survives fine.
     * ──────────────────────────────────────────────────────────────────── */
    html = html.replace(
      /<script\b[^>]*\bsrc="[^"]*assets\/javascripts\/(?:bundle|main)[^"]*"[^>]*>\s*<\/script>/gi,
      ''
    );

    /* ── Inject minimal override so the article fills the frame ─ */
    html = html.replace(
      '<head>',
      `<head>\n  <base href="${targetUrl}">\n  <script>window.__TARGET_URL__="${targetUrl}";window.document$={subscribe:()=>({unsubscribe:()=>{}})};window.location$={subscribe:()=>({unsubscribe:()=>{}})};</script>`
    );
    html = html.replace(
      '</head>',
      `<style>
        /* Hide search bar and announce banner since scripts are stripped */
        .md-search, [data-md-component="announce"] { display: none !important; }
        /* Hide right-hand table of contents to save width on mobile/popovers */
        .md-sidebar--secondary { display: none !important; }
        /* Hide the header to save space, but we will move the menu button out via JS */
        .md-header { display: none !important; }
        /* Add some padding to main content so it doesn't collide with the moved button */
        .md-main { padding-top: 24px !important; }
        /* Ensure only one toggle button is visible at a time based on MkDocs breakpoint */
        @media screen and (min-width: 1220px) {
          label.md-header__button.md-icon[for="__drawer"] { display: none !important; }
        }
        @media screen and (max-width: 1219px) {
          .mkdocs-toggle-sidebar-button { display: none !important; }
        }
        /* Hide the mobile floating button when the drawer is open so it doesn't overlap the sidebar */
        #__drawer:checked ~ .md-container label.md-header__button.md-icon[for="__drawer"] {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        /* Hide scrollbars completely while keeping scroll functionality */
        ::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        html, body { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; overscroll-behavior-y: contain; }
      </style>
      <script>
        /* Restructure UI */
        function restructureUI() {
          try {
            var container = document.querySelector('.md-container');
            if (!container) return;

            var styleBtn = function(btn) {
              if (!btn || btn.dataset.moved) return;
              btn.dataset.moved = 'true';
              container.appendChild(btn);
              btn.style.position = 'absolute';
              btn.style.top = '16px';
              btn.style.left = '16px';
              btn.style.zIndex = '99';
              btn.style.cursor = 'pointer';
              btn.style.color = 'var(--md-default-fg-color)';
            };

            // Mobile drawer toggle
            styleBtn(document.querySelector('label.md-header__button.md-icon[for="__drawer"]'));
            // Desktop sidebar toggle
            styleBtn(document.querySelector('.mkdocs-toggle-sidebar-button'));
          } catch(e) {}
        }

        /* Sync theme with parent window */
        function syncTheme() {
          try {
            if (window.parent && window.parent !== window && window.parent.document) {
              var root = window.parent.document.documentElement;
              var updateTheme = function() {
                var isLight = root.getAttribute('data-theme') === 'light';
                document.body.setAttribute('data-md-color-scheme', isLight ? 'cpalgo' : 'slate');
              };
              updateTheme();
              if (!window.__themeObserver) {
                window.__themeObserver = new MutationObserver(updateTheme);
                window.__themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
              }
            }
          } catch(e) {}
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() { syncTheme(); restructureUI(); });
        } else {
          syncTheme();
          restructureUI();
        }

        /* Intercept all link clicks inside the proxied page:
           - cp-algorithms.com links  → location.replace through proxy (no new history entry)
           - everything else          → open in new tab                                       */
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a || !a.href) return;
          try {
            var url = new URL(a.href);
            if (url.hostname === 'cp-algorithms.com' || url.hostname.endsWith('.cp-algorithms.com')) {
              var baseUrl = window.__TARGET_URL__ || window.location.href;
              if (url.href.split('#')[0] === baseUrl.split('#')[0]) {
                e.preventDefault();
                if (url.hash) {
                  var targetId = url.hash.substring(1);
                  var el = document.getElementById(targetId) || document.getElementsByName(targetId)[0];
                  if (el) el.scrollIntoView();
                }
                return;
              }
              e.preventDefault();
              if (window.parent !== window) {
                if (window.parent.cpaNavigate && window.parent.document.getElementById('cpa-viewer') && window.parent.document.getElementById('cpa-viewer').classList.contains('open')) {
                  window.parent.cpaNavigate(url.href);
                } else if (window.parent.lmNavigate && window.parent.document.getElementById('lm-viewer-overlay') && window.parent.document.getElementById('lm-viewer-overlay').classList.contains('open')) {
                  window.parent.lmNavigate(url.href);
                } else {
                  window.location.replace(
                    window.location.origin + '/.netlify/functions/cp-proxy?url=' + encodeURIComponent(url.href)
                  );
                }
              } else {
                window.location.replace(
                  window.location.origin + '/.netlify/functions/cp-proxy?url=' + encodeURIComponent(url.href)
                );
              }
            } else if (url.protocol === 'https:' || url.protocol === 'http:') {
              e.preventDefault();
              window.open(a.href, '_blank', 'noopener,noreferrer');
            }
          } catch(_) {}
        }, true);
      </script></head>`
    );

    return {
      statusCode : upstream.status,
      headers    : {
        'Content-Type' : 'text/html; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
      body: html,
    };
  } catch (err) {
    /* Graceful fallback — show a direct link instead of an error page */
    const escaped = targetUrl.replace(/"/g, '&quot;');
    return {
      statusCode : 200,
      headers    : { 'Content-Type': 'text/html; charset=utf-8' },
      body       : `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;text-align:center">
        <p style="color:#888">Could not load article preview.</p>
        <a href="${escaped}" target="_blank" rel="noopener"
           style="display:inline-block;margin-top:12px;padding:10px 20px;background:#4f8ef7;color:#fff;border-radius:8px;text-decoration:none">
          Open on cp-algorithms.com ↗
        </a>
      </body></html>`,
    };
  }
};
