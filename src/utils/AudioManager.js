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

  /** Ascending tone — good gate */
  gatGood() {
    this._play(400, 0.22, 'sine', 620, 0.28);
  }

  /** Descending harsh tone — bad gate */
  gateBad() {
    this._play(600, 0.22, 'sawtooth', 180, 0.2);
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

  /** Deep rumble roar — boss entry */
  bossRoar() {
    this._play(55, 0.55, 'sawtooth', 35, 0.45);
  }
}

// Single global instance
window.audioManager = new AudioManager();
