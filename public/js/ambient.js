const AUDIO_URLS = {
  rain:    'https://res.cloudinary.com/dnju7wfma/video/upload/rain_fe6smc.mp3',
  rain2:   'https://res.cloudinary.com/dnju7wfma/video/upload/rain2_uycmn6.mp3',
  ocean:   'https://res.cloudinary.com/dnju7wfma/video/upload/ocean_gzek2u.mp3',
  forest:  'https://res.cloudinary.com/dnju7wfma/video/upload/forest_l804pd.mp3',
  forest2: 'https://res.cloudinary.com/dnju7wfma/video/upload/forest2_xg9jbw.mp3',
  forest3: 'https://res.cloudinary.com/dnju7wfma/video/upload/forest3_xlypzq.mp3',
};

export const AmbientSound = {
  activeDeck: 'A',
  currentTrack: null,
  isPlaying: false,
  crossfadeDuration: 4.0, // 4 seconds overlap
  isFading: false,
  fadeInterval: null,
  isMuted: false,

  init() {
    this.panel = document.getElementById('ambient-panel');
    this.toggleBtn = document.getElementById('ambient-toggle');
    this.trackBtns = document.querySelectorAll('.ambient-btn');
    this.volSlider = document.getElementById('ambient-vol');
    
    if (!this.panel) return;

    // Load saved volume
    const savedVol = localStorage.getItem('dsa_ambient_vol');
    if (savedVol !== null) {
      this.volSlider.value = savedVol;
    }

    this.toggleBtn.addEventListener('click', () => this.panel.classList.toggle('open'));
    
    this.muteBtn = document.getElementById('ambient-mute');
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => this.toggleMute());
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#ambient-widget')) this.panel.classList.remove('open');
    });

    this.trackBtns.forEach(btn => {
      btn.addEventListener('click', () => this.toggleTrack(btn.dataset.track));
    });

    this.volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      localStorage.setItem('dsa_ambient_vol', vol);
      this.applyVolume(vol);
    });
  },

  applyVolume(vol) {
    if (!this.isFading) {
      if (this.activeDeck === 'A' && this.audioA) this.audioA.volume = vol;
      // If we are on deck B, set B's volume (since activeDeck swapped)
      if (this.activeDeck === 'B' && this.audioB) this.audioB.volume = vol;
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audioA) this.audioA.muted = this.isMuted;
    if (this.audioB) this.audioB.muted = this.isMuted;
    if (this.muteBtn) {
      this.muteBtn.textContent = this.isMuted ? '🔇' : '🔉';
    }
  },

  lazyInitDecks() {
    // Only initialize once
    if (this.audioA) return;
    
    this.audioA = new Audio();
    this.audioA.preload = 'none';
    this.audioA.loop = false; // We control looping manually via crossfade
    this.audioA.muted = this.isMuted;

    this.audioB = new Audio();
    this.audioB.preload = 'none';
    this.audioB.loop = false;
    this.audioB.muted = this.isMuted;

    const monitorTime = (deck, nextDeck) => {
      deck.addEventListener('timeupdate', () => {
        if (!this.isPlaying || this.isFading) return;
        
        // Trigger crossfade securely near the end
        if (deck.duration && deck.currentTime >= deck.duration - this.crossfadeDuration) {
          this.doCrossfade(deck, nextDeck);
        }
      });
    };

    // A fades into B at the end of A
    monitorTime(this.audioA, this.audioB);
    // B fades into A at the end of B
    monitorTime(this.audioB, this.audioA);
  },

  doCrossfade(fadeOutAudio, fadeInAudio) {
    this.isFading = true;
    fadeInAudio.currentTime = 0;
    fadeInAudio.volume = 0;
    
    // Play the next deck
    const playPromise = fadeInAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }

    const steps = 30; // 30 increments for smoothness
    const intervalTime = (this.crossfadeDuration * 1000) / steps;
    let step = 0;

    clearInterval(this.fadeInterval);
    this.fadeInterval = setInterval(() => {
      step++;
      const ratio = step / steps;
      
      // Grab fresh targetVol dynamically inside the loop so live slider adjustments work during fade
      const currentTargetVol = parseFloat(this.volSlider.value);
      
      fadeOutAudio.volume = Math.max(0, currentTargetVol * (1 - ratio));
      fadeInAudio.volume = Math.min(currentTargetVol, currentTargetVol * ratio);

      if (step >= steps) {
        clearInterval(this.fadeInterval);
        
        // Successfully crossed over
        fadeOutAudio.pause();
        fadeOutAudio.currentTime = 0;
        fadeOutAudio.volume = 0;
        
        fadeInAudio.volume = currentTargetVol;
        
        this.activeDeck = this.activeDeck === 'A' ? 'B' : 'A';
        this.isFading = false;
      }
    }, intervalTime);
  },

  toggleTrack(track) {
    if (this.currentTrack === track && this.isPlaying) {
      this.pause();
      return;
    }

    this.lazyInitDecks();
    
    // Stop any ongoing crossfades completely
    clearInterval(this.fadeInterval);
    this.isFading = false;

    // Reset to Deck A as the master
    this.activeDeck = 'A';
    
    // If it's a new track, swap SRC for both decks so they are ready
    if (this.currentTrack !== track) {
      const src = AUDIO_URLS[track];
      this.audioA.src = src;
      this.audioB.src = src;
    }
    
    this.currentTrack = track;
    this.audioA.volume = parseFloat(this.volSlider.value);
    this.audioA.currentTime = 0;
    
    // Pause Deck B just in case it was playing during a swap
    this.audioB.pause();
    this.audioB.currentTime = 0;

    const playPromise = this.audioA.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        this.updateUI();
      }).catch(err => {
        console.warn('Audio play failed:', err);
      });
    }
  },

  pause() {
    if (this.isPlaying) {
      clearInterval(this.fadeInterval);
      this.isFading = false;
      
      if (this.audioA) this.audioA.pause();
      if (this.audioB) this.audioB.pause();
      
      this.isPlaying = false;
      this.updateUI();
    }
  },

  updateUI() {
    this.trackBtns.forEach(b => b.classList.remove('playing'));
    
    if (this.isPlaying) {
      document.querySelector(`.ambient-btn[data-track="${this.currentTrack}"]`)?.classList.add('playing');
      this.toggleBtn.classList.add('active-glow');
    } else {
      this.toggleBtn.classList.remove('active-glow');
    }
  }
};
