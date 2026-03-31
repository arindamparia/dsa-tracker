const AUDIO_URLS = {
  // ── New additions (shown first in panel) ──
  healingSound:   'https://res.cloudinary.com/dnju7wfma/video/upload/v1774780549/HealingSound.mp3',
  mandirWinds:    'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779620/Winds_Through_the_Old_Mandir_Flute___Sitar_in_Timeless_Tranquility_MP3_160K_llh2me.mp3',
  shivaMeditation:'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779618/SHIVA___Beautiful_Indian_Background_Music___Deep___Mystical_Meditation_Music___Ambient_Hindu_Music_MP3_160K_sgrn1q.mp3',
  meditation:     'https://res.cloudinary.com/dnju7wfma/video/upload/v1774774806/Temple_Rhythms_Tabla__Flute___Sitar_Tranquility___1_Hour_Indian_Meditation_Music_MP3_160K_aspm1l.mp3',
  krishnaFlute:   'https://res.cloudinary.com/dnju7wfma/video/upload/v1774779598/Flute_of_Peace___Shri_Krishna_Relaxing_Instrumental_MP3_160K_ugj3b0.mp3',
  // ── Nature & ambient ──
  rain:           'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/rain_fe6smc.mp3',
  rain2:          'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/rain2_uycmn6.mp3',
  ocean:          'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378668/ocean_gzek2u.mp3',
  forest:         'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/forest_l804pd.mp3',
  forest2:        'https://res.cloudinary.com/dnju7wfma/video/upload/v1774382236/forest2_xg9jbw.mp3',
  forest3:        'https://res.cloudinary.com/dnju7wfma/video/upload/v1774378667/forest3_xlypzq.mp3',
  river:          'https://res.cloudinary.com/dnju7wfma/video/upload/v1774382577/river_ffhhlr.mp3',
};

export const AmbientSound = {
  activeDeck: 'A',
  currentTrack: null,
  isPlaying: false,
  crossfadeDuration: 4.0,
  isFading: false,
  fadeRaf: null,
  fadeStart: 0,
  isMuted: false,
  audioCtx: null,
  gainA: null,
  gainB: null,

  init() {
    this.panel = document.getElementById('ambient-panel');
    this.toggleBtn = document.getElementById('ambient-toggle');
    this.trackBtns = document.querySelectorAll('.ambient-btn');
    this.volSlider = document.getElementById('ambient-vol');
    this.backdrop = document.getElementById('ambient-mobile-backdrop');
    this.nowPlayingLabel = document.getElementById('ambient-now-playing');

    if (!this.panel) return;

    // Restructure each button: icon + eq-bars injected via JS
    this.trackBtns.forEach(btn => {
      const emoji = btn.innerHTML.trim();
      btn.innerHTML = `<span class="abt-icon">${emoji}</span><span class="abt-bars"><span></span><span></span><span></span><span></span></span>`;
    });

    // Restore saved volume (stored as actual vol, convert to slider position)
    const savedVol = localStorage.getItem('dsa_ambient_vol');
    if (savedVol !== null) {
      this.volSlider.value = this._volToSlider(parseFloat(savedVol));
    }
    this._updateSliderFill(parseFloat(this.volSlider.value));

    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = this.panel.classList.toggle('open');
      if (this.backdrop) this.backdrop.classList.toggle('open', isOpen);
    });

    if (this.backdrop) {
      this.backdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        this.panel.classList.remove('open');
        this.backdrop.classList.remove('open');
      });
    }

    this.muteBtn = document.getElementById('ambient-mute');
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => this.toggleMute());
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#ambient-widget')) {
        this.panel.classList.remove('open');
        if (this.backdrop) this.backdrop.classList.remove('open');
      }
    });

    this.trackBtns.forEach(btn => {
      btn.addEventListener('click', () => this.toggleTrack(btn.dataset.track));
    });

    this.volLabel = document.getElementById('ambient-vol-label');
    this._updateVolLabel(this._sliderToVol(parseFloat(this.volSlider.value)));

    this.volSlider.addEventListener('input', (e) => {
      const slider = parseFloat(e.target.value);
      let vol = this._sliderToVol(slider);
      // Magnetic snap to nearest 0.5x step when within ±0.08
      const snaps = [0, 0.5, 1, 1.5, 2, 2.5, 3];
      for (const s of snaps) {
        if (Math.abs(vol - s) < 0.08) {
          vol = s;
          this.volSlider.value = this._volToSlider(s);
          break;
        }
      }
      localStorage.setItem('dsa_ambient_vol', vol);
      this.applyVolume(vol);
      this._updateVolLabel(vol);
      this._updateSliderFill(parseFloat(this.volSlider.value));
    });

    window.addEventListener('beforeunload', () => this.destroy());

    // Resume playback when tab regains focus — browsers suspend AudioContext
    // and sometimes pause audio after ~5-10 min of the tab being hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !this.isPlaying || !this.audioCtx) return;
      // Resume AudioContext if browser suspended it
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      // Re-play the active deck if it got paused by the browser
      const activeAudio = this.activeDeck === 'A' ? this.audioA : this.audioB;
      if (activeAudio && activeAudio.paused) {
        activeAudio.play().catch(() => {});
      }
    });
  },

  // Non-linear slider mapping: 0–0.5 slider = 0–1x vol, 0.5–1 slider = 1x–3x vol
  _sliderToVol(s) {
    if (s <= 0.5) return s * 2;          // 0→0, 0.5→1
    return 1 + (s - 0.5) * 4;            // 0.5→1, 1→3
  },
  _volToSlider(v) {
    if (v <= 1) return v / 2;            // 0→0, 1→0.5
    return 0.5 + (v - 1) / 4;            // 1→0.5, 3→1
  },

  // Updates the filled-track gradient on the volume slider
  _updateSliderFill(sliderVal) {
    if (!this.volSlider) return;
    this.volSlider.style.setProperty('--slider-fill', Math.round(sliderVal * 100) + '%');
  },

  _initAudioCtx() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  },

  _connectToGain(audio, gain) {
    const source = this.audioCtx.createMediaElementSource(audio);
    source.connect(gain);
    gain.connect(this.audioCtx.destination);
  },

  applyVolume(vol) {
    if (!this.isFading) {
      if (this.activeDeck === 'A' && this.gainA) this.gainA.gain.value = vol;
      if (this.activeDeck === 'B' && this.gainB) this.gainB.gain.value = vol;
    }
  },

  _updateVolLabel(vol) {
    const boosted = vol > 1;
    const label = vol % 1 === 0 ? vol.toFixed(0) + 'x' : vol.toFixed(1) + 'x';
    if (this.volLabel) {
      this.volLabel.textContent = label;
      this.volLabel.classList.toggle('boosted', boosted);
    }
    this.volSlider.classList.toggle('boosted', boosted);
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audioA) this.audioA.muted = this.isMuted;
    if (this.audioB) this.audioB.muted = this.isMuted;
    if (this.muteBtn) {
      this.muteBtn.textContent = this.isMuted ? '🔇' : '🔉';
    }
  },

  _setLoading(track, loading) {
    const btn = document.querySelector(`.ambient-btn[data-track="${track}"]`);
    if (btn) btn.classList.toggle('loading', loading);
  },

  _attachDeckEvents(deck) {
    deck.addEventListener('error', () => {
      if (deck.src) {
        this.isPlaying = false;
        this.updateUI();
        if (this.currentTrack) this._setLoading(this.currentTrack, false);
        if (window.showToast) window.showToast('Audio failed to load', 'error');
      }
    });
    deck.addEventListener('waiting', () => {
      if (this.currentTrack) this._setLoading(this.currentTrack, true);
    });
    deck.addEventListener('canplay', () => {
      if (this.currentTrack) this._setLoading(this.currentTrack, false);
    });
  },

  lazyInitDecks() {
    if (this.audioA) return;

    this._initAudioCtx();

    this.audioA = new Audio();
    this.audioA.preload = 'none';
    this.audioA.loop = false;
    this.audioA.muted = this.isMuted;
    this.audioA.crossOrigin = 'anonymous';

    this.audioB = new Audio();
    this.audioB.preload = 'none';
    this.audioB.loop = false;
    this.audioB.muted = this.isMuted;
    this.audioB.crossOrigin = 'anonymous';

    // Create GainNodes for volume amplification beyond 1.0
    this.gainA = this.audioCtx.createGain();
    this.gainB = this.audioCtx.createGain();
    this._connectToGain(this.audioA, this.gainA);
    this._connectToGain(this.audioB, this.gainB);

    // Set Audio element volume to max — GainNode controls actual volume
    this.audioA.volume = 1;
    this.audioB.volume = 1;

    this._attachDeckEvents(this.audioA);
    this._attachDeckEvents(this.audioB);

    const monitorTime = (deck, nextDeck) => {
      deck.addEventListener('timeupdate', () => {
        if (!this.isPlaying || this.isFading) return;
        if (deck.duration && deck.currentTime >= deck.duration - this.crossfadeDuration) {
          this.doCrossfade(deck, nextDeck);
        }
      });
    };

    monitorTime(this.audioA, this.audioB);
    monitorTime(this.audioB, this.audioA);
  },

  _gainFor(audio) {
    return audio === this.audioA ? this.gainA : this.gainB;
  },

  doCrossfade(fadeOutAudio, fadeInAudio) {
    this.isFading = true;
    fadeInAudio.currentTime = 0;

    const fadeOutGain = this._gainFor(fadeOutAudio);
    const fadeInGain = this._gainFor(fadeInAudio);
    fadeInGain.gain.value = 0;

    const playPromise = fadeInAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

    const duration = this.crossfadeDuration * 1000;
    this.fadeStart = performance.now();

    cancelAnimationFrame(this.fadeRaf);
    const tick = (now) => {
      const elapsed = now - this.fadeStart;
      const ratio = Math.min(elapsed / duration, 1);

      const targetVol = this._sliderToVol(parseFloat(this.volSlider.value));
      fadeOutGain.gain.value = Math.max(0, targetVol * (1 - ratio));
      fadeInGain.gain.value = targetVol * ratio;

      if (ratio < 1) {
        this.fadeRaf = requestAnimationFrame(tick);
      } else {
        fadeOutAudio.pause();
        fadeOutAudio.currentTime = 0;
        fadeOutGain.gain.value = 0;
        fadeInGain.gain.value = targetVol;
        this.activeDeck = this.activeDeck === 'A' ? 'B' : 'A';
        this.isFading = false;
      }
    };
    this.fadeRaf = requestAnimationFrame(tick);
  },

  toggleTrack(track) {
    if (this.currentTrack === track && this.isPlaying) {
      this.pause();
      return;
    }

    this.lazyInitDecks();

    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    cancelAnimationFrame(this.fadeRaf);
    this.isFading = false;

    this.activeDeck = 'A';

    if (this.currentTrack !== track) {
      const src = AUDIO_URLS[track];
      this.audioA.src = src;
      this.audioB.src = src;
    }

    this.currentTrack = track;
    this._setLoading(track, true);

    const vol = this._sliderToVol(parseFloat(this.volSlider.value));
    this.gainA.gain.value = vol;
    this.audioA.currentTime = 0;

    this.audioB.pause();
    this.audioB.currentTime = 0;
    this.gainB.gain.value = 0;

    const playPromise = this.audioA.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        this.updateUI();
      }).catch(err => {
        this._setLoading(track, false);
        console.warn('Audio play failed:', err);
        if (window.showToast) window.showToast('Audio playback blocked', 'error');
      });
    }
  },

  pause() {
    if (this.isPlaying) {
      cancelAnimationFrame(this.fadeRaf);
      this.isFading = false;

      if (this.audioA) this.audioA.pause();
      if (this.audioB) this.audioB.pause();

      this.isPlaying = false;
      this.updateUI();
    }
  },

  destroy() {
    cancelAnimationFrame(this.fadeRaf);
    this.isFading = false;
    this.isPlaying = false;
    if (this.audioA) { this.audioA.pause(); this.audioA.src = ''; }
    if (this.audioB) { this.audioB.pause(); this.audioB.src = ''; }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  },

  updateUI() {
    const iconEl = this.toggleBtn?.querySelector('.ambient-toggle-icon');
    this.trackBtns.forEach(b => b.classList.remove('playing'));

    if (this.isPlaying) {
      const activeBtn = document.querySelector(`.ambient-btn[data-track="${this.currentTrack}"]`);
      if (activeBtn) activeBtn.classList.add('playing');
      this.toggleBtn.classList.add('active-glow');
      // Swap toggle icon to animated live waveform
      if (iconEl) iconEl.innerHTML = '<span class="live-bars"><span></span><span></span><span></span><span></span></span>';
      
      if (this.nowPlayingLabel && activeBtn) {
        const emoji = activeBtn.querySelector('.abt-icon')?.textContent || '';
        this.nowPlayingLabel.textContent = `${emoji} ${activeBtn.title}`;
        this.nowPlayingLabel.style.display = 'block';
      }
    } else {
      this.toggleBtn.classList.remove('active-glow');
      // Restore static emoji
      if (iconEl) iconEl.textContent = '🎵';
      
      if (this.nowPlayingLabel) {
        this.nowPlayingLabel.style.display = 'none';
      }
    }
  }
};
