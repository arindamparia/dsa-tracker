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
  visualizeRaf: null,
  fadeStart: 0,
  isMuted: false,
  audioCtx: null,
  gainA: null,
  gainB: null,
  analyser: null,
  dataArray: null,

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
    gain.connect(this.analyser);
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

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 64; 
    this.analyser.smoothingTimeConstant = 0.85; 
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.connect(this.audioCtx.destination);

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

  attachMediaSession(trackKey) {
    if (!('mediaSession' in navigator)) return;
    const btn = document.querySelector(`.ambient-btn[data-track="${trackKey}"]`);
    const label = btn ? btn.title : 'Ambient Sound';

    navigator.mediaSession.metadata = new MediaMetadata({
      title: label,
      artist: 'DSA Tracker',
      album: 'Calm Background Sounds',
    });

    navigator.mediaSession.playbackState = 'playing';

    if ('setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Infinity,
          playbackRate: 1,
          position: 0
        });
      } catch (e) {
        console.warn('setPositionState not supported', e);
      }
    }

    ['seekforward', 'seekbackward', 'seekto'].forEach(action => {
      try { navigator.mediaSession.setActionHandler(action, () => {}); } catch {}
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
      navigator.mediaSession.playbackState = 'paused';
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (this.currentTrack) {
        const deck = this.activeDeck === 'A' ? this.audioA : this.audioB;
        if (deck) {
          deck.play().then(() => {
            this.isPlaying = true;
            this.updateUI();
            this.startVisualizer();
            navigator.mediaSession.playbackState = 'playing';
          }).catch(() => {});
        }
      }
    });

    const trackBtnsArray = Array.from(this.trackBtns);
    const idx = trackBtnsArray.findIndex(b => b.dataset.track === trackKey);
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const nextBtn = trackBtnsArray[(idx + 1) % trackBtnsArray.length];
      if (nextBtn) this.toggleTrack(nextBtn.dataset.track);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const prevBtn = trackBtnsArray[(idx - 1 + trackBtnsArray.length) % trackBtnsArray.length];
      if (prevBtn) this.toggleTrack(prevBtn.dataset.track);
    });
  },

  startVisualizer() {
    if (!this.analyser) return;
    
    const loop = () => {
      this.visualizeRaf = requestAnimationFrame(loop);
      if (!this.isPlaying) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      const data = this.dataArray;

      const getRawPeak = (start, end) => {
        let max = 0;
        for (let i = start; i < end; i++) if (data[i] > max) max = data[i];
        return max / 255; 
      };

      const raw1 = getRawPeak(0, 3);
      const raw2 = getRawPeak(3, 7);
      const raw3 = getRawPeak(7, 13);
      const raw4 = getRawPeak(13, 25);

      const currentMax = Math.max(0.01, raw1, raw2, raw3, raw4);
      const multiplier = Math.min(15, 0.8 / currentMax);

      const v1 = raw1 * multiplier;
      const v2 = raw2 * multiplier;
      const v3 = raw3 * multiplier;
      const v4 = raw4 * multiplier;

      const jt = () => Math.random() * 1.2;

      const h1 = Math.min(14, 3 + (v1 * 11) + jt());
      const h2 = Math.min(14, 3 + (v2 * 11) + jt());
      const h3 = Math.min(14, 3 + (v3 * 11) + jt());
      const h4 = Math.min(14, 3 + (v4 * 11) + jt());

      const lh1 = Math.min(20, 4 + (v1 * 16) + jt() * 1.2);
      const lh2 = Math.min(20, 4 + (v2 * 16) + jt() * 1.2);
      const lh3 = Math.min(20, 4 + (v3 * 16) + jt() * 1.2);
      const lh4 = Math.min(20, 4 + (v4 * 16) + jt() * 1.2);

      const btnBars = document.querySelector('.ambient-btn.playing.reactive .abt-bars');
      if (btnBars && btnBars.children.length === 4) {
        btnBars.children[0].style.height = `${h1}px`;
        btnBars.children[1].style.height = `${h2}px`;
        btnBars.children[2].style.height = `${h3}px`;
        btnBars.children[3].style.height = `${h4}px`;
      }

      const liveBars = document.querySelector('.live-bars.reactive');
      if (liveBars && liveBars.children.length === 4) {
        liveBars.children[0].style.height = `${lh1}px`;
        liveBars.children[1].style.height = `${lh2}px`;
        liveBars.children[2].style.height = `${lh3}px`;
        liveBars.children[3].style.height = `${lh4}px`;
      }
    };
    cancelAnimationFrame(this.visualizeRaf);
    loop();
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
        this.attachMediaSession(track);
        this.updateUI();
        this.startVisualizer();
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
      cancelAnimationFrame(this.visualizeRaf);
      this.isFading = false;

      if (this.audioA) this.audioA.pause();
      if (this.audioB) this.audioB.pause();

      this.isPlaying = false;
      this.updateUI();
    }
  },

  destroy() {
    cancelAnimationFrame(this.fadeRaf);
    cancelAnimationFrame(this.visualizeRaf);
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
    this.trackBtns.forEach(b => b.classList.remove('playing', 'reactive'));

    if (this.isPlaying) {
      this.panel.classList.add('playing-bg');
      const activeBtn = document.querySelector(`.ambient-btn[data-track="${this.currentTrack}"]`);
      if (activeBtn) activeBtn.classList.add('playing', 'reactive');
      this.toggleBtn.classList.add('active-glow');
      // Swap toggle icon to animated live waveform
      if (iconEl) iconEl.innerHTML = '<span class="live-bars reactive"><span></span><span></span><span></span><span></span></span>';
      
      if (this.nowPlayingLabel && activeBtn) {
        const emoji = activeBtn.querySelector('.abt-icon')?.textContent || '';
        this.nowPlayingLabel.textContent = `${emoji} ${activeBtn.title}`;
        this.nowPlayingLabel.style.display = 'block';
      }
    } else {
      this.panel.classList.remove('playing-bg');
      this.toggleBtn.classList.remove('active-glow');
      // Restore static emoji
      if (iconEl) iconEl.textContent = '🎵';
      
      if (this.nowPlayingLabel) {
        this.nowPlayingLabel.style.display = 'none';
      }
    }
  }
};
