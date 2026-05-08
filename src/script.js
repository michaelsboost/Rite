function App() {
  return {
    app: {
      name: 'RITE',
      slogan: "NOT YOUR MOMMA'S WORKOUT APP",
    },
    dark: true,
    activeMode: 'reps',
    wakeLock: null,
    countdownSeconds: 0,
    async requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake lock is active');
        } catch (err) {
          console.error('Wake lock error:', err.name, err.message);
        }
      } else {
        alert('Your browser does not support wake lock. Please keep your screen on manually during training.');
      }
    },
    releaseWakeLock() {
      if (this.wakeLock !== null) {
        this.wakeLock.release()
          .then(() => {
            console.log('Wake lock released');
            this.wakeLock = null;
          });
      }
    },
    async shareApp() {
      if (navigator.share) {
        await navigator.share({
          title: "Rite",
          text: "Check this out",
          url: window.location.href
        });
      } else {
        alert("Sharing is not supported on this browser.");
      }
    },
    modal: {
      show: false,
      type: null, // 'reps' | 'interval' | 'duration'
      title: ''
    },
    openModal(type) {
      switch (type) {
        case 'reps':
          this.modal.title = 'Edit Reps per Set';
          this.modes.reps.inputMode = 'manual';
          break;
        case 'interval':
          this.modal.title = 'Edit Interval Seconds';
          this.modes.reps.inputMode = 'manual';
          break;
        case 'duration':
          this.modal.title = 'Edit Workout Duration';
          this.modes.reps.inputMode = 'manual';
          break;
        case 'totalReps':
          this.modal.title = 'Set Total Rep Goal';
          this.modes.reps.inputMode = 'target'; // Switch to goal mode
          break;

        case 'cardioDuration':
          this.modal.title = 'Set Cardio Duration';
          break;
          
        case 'sparringRounds':
          this.modal.title = 'Edit Total Rounds';
          break;
        case 'sparringRoundTime':
          this.modal.title = 'Edit Round Duration';
          break;
        case 'sparringRestTime':
          this.modal.title = 'Edit Rest Duration';
          break;
      }
      this.modal.type = type;
      this.modal.show = true;
      
      // Show dialog
      this.$nextTick(() => {
        if (this.$refs.modal && !this.$refs.modal.open) {
          this.$refs.modal.showModal();
        }
      });
    },
    closeModal() {
      this.modal.show = false;
      this.modal.type = null;
      this.modal.title = '';
      if (this.$refs.modal && this.$refs.modal.open) {
        this.$refs.modal.close();
      }
    },
    saveModal() {
      this.calculateStats();
      this.saveToStorage();
      this.closeModal();
    },
    settings: {
      soundEnabled: true,
      vibrationEnabled: false
    },
    modes: {
      reps: {
        inputMode: 'manual', // 'manual' or 'target'
        totalReps: 500,
        duration: { hour: 0, minute: 15, second: 0 },
        intervalSeconds: 30,
        repsPerInterval: 7,
        completedReps: 0
      },
      cardio: {
        duration: { hour: 0, minute: 30, second: 0 },
        intervalSeconds: 180, // 3 min work
        restSeconds: 60, // 1 min rest
        isRest: false,
      },
      sparring: {
        rounds: 5,
        roundDuration: { minute: 3, second: 0 },
        restDuration: { minute: 1, second: 0 },
        currentRound: 0
      }
    },
    stats: {
      totalDurationSeconds: 0,
      totalIntervals: 0,
      totalProjectedReps: 0
    },
    init() {
      this.calculateStats();
      this.loadFromStorage();
      this.preloadBell();
      window.addEventListener('beforeunload', () => this.saveToStorage());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.timer.isActive) {
          this.requestWakeLock();
        }
      });
    },
    setMode(mode) {
      if (['reps', 'cardio', 'sparring'].includes(mode)) {
        this.activeMode = mode;
        this.calculateStats();
        this.saveToStorage();
      }
    },
    calculateStats() {
      const mode = this.modes[this.activeMode];
    
      switch (this.activeMode) {
        case 'reps': {
          const d = mode.duration;
          this.stats.totalDurationSeconds = (d.hour * 3600) + (d.minute * 60) + d.second;
          this.stats.totalIntervals = Math.floor(this.stats.totalDurationSeconds / mode.intervalSeconds);
    
          if (mode.inputMode === 'manual') {
            // User is defining reps per interval manually
            this.stats.totalProjectedReps = this.stats.totalIntervals * mode.repsPerInterval;
          } else if (mode.inputMode === 'target' && this.stats.totalIntervals > 0) {
            // User is setting total reps as a goal
            mode.repsPerInterval = Math.ceil(mode.totalReps / this.stats.totalIntervals);
            this.stats.totalProjectedReps = this.stats.totalIntervals * mode.repsPerInterval;
          }
    
          break;
        }
    
        case 'cardio': {
          const cd = mode.duration;
          this.stats.totalDurationSeconds = (cd.hour * 3600) + (cd.minute * 60) + cd.second;
          break;
        }
    
        case 'sparring': {
          const roundSec = (mode.roundDuration.minute * 60) + mode.roundDuration.second;
          const restSec = (mode.restDuration.minute * 60) + mode.restDuration.second;
          this.stats.totalDurationSeconds = (roundSec + restSec) * mode.rounds - restSec;
          break;
        }
      }
    },
    saveToStorage() {
      localStorage.setItem('rite-app-state', JSON.stringify({
        activeMode: this.activeMode,
        modes: this.modes,
        settings: this.settings
      }));
    },
    loadFromStorage() {
      const saved = localStorage.getItem('rite-app-state');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this.activeMode = data.activeMode || 'reps';
          this.modes = data.modes || this.modes;
          this.settings = data.settings || this.settings;
          this.calculateStats();
        } catch (e) {
          console.error('Failed to load saved state', e);
        }
      }
    },
    formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    timer: {
      isActive: false,
      isPaused: false,
      interval: null,
      remainingSeconds: 0,
      completedReps: 0,
      currentRound: 1,
      isRest: false,
      mode: null
    },
    async startTimer() {
      await this.requestWakeLock();
      await this.startCountdown(); // add this line before anything else
    
      if (this.activeMode === 'cardio') return this.startCardio();
      if (this.activeMode === 'sparring') return this.startSparring();
    
      const duration = this.stats.totalDurationSeconds;
      if (duration <= 0) return;
    
      this.timer.remainingSeconds = duration;
      this.timer.isActive = true;
      this.timer.isPaused = false;
      this.timer.completedReps = 0;
      this.timer.mode = this.activeMode;
    
      this.timer.interval = setInterval(() => {
        if (this.timer.remainingSeconds <= 0) {
          this.stopTimer();
          return;
        }
    
        this.timer.remainingSeconds--;
    
        if (this.activeMode === 'reps') {
          const elapsed = this.stats.totalDurationSeconds - this.timer.remainingSeconds;
          if (elapsed % this.modes.reps.intervalSeconds === 0) {
            this.timer.completedReps += this.modes.reps.repsPerInterval;
            if (this.settings.soundEnabled) this.beep();
          }
        }
      }, 1000);
    },
    stopTimer() {
      clearInterval(this.timer.interval);
      this.timer.interval = null;
      this.timer.isActive = false;
      this.timer.remainingSeconds = 0;
      this.releaseWakeLock();

      // Stop the bell sound
      if (this.bell && !this.bell.paused) {
        this.bell.pause();
        this.bell.currentTime = 0;
      }
    },
    preloadBell() {
      this.bell = document.getElementById('bell-sound');
    },
    beep() {
      if (!this.settings.soundEnabled) return;
    
      if (this.activeMode === 'sparring') {
        // Use bell for sparring
        if (this.bell) {
          this.bell.currentTime = 0;
          this.bell.play();
        }
      } else {
        // Use oscillator-based ding for reps & cardio
        this.dingSound();
      }
    },
    async startCountdown() {
      for (let i = 3; i > 0; i--) {
        this.countdownSeconds = i;
        this.playDing(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      this.countdownSeconds = 0;
    },
    dingSound() {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
    
      const startTime = ctx.currentTime;
      const duration = 0.2;
    
      osc.type = 'triangle'; // Nice soft "ding"
      osc.frequency.setValueAtTime(1000, startTime); // Adjust pitch if needed
      gain.gain.setValueAtTime(1, startTime); // Volume
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
      osc.connect(gain);
      gain.connect(ctx.destination);
    
      osc.start(startTime);
      osc.stop(startTime + duration);
    },
    playDing(pitch = 1) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
    
      const startTime = ctx.currentTime;
      const duration = 0.3;
    
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 * pitch, startTime); // varies pitch
      gain.gain.setValueAtTime(1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
      osc.connect(gain);
      gain.connect(ctx.destination);
    
      osc.start(startTime);
      osc.stop(startTime + duration);
    },
    startCardio() {
      const d = this.modes.cardio.duration;
      const total = (d.hour * 3600) + (d.minute * 60) + d.second;
      if (total <= 0) return;
    
      this.timer.isActive = true;
      this.timer.isPaused = false;
      this.timer.mode = 'cardio';
      this.timer.remainingSeconds = total;
    
      this.timer.interval = setInterval(() => {
        if (this.timer.remainingSeconds <= 0) {
          this.beep();
          this.stopTimer();
          return;
        }
        this.timer.remainingSeconds--;
      }, 1000);
    },
    stopwatch: {
      isActive: false,
      time: 0,
      interval: null,
      laps: [],
    },
    startStopwatch() {
      if (this.stopwatch.isActive) return;
      this.stopwatch.isActive = true;
      this.stopwatch.interval = setInterval(() => {
        this.stopwatch.time++;
      }, 1000);
    },
    stopStopwatch() {
      this.stopwatch.isActive = false;
      clearInterval(this.stopwatch.interval);
      this.stopwatch.interval = null;
    },
    resetStopwatch() {
      this.stopwatch.time = 0;
      this.stopwatch.laps = [];
      this.stopStopwatch();
    },
    recordLap() {
      this.stopwatch.laps.push(this.formatTime(this.stopwatch.time));
    },
    startSparring() {
      const mode = this.modes.sparring;
      const roundTime = (mode.roundDuration.minute * 60) + mode.roundDuration.second;
      const restTime = (mode.restDuration.minute * 60) + mode.restDuration.second;
    
      this.timer.isActive = true;
      this.timer.isPaused = false;
      this.timer.mode = 'sparring';
      this.timer.currentRound = 1;
      this.timer.isRest = false;
      this.timer.remainingSeconds = roundTime;
    
      this.timer.interval = setInterval(() => {
        if (this.timer.remainingSeconds <= 0) {
          this.beep();
    
          // Switch between round <-> rest
          if (!this.timer.isRest) {
            this.timer.isRest = true;
            this.timer.remainingSeconds = restTime;
          } else {
            if (this.timer.currentRound >= mode.rounds) {
              this.stopTimer();
              return;
            }
            this.timer.currentRound++;
            this.timer.isRest = false;
            this.timer.remainingSeconds = roundTime;
          }
        } else {
          this.timer.remainingSeconds--;
        }
      }, 1000);
    },
    theme() {
      const saved = localStorage.getItem('color-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
      const theme = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
      this.dark = theme === 'dark';
    },
    toggleTheme() {
      this.dark = !this.dark;
      const newTheme = this.dark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('color-theme', newTheme);
    }
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('App', App);
});