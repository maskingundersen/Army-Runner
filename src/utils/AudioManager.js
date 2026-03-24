// src/utils/AudioManager.js — Web Audio API sound effects (no audio files needed)

class AudioManager {
  constructor() {
    this._ctx = null;
    this._initialized = false;
  }

  _init() {
    if (this._initialized) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch (e) {
      console.warn('AudioManager: Web Audio API not available', e);
    }
  }

  // Internal tone player: freq (Hz), duration (s), wave type, optional end freq (for sweeps), volume
  _play(freq, duration, type, freqEnd, vol) {
    this._init();
    if (!this._ctx) return;
    const ctx = this._ctx;
    // Resume context if suspended (iOS requirement)
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined && freqEnd !== null) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }

    const v = vol || 0.25;
    gain.gain.setValueAtTime(v, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  // Schedule multiple notes in sequence
  _sequence(notes) {
    this._init();
    if (!this._ctx) return;
    const ctx = this._ctx;
    if (ctx.state === 'suspended') ctx.resume();

    let t = ctx.currentTime;
    for (const note of notes) {
      const [freq, duration, type, freqEnd, vol] = note;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
      const v = vol || 0.25;
      gain.gain.setValueAtTime(v, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.01);
      t += duration * 0.85; // slight overlap for legato feel
    }
  }

  /** Short high-pitched blip — soldier fires */
  shoot() {
    this._play(900, 0.05, 'square', 700, 0.12);
  }

  /** Lower thud — enemy dies */
  enemyDeath() {
    this._play(220, 0.18, 'sine', 80, 0.22);
  }

  /** Low thud — bad gate */
  gateBad() {
    this._play(100, 0.15, 'sine', 50, 0.25);
  }

  /** Deep boom — boss takes a hit */
  bossHit() {
    this._play(110, 0.32, 'sine', 55, 0.4);
  }

  /** Bright ascending ping — upgrade chosen */
  upgrade() {
    this._sequence([
      [500, 0.1, 'sine', null, 0.28],
      [650, 0.1, 'sine', null, 0.28],
      [820, 0.18, 'sine', null, 0.32],
    ]);
  }

  /** Ascending fanfare — victory */
  win() {
    this._sequence([
      [261, 0.18, 'sine', null, 0.3],
      [329, 0.18, 'sine', null, 0.3],
      [392, 0.18, 'sine', null, 0.3],
      [523, 0.35, 'sine', null, 0.35],
    ]);
  }

  /** Descending sad tones — defeat */
  lose() {
    this._sequence([
      [392, 0.22, 'sine', null, 0.25],
      [329, 0.22, 'sine', null, 0.25],
      [261, 0.22, 'sine', null, 0.25],
      [196, 0.38, 'sine', null, 0.28],
    ]);
  }

  /** Rumble — boss attacks */
  bossAttack() {
    this._play(80, 0.25, 'sawtooth', 60, 0.18);
  }

  /** Combo hit sound */
  combo() {
    this._sequence([
      [700, 0.08, 'square', null, 0.2],
      [900, 0.12, 'square', null, 0.22],
    ]);
  }

  /** Short thud — enemy takes a hit (not death) */
  enemyHit() {
    this._play(280, 0.05, 'square', 180, 0.1);
  }

  /** Rising chime — good gate (ascending notes, higher pitch) */
  gateGood() {
    this._sequence([
      [520, 0.1, 'triangle', null, 0.3],
      [660, 0.1, 'triangle', null, 0.3],
      [830, 0.15, 'triangle', null, 0.35],
    ]);
  }

  /** Deep rumble roar — boss entry (layered low + mid oscillators) */
  bossRoar() {
    this._init();
    if (!this._ctx) return;
    const ctx = this._ctx;
    if (ctx.state === 'suspended') ctx.resume();

    // Low oscillator (60Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(60, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(35, ctx.currentTime + 0.6);
    gain1.gain.setValueAtTime(0.5, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.61);

    // Mid oscillator (200Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(200, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);
    gain2.gain.setValueAtTime(0.35, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.41);
  }

  /** Continuous low rhythmic march thumping */
  marchLoop() {
    this._init();
    if (!this._ctx) return;
    if (this._marchInterval) return;
    const ctx = this._ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const pulse = () => {
      if (!this._marchInterval) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.13);
    };

    pulse();
    this._marchInterval = setInterval(pulse, 300);
  }

  marchStop() {
    if (this._marchInterval) {
      clearInterval(this._marchInterval);
      this._marchInterval = null;
    }
  }

  /** Short ascending arpeggio — victory fanfare */
  victory() {
    this._sequence([
      [440, 0.12, 'triangle', null, 0.3],
      [554, 0.12, 'triangle', null, 0.3],
      [659, 0.12, 'triangle', null, 0.32],
      [880, 0.25, 'square', null, 0.35],
    ]);
  }

  /** Looping combat drum/bass pattern */
  startCombatMusic() {
    this._init();
    if (!this._ctx) return;
    if (this._combatInterval) return;
    const ctx = this._ctx;
    if (ctx.state === 'suspended') ctx.resume();

    let beat = 0;
    const playBeat = () => {
      if (!this._combatInterval) return;
      // Bass note every beat
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(55, ctx.currentTime);
      bassGain.gain.setValueAtTime(0.18, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      bassOsc.start(ctx.currentTime);
      bassOsc.stop(ctx.currentTime + 0.21);

      // Higher hit every other beat
      if (beat % 2 === 0) {
        const hitOsc = ctx.createOscillator();
        const hitGain = ctx.createGain();
        hitOsc.connect(hitGain);
        hitGain.connect(ctx.destination);
        hitOsc.type = 'square';
        hitOsc.frequency.setValueAtTime(220, ctx.currentTime);
        hitGain.gain.setValueAtTime(0.1, ctx.currentTime);
        hitGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        hitOsc.start(ctx.currentTime);
        hitOsc.stop(ctx.currentTime + 0.09);
      }
      beat++;
    };

    playBeat();
    this._combatInterval = setInterval(playBeat, 500);
  }

  stopCombatMusic() {
    if (this._combatInterval) {
      clearInterval(this._combatInterval);
      this._combatInterval = null;
    }
  }
}

// Single global instance
window.audioManager = new AudioManager();
