export const AmbientSound = {
  audio: null,
  currentTrack: null,
  isPlaying: false,

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

    // Toggle panel
    this.toggleBtn.addEventListener('click', () => {
      this.panel.classList.toggle('open');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#ambient-widget')) {
        this.panel.classList.remove('open');
      }
    });

    // Handle track selection
    this.trackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const track = btn.dataset.track;
        this.toggleTrack(track, btn);
      });
    });

    // Handle volume change
    this.volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      localStorage.setItem('dsa_ambient_vol', vol);
      if (this.audio) {
        this.audio.volume = vol;
      }
    });
  },

  lazyInitAudio(track) {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'none'; // Forces the browser to strictly stream only what it needs, saving memory and bandwidth
      this.audio.src = `/audio/${track}.mp3`;
      this.audio.loop = true;
      this.audio.volume = parseFloat(this.volSlider.value);
    } else if (this.currentTrack !== track) {
      this.audio.src = `/audio/${track}.mp3`;
    }
  },

  toggleTrack(track, btn) {
    // If clicking the currently playing track, pause it
    if (this.currentTrack === track && this.isPlaying) {
      this.pause();
      return;
    }

    // Play new track
    this.lazyInitAudio(track);
    this.currentTrack = track;
    
    // Play with fade-in (handled natively for simplicity, or just instant play since it's ambiance)
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
        this.updateUI();
      }).catch(err => {
        console.warn('Audio play failed:', err);
        showToast('Click anywhere first to allow audio.', 'error');
      });
    }
  },

  pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.updateUI();
    }
  },

  updateUI() {
    // Remove playing class from all
    this.trackBtns.forEach(b => b.classList.remove('playing'));
    
    if (this.isPlaying) {
      document.querySelector(`.ambient-btn[data-track="${this.currentTrack}"]`)?.classList.add('playing');
      this.toggleBtn.classList.add('active-glow');
    } else {
      this.toggleBtn.classList.remove('active-glow');
    }
  }
};
