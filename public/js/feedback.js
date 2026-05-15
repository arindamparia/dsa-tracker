import { lockScroll, unlockScroll } from './utils.js';
import { showToast } from './toast.js';

// ── Submit Feedback Modal ─────────────────────────────────────────────────
export const FeedbackModal = {
  _id: 'feedback-modal',

  open() {
    lockScroll();
    document.getElementById(this._id).classList.add('open');
    setTimeout(() => document.getElementById('fb-message')?.focus({ preventScroll: true }), 60);
  },

  close() {
    document.getElementById(this._id).classList.remove('open');
    unlockScroll();
    const msg = document.getElementById('fb-message');
    const err = document.getElementById('fb-error');
    if (msg) msg.value = '';
    if (err) { err.textContent = ''; err.classList.remove('show'); }
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById(this._id)) this.close();
  },

  async submit() {
    const msgEl  = document.getElementById('fb-message');
    const errEl  = document.getElementById('fb-error');
    const btn    = document.getElementById('fb-submit-btn');
    const message = (msgEl?.value || '').trim();

    if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }

    if (!message) {
      if (errEl) { errEl.textContent = 'Please write something before submitting.'; errEl.classList.add('show'); }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res  = await fetch('/.netlify/functions/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.ok) {
        this.close();
        showToast('Feedback sent — thank you!', 'success');
      } else {
        if (errEl) { errEl.textContent = data.error || 'Failed to send feedback.'; errEl.classList.add('show'); }
      }
    } catch {
      if (errEl) { errEl.textContent = 'Network error. Please try again.'; errEl.classList.add('show'); }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Feedback'; }
    }
  },
};

// ── View Feedback Modal (admin only) ──────────────────────────────────────
export const ViewFeedbackModal = {
  _id: 'view-feedback-modal',

  open() {
    lockScroll();
    document.getElementById(this._id).classList.add('open');
    this._load();
  },

  close() {
    document.getElementById(this._id).classList.remove('open');
    unlockScroll();
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById(this._id)) this.close();
  },

  async _load() {
    const list    = document.getElementById('vf-list');
    const counter = document.getElementById('vf-count');
    if (!list) return;
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:32px 0;">Loading…</div>`;

    try {
      const res  = await fetch('/.netlify/functions/get-feedback');
      const data = await res.json();

      if (!data.ok) {
        list.innerHTML = `<div style="text-align:center;color:var(--hard);font-size:13px;padding:32px 0;">${data.error || 'Failed to load.'}</div>`;
        return;
      }

      const items = data.feedback;
      if (counter) counter.textContent = items.length ? `${items.length} total` : '';

      if (!items.length) {
        list.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:40px 0;">No feedback submitted yet.</div>`;
        return;
      }

      list.innerHTML = items.map((f, i) => {
        const name    = f.user_name  || 'Anonymous';
        const email   = f.user_email || '';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const date    = new Date(f.created_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
        });
        const time    = new Date(f.created_at).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit',
        });
        const avatarHtml = f.image_url
          ? `<img src="${_esc(f.image_url)}" alt="" style="flex-shrink:0;width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid rgba(124,106,247,0.3);" />`
          : `<div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:rgba(124,106,247,0.15);border:1px solid rgba(124,106,247,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#9d8ff7;font-family:'JetBrains Mono',monospace;">${_esc(initials)}</div>`;
        return `
          <div style="display:flex;gap:12px;align-items:flex-start;">
            ${avatarHtml}
            <div style="flex:1;min-width:0;background:var(--surface3);border:1px solid var(--border);border-radius:10px;padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <div>
                  <span style="font-size:13px;font-weight:700;color:var(--text);">${_esc(name)}</span>
                  ${email ? `<span style="font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-left:8px;">${_esc(email)}</span>` : ''}
                </div>
                <span style="font-size:10px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;white-space:nowrap;">${date} · ${time}</span>
              </div>
              <div style="font-size:13px;color:var(--text);line-height:1.65;white-space:pre-wrap;border-top:1px solid var(--border);padding-top:8px;">${_esc(f.message)}</div>
            </div>
          </div>`;
      }).join('');
    } catch {
      list.innerHTML = `<div style="text-align:center;color:var(--hard);font-size:13px;padding:32px 0;">Network error.</div>`;
    }
  },
};

function _esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
