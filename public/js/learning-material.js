/* ─────────────────────────────────────────────────────────
   Learning Material — document list & in-site viewer
   DOCX: rendered via docx-preview (near-Word fidelity)
   PDF : native browser iframe
   ───────────────────────────────────────────────────────── */

const LearningMaterial = (() => {

  /* ── Document registry ───────────────────────────────── *
   * To add more files just push another entry here.
   * type: 'docx' | 'pdf'
   * url : publicly accessible direct URL to the file
   * ───────────────────────────────────────────────────── */
  const MATERIALS = [
    {
      id    : 'cp-algorithms',
      title : 'CP-Algorithms Reference',
      desc  : 'Full algorithm & data structure reference',
      type  : 'web',
      url   : 'https://cp-algorithms.com/index.html',
    },
    {
      id    : 'number-theory',
      title : 'Number Theory Guide',
      desc  : 'Core number theory concepts for DSA interviews',
      type  : 'docx',
      url   : 'https://res.cloudinary.com/dnju7wfma/raw/upload/v1777461808/Number_Theory_Guide_w9wmoe.docx',
    },
    // ──── Add more materials below ────
    // {
    //   id   : 'graphs-guide',
    //   title: 'Graph Algorithms Guide',
    //   desc : 'BFS, DFS, Dijkstra, Topological Sort & more',
    //   type : 'pdf',
    //   url  : 'https://...',
    // },
  ];

  /* ── docx-preview lazy loader ────────────────────────── *
   * Loads jszip (dependency) then docx-preview from CDN
   * on first use — zero cost on page load.
   * ───────────────────────────────────────────────────── */
  let _docxReady    = false;
  let _docxLoading  = false;
  let _docxCbs      = [];

  function _loadDocxPreview(cb) {
    if (_docxReady)   { cb(); return; }
    _docxCbs.push(cb);
    if (_docxLoading) return;
    _docxLoading = true;

    const flush = (err) => {
      _docxCbs.forEach(fn => fn(err));
      _docxCbs = [];
    };

    // 1. Load JSZip (required peer dependency)
    const jszip = document.createElement('script');
    jszip.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    jszip.onerror = () => flush(new Error('Failed to load JSZip'));
    jszip.onload  = () => {
      // 2. Load docx-preview CSS
      const css = document.createElement('link');
      css.rel  = 'stylesheet';
      css.href = 'https://cdn.jsdelivr.net/npm/docx-preview@0.3.7/dist/docx-preview.css';
      document.head.appendChild(css);

      // 3. Load docx-preview JS
      const dp = document.createElement('script');
      dp.src = 'https://cdn.jsdelivr.net/npm/docx-preview@0.3.7/dist/docx-preview.min.js';
      dp.onerror = () => flush(new Error('Failed to load docx-preview'));
      dp.onload  = () => { _docxReady = true; flush(); };
      document.head.appendChild(dp);
    };
    document.head.appendChild(jszip);
  }

  /* ── State ───────────────────────────────────────────── */
  let _listOverlay   = null;
  let _viewerOverlay = null;
  let _docxContainer = null;
  let _docxInner     = null;   // inner scaling wrapper for DOCX content
  let _viewerIframe  = null;
  let _loader        = null;
  let _loaderText    = null;
  let _errorBox      = null;
  let _zoomLabel     = null;
  let _zoomLevel     = 1.0;
  let _currentType   = null;
  let _pinchDist     = null;
  let _urlStack      = [];
  let _currentUrl    = null;

  /* ── Build DOM (once) ───────────────────────────────── */
  function _buildDOM() {
    if (document.getElementById('lm-list-modal')) return;

    /* ── List modal ── */
    const listOverlay = document.createElement('div');
    listOverlay.className = 'modal-overlay';
    listOverlay.id        = 'lm-list-modal';
    listOverlay.setAttribute('role', 'dialog');
    listOverlay.setAttribute('aria-modal', 'true');
    listOverlay.setAttribute('aria-label', 'Learning Materials');

    const items = MATERIALS.map(m => `
      <button class="lm-item" id="lm-item-${m.id}" onclick="LearningMaterial.openViewer('${m.id}')" title="Open: ${m.title}">
        <div class="lm-item-icon ${m.type}">${m.type === 'pdf' ? '📄' : m.type === 'web' ? '🌐' : '📘'}</div>
        <div class="lm-item-info">
          <div class="lm-item-title">${m.title}</div>
          <div class="lm-item-meta">${m.desc}</div>
        </div>
        <span class="lm-item-badge ${m.type}">${m.type.toUpperCase()}</span>
        <span class="lm-item-arrow">›</span>
      </button>
    `).join('');

    listOverlay.innerHTML = `
      <div class="modal lm-modal">
        <div class="lm-modal-header">
          <div class="lm-modal-icon">📚</div>
          <div>
            <div class="modal-title" style="margin-bottom:2px;">Learning Materials</div>
            <div class="modal-sub" style="margin-bottom:0;">Click any document to read it right here</div>
          </div>
        </div>
        <div class="lm-list" id="lm-list-body">
          ${items || '<div class="lm-empty">No materials added yet.</div>'}
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" onclick="LearningMaterial.closeList()">Close</button>
        </div>
      </div>
    `;
    listOverlay.addEventListener('click', e => {
      if (e.target === listOverlay) closeList();
    });
    document.body.appendChild(listOverlay);
    _listOverlay = listOverlay;

    /* ── Fullscreen viewer ── */
    const viewerOverlay = document.createElement('div');
    viewerOverlay.id = 'lm-viewer-overlay';
    viewerOverlay.setAttribute('role', 'dialog');
    viewerOverlay.setAttribute('aria-modal', 'true');
    viewerOverlay.setAttribute('aria-label', 'Document Viewer');

    viewerOverlay.innerHTML = `
      <div class="lm-viewer-header">
        <button class="lm-viewer-back" onclick="LearningMaterial.goBack()" title="Back">
          ‹ <span>Back</span>
        </button>
        <div class="lm-viewer-title" id="lm-viewer-title">Document</div>
        <span class="lm-viewer-badge" id="lm-viewer-badge"></span>
        <div class="lm-zoom-controls" id="lm-zoom-controls" aria-label="Zoom controls">
          <button class="lm-zoom-btn" id="lm-zoom-out" onclick="LearningMaterial.zoom(-0.1)" title="Zoom out (Ctrl+−)">−</button>
          <span class="lm-zoom-label" id="lm-zoom-label">100%</span>
          <button class="lm-zoom-btn" id="lm-zoom-in"  onclick="LearningMaterial.zoom(+0.1)" title="Zoom in (Ctrl++)">+</button>
        </div>
        <button class="lm-viewer-close" onclick="LearningMaterial.closeViewer()" title="Close" aria-label="Close viewer">✕</button>
      </div>
      <div class="lm-viewer-body" id="lm-viewer-body">
        <div class="lm-viewer-loader" id="lm-viewer-loader">
          <div class="lm-loader-spinner"></div>
          <div class="lm-loader-text" id="lm-loader-text">Loading document…</div>
        </div>
        <div class="lm-viewer-error" id="lm-viewer-error">
          <div class="lm-error-icon">⚠️</div>
          <div class="lm-error-msg" id="lm-error-msg">Failed to load document.</div>
          <button class="btn-cancel" onclick="LearningMaterial.closeViewer()" style="margin-top:12px;">Close</button>
        </div>
        <div class="lm-docx-pages" id="lm-docx-pages">
          <div id="lm-docx-inner"></div>
        </div>
        <iframe id="lm-viewer-iframe" title="PDF Viewer" loading="lazy"></iframe>
      </div>
    `;
    document.body.appendChild(viewerOverlay);
    _viewerOverlay = viewerOverlay;
    _docxContainer = document.getElementById('lm-docx-pages');
    _docxInner     = document.getElementById('lm-docx-inner');
    _viewerIframe  = document.getElementById('lm-viewer-iframe');
    _loader        = document.getElementById('lm-viewer-loader');
    _loaderText    = document.getElementById('lm-loader-text');
    _errorBox      = document.getElementById('lm-viewer-error');
    _zoomLabel     = document.getElementById('lm-zoom-label');

    _viewerIframe.addEventListener('load', () => {
      if (_currentType === 'pdf' || _currentType === 'web') {
        _loader.classList.add('hidden');
        _viewerIframe.classList.add('show');
      }
    });

    /* Ctrl+Wheel → zoom document, not page */
    viewerOverlay.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      _applyZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });

    /* Pinch-to-zoom on touch devices */
    viewerOverlay.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        _pinchDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
      }
    }, { passive: true });

    viewerOverlay.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2 || _pinchDist === null) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      _applyZoom((dist - _pinchDist) * 0.004);
      _pinchDist = dist;
    }, { passive: false });

    viewerOverlay.addEventListener('touchend', () => { _pinchDist = null; }, { passive: true });

    /* Escape key closes */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (_viewerOverlay.classList.contains('open')) { closeViewer(); return; }
      if (_listOverlay.classList.contains('open'))   { closeList();   return; }
    });
  }

  /* ── Zoom ────────────────────────────────────────────── */
  function _applyZoom(delta) {
    _zoomLevel = Math.max(0.5, Math.min(3.0, parseFloat((_zoomLevel + delta).toFixed(2))));
    if (_zoomLabel) _zoomLabel.textContent = Math.round(_zoomLevel * 100) + '%';
    if (_currentType === 'docx' && _docxInner) {
      _docxInner.style.zoom = _zoomLevel;
    }
    // PDF: native viewer handles its own zoom; we only suppress page zoom via preventDefault
  }

  /* ── Reset viewer ───────────────────────────────────── */
  function _resetViewer() {
    _loader.classList.remove('hidden');
    _errorBox.classList.remove('show');
    _docxContainer.classList.remove('show');
    _docxInner.innerHTML = '';
    _docxInner.style.zoom = '';
    _viewerIframe.classList.remove('show');
    _viewerIframe.src = '';
    _zoomLevel = 1.0;
    if (_zoomLabel) _zoomLabel.textContent = '100%';
  }

  /* ── DOCX renderer ──────────────────────────────────── */
  async function _renderDocx(material) {
    _loaderText.textContent = 'Fetching document…';

    let arrayBuffer;
    try {
      const res = await fetch(material.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      arrayBuffer = await res.arrayBuffer();
    } catch {
      _showError('Could not fetch the document. Check your connection and try again.');
      return;
    }

    _loaderText.textContent = 'Loading renderer…';

    _loadDocxPreview(async (err) => {
      if (err) { _showError('Could not load the document renderer. Please try again.'); return; }

      _loaderText.textContent = 'Rendering pages…';

      try {
        // eslint-disable-next-line no-undef
        await docx.renderAsync(arrayBuffer, _docxInner, null, {
          className            : 'lm-docx-page',
          inWrapper            : true,
          ignoreWidth          : false,
          ignoreHeight         : false,
          ignoreFonts          : false,
          breakPages           : true,
          useBase64URL         : true,
          renderEndnotes       : true,
          renderFootnotes      : true,
          renderFooters        : true,
          renderHeaders        : true,
        });
        _loader.classList.add('hidden');
        _docxContainer.classList.add('show');
      } catch (e) {
        console.error('docx-preview error:', e);
        _showError('Failed to render the document. It may use unsupported formatting.');
      }
    });
  }

  /* ── PDF renderer ───────────────────────────────────── */
  function _renderPdf(material) {
    _loaderText.textContent = 'Opening PDF…';
    _viewerIframe.src = material.url;
  }

  /* ── Web renderer (cp-proxy) ─────────────────────────── */
  function _renderWeb(material) {
    _loaderText.textContent = 'Loading…';
    const proxyUrl = window.location.origin + `/.netlify/functions/cp-proxy?url=${encodeURIComponent(material.url)}`;
    setTimeout(() => { _viewerIframe.contentWindow.location.replace(proxyUrl); }, 80);
  }

  /* ── Error display ──────────────────────────────────── */
  function _showError(msg) {
    _loader.classList.add('hidden');
    document.getElementById('lm-error-msg').textContent = msg;
    _errorBox.classList.add('show');
  }

  /* ── Public API ─────────────────────────────────────── */

  function openList() {
    _buildDOM();
    _listOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();
  }

  function closeList() {
    if (!_listOverlay) return;
    _listOverlay.classList.remove('open');
    document.body.style.overflow = '';
    window.__lenis?.start();
  }

  function openViewer(id) {
    const material = MATERIALS.find(m => m.id === id);
    if (!material) return;

    closeList();

    setTimeout(() => {
      _resetViewer();
      _urlStack = [];
      _currentUrl = material.url;

      document.getElementById('lm-viewer-title').textContent = material.title;
      const badge   = document.getElementById('lm-viewer-badge');
      badge.textContent = material.type.toUpperCase();
      badge.className   = `lm-viewer-badge ${material.type}`;

      _currentType = material.type;
      _viewerOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      window.__lenis?.stop();

      if (material.type === 'pdf') {
        _renderPdf(material);
      } else if (material.type === 'web') {
        _renderWeb(material);
      } else {
        _renderDocx(material);
      }
    }, 180);
  }

  function closeViewer() {
    if (!_viewerOverlay) return;
    _viewerOverlay.classList.remove('open');
    document.body.style.overflow = '';
    window.__lenis?.start();
    setTimeout(() => {
      if (!_viewerOverlay.classList.contains('open')) {
        _viewerIframe.src  = '';
        _docxInner.innerHTML = '';
      }
    }, 300);
  }

  function zoom(delta) { _applyZoom(delta); }

  function goBack() {
    if (_currentType === 'web' && _urlStack.length > 0) {
      const prevUrl = _urlStack.pop();
      _currentUrl = prevUrl;
      _loaderText.textContent = 'Loading…';
      _loader.classList.remove('hidden');
      _viewerIframe.classList.remove('show');
      const proxyUrl = window.location.origin + `/.netlify/functions/cp-proxy?url=${encodeURIComponent(prevUrl)}`;
      setTimeout(() => { _viewerIframe.contentWindow.location.replace(proxyUrl); }, 80);
    } else {
      closeViewer();
    }
  }

  window.lmNavigate = function(newUrl) {
    if (_currentUrl && _currentUrl !== newUrl) {
      _urlStack.push(_currentUrl);
    }
    _currentUrl = newUrl;
    _loaderText.textContent = 'Loading…';
    _loader.classList.remove('hidden');
    _viewerIframe.classList.remove('show');
    const proxyUrl = window.location.origin + `/.netlify/functions/cp-proxy?url=${encodeURIComponent(newUrl)}`;
    setTimeout(() => { _viewerIframe.contentWindow.location.replace(proxyUrl); }, 80);
  };

  return { openList, closeList, openViewer, closeViewer, zoom, goBack };
})();

window.LearningMaterial = LearningMaterial;
