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

export const UserSettings = {
  open() {
    const modal = document.getElementById('user-settings-modal');
    if (!modal) return;

    const nameEl   = document.getElementById('us-name');
    const codeEl   = document.getElementById('us-phone-code');
    const numEl    = document.getElementById('us-phone-number');
    const toggleEl = document.getElementById('us-reminders-toggle');
    const emailEl  = document.getElementById('us-reminder-email');

    const { code, number } = splitPhone(state.userPhone);

    // Populate country code select (only once)
    if (codeEl && !codeEl.options.length) {
      codeEl.innerHTML = this.buildCountryOptions(code);
    } else if (codeEl) {
      codeEl.value = code;
    }

    if (nameEl)   nameEl.value  = state.userName     || '';
    if (numEl)    numEl.value   = number;
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
      if (hideBgState === null && window.innerWidth <= 768) hideBgState = '1';
      bgToggleEl.checked = hideBgState !== '1';
    }

    modal.classList.add('open');
  },

  close() {
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
    const checked = document.getElementById('us-bg-toggle')?.checked;
    if (checked) {
      document.documentElement.classList.remove('hide-theme-bg');
      localStorage.setItem('dsa_hide_bg', '0');
      
      // If the image was skipped during main page load (e.g. mobile default), lazily inject it now
      const root = document.documentElement;
      if (!root.style.getPropertyValue('--bg-image')) {
        const img = new Image();
        img.onload = () => {
          root.style.setProperty('--bg-image', "url('/images/bg.png')");
          requestAnimationFrame(() => requestAnimationFrame(() => {
            root.classList.add('bg-loaded');
          }));
        };
        img.src = '/images/bg.png';
      }
    } else {
      document.documentElement.classList.add('hide-theme-bg');
      localStorage.setItem('dsa_hide_bg', '1');
    }
  },

  async save() {
    const nameEl     = document.getElementById('us-name');
    const codeEl     = document.getElementById('us-phone-code');
    const numEl      = document.getElementById('us-phone-number');
    const toggleEl   = document.getElementById('us-reminders-toggle');
    const emailEl    = document.getElementById('us-reminder-email');
    const saveBtn    = document.getElementById('us-save-btn');

    const rawName    = nameEl?.value.trim() || '';
    const rawCode    = codeEl?.value.trim() || '+91';
    const rawNum     = sanitizeNumber(numEl?.value || '');
    const enabled    = toggleEl?.checked ?? false;
    const remEmail   = emailEl?.value.trim() || '';
    const phone      = rawNum ? `${rawCode} ${rawNum}` : null;

    const nameChanged = rawName !== (state.userName || '');
    const phoneChanged = phone !== (state.userPhone || null);
    const enabledChanged = enabled !== !!state.remindersEnabled;
    const emailChanged = remEmail !== (state.reminderEmail || '');

    // validation
    if (rawName.length > 80) {
      showToast('Name must be 80 characters or less.', 'error'); return;
    }
    if (rawNum) {
      const digits = countDigits(rawNum);
      if (digits < 7)  { showToast('Phone number must have at least 7 digits.', 'error'); return; }
      if (digits > 15) { showToast('Phone number must have at most 15 digits.', 'error'); return; }
      if (!/^[\d\s\-()]+$/.test(rawNum)) { showToast('Phone number contains invalid characters.', 'error'); return; }
    }
    if (enabled && remEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remEmail)) {
      showToast('Enter a valid reminder email address.', 'error'); return;
    }

    if (!nameChanged && !phoneChanged && !enabledChanged && !emailChanged) {
      this.close();
      return;
    }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    try {
      const res = await fetch('/.netlify/functions/update-reminder-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              rawName || null,
          phone,
          reminders_enabled: enabled,
          reminder_email:    remEmail || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Save failed');

      // Update state
      state.userName         = rawName  || null;
      state.userPhone        = phone;
      state.remindersEnabled = enabled;
      state.reminderEmail    = remEmail || null;

      // Only cache non-sensitive preferences — never store is_subscribed or user_role
      UserCache.set({
        reminders_enabled: enabled,
        reminder_email:    remEmail || null,
        user_name:         rawName  || null,
        user_phone:        phone,
      });

      // Refresh header display name if it changed
      const metaEl = document.getElementById('hdr-user-meta');
      if (metaEl && rawName) { metaEl.textContent = rawName; }

      showToast('Settings saved ✓', 'success');
      this.close();
    } catch (err) {
      handleError(err, "Couldn't save settings. Please try again.");
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    }
  },

  /** Build the country code <select> options HTML. */
  buildCountryOptions(selected = '+91') {
    return COUNTRIES.map(c => {
      const val = `${c.code}`;
      const lbl = `${c.flag} ${c.name} (${c.code})`;
      return `<option value="${val}"${val === selected ? ' selected' : ''}>${lbl}</option>`;
    }).join('');
  },
};
