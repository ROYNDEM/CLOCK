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
      // Grandfather Clock Tones
      'grandfather-westminster': {
        name: 'Grandfather Clock • Westminster Quarters',
        description: 'Authentic 4-phrase Westminster tubular bell chime followed by deep hour gong strike',
        category: 'grandfather'
      },
      'grandfather-cathedral-gong': {
        name: 'Grandfather Clock • Deep Cathedral Gong',
        description: 'Resonant low bronze pendulum clock gong with slow harmonic 4-second decay',
        category: 'grandfather'
      },
      'grandfather-whittington': {
        name: 'Grandfather Clock • Whittington Chimes',
        description: 'Historic 8-bell cascading chime sequence from St. Mary-le-Bow',
        category: 'grandfather'
      },
      'grandfather-single-strike': {
        name: 'Grandfather Clock • Executive Single Chime',
        description: 'Discreet, dignified single bronze chime strike designed specifically for board meetings',
        category: 'grandfather'
      },
      'grandfather-st-michael': {
        name: 'Grandfather Clock • St. Michael Chime',
        description: 'Melodic historic 4-bell chime sequence with bright acoustic bronze resonance',
        category: 'grandfather'
      },
      // Silent Option
      'none': {
        name: 'None • Silent (Visual & Popup Only)',
        description: 'Complete silence - only triggers desktop pop-up notification and screen alert',
        category: 'silent'
      },
      // Modern & Melodic Tones
      'crystal-chime': {
        name: 'Crystal Singing Chime',
        description: 'Gentle, meditative pentatonic chime',
        category: 'melodic'
      },
      'marimba-sunshine': {
        name: 'Marimba Sunshine',
        description: 'Warm rhythmic acoustic wooden mallet notes',
        category: 'melodic'
      },
      'gentle-harp': {
        name: 'Soothing Acoustic Harp',
        description: 'Calming ascending harp arpeggio',
        category: 'melodic'
      },
      'birds-chirping': {
        name: 'Forest Birdsong',
        description: 'Natural procedural morning bird chirps',
        category: 'melodic'
      },
      // Standard / Alert Tones
      'classic-bell': {
        name: 'Classic Mechanical Bell',
        description: 'Vibrant dual metallic bells with rapid strike vibration',
        category: 'alert'
      },
      'digital-beep': {
        name: 'Retro Digital Watch',
        description: 'Iconic 4-beep digital watch cadence',
        category: 'alert'
      },
      'cosmic-radar': {
        name: 'Cosmic Radar Pulse',
        description: 'Sci-fi sonar ping with frequency sweep',
        category: 'alert'
      },
      'energetic-siren': {
        name: 'Energetic Siren',
        description: 'Rapid alternating pitch alert for deep sleepers',
        category: 'alert'
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
    this.stop(); // Stop any active playback
    this.isRinging = loop;
    this.currentTone = toneId;

    // Silent mode requires no audio synthesis
    if (toneId === 'none') {
      return;
    }

    this.initContext();
    if (!this.ctx) return;

    if (volume !== null) {
      this.setVolume(volume);
    }

    const playCycle = () => {
      if (!this.ctx || !this.isRinging) return;
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
   * Play a short preview of a tone (lasts ~2.5 - 4 seconds then stops).
   */
  preview(toneId, volume = null, onComplete = null) {
    this.stop();
    this.currentTone = toneId;

    if (toneId === 'none') {
      // Visual feedback only for silent mode
      this.previewTimer = setTimeout(() => {
        this.stop();
        if (typeof onComplete === 'function') onComplete();
      }, 700);
      return;
    }

    this.initContext();
    if (!this.ctx) return;

    if (volume !== null) {
      this.setVolume(volume);
    }

    const duration = this._synthesizeTone(toneId);
    const stopTimeMs = Math.min(4500, Math.max(2200, duration * 1000));

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
      // Grandfather Clock Tones
      case 'grandfather-westminster':
        return this._playGrandfatherWestminster();
      case 'grandfather-cathedral-gong':
        return this._playGrandfatherCathedralGong();
      case 'grandfather-whittington':
        return this._playGrandfatherWhittington();
      case 'grandfather-single-strike':
        return this._playGrandfatherSingleStrike();
      case 'grandfather-st-michael':
        return this._playGrandfatherStMichael();

      // Silent Mode
      case 'none':
        return this._playSilent();

      // Standard / Melodic Tones
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
        return this._playGrandfatherWestminster();
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

  /* -------------------------------------------------------------
     GRANDFATHER CLOCK ACOUSTIC SYNTHESIZERS
     Physical acoustics modeling for tubular bells and bronze gongs
     ------------------------------------------------------------- */

  /**
   * Generates a single acoustic chime note with authentic bell overtone partials:
   * Prime (1.0x), Tierce (1.2x), Quint (1.5x), Nominal (2.0x), and mechanical hammer strike.
   */
  _createGrandfatherChimeNote(freq, startTime, duration = 3.5, vol = 0.45, isHeavyGong = false) {
    if (!this.ctx) return;

    // Harmonic partial ratios for cast bronze / tubular bell acoustics
    const overtones = [
      { ratio: 1.0, type: 'sine', decayMult: 1.0, volMult: 0.85 },
      { ratio: 1.201, type: 'sine', decayMult: 0.88, volMult: 0.55 }, // Tierce (minor third)
      { ratio: 1.498, type: 'sine', decayMult: 0.82, volMult: 0.45 }, // Quint (fifth)
      { ratio: 2.0, type: 'sine', decayMult: 0.72, volMult: 0.38 },   // Nominal (octave)
      { ratio: 2.76, type: 'sine', decayMult: 0.45, volMult: 0.22 }   // High chime shimmer
    ];

    if (isHeavyGong) {
      // Add deep low hum tone and extra sub-harmonic body for cathedral gong
      overtones.push({ ratio: 0.5, type: 'sine', decayMult: 1.3, volMult: 0.95 });
      overtones.push({ ratio: 0.75, type: 'sine', decayMult: 1.15, volMult: 0.5 });
    }

    // Mechanical hammer transient (felt/brass clapper impulse)
    const strikeOsc = this.ctx.createOscillator();
    const strikeGain = this.ctx.createGain();
    strikeOsc.type = 'triangle';
    strikeOsc.frequency.setValueAtTime(freq * 3.6, startTime);
    strikeGain.gain.setValueAtTime(0, startTime);
    strikeGain.gain.linearRampToValueAtTime(vol * 0.35, startTime + 0.002);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.05);

    strikeOsc.connect(strikeGain);
    strikeGain.connect(this.masterGain);
    strikeOsc.start(startTime);
    strikeOsc.stop(startTime + 0.06);
    this.activeNodes.push(strikeOsc, strikeGain);

    // Render acoustic bell overtones with subtle detuning for natural brass phasing
    overtones.forEach((ot, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = ot.type;
      osc.frequency.setValueAtTime(freq * ot.ratio, startTime);

      // Micro-detuning creates warm acoustic chorus effect
      const detune = (i % 2 === 0 ? 1 : -1) * (i * 1.6 + 1.2);
      osc.detune.setValueAtTime(detune, startTime);

      const noteDuration = duration * ot.decayMult;
      const noteVol = vol * ot.volMult;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(noteVol, startTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
      this.activeNodes.push(osc, gain);
    });
  }

  /**
   * 9. WESTMINSTER QUARTERS: Classic Grandfather Clock 4-bell melody + deep hour gong strike.
   */
  _playGrandfatherWestminster() {
    const t0 = this.ctx.currentTime;
    // Classic 4-note Westminster chime sequence: G#4, E4, F#4, B3
    const notes = [
      { freq: 415.30, time: 0.0, dur: 2.8, vol: 0.40 }, // G#4
      { freq: 329.63, time: 0.75, dur: 2.8, vol: 0.40 }, // E4
      { freq: 369.99, time: 1.50, dur: 2.8, vol: 0.40 }, // F#4
      { freq: 246.94, time: 2.25, dur: 3.5, vol: 0.44 }  // B3
    ];

    notes.forEach(n => {
      this._createGrandfatherChimeNote(n.freq, t0 + n.time, n.dur, n.vol, false);
    });

    // Deep hour gong strike following the chime
    this._createGrandfatherChimeNote(164.81, t0 + 3.4, 4.2, 0.52, true); // E3 deep bronze gong

    return 7.6; // Cycle duration in seconds
  }

  /**
   * 10. DEEP CATHEDRAL GONG: Authoritative low bronze pendulum clock strikes with 4.5s decay.
   */
  _playGrandfatherCathedralGong() {
    const t0 = this.ctx.currentTime;
    // Deep bronze clock strike (C3 / 130.8 Hz)
    this._createGrandfatherChimeNote(130.81, t0, 4.6, 0.58, true);
    this._createGrandfatherChimeNote(130.81, t0 + 2.4, 4.8, 0.54, true);
    return 6.5;
  }

  /**
   * 11. WHITTINGTON CHIMES: Historic 8-bell cascading sequence from St. Mary-le-Bow.
   */
  _playGrandfatherWhittington() {
    const t0 = this.ctx.currentTime;
    // 8-bell melody: B4, A4, G#4, F#4, E4, D#4, C#4, B3
    const notes = [
      { freq: 493.88, time: 0.0, dur: 2.2, vol: 0.34 },
      { freq: 440.00, time: 0.35, dur: 2.2, vol: 0.34 },
      { freq: 415.30, time: 0.70, dur: 2.2, vol: 0.34 },
      { freq: 369.99, time: 1.05, dur: 2.2, vol: 0.34 },
      { freq: 329.63, time: 1.40, dur: 2.4, vol: 0.36 },
      { freq: 311.13, time: 1.75, dur: 2.4, vol: 0.36 },
      { freq: 277.18, time: 2.10, dur: 2.6, vol: 0.38 },
      { freq: 246.94, time: 2.45, dur: 3.8, vol: 0.44 }
    ];

    notes.forEach(n => {
      this._createGrandfatherChimeNote(n.freq, t0 + n.time, n.dur, n.vol, false);
    });

    return 6.2;
  }

  /**
   * 12. EXECUTIVE SINGLE BELL: Discreet single bronze chime strike for board meetings.
   */
  _playGrandfatherSingleStrike() {
    const t0 = this.ctx.currentTime;
    // Single dignified bronze bell strike (E4 / 329.6 Hz)
    this._createGrandfatherChimeNote(329.63, t0, 4.2, 0.48, false);
    return 4.5;
  }

  /**
   * 13. ST. MICHAEL CHIME: Traditional ornate 4-bell chime sequence.
   */
  _playGrandfatherStMichael() {
    const t0 = this.ctx.currentTime;
    const notes = [
      { freq: 369.99, time: 0.0, dur: 2.6, vol: 0.36 }, // F#4
      { freq: 493.88, time: 0.65, dur: 2.6, vol: 0.38 }, // B4
      { freq: 415.30, time: 1.30, dur: 2.6, vol: 0.38 }, // G#4
      { freq: 329.63, time: 1.95, dur: 3.8, vol: 0.44 }  // E4
    ];

    notes.forEach(n => {
      this._createGrandfatherChimeNote(n.freq, t0 + n.time, n.dur, n.vol, false);
    });

    return 5.5;
  }

  /**
   * 14. SILENT MODE: Zero sound output, visual and desktop popup alert only.
   */
  _playSilent() {
    return 2.0;
  }
}

// Global audio engine singleton
window.chronosAudio = new ChronosAudioEngine();
