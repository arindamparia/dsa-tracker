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
  let _viewerIframe  = null;
  let _loader        = null;
  let _loaderText    = null;
  let _errorBox      = null;

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
        <div class="lm-item-icon ${m.type}">${m.type === 'pdf' ? '📄' : '📘'}</div>
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
        <button class="lm-viewer-back" onclick="LearningMaterial.closeViewer()" title="Back to list">
          ‹ <span>Back</span>
        </button>
        <div class="lm-viewer-title" id="lm-viewer-title">Document</div>
        <span class="lm-viewer-badge" id="lm-viewer-badge"></span>
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
        <div class="lm-docx-pages" id="lm-docx-pages"></div>
        <iframe id="lm-viewer-iframe" title="PDF Viewer" loading="lazy"></iframe>
      </div>
    `;
    document.body.appendChild(viewerOverlay);
    _viewerOverlay = viewerOverlay;
    _docxContainer = document.getElementById('lm-docx-pages');
    _viewerIframe  = document.getElementById('lm-viewer-iframe');
    _loader        = document.getElementById('lm-viewer-loader');
    _loaderText    = document.getElementById('lm-loader-text');
    _errorBox      = document.getElementById('lm-viewer-error');

    /* Escape key closes */
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (_viewerOverlay.classList.contains('open')) { closeViewer(); return; }
      if (_listOverlay.classList.contains('open'))   { closeList();   return; }
    });
  }

  /* ── Reset viewer ───────────────────────────────────── */
  function _resetViewer() {
    _loader.classList.remove('hidden');
    _errorBox.classList.remove('show');
    _docxContainer.classList.remove('show');
    _docxContainer.innerHTML = '';
    _viewerIframe.classList.remove('show');
    _viewerIframe.src = '';
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
        await docx.renderAsync(arrayBuffer, _docxContainer, null, {
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
    _viewerIframe.onload = () => {
      _loader.classList.add('hidden');
      _viewerIframe.classList.add('show');
    };
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
  }

  function closeList() {
    if (!_listOverlay) return;
    _listOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openViewer(id) {
    const material = MATERIALS.find(m => m.id === id);
    if (!material) return;

    closeList();

    setTimeout(() => {
      _resetViewer();

      document.getElementById('lm-viewer-title').textContent = material.title;
      const badge   = document.getElementById('lm-viewer-badge');
      badge.textContent = material.type.toUpperCase();
      badge.className   = `lm-viewer-badge ${material.type}`;

      _viewerOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';

      if (material.type === 'pdf') {
        _renderPdf(material);
      } else {
        _renderDocx(material);
      }
    }, 180);
  }

  function closeViewer() {
    if (!_viewerOverlay) return;
    _viewerOverlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!_viewerOverlay.classList.contains('open')) {
        _viewerIframe.src   = '';
        _docxContainer.innerHTML = '';
      }
    }, 300);
  }

  return { openList, closeList, openViewer, closeViewer };
})();

window.LearningMaterial = LearningMaterial;
