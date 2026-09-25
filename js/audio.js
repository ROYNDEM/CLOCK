/**
 * CHRONOS SOUND ENGINE • Procedural Web Audio API Synthesizer
 * Provides 8 rich, distinct, zero-dependency synthesized tones for alarms and previews.
 */

class ChronosAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeNodes = [];
    this.loopTimer = null;
    this.previewTimer = null;
    this.isRinging = false;
    this.currentTone = null;
    this.volume = 0.8; // default 80%

    // Tone metadata
    this.tones = {
      'classic-bell': {
        name: 'Classic Mechanical Bell',
        description: 'Vibrant dual metallic bells with rapid strike vibration'
      },
      'digital-beep': {
        name: 'Retro Digital Watch',
        description: 'Iconic 4-beep digital watch cadence'
      },
      'crystal-chime': {
        name: 'Crystal Singing Chime',
        description: 'Gentle, meditative pentatonic chime'
      },
      'marimba-sunshine': {
        name: 'Marimba Sunshine',
        description: 'Warm rhythmic acoustic wooden mallet notes'
      },
      'cosmic-radar': {
        name: 'Cosmic Radar Pulse',
        description: 'Sci-fi sonar ping with frequency sweep'
      },
      'gentle-harp': {
        name: 'Soothing Acoustic Harp',
        description: 'Calming ascending harp arpeggio'
      },
      'energetic-siren': {
        name: 'Energetic Siren',
        description: 'Rapid alternating pitch alert for deep sleepers'
      },
      'birds-chirping': {
        name: 'Forest Birdsong',
        description: 'Natural procedural morning bird chirps'
      }
    };
  }

  /**
   * Initializes or resumes the AudioContext on user interaction.
   */
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported in this browser.');
        return null;
      }
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  isContextUnlocked() {
    return this.ctx && this.ctx.state === 'running';
  }

  setVolume(percent) {
    this.volume = Math.max(0.01, Math.min(1.0, percent / 100));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Play a specific tone. If loop is true, repeats until stopped.
   */
  play(toneId, volume = null, loop = false) {
    this.initContext();
    if (!this.ctx) return;

    if (volume !== null) {
      this.setVolume(volume);
    }

    this.stop(); // Stop any active playback
    this.isRinging = loop;
    this.currentTone = toneId;

    const playCycle = () => {
      if (!this.ctx) return;
      const cycleDuration = this._synthesizeTone(toneId);

      if (loop && this.isRinging) {
        this.loopTimer = setTimeout(() => {
          if (this.isRinging) {
            playCycle();
          }
        }, cycleDuration * 1000);
      }
    };

    playCycle();
  }

  /**
   * Play a short preview of a tone (lasts ~2.5 - 3 seconds then stops).
   */
  preview(toneId, volume = null, onComplete = null) {
    this.initContext();
    if (!this.ctx) return;

    if (volume !== null) {
      this.setVolume(volume);
    }

    this.stop();
    this.currentTone = toneId;

    const duration = this._synthesizeTone(toneId);
    const stopTimeMs = Math.min(3200, Math.max(2200, duration * 1000));

    this.previewTimer = setTimeout(() => {
      this.stop();
      if (typeof onComplete === 'function') onComplete();
    }, stopTimeMs);
  }

  /**
   * Stop all ringing/previewing sounds and cleanup.
   */
  stop() {
    this.isRinging = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }

    if (this.activeNodes.length > 0 && this.ctx) {
      const now = this.ctx.currentTime;
      this.activeNodes.forEach(node => {
        try {
          if (node.gain) {
            node.gain.setTargetAtTime(0, now, 0.03);
          }
          if (node.stop) {
            node.stop(now + 0.05);
          }
        } catch (e) {
          // Node may already be stopped
        }
      });
      this.activeNodes = [];
    }
  }

  /* -------------------------------------------------------------
     TONE SYNTHESIZERS (Procedural Sound Generation)
     ------------------------------------------------------------- */

  _synthesizeTone(toneId) {
    switch (toneId) {
      case 'classic-bell':
        return this._playClassicBell();
      case 'digital-beep':
        return this._playDigitalBeep();
      case 'crystal-chime':
        return this._playCrystalChime();
      case 'marimba-sunshine':
        return this._playMarimbaSunshine();
      case 'cosmic-radar':
        return this._playCosmicRadar();
      case 'gentle-harp':
        return this._playGentleHarp();
      case 'energetic-siren':
        return this._playEnergeticSiren();
      case 'birds-chirping':
        return this._playBirdsChirping();
      default:
        return this._playCrystalChime();
    }
  }

  /**
   * 1. CLASSIC BELL: Dual resonant metallic frequencies with 14Hz rapid strike vibration.
   */
  _playClassicBell() {
    const t0 = this.ctx.currentTime;
    const strikes = [0, 0.12, 0.24, 0.36, 0.48, 0.60, 0.85, 0.97, 1.09, 1.21, 1.33, 1.45];

    strikes.forEach(timeOffset => {
      const strikeTime = t0 + timeOffset;
      // Bell 1: ~1180 Hz
      this._createResonantStrike(1180, strikeTime, 0.2, 0.4);
      // Bell 2: ~1740 Hz
      this._createResonantStrike(1740, strikeTime, 0.18, 0.35);
    });

    return 2.2; // cycle duration in seconds
  }

  _createResonantStrike(freq, startTime, duration, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    // Add subtle detune for physical metallic depth
    osc.detune.setValueAtTime(Math.random() * 10 - 5, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
    this.activeNodes.push(osc, gain);
  }

  /**
   * 2. DIGITAL BEEP: Iconic 4-beep digital watch cadence.
   */
  _playDigitalBeep() {
    const t0 = this.ctx.currentTime;
    const beeps = [0, 0.12, 0.24, 0.36];

    beeps.forEach(offset => {
      const startTime = t0 + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(2048, startTime);

      // Low pass filter to soften the harshness slightly into classic watch piezo sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2048, startTime);
      filter.Q.setValueAtTime(3.0, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.setValueAtTime(0.35, startTime + 0.005);
      gain.gain.setValueAtTime(0.35, startTime + 0.06);
      gain.gain.setValueAtTime(0.0001, startTime + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.08);
      this.activeNodes.push(osc, gain, filter);
    });

    return 1.4; // 1.4s cycle
  }

  /**
   * 3. CRYSTAL CHIME: Ethereal singing bowl pentatonic chord.
   */
  _playCrystalChime() {
    const t0 = this.ctx.currentTime;
    // Pentatonic chord: E5, G#5, B5, E6
    const notes = [
      { freq: 659.25, time: 0, decay: 2.2, vol: 0.3 },
      { freq: 830.61, time: 0.2, decay: 2.0, vol: 0.25 },
      { freq: 987.77, time: 0.4, decay: 2.2, vol: 0.25 },
      { freq: 1318.51, time: 0.6, decay: 2.4, vol: 0.2 }
    ];

    notes.forEach(note => {
      const startTime = t0 + note.time;
      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, startTime);

      // Harmonic shimmer
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(note.freq * 2.01, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(note.vol, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.decay);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      oscHarmonic.start(startTime);
      osc.stop(startTime + note.decay);
      oscHarmonic.stop(startTime + note.decay);

      this.activeNodes.push(osc, oscHarmonic, gain);
    });

    return 3.0;
  }

  /**
   * 4. MARIMBA SUNSHINE: Cheerful acoustic wooden mallet arpeggio.
   */
  _playMarimbaSunshine() {
    const t0 = this.ctx.currentTime;
    // C5, E5, G5, C6, B5, G5
    const notes = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.16 },
      { freq: 783.99, time: 0.32 },
      { freq: 1046.50, time: 0.48 },
      { freq: 987.77, time: 0.68 },
      { freq: 783.99, time: 0.88 }
    ];

    notes.forEach(note => {
      const startTime = t0 + note.time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, startTime);

      // Snappy wooden mallet attack
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.46);
      this.activeNodes.push(osc, gain);
    });

    return 1.8;
  }

  /**
   * 5. COSMIC RADAR: Sonar frequency sweep with synthetic echo.
   */
  _playCosmicRadar() {
    const t0 = this.ctx.currentTime;
    const pings = [0, 0.75];

    pings.forEach(offset => {
      const startTime = t0 + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, startTime);
      osc.frequency.exponentialRampToValueAtTime(1400, startTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(700, startTime + 0.5);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.7);
      this.activeNodes.push(osc, gain);
    });

    return 2.0;
  }

  /**
   * 6. GENTLE HARP: Soothing ascending arpeggio.
   */
  _playGentleHarp() {
    const t0 = this.ctx.currentTime;
    // D4, F#4, A4, C#5, E5, A5
    const notes = [
      { freq: 293.66, time: 0 },
      { freq: 369.99, time: 0.15 },
      { freq: 440.00, time: 0.30 },
      { freq: 554.37, time: 0.45 },
      { freq: 659.25, time: 0.60 },
      { freq: 880.00, time: 0.75 }
    ];

    notes.forEach(note => {
      const startTime = t0 + note.time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 1.25);
      this.activeNodes.push(osc, gain);
    });

    return 2.6;
  }

  /**
   * 7. ENERGETIC SIREN: Fast alternating dual-tone siren.
   */
  _playEnergeticSiren() {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';

    // 4 cycles of alternating frequency
    for (let i = 0; i < 4; i++) {
      const cycleStart = t0 + i * 0.35;
      osc.frequency.setValueAtTime(800, cycleStart);
      osc.frequency.linearRampToValueAtTime(1250, cycleStart + 0.17);
      osc.frequency.linearRampToValueAtTime(800, cycleStart + 0.34);
    }

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.05);
    gain.gain.setValueAtTime(0.25, t0 + 1.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t0);
    osc.stop(t0 + 1.5);
    this.activeNodes.push(osc, gain);

    return 1.8;
  }

  /**
   * 8. BIRDS CHIRPING: Organic frequency sweeps replicating songbirds.
   */
  _playBirdsChirping() {
    const t0 = this.ctx.currentTime;
    const chirps = [
      { start: 0, duration: 0.12, f1: 2800, f2: 4400 },
      { start: 0.15, duration: 0.14, f1: 3200, f2: 4800 },
      { start: 0.35, duration: 0.18, f1: 2900, f2: 4200 },
      { start: 0.7, duration: 0.1, f1: 3500, f2: 5200 },
      { start: 0.85, duration: 0.15, f1: 3000, f2: 4600 }
    ];

    chirps.forEach(chirp => {
      const startTime = t0 + chirp.start;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(chirp.f1, startTime);
      osc.frequency.exponentialRampToValueAtTime(chirp.f2, startTime + chirp.duration * 0.5);
      osc.frequency.exponentialRampToValueAtTime(chirp.f1 * 0.9, startTime + chirp.duration);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + chirp.duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + chirp.duration + 0.02);
      this.activeNodes.push(osc, gain);
    });

    return 2.0;
  }
}

// Global audio engine singleton
window.chronosAudio = new ChronosAudioEngine();
