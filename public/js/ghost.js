import { showToast } from './toast.js';
import { lockScroll, unlockScroll } from './utils.js';
import { lsSet, lsGet } from './storage.js';

export const GhostEngine = {
  UI: null,
  state: {
    isPlaying: false,
    speed: 1, // 1x, 2x, 4x
    code: '',
    charIndex: 0,
    currentLine: 1
  },
  intervals: {
    typing: null
  },

  init() {
    if (this.UI) return;
    const html = `
      <div id="ghost-overlay" class="ghost-overlay" onclick="GhostEngine.handleOverlayClick(event)">
        <div class="ghost-window" style="flex-direction: row; width: 100vw; height: 100vh;">
          
          <div style="flex: 3; display: flex; flex-direction: column; position: relative; border-right: 1px solid rgba(124, 106, 247, 0.3);">
            <div class="ghost-header">
              <div class="ghost-title">
                <span style="font-size:16px;">👻</span> 
                Temporal Ghost Replay 
                <span id="ghost-title-text" style="color:#888;margin-left:8px;font-weight:400;"></span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <span class="ghost-badge" id="ghost-lang-badge" style="display: none;"></span>
              </div>
            </div>
            
            <div class="ghost-body" id="ghost-body">
              <div id="ghost-lang-picker" class="ghost-lang-picker hidden">
                <div class="ghost-lang-picker-title">Choose your weapon</div>
                <div class="ghost-lang-grid">
                  <button class="ghost-lang-card" onclick="GhostEngine._pickLanguage('C++')" style="border-color: #7c6af7; background: rgba(124, 106, 247, 0.1);">
                    <span class="ghost-lang-icon">⚡</span>
                    <span class="ghost-lang-name">C++ (Default)</span>
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
                <div class="ghost-loading-text" style="text-align: center;">
                  Summoning optimal ghost...<br/>
                  <span style="font-size: 0.85em; color: var(--text-muted); font-weight: normal; margin-top: 8px; display: inline-block;">This AI generation takes a minute. Grab a cup of coffee! ☕</span>
                </div>
              </div>
              
              <div id="ghost-naive-panel" class="ghost-intuition-panel hidden" style="border-left-color: #ff4757; background: rgba(255, 71, 87, 0.05); margin-bottom: 12px;">
                <div class="ghost-intuition-header">
                  <span class="ghost-intuition-title" style="color: #ff4757;">⚠️ Naive Approach</span>
                </div>
                <div id="ghost-naive-text" class="ghost-intuition-text"></div>
              </div>

              <div id="ghost-intuition-panel" class="ghost-intuition-panel hidden">
                <div class="ghost-intuition-header">
                  <span class="ghost-intuition-title">✨ Optimal Intuition</span>
                  <div class="ghost-complexity-badges">
                    <span id="ghost-time-badge" class="ghost-badge time"></span>
                    <span id="ghost-space-badge" class="ghost-badge space"></span>
                  </div>
                </div>
                <div id="ghost-intuition-text" class="ghost-intuition-text"></div>
              </div>
              
              <div id="ghost-dry-run-panel" class="ghost-intuition-panel hidden" style="border-left-color: #0fb9b1; background: rgba(15, 185, 177, 0.05); margin-top: 12px;">
                <div class="ghost-intuition-header">
                  <span class="ghost-intuition-title" style="color: #0fb9b1;">👟 Dry Run (Mental Tracing)</span>
                </div>
                <div id="ghost-dry-run-steps" class="ghost-intuition-text" style="display: flex; flex-direction: column; gap: 8px;"></div>
              </div>

              <div class="ghost-code-content" id="ghost-code-container"><span id="ghost-code-output"></span><span class="ghost-cursor" id="ghost-cursor"></span></div>
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

          <div style="flex: 1; background: #0a0a0c; display: flex; flex-direction: column; min-width: 300px;">
            <div class="ghost-header" style="border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
              <div class="ghost-title" style="color: #88ccff; display:flex; align-items:center;"><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:24px; height:24px; border-radius:50%; margin-right:8px; background:white; padding:2px; box-sizing:border-box;"> Snowy Chat</div>
              <button onclick="GhostEngine.close()" style="background: rgba(255,71,87,0.15); border: 1px solid rgba(255,71,87,0.3); color: #ff4757; font-size: 24px; font-weight: bold; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,71,87,0.3)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,71,87,0.15)'; this.style.color='#ff4757';">×</button>
            </div>
            <div id="ghost-mentor-chat" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; font-family: 'Syne', sans-serif;">
            </div>
            <div id="ghost-chat-actions" style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.06); display: none; background: #0a0a0c;">
            </div>
            <div id="ghost-chat-input-area" style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.06); display: none; gap: 8px; background: #131318;">
              <input type="text" id="ghost-chat-input" placeholder="Ask Snowy about this code..." style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px 12px; color: white; outline: none; font-size: 13px;" onkeydown="if(event.key === 'Enter') GhostEngine.sendChatMessage()">
              <button id="ghost-chat-send" onclick="GhostEngine.sendChatMessage()" style="background: var(--accent); border: none; color: white; padding: 0 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">Ask</button>
            </div>
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
      codeContent: document.getElementById('ghost-code-container'),
      naivePanel: document.getElementById('ghost-naive-panel'),
      naiveText: document.getElementById('ghost-naive-text'),
      intuitionPanel: document.getElementById('ghost-intuition-panel'),
      intuitionText: document.getElementById('ghost-intuition-text'),
      dryRunPanel: document.getElementById('ghost-dry-run-panel'),
      dryRunSteps: document.getElementById('ghost-dry-run-steps'),
      timeBadge: document.getElementById('ghost-time-badge'),
      spaceBadge: document.getElementById('ghost-space-badge'),
      mentorChat: document.getElementById('ghost-mentor-chat'),
      chatActions: document.getElementById('ghost-chat-actions'),
      chatInputArea: document.getElementById('ghost-chat-input-area'),
      chatInput: document.getElementById('ghost-chat-input'),
      chatSend: document.getElementById('ghost-chat-send'),
      resumeBtn: document.getElementById('ghost-resume-btn'),
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
    if (this._pollAbort) {
      this._pollAbort.abort();   // cancels the in-flight long-poll
      this._pollAbort = null;
    }
    unlockScroll();
  },

  async summon(lcNumber, title, language = null, platform = 'LeetCode', difficulty = 'Medium') {
    this.init();
    lockScroll();
    this.UI.overlay.classList.add('open');
    this.UI.title.textContent = '- ' + title;
    this.UI.langBadge.style.display = 'none';
    this.UI.output.textContent = '';
    this.UI.mentorChat.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 20px;">Waiting for the optimal solution... Once it\'s ready, you can ask me questions about the logic!</div>';
    this.UI.chatActions.style.display = 'none';
    this.UI.intuitionPanel.classList.add('hidden');
    if (this.UI.naivePanel) this.UI.naivePanel.classList.add('hidden');
    if (this.UI.dryRunPanel) this.UI.dryRunPanel.classList.add('hidden');
    this.state = { isPlaying: false, speed: 1, code: '', charIndex: 0, currentLine: 1, chatHistory: [], problemTitle: title, ghostContext: null };
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
    this.UI.langBadge.style.display = 'inline-block';
    this.UI.loading.classList.remove('hidden');
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.UI.output.parentElement.classList.remove('interactive');
    this.startLoadingAnimation(language);
    this.UI.output.textContent = '';
    this.setControlsEnabled(false);

    try {
      // 1. Check cache first
      let res = await fetch('/.netlify/functions/check-ghost-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lcNumber, title, language, platform, difficulty })
      });
      let data = await res.json();

      if (data?.error === 'NO_SOLUTION') {
        this.stopLoadingAnimation();
        this.setControlsEnabled(true);
        this.close();
        showToast(data.message || "Ghost Engine has no solution for this problem yet. Try a different problem!", 'info');
        return;
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to check ghost cache');

      // 2. If pending or generating, wait for the background generator to finish
      if (data.status === 'pending' || data.status === 'generating') {
        const result = await this._awaitGhost({
          payload: { lcNumber, title, language, platform, difficulty },
          realtime: data.realtime,
          needsTrigger: data.status === 'pending',
        });
        if (!result) return; // modal closed while waiting

        if (result.status === 'NO_SOLUTION') {
          this.stopLoadingAnimation();
          this.setControlsEnabled(true);
          this.close();
          showToast(result.message || "Ghost Engine has no solution for this problem yet. Try a different problem!", 'info');
          return;
        }
        data = result.data;
      }

      if (!data.data || !data.data.optimal_code) {
         throw new Error("Invalid response from Ghost Engine");
      }

      this.state.code = (data.data.optimal_code || '').trimStart();
      this.state.ghostContext = data.data;

      // Enable chat only after successful generation
      this.UI.chatInputArea.style.display = 'flex';
      
      const cache = lsGet('dsa_ghost_history', {});
      this.state.chatHistory = cache[lcNumber] || [];

      // Restore chat UI if history exists
      for (const msg of this.state.chatHistory) {
        const div = document.createElement('div');
        div.className = `msg ${msg.role}`;
        div.style.fontSize = '16px';
        div.style.fontFamily = "'Kalam', cursive";
        div.style.lineHeight = '1.4';
        if (msg.role === 'assistant') {
          div.innerHTML = `<strong><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px; background:white; padding:2px; box-sizing:border-box;"> Snowy:</strong> <span>${msg.content}</span>`;
        } else {
          div.innerHTML = `<strong>You:</strong> <span>${msg.content}</span>`;
        }
        this.UI.mentorChat.appendChild(div);
      }
      if (this.state.chatHistory.length > 0) {
        this.UI.mentorChat.scrollTop = this.UI.mentorChat.scrollHeight;
      }

      const naiveText = data.data.naive_approach;
      if (naiveText && this.UI.naivePanel) {
        this.UI.naiveText.textContent = naiveText;
        this.UI.naivePanel.classList.remove('hidden');
      }

      if (data.data.intuition) {
        this.UI.intuitionText.textContent = data.data.intuition;
        this.UI.timeBadge.textContent = `⏳ ${data.data.time_complexity || 'O(?)'}`;
        this.UI.spaceBadge.textContent = `💾 ${data.data.space_complexity || 'O(?)'}`;
        this.UI.intuitionPanel.classList.remove('hidden');
      }

      if (data.data.dry_run && Array.isArray(data.data.dry_run) && this.UI.dryRunPanel) {
        this.UI.dryRunSteps.innerHTML = '';
        data.data.dry_run.forEach(step => {
          const div = document.createElement('div');
          div.style.padding = "8px";
          div.style.background = "rgba(0,0,0,0.2)";
          div.style.borderRadius = "6px";
          div.style.borderLeft = "3px solid #0fb9b1";
          div.innerHTML = `<strong style="color: #0fb9b1;">[Step ${step.step}] ${step.variable_state}</strong><br><span style="opacity:0.85; font-size:0.9em; line-height: 1.4; display: inline-block; margin-top: 4px;">${step.description}</span>`;
          this.UI.dryRunSteps.appendChild(div);
        });
        this.UI.dryRunPanel.classList.remove('hidden');
      }

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

  // ── Waiting for generation ────────────────────────────────────────────────
  // Preferred: the generator pushes "ghost-ready"/"ghost-failed" over Pusher and we fetch the
  // replay on that signal. Fallback (Pusher unconfigured/blocked): server-held long-poll.
  // Returns { status: 'SUCCESS', data } | { status: 'NO_SOLUTION', message } | null (modal closed).
  async _awaitGhost({ payload, realtime, needsTrigger }) {
    const GENERATION_BUDGET_MS = 5 * 60 * 1000;
    const SAFETY_RECHECK_MS    = 30 * 1000;   // insurance against a dropped push event
    const FAILED_MSG = "Ghost Engine couldn't generate this replay right now. Please try again in a moment.";
    const startedAt = Date.now();
    const abort = this._pollAbort = new AbortController();
    const signal = abort.signal;
    let retriggers = 0;

    const trigger = () => fetch('/.netlify/functions/generate-ghost-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {}); // fire and forget

    const check = async (wait) => {
      const res = await fetch('/.netlify/functions/check-ghost-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, wait }),
        signal
      });
      return { res, body: await res.json() };
    };

    // Interprets a check result: a final answer, or null meaning "keep waiting". Throws on failure.
    const settle = ({ res, body }) => {
      if (body?.error === 'NO_SOLUTION') return { status: 'NO_SOLUTION', message: body.message };
      if (!res.ok) {
        if (res.status < 500) throw new Error(body?.error || 'Failed to check ghost cache');
        return null; // 5xx: maybe transient
      }
      if (body?.status === 'failed') throw new Error(FAILED_MSG);
      if (body?.ok && body.data) return { status: 'SUCCESS', data: body };
      return null;
    };
    const overBudget = () => Date.now() - startedAt > GENERATION_BUDGET_MS &&
      (() => { throw new Error("Ghost Replay generation is taking longer than expected. Please check back later."); })();

    try {
      // Subscribe BEFORE triggering so we can't miss the event.
      const sub = realtime ? await this._subscribeGhost(realtime) : null;
      if (needsTrigger) trigger();

      if (sub) {
        try {
          // Catch anything that finished between the first check and the subscription going live.
          const early = settle(await check(false));
          if (early) return early;

          while (true) {
            overBudget();
            const evt = await sub.next(SAFETY_RECHECK_MS, signal);
            if (signal.aborted) return null;
            if (evt === 'failed') throw new Error(FAILED_MSG);

            // 'ready' → fetch the replay; 'timeout' → safety re-check (event may have been dropped)
            let out = null;
            try {
              const r = await check(false);
              out = settle(r);
              // No row at all (trigger lost) → kick generation off again, once.
              if (!out && evt === 'timeout' && r.body?.status === 'pending' && retriggers++ < 1) trigger();
            } catch (err) {
              if (signal.aborted) return null;
              if (err.name !== 'TypeError') throw err; // network blip → keep waiting
            }
            if (out) return out;
          }
        } finally { sub.close(); }
      }

      // Fallback: long-poll — each request is held open by the server (~20s) and returns the
      // moment the background function finishes.
      while (true) {
        overBudget();
        let r;
        try { r = await check(true); }
        catch (err) {
          if (signal.aborted) return null;                 // modal closed
          await new Promise(res => setTimeout(res, 2000)); // network blip — pause, then re-wait
          continue;
        }
        if (signal.aborted) return null;
        const out = settle(r);
        if (out) return out;
        if (!r.res.ok) { await new Promise(res => setTimeout(res, 2000)); continue; } // never spin on 5xx
        if (r.body?.status === 'pending' && retriggers++ < 3) trigger(); // trigger request was lost
      }
    } finally {
      if (this._pollAbort === abort) this._pollAbort = null;
    }
  },

  _loadPusher() {
    if (window.Pusher) return Promise.resolve(window.Pusher);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pusher-js@8.4.0/dist/web/pusher.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = () => window.Pusher ? resolve(window.Pusher) : reject(new Error('Pusher missing'));
      s.onerror = () => reject(new Error('Pusher failed to load'));
      document.head.appendChild(s);
    });
  },

  // Subscribes to the problem's channel. Resolves { next(ms, signal), close() }, or null if
  // realtime is unavailable (blocked script, connection trouble) so the caller can long-poll.
  async _subscribeGhost({ key, cluster, channel }) {
    try {
      const Pusher = await Promise.race([
        this._loadPusher(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Pusher load timeout')), 8000)),
      ]);
      this._pusher = this._pusher || new Pusher(key, { cluster });
      const pusher = this._pusher;
      const ch = pusher.subscribe(channel);

      const queue = [];
      let wake = null;
      const push = (evt) => { queue.push(evt); wake?.(); };
      ch.bind('ghost-ready',  () => push('ready'));
      ch.bind('ghost-failed', () => push('failed'));

      if (!ch.subscribed) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Pusher subscribe timeout')), 6000);
          ch.bind('pusher:subscription_succeeded', () => { clearTimeout(t); resolve(); });
          ch.bind('pusher:subscription_error',     () => { clearTimeout(t); reject(new Error('Pusher subscribe error')); });
        });
      }

      return {
        // Resolves with the next event, 'timeout' after ms, or 'aborted' if the modal closes.
        next: (ms, signal) => new Promise((resolve) => {
          if (queue.length) return resolve(queue.shift());
          if (signal?.aborted) return resolve('aborted');
          const done = (v) => { clearTimeout(t); wake = null; signal?.removeEventListener('abort', onAbort); resolve(v); };
          const onAbort = () => done('aborted');
          const t = setTimeout(() => done('timeout'), ms);
          wake = () => done(queue.shift());
          signal?.addEventListener('abort', onAbort, { once: true });
        }),
        close: () => { try { ch.unbind_all(); pusher.unsubscribe(channel); } catch {} },
      };
    } catch (err) {
      try { this._pusher?.unsubscribe(channel); } catch {}
      return null;
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
      this.state.charIndex = 0;
      this.UI.output.parentElement.classList.remove('interactive');
      this.UI.output.textContent = '';
      this.UI.mentorChat.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 20px;">Waiting for the optimal solution... Once it\'s ready, you can ask me questions about the logic!</div>';
      this.UI.chatActions.style.display = 'none';
      this.UI.chatInputArea.style.display = 'flex';
      this.state.chatHistory = [];
    }
    this.state.isPlaying ? this.pause() : this.play();
  },

  sendChatMessage: async function() {
    const input = this.UI.chatInput;
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    
    const userMsg = document.createElement('div');
    userMsg.style.background = 'rgba(255,255,255,0.05)';
    userMsg.style.padding = '10px 14px';
    userMsg.style.borderRadius = '8px';
    userMsg.style.fontSize = '16px';
    userMsg.style.fontFamily = "'Kalam', cursive";
    userMsg.style.lineHeight = '1.4';
    userMsg.style.marginLeft = '20px';
    userMsg.innerHTML = `<strong>You:</strong><br>${text}`;
    this.UI.mentorChat.appendChild(userMsg);
    this.UI.mentorChat.scrollTop = this.UI.mentorChat.scrollHeight;
    
    this.state.chatHistory.push({ role: 'user', content: text });
    this._saveGhostCache();
    
    const typingMsg = document.createElement('div');
    typingMsg.style.background = 'rgba(100,200,255,0.1)';
    typingMsg.style.borderLeft = '2px solid #88ccff';
    typingMsg.style.padding = '10px 14px';
    typingMsg.style.borderRadius = '8px';
    typingMsg.style.fontSize = '16px';
    typingMsg.style.fontFamily = "'Kalam', cursive";
    typingMsg.innerHTML = `<strong><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px; background:white; padding:2px; box-sizing:border-box;"> Snowy:</strong> <em>Typing...</em>`;
    this.UI.mentorChat.appendChild(typingMsg);
    this.UI.mentorChat.scrollTop = this.UI.mentorChat.scrollHeight;

    input.disabled = true;
    this.UI.chatSend.disabled = true;
    
    try {
      const token = await window.Clerk.session.getToken();
      const filteredHistory = this.state.chatHistory.filter(m => m.isGenuine !== false).slice(-5);
      
      const response = await fetch('/.netlify/functions/ghost-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problemTitle: this.state.problemTitle,
          fullCode: this.state.code,
          ghostContext: this.state.ghostContext,
          history: filteredHistory
        })
      });
      
      if (!response.ok) throw new Error('Failed to get chat response');
      const data = await response.json();
      
      typingMsg.innerHTML = `<strong><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px; background:white; padding:2px; box-sizing:border-box;"> Snowy:</strong><br>${data.data.reply}`;
      
      if (data.data.isGenuine === false) {
        if (this.state.chatHistory.length > 0 && this.state.chatHistory[this.state.chatHistory.length - 1].role === 'user') {
          this.state.chatHistory[this.state.chatHistory.length - 1].isGenuine = false;
        }
        this.state.chatHistory.push({ role: 'assistant', content: data.data.reply, isGenuine: false });
      } else {
        this.state.chatHistory.push({ role: 'assistant', content: data.data.reply, isGenuine: true });
      }
      this._saveGhostCache();
      
    } catch (err) {
      typingMsg.innerHTML = `<strong><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px; background:white; padding:2px; box-sizing:border-box;"> Snowy:</strong><br><em>Sorry, I encountered an error answering that.</em>`;
    } finally {
      input.disabled = false;
      this.UI.chatSend.disabled = false;
      input.focus();
      this.UI.mentorChat.scrollTop = this.UI.mentorChat.scrollHeight;
    }
  },

  skipPlayback() {
    this.stopPlayback();
    this.UI.body.classList.remove('is-typing');
    this.state.charIndex = this.state.code.length;
    this.renderCompletedCode();
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
    clearInterval(this.intervals.typing);
    this.intervals.typing = null;
    this.updateControls();
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.UI.chatActions.style.display = 'none';
  },

  stopPlayback() {
    this.state.isPlaying = false;
    clearInterval(this.intervals.typing);
    document.getElementById('ghost-body').classList.remove('is-typing');
    this.UI.chatActions.style.display = 'none';
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
    if (!this.state.isPlaying) return;

    if (this.state.charIndex >= this.state.code.length) {
      this.stopPlayback();
      this.renderCompletedCode();
      this.updateControls();
      return;
    }

    const char = this.state.code[this.state.charIndex];
    if (this.UI.output.lastChild && this.UI.output.lastChild.nodeType === 3) {
      this.UI.output.lastChild.nodeValue += char;
    } else {
      this.UI.output.appendChild(document.createTextNode(char));
    }
    this.state.charIndex++;
    this.updateControls();

    if (this.state.isPlaying) {
      this.UI.body.scrollTop = this.UI.body.scrollHeight;
    }

    let baseDelay = 20 + Math.random() * 60;
    if (char === ' ') baseDelay = 10;
    
    const delay = baseDelay / this.state.speed;
    this.intervals.typing = setTimeout(() => this.typeNext(), delay);
  },

  renderCompletedCode() {
    this.UI.output.parentElement.classList.add('interactive');
    const lines = this.state.code.split('\n');
    const html = lines.map((lineStr) => {
        const lineHtml = lineStr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="ghost-line-wrapper">${lineHtml || ' '}</div>`;
      }).join('');
    this.UI.output.innerHTML = html;
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
  },

  _saveGhostCache() {
    if (!this._pendingSummon && !this.state.problemTitle) return;
    const lcNumber = this._pendingSummon ? this._pendingSummon.lcNumber : (this.state.ghostContext?.lc_number);
    if (!lcNumber) return;
    
    const cache = lsGet('dsa_ghost_history', {});
    cache[lcNumber] = this.state.chatHistory;
    lsSet('dsa_ghost_history', cache);
  }
};
