import { state } from './state.js';
import { UserCache } from './cache.js';
import { showToast } from './toast.js';
import { getUserEmail } from './auth.js';
import { handleError } from './errors.js';

// country code list (flag emoji + name + dial code)
const COUNTRIES = [
  { flag: '🇮🇳', name: 'India',      code: '+91'  },
  { flag: '🇺🇸', name: 'USA',        code: '+1'   },
  { flag: '🇬🇧', name: 'UK',         code: '+44'  },
  { flag: '🇨🇦', name: 'Canada',     code: '+1'   },
  { flag: '🇦🇺', name: 'Australia',  code: '+61'  },
  { flag: '🇩🇪', name: 'Germany',    code: '+49'  },
  { flag: '🇫🇷', name: 'France',     code: '+33'  },
  { flag: '🇯🇵', name: 'Japan',      code: '+81'  },
  { flag: '🇰🇷', name: 'S. Korea',   code: '+82'  },
  { flag: '🇨🇳', name: 'China',      code: '+86'  },
  { flag: '🇸🇬', name: 'Singapore',  code: '+65'  },
  { flag: '🇦🇪', name: 'UAE',        code: '+971' },
  { flag: '🇸🇦', name: 'S. Arabia',  code: '+966' },
  { flag: '🇧🇷', name: 'Brazil',     code: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',     code: '+52'  },
  { flag: '🇿🇦', name: 'S. Africa',  code: '+27'  },
  { flag: '🇳🇬', name: 'Nigeria',    code: '+234' },
  { flag: '🇵🇰', name: 'Pakistan',   code: '+92'  },
  { flag: '🇧🇩', name: 'Bangladesh', code: '+880' },
  { flag: '🇱🇰', name: 'Sri Lanka',  code: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',      code: '+977' },
  { flag: '🇮🇩', name: 'Indonesia',  code: '+62'  },
  { flag: '🇲🇾', name: 'Malaysia',   code: '+60'  },
  { flag: '🇵🇭', name: 'Philippines',code: '+63'  },
  { flag: '🇹🇭', name: 'Thailand',   code: '+66'  },
  { flag: '🇻🇳', name: 'Vietnam',    code: '+84'  },
  { flag: '🇮🇱', name: 'Israel',     code: '+972' },
  { flag: '🇹🇷', name: 'Turkey',     code: '+90'  },
  { flag: '🇷🇺', name: 'Russia',     code: '+7'   },
  { flag: '🇮🇹', name: 'Italy',      code: '+39'  },
  { flag: '🇪🇸', name: 'Spain',      code: '+34'  },
  { flag: '🇳🇱', name: 'Netherlands',code: '+31'  },
  { flag: '🇸🇪', name: 'Sweden',     code: '+46'  },
  { flag: '🇳🇴', name: 'Norway',     code: '+47'  },
  { flag: '🇩🇰', name: 'Denmark',    code: '+45'  },
  { flag: '🇫🇮', name: 'Finland',    code: '+358' },
  { flag: '🇵🇱', name: 'Poland',     code: '+48'  },
  { flag: '🇨🇭', name: 'Switzerland',code: '+41'  },
  { flag: '🇦🇹', name: 'Austria',    code: '+43'  },
  { flag: '🇧🇪', name: 'Belgium',    code: '+32'  },
  { flag: '🇳🇿', name: 'N. Zealand', code: '+64'  },
  { flag: '🇦🇷', name: 'Argentina',  code: '+54'  },
  { flag: '🇨🇱', name: 'Chile',      code: '+56'  },
  { flag: '🇨🇴', name: 'Colombia',   code: '+57'  },
  { flag: '🇵🇪', name: 'Peru',       code: '+51'  },
  { flag: '🇪🇬', name: 'Egypt',      code: '+20'  },
  { flag: '🇲🇦', name: 'Morocco',    code: '+212' },
  { flag: '🇰🇪', name: 'Kenya',      code: '+254' },
  { flag: '🇬🇭', name: 'Ghana',      code: '+233' },
  { flag: '🇪🇹', name: 'Ethiopia',   code: '+251' },
];

/** Splits a stored phone string like "+91 9876543210" into { code, number }. */
function splitPhone(phone) {
  if (!phone) return { code: '+91', number: '' };
  const m = phone.match(/^(\+\d+)\s*(.*)$/);
  if (m) return { code: m[1], number: m[2] };
  return { code: '+91', number: phone };
}

/** Strip non-allowed characters; keep only digits, spaces, hyphens, parens. */
function sanitizeNumber(raw) {
  return raw.replace(/[^\d\s\-()]/g, '').trim();
}

/** Count actual digit characters in a phone number string. */
function countDigits(s) {
  return (s.match(/\d/g) || []).length;
}

/** Single initial from display name or email fallback. */
function getInitial(name, email) {
  if (name && name.trim()) return name.trim()[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return '?';
}

/** Build <option> HTML for country code <select>. */
function buildCountryOptions(selected = '+91') {
  return COUNTRIES.map(c => {
    const val = `${c.code}`;
    const lbl = `${c.flag} ${c.name} (${c.code})`;
    return `<option value="${val}"${val === selected ? ' selected' : ''}>${lbl}</option>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// UserProfile — name, phone, avatar. Opened by clicking the username chip.
// ---------------------------------------------------------------------------
export const UserProfile = {
  open() {
    const modal = document.getElementById('user-profile-modal');
    if (!modal) return;

    const nameEl   = document.getElementById('up-name');
    const codeEl   = document.getElementById('up-phone-code');
    const numEl    = document.getElementById('up-phone-number');
    const avatarEl = document.getElementById('up-avatar');
    const emailEl  = document.getElementById('up-email');

    const email = getUserEmail();
    const { code, number } = splitPhone(state.userPhone);

    if (avatarEl) {
      const imgUrl = window._clerk?.user?.imageUrl;
      if (imgUrl) {
        avatarEl.innerHTML = `<img src="${imgUrl}" alt="profile" />`;
      } else {
        avatarEl.textContent = getInitial(state.userName, email);
      }
    }
    if (emailEl)  emailEl.textContent  = email;

    if (codeEl && !codeEl.options.length) {
      codeEl.innerHTML = buildCountryOptions(code);
    } else if (codeEl) {
      codeEl.value = code;
    }

    if (nameEl) nameEl.value = state.userName || '';
    if (numEl)  numEl.value  = number;

    modal.classList.add('open');
  },

  close() {
    document.getElementById('user-profile-modal')?.classList.remove('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('user-profile-modal')) this.close();
  },

  async save() {
    const nameEl  = document.getElementById('up-name');
    const codeEl  = document.getElementById('up-phone-code');
    const numEl   = document.getElementById('up-phone-number');
    const saveBtn = document.getElementById('up-save-btn');

    const rawName = nameEl?.value.trim() || '';
    const rawCode = codeEl?.value.trim() || '+91';
    const rawNum  = sanitizeNumber(numEl?.value || '');
    const phone   = rawNum ? `${rawCode} ${rawNum}` : null;

    const nameChanged  = rawName !== (state.userName || '');
    const phoneChanged = phone !== (state.userPhone || null);

    if (rawName.length > 80) {
      showToast('Name must be 80 characters or less.', 'error'); return;
    }
    if (rawNum) {
      const digits = countDigits(rawNum);
      if (digits < 7)  { showToast('Phone number must have at least 7 digits.', 'error'); return; }
      if (digits > 15) { showToast('Phone number must have at most 15 digits.', 'error'); return; }
      if (!/^[\d\s\-()]+$/.test(rawNum)) { showToast('Phone number contains invalid characters.', 'error'); return; }
    }

    if (!nameChanged && !phoneChanged) { this.close(); return; }

    const prev = { name: state.userName, phone: state.userPhone };

    state.userName  = rawName || null;
    state.userPhone = phone;

    UserCache.set({
      reminders_enabled: state.remindersEnabled,
      reminder_email:    state.reminderEmail,
      user_name:         rawName || null,
      user_phone:        phone,
    });

    const metaEl = document.getElementById('hdr-user-meta');
    if (metaEl && rawName) metaEl.textContent = rawName;

    this.close();

    fetch('/.netlify/functions/update-reminder-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:             rawName || null,
        phone,
        reminders_enabled: state.remindersEnabled,
        reminder_email:    state.reminderEmail || null,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'Save failed');
      showToast('Profile saved ✓', 'success');
    })
    .catch(err => {
      state.userName  = prev.name;
      state.userPhone = prev.phone;
      UserCache.set({
        reminders_enabled: state.remindersEnabled,
        reminder_email:    state.reminderEmail,
        user_name:         prev.name,
        user_phone:        prev.phone,
      });
      if (metaEl && prev.name) metaEl.textContent = prev.name;
      handleError(err, "Couldn't save profile. Changes reverted.");
    })
    .finally(() => {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    });
  },
};

// ---------------------------------------------------------------------------
// UserSettings — reminders & background artwork. Opened by ⚙ Settings button.
// ---------------------------------------------------------------------------
export const UserSettings = {
  open() {
    const modal    = document.getElementById('user-settings-modal');
    if (!modal) return;

    const toggleEl = document.getElementById('us-reminders-toggle');
    const emailEl  = document.getElementById('us-reminder-email');

    if (emailEl) {
      emailEl.value       = state.reminderEmail || '';
      emailEl.placeholder = getUserEmail() || 'your@email.com';
    }
    if (toggleEl) {
      toggleEl.checked = state.remindersEnabled;
      document.getElementById('us-reminder-email-row')?.classList.toggle('hidden', !state.remindersEnabled);
    }

    const bgToggleEl = document.getElementById('us-bg-toggle');
    if (bgToggleEl) {
      let hideBgState = localStorage.getItem('dsa_hide_bg');
      if (hideBgState === null) hideBgState = '1';
      bgToggleEl.checked = hideBgState !== '1';
      this._bgSnapshot = document.documentElement.classList.contains('hide-theme-bg') ? '1' : '0';
    }

    modal.classList.add('open');
  },

  close() {
    // Revert bg preview if user didn't save
    if (this._bgSnapshot !== undefined) {
      if (this._bgSnapshot === '1') {
        document.documentElement.classList.add('hide-theme-bg');
      } else {
        document.documentElement.classList.remove('hide-theme-bg');
      }
      this._bgSnapshot = undefined;
    }
    document.getElementById('user-settings-modal')?.classList.remove('open');
  },

  handleOverlayClick(e) {
    if (e.target === document.getElementById('user-settings-modal')) this.close();
  },

  onReminderToggle() {
    const checked  = document.getElementById('us-reminders-toggle')?.checked;
    const emailRow = document.getElementById('us-reminder-email-row');
    if (emailRow) emailRow.classList.toggle('hidden', !checked);
  },

  onThemeBgToggle() {
    // Preview only — no localStorage write until Save
    const checked = document.getElementById('us-bg-toggle')?.checked;
    if (checked) {
      document.documentElement.classList.remove('hide-theme-bg');
      const root = document.documentElement;
      if (!root.classList.contains('bg-loaded')) {
        const bgUrl = 'https://res.cloudinary.com/dnju7wfma/image/upload/f_auto,q_auto,w_1920/bg_lnzb9t.png';
        const img = new Image();
        img.onload = () => {
          root.style.setProperty('--bg-image', `url('${bgUrl}')`);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            root.classList.add('bg-loaded');
          }));
        };
        img.src = bgUrl;
      }
    } else {
      document.documentElement.classList.add('hide-theme-bg');
    }
  },

  async save() {
    const toggleEl = document.getElementById('us-reminders-toggle');
    const emailEl  = document.getElementById('us-reminder-email');
    const saveBtn  = document.getElementById('us-save-btn');

    const enabled  = toggleEl?.checked ?? false;
    const remEmail = emailEl?.value.trim() || '';

    const enabledChanged = enabled !== !!state.remindersEnabled;
    const emailChanged   = remEmail !== (state.reminderEmail || '');
    const bgChecked      = document.getElementById('us-bg-toggle')?.checked;
    const bgChanged      = bgChecked !== undefined && (bgChecked ? '0' : '1') !== this._bgSnapshot;

    if (!enabledChanged && !emailChanged) {
      if (bgChanged) {
        localStorage.setItem('dsa_hide_bg', bgChecked ? '0' : '1');
        this._bgSnapshot = undefined;
      }
      this.close();
      return;
    }

    if (enabled && remEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remEmail)) {
      showToast('Enter a valid reminder email address.', 'error'); return;
    }

    const prev = {
      remindersEnabled: state.remindersEnabled,
      email: state.reminderEmail,
    };

    state.remindersEnabled = enabled;
    state.reminderEmail    = remEmail || null;

    UserCache.set({
      reminders_enabled: enabled,
      reminder_email:    remEmail || null,
      user_name:         state.userName,
      user_phone:        state.userPhone,
    });

    if (bgChecked !== undefined) {
      localStorage.setItem('dsa_hide_bg', bgChecked ? '0' : '1');
    }
    this._bgSnapshot = undefined;

    this.close();

    fetch('/.netlify/functions/update-reminder-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:             state.userName || null,
        phone:            state.userPhone || null,
        reminders_enabled: enabled,
        reminder_email:    remEmail || null,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'Save failed');
      showToast('Settings saved ✓', 'success');
    })
    .catch(err => {
      state.remindersEnabled = prev.remindersEnabled;
      state.reminderEmail    = prev.email;
      UserCache.set({
        reminders_enabled: prev.remindersEnabled,
        reminder_email:    prev.email,
        user_name:         state.userName,
        user_phone:        state.userPhone,
      });
      handleError(err, "Couldn't save settings. Changes reverted.");
    })
    .finally(() => {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    });
  },
};
