import { showToast } from './toast.js';
import { lockScroll, unlockScroll } from './utils.js';

export const GhostEngine = {
  UI: null,
  state: {
    isPlaying: false,
    speed: 1, // 1x, 2x, 4x
    code: '',
    pauses: [], // { line_number, delay_ms, annotation }
    charIndex: 0,
    currentLine: 1,
    isPausedForThought: false
  },
  intervals: {
    typing: null
  },

  init() {
    if (this.UI) return;
    const html = `
      <div id="ghost-overlay" class="ghost-overlay" onclick="GhostEngine.handleOverlayClick(event)">
        <div class="ghost-window">
          <div class="ghost-header">
            <div class="ghost-title">
              <span style="font-size:16px;">👻</span> 
              Temporal Ghost Replay 
              <span id="ghost-title-text" style="color:#888;margin-left:8px;font-weight:400;"></span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="ghost-badge" id="ghost-lang-badge">PYTHON</span>
              <button class="ghost-close" onclick="GhostEngine.close()">×</button>
            </div>
          </div>
          
          <div class="ghost-body" id="ghost-body">
            <div id="ghost-lang-picker" class="ghost-lang-picker hidden">
              <div class="ghost-lang-picker-title">Choose your weapon</div>
              <div class="ghost-lang-grid">
                <button class="ghost-lang-card" onclick="GhostEngine._pickLanguage('C++')">
                  <span class="ghost-lang-icon">⚡</span>
                  <span class="ghost-lang-name">C++</span>
                  <span class="ghost-lang-desc">Blazing Fast</span>
                </button>
                <button class="ghost-lang-card" onclick="GhostEngine._pickLanguage('Java')">
                  <span class="ghost-lang-icon">☕</span>
                  <span class="ghost-lang-name">Java</span>
                  <span class="ghost-lang-desc">Battle-Tested</span>
                </button>
              </div>
            </div>
            <div id="ghost-loading" class="ghost-loading hidden">
              <div class="ghost-spinner"></div>
              <div class="ghost-loading-text">Summoning optimal ghost...</div>
            </div>
            
            <div id="ghost-intuition-panel" class="ghost-intuition-panel hidden">
              <div class="ghost-intuition-header">
                <span class="ghost-intuition-title">✨ Cognitive Intuition</span>
                <div class="ghost-complexity-badges">
                  <span id="ghost-time-badge" class="ghost-badge time"></span>
                  <span id="ghost-space-badge" class="ghost-badge space"></span>
                </div>
              </div>
              <div id="ghost-intuition-text" class="ghost-intuition-text"></div>
            </div>

            <div class="ghost-code-content"><span id="ghost-code-output"></span><span class="ghost-cursor" id="ghost-cursor"></span></div>
          </div>
          
          <div id="ghost-annotation" class="ghost-annotation">
            <div class="ghost-anno-title">
              <div class="ghost-anno-pulse"></div><span>Cognitive Pause</span>
            </div>
            <div id="ghost-anno-text"></div>
          </div>

          <div class="ghost-controls">
            <button class="ghost-btn-play" id="ghost-play-btn" onclick="GhostEngine.togglePlay()">▶</button>
            <div class="ghost-progress-wrap">
              <div class="ghost-progress-bar" id="ghost-progress"></div>
            </div>
            <button class="ghost-speed" id="ghost-speed-btn" onclick="GhostEngine.toggleSpeed()">1x Speed</button>
            <button class="ghost-speed ghost-skip-btn" id="ghost-skip-btn" onclick="GhostEngine.skipPlayback()">⏭ Skip</button>
            <button class="ghost-speed" id="ghost-copy-btn" onclick="GhostEngine.copyCode()" title="Copy Full Solution">📋 Copy</button>
          </div>
          <div class="ghost-ai-disclaimer">
            ⚠ AI-generated solution — verify correctness before submitting.
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this.UI = {
      overlay: document.getElementById('ghost-overlay'),
      title: document.getElementById('ghost-title-text'),
      langBadge: document.getElementById('ghost-lang-badge'),
      langPicker: document.getElementById('ghost-lang-picker'),
      loading: document.getElementById('ghost-loading'),
      output: document.getElementById('ghost-code-output'),
      intuitionPanel: document.getElementById('ghost-intuition-panel'),
      intuitionText: document.getElementById('ghost-intuition-text'),
      timeBadge: document.getElementById('ghost-time-badge'),
      spaceBadge: document.getElementById('ghost-space-badge'),
      annotation: document.getElementById('ghost-annotation'),
      annoText: document.getElementById('ghost-anno-text'),
      playBtn: document.getElementById('ghost-play-btn'),
      progress: document.getElementById('ghost-progress'),
      speedBtn: document.getElementById('ghost-speed-btn'),
      skipBtn: document.getElementById('ghost-skip-btn'),
      copyBtn: document.getElementById('ghost-copy-btn'),
      body: document.getElementById('ghost-body')
    };

    // Lenis intercepts all wheel events globally. Since lockScroll() stops Lenis,
    // we intercept wheel events and use instant scroll to avoid queuing animations.
    let _scrollTarget = 0;
    this.UI.body.addEventListener('wheel', (e) => {
      e.stopPropagation();
      const maxScroll = this.UI.body.scrollHeight - this.UI.body.clientHeight;
      _scrollTarget = Math.max(0, Math.min(maxScroll, this.UI.body.scrollTop + e.deltaY * 1.6));
      this.UI.body.scrollTop = _scrollTarget;
    }, { passive: true });
  },

  setControlsEnabled(enabled) {
    const btns = [this.UI.playBtn, this.UI.speedBtn, this.UI.skipBtn, this.UI.copyBtn];
    btns.forEach(btn => {
      if (!btn) return;
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '' : '0.35';
      btn.style.pointerEvents = enabled ? '' : 'none';
    });
  },

  handleOverlayClick(e) {
    if (e.target === this.UI.overlay) this.close();
  },

  close() {
    this.UI.overlay.classList.remove('open');
    this.stopPlayback();
    this.UI.langPicker?.classList.add('hidden');
    this._pendingSummon = null;
    unlockScroll();
  },

  async summon(lcNumber, title, language = null, platform = 'LeetCode', difficulty = 'Medium') {
    this.init();
    lockScroll();
    this.UI.overlay.classList.add('open');
    this.UI.title.textContent = '- ' + title;
    this.UI.langBadge.textContent = '';
    this.UI.annotation.classList.remove('visible');
    this.UI.intuitionPanel.classList.add('hidden');
    this.state = { isPlaying: false, speed: 1, code: '', pauses: [], charIndex: 0, currentLine: 1, isPausedForThought: false };
    this.updateControls();

    if (!language) {
      this._pendingSummon = { lcNumber, title, platform, difficulty };
      this._showLangPicker();
      return;
    }

    await this._doSummon(lcNumber, title, language, platform, difficulty);
  },

  _showLangPicker() {
    this.UI.langPicker.classList.remove('hidden');
    this.UI.loading.classList.add('hidden');
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.UI.output.textContent = '';
    this.setControlsEnabled(false);
  },

  async _pickLanguage(lang) {
    if (!this._pendingSummon) return;
    const { lcNumber, title, platform, difficulty } = this._pendingSummon;
    this._pendingSummon = null;
    this.UI.langPicker.classList.add('hidden');
    await this._doSummon(lcNumber, title, lang, platform, difficulty);
  },

  async _doSummon(lcNumber, title, language, platform, difficulty) {
    this.UI.langBadge.textContent = language.toUpperCase();
    this.UI.loading.classList.remove('hidden');
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.UI.output.parentElement.classList.remove('interactive');
    this.startLoadingAnimation(language);
    this.UI.output.textContent = '';
    this.setControlsEnabled(false);

    try {
      const res = await fetch('/.netlify/functions/generate-ghost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lcNumber, title, language, platform, difficulty })
      });
      const data = await res.json();

      if (data?.error === 'NO_SOLUTION') {
        this.stopLoadingAnimation();
        this.setControlsEnabled(true);
        this.close();
        showToast(data.message || "Ghost Engine has no solution for this problem yet. Try a different problem!", 'info');
        return;
      }

      if (!res.ok || !data.ok) throw new Error(data?.error || 'Failed to summon ghost');

      this.state.code = (data.data.optimal_code || '').trimStart();

      if (data.data.intuition) {
        this.UI.intuitionText.textContent = data.data.intuition;
        this.UI.timeBadge.textContent = `⏳ ${data.data.time_complexity || 'O(?)'}`;
        this.UI.spaceBadge.textContent = `💾 ${data.data.space_complexity || 'O(?)'}`;
        this.UI.intuitionPanel.classList.remove('hidden');
      }

      this.state.pauses = (data.data.thought_pauses || []).reduce((acc, p) => {
        acc[p.line_number] = p;
        return acc;
      }, {});

      this.stopLoadingAnimation();
      this.UI.loading.classList.add('hidden');
      this.setControlsEnabled(true);
      this.play();
    } catch (err) {
      this.stopLoadingAnimation();
      this.setControlsEnabled(true);
      this.close();
      showToast(err.message, 'error');
    }
  },

  startLoadingAnimation(language) {
    const texts = [
      "> Initializing Ghost Engine...",
      "> Analyzing problem constraints...",
      "> Building Abstract Syntax Tree...",
      "> Optimizing time complexity...",
      `> Writing optimal ${language} solution...`,
      "> Finalizing cognitive annotations..."
    ];
    let idx = 0;
    const textEl = document.querySelector('.ghost-loading-text');
    if (textEl) textEl.textContent = texts[0];
    
    this.intervals.loading = setInterval(() => {
      idx = (idx + 1) % texts.length;
      if (textEl) textEl.textContent = texts[idx];
    }, 1500);
  },

  stopLoadingAnimation() {
    clearInterval(this.intervals.loading);
    const textEl = document.querySelector('.ghost-loading-text');
    if (textEl) textEl.textContent = "Summoning optimal ghost...";
  },

  togglePlay() {
    if (this.state.charIndex >= this.state.code.length) {
      // Replay from start
      this.state.charIndex = 0;
      this.state.currentLine = 1;
      this.UI.output.parentElement.classList.remove('interactive');
      this.UI.output.textContent = '';
      this.UI.annotation.classList.remove('visible');
    }
    this.state.isPlaying ? this.pause() : this.play();
  },

  skipPlayback() {
    this.stopPlayback();
    this.UI.body.classList.remove('is-typing'); // ensure scroll is restored
    this.state.charIndex = this.state.code.length;
    this.UI.annotation.classList.remove('visible');
    this.renderInteractiveCode();
    this.updateControls();
  },

  play() {
    this.state.isPlaying = true;
    this.updateControls();
    document.getElementById('ghost-body').classList.add('is-typing');
    this.typeNext();
  },

  pause() {
    this.state.isPlaying = false;
    clearTimeout(this.intervals.typing);
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.updateControls();
  },

  stopPlayback() {
    this.state.isPlaying = false;
    this.state.isPausedForThought = false;
    clearTimeout(this.intervals.typing);
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.UI.annotation.classList.remove('visible');
  },

  toggleSpeed() {
    const speeds = [1, 2, 4];
    const idx = speeds.indexOf(this.state.speed);
    this.state.speed = speeds[(idx + 1) % speeds.length];
    this.UI.speedBtn.textContent = this.state.speed + 'x';
  },

  updateControls() {
    this.UI.playBtn.textContent = this.state.isPlaying ? '⏸' : '▶';
    const pct = this.state.code.length ? (this.state.charIndex / this.state.code.length) * 100 : 0;
    this.UI.progress.style.width = pct + '%';
  },

  typeNext() {
    if (!this.state.isPlaying || this.state.isPausedForThought) return;

    if (this.state.charIndex >= this.state.code.length) {
      this.stopPlayback(); // Done
      this.renderInteractiveCode();
      this.updateControls();
      return;
    }

    const char = this.state.code[this.state.charIndex];
    this.UI.output.textContent += char;
    this.state.charIndex++;
    this.updateControls();

    // Scroll to bottom only if actively typing
    if (this.state.isPlaying) {
      this.UI.body.scrollTop = this.UI.body.scrollHeight;
    }

    // Line break logic
    if (char === '\\n' || char === '\n') {
      this.state.currentLine++;
      const thought = this.state.pauses[this.state.currentLine];
      
      if (thought) {
        this.triggerCognitivePause(thought);
        return; // Halt normal typing loop
      }
    }

    // Baseline typing speed: random between 20ms and 80ms, divided by speed multiplier
    let baseDelay = 20 + Math.random() * 60;
    // Faster on spaces or indents
    if (char === ' ') baseDelay = 10;
    
    const delay = baseDelay / this.state.speed;
    this.intervals.typing = setTimeout(() => this.typeNext(), delay);
  },

  triggerCognitivePause(thought) {
    this.state.isPausedForThought = true;
    clearTimeout(this.intervals.typing);
    this.updateControls(); // ensure play button shows paused state if we want

    // Show annotation with manual resume button
    this.UI.annoText.innerHTML = `
      <div style="margin-bottom:4px;">${thought.annotation}</div>
      <button class="ghost-anno-btn" onclick="GhostEngine.resumeFromThought()">Resume Replay ➔</button>
    `;
    this.UI.annotation.classList.add('visible');
  },

  resumeFromThought() {
    this.UI.annotation.classList.remove('visible');
    this.state.isPausedForThought = false;
    if (this.state.isPlaying) this.typeNext();
  },

  renderInteractiveCode() {
    this.UI.output.parentElement.classList.add('interactive');
    const lines = this.state.code.split('\n');
    let html = '';
    
    // Helper to safely escape HTML to prevent XSS injection in user code
    const escapeHtml = (unsafe) => {
      return (unsafe || '').replace(/[&<"']/g, m => {
        switch (m) {
          case '&': return '&amp;'; case '<': return '&lt;';
          case '"': return '&quot;'; default: return '&#039;';
        }
      });
    };

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const hasPause = !!this.state.pauses[lineNum];
      // Use white-space:pre to preserve all indentation and spacing per line
      const lineHtml = `<span style="white-space:pre;">${escapeHtml(line) || ' '}</span>`;
      if (hasPause) {
        html += `<div class="ghost-line-wrapper"><span class="ghost-line-marker" onclick="GhostEngine.showInteractivePause(${lineNum}, this)" title="Click to view explanation">💡</span>${lineHtml}</div>`;
      } else {
        html += `<div class="ghost-line-wrapper">${lineHtml}</div>`;
      }
    });
    this.UI.output.innerHTML = html;
  },

  showInteractivePause(lineNum, markerEl) {
    document.querySelectorAll('.ghost-line-marker').forEach(el => el.classList.remove('active'));
    markerEl.classList.add('active');
    const p = this.state.pauses[lineNum];
    if (p) {
      this.UI.annoText.innerHTML = `
        <div style="margin-bottom:4px;">${p.annotation}</div>
        <button class="ghost-anno-btn" onclick="GhostEngine.hideInteractivePause()">Close ✖</button>
      `;
      this.UI.annotation.classList.add('visible');
    }
  },

  hideInteractivePause() {
    this.UI.annotation.classList.remove('visible');
    document.querySelectorAll('.ghost-line-marker').forEach(el => el.classList.remove('active'));
  },

  async copyCode() {
    if (!this.state.code) return;
    try {
      await navigator.clipboard.writeText(this.state.code);
      showToast('Solution copied to clipboard!', 'success');
      const btn = document.getElementById('ghost-copy-btn');
      btn.textContent = '✅ Copied';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
    } catch (e) {
      showToast('Failed to copy', 'error');
    }
  }
};
