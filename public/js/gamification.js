// Gamification logic: Socratic Mock Interview
import { state } from './state.js';
import { lsSet, lsGet } from './storage.js';

// --- Socratic Mock Interview ---
export const SocraticChat = {
  currentLc: null,
  currentName: '',
  currentDiff: '',
  currentUrl: '',
  currentPlatform: '',
  history: [],
  isOpen: false,
  _outsideClickHandler: null,

  open(lcNumber, problemName, difficulty, url = '', platform = '') {
    this.currentLc = lcNumber;
    this.currentName = problemName;
    this.currentDiff = difficulty;
    this.currentUrl = url;
    this.currentPlatform = platform;
    
    // Load from cache
    const cache = lsGet('dsa_socratic_history', {});
    this.history = cache[lcNumber] || [];
    this.isOpen = true;
    
    this._injectCSS();

    const drawer = document.getElementById('socratic-drawer');
    const historyDiv = document.getElementById('socratic-history');
    
    if (drawer) {
      // Clear the inline pre-hide style — JS-injected CSS now controls visibility
      drawer.style.cssText = '';
      drawer.classList.add('open');
      historyDiv.innerHTML = '';
      document.getElementById('socratic-input').value = '';

      // Always show the initial greeting
      this.addMessage('system', `I'm Snowy! Let's dig into "${problemName}". How would you approach this? (Think aloud)`, this.history.length === 0, true);

      // Restore history
      for (const msg of this.history) {
        this.addMessage(msg.role === 'user' ? 'user' : 'system', msg.content, false, true);
      }

      // Click-outside to close
      if (this._outsideClickHandler) {
        document.removeEventListener('click', this._outsideClickHandler);
      }
      this._outsideClickHandler = (e) => {
        const d = document.getElementById('socratic-drawer');
        if (d && !d.contains(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        }
      };
      setTimeout(() => document.addEventListener('click', this._outsideClickHandler, true), 100);
    }
  },

  close() {
    this.isOpen = false;
    document.getElementById('socratic-drawer')?.classList.remove('open');
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler, true);
      this._outsideClickHandler = null;
    }
  },

  addMessage(role, text, animate = true, isRestoring = false) {
    const historyDiv = document.getElementById('socratic-history');
    if (!historyDiv) return;

    const div = document.createElement('div');
    div.className = `socratic-msg ${role}`;
    
    if (role === 'system') {
      div.innerHTML = `<strong><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px; background:white; padding:2px; box-sizing:border-box;"> Snowy:</strong> <span class="socratic-text"></span>`;
      const span = div.querySelector('.socratic-text');
      
      if (animate) {
        let i = 0;
        const type = () => {
          if (i < text.length) {
            span.textContent += text.charAt(i);
            i++;
            historyDiv.scrollTop = historyDiv.scrollHeight;
            setTimeout(type, 20);
          }
        };
        type();
      } else {
        span.textContent = text;
      }
    } else {
      div.innerHTML = `<strong>You:</strong> <span>${text}</span>`;
    }
    
    historyDiv.appendChild(div);
    historyDiv.scrollTop = historyDiv.scrollHeight;

    if (!isRestoring) {
      if (role !== 'system') {
        this.history.push({ role: 'user', content: text });
      } else {
        // We only save system messages to history if they are actual API replies, handled in send().
        // Initial greeting is not saved so it regenerates dynamically.
      }
      this._saveCache();
    }
  },

  _saveCache() {
    if (!this.currentLc) return;
    const cache = lsGet('dsa_socratic_history', {});
    cache[this.currentLc] = this.history;
    lsSet('dsa_socratic_history', cache);
  },

  handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  },

  async send() {
    const input = document.getElementById('socratic-input');
    const text = input.value.trim();
    if (!text) return;

    this.addMessage('user', text);
    input.value = '';
    input.disabled = true;

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'socratic-msg system typing';
    typingDiv.innerHTML = `<strong><img src="https://res.cloudinary.com/dnju7wfma/image/upload/v1779431231/snowy_shuw2h.jpg" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:4px; background:white; padding:2px; box-sizing:border-box;"> Snowy:</strong> <em>Typing...</em>`;
    document.getElementById('socratic-history').appendChild(typingDiv);

    try {
      const payload = {
        problemTitle: this.currentName,
        difficulty: this.currentDiff,
        url: this.currentUrl,
        platform: this.currentPlatform,
        history: this.history.filter(m => m.isGenuine !== false).slice(-10)
      };
      
      console.log('Mock Interview: History being sent to AI:', payload.history);

      const res = await fetch('/.netlify/functions/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      typingDiv.remove();

      if (!res.ok) throw new Error('Failed to get reply');
      const data = await res.json();
      
      if (data.ok && data.data && data.data.reply) {
        const reply = data.data.reply;
        if (data.data.isGenuine === false) {
          if (this.history.length > 0 && this.history[this.history.length - 1].role === 'user') {
            this.history[this.history.length - 1].isGenuine = false;
          }
          this.history.push({ role: 'assistant', content: reply, isGenuine: false });
        } else {
          this.history.push({ role: 'assistant', content: reply, isGenuine: true });
        }
        this._saveCache();
        this.addMessage('system', reply, true, true); // display without re-saving
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error(err);
      typingDiv.remove();
      this.addMessage('system', 'Sorry, I lost the scent. Try again?');
    } finally {
      input.disabled = false;
      input.focus();
    }
  },

  _injectCSS() {
    if (document.getElementById('socratic-styles')) return;
    const style = document.createElement('style');
    style.id = 'socratic-styles';
    style.innerHTML = `
      .socratic-drawer {
        position: fixed;
        right: -420px;
        top: 0;
        width: 420px;
        height: 100vh;
        background: var(--surface-blur, rgba(17, 17, 24, 0.95));
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-left: 1px solid var(--border);
        box-shadow: -8px 0 32px var(--shadow-lg, rgba(0,0,0,0.5));
        z-index: 10000;
        transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
      }
      .socratic-drawer.open { right: 0; }
      @media (max-width: 450px) {
        .socratic-drawer { width: 100vw; right: -100vw; }
      }
      .socratic-header {
        padding: 20px;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--surface2);
      }
      .socratic-header h3 { 
        margin: 0; 
        color: var(--accent); 
        font-size: 16px; 
        font-weight: 700; 
        letter-spacing: 0.5px; 
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .socratic-close {
        background: rgba(255, 255, 255, 0.03); 
        border: 1px solid var(--border); 
        border-radius: 50%; 
        color: var(--text-dim); 
        font-size: 20px; 
        width: 32px; 
        height: 32px; 
        cursor: pointer; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        transition: all 0.2s ease;
      }
      .socratic-close:hover { 
        background: rgba(255, 255, 255, 0.08); 
        color: var(--text); 
      }
      .socratic-chat-history {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .socratic-msg {
        max-width: 88%;
        padding: 12px 16px;
        border-radius: 12px;
        font-family: 'Kalam', cursive;
        font-size: 16px;
        line-height: 1.5;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .socratic-msg.system {
        background: var(--surface3);
        border: 1px solid var(--border2);
        border-top-left-radius: 4px;
        align-self: flex-start;
        color: var(--text);
      }
      .socratic-msg.user {
        background: var(--accent);
        color: #fff;
        border-bottom-right-radius: 4px;
        align-self: flex-end;
      }
      .socratic-input-area {
        padding: 20px;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 12px;
        background: var(--surface);
      }
      .socratic-input-area textarea {
        flex: 1;
        height: 48px;
        resize: none;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        padding: 14px 16px;
        font-family: inherit;
        font-size: 14px;
        transition: all 0.2s ease;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
      }
      .socratic-input-area textarea:focus {
        outline: none;
        border-color: var(--accent);
        background: var(--surface3);
      }
      .socratic-input-area button {
        background: var(--accent);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0 20px;
        font-weight: 600;
        cursor: pointer;
        transition: filter 0.2s ease, transform 0.1s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .socratic-input-area button:hover {
        filter: brightness(1.1);
      }
      .socratic-input-area button:active {
        transform: scale(0.96);
      }
    `;
    document.head.appendChild(style);
  }
};
