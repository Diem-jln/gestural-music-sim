/**
 * AudioEngine.js - Motor Acústico Robusto y Estable
 * Síntesis armónica diferenciada para 6 géneros sin bucles circulares ni cuelgues.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Escala Diatónica de Do Mayor (C4 a C5) con frecuencias ISO 16
    this.scale = [
      { name: 'Do',  freq: 261.626, midi: 60, col: '#ff5400', desc: 'Fundamental' },
      { name: 'Re',  freq: 293.665, midi: 62, col: '#ff7700', desc: 'Segunda Mayor' },
      { name: 'Mi',  freq: 329.628, midi: 64, col: '#ffaa00', desc: 'Tercera Mayor' },
      { name: 'Fa',  freq: 349.228, midi: 65, col: '#ffbe0b', desc: 'Cuarta Justa' },
      { name: 'Sol', freq: 391.995, midi: 67, col: '#06d6a0', desc: 'Quinta Justa' },
      { name: 'La',  freq: 440.000, midi: 69, col: '#118ab2', desc: 'Sexta Mayor (A440)' },
      { name: 'Si',  freq: 493.883, midi: 71, col: '#8338ec', desc: 'Séptima Mayor' },
      { name: "Do'", freq: 523.251, midi: 72, col: '#ff006e', desc: 'Octava Superior' }
    ];

    this.activeNote = null;
    this.activeFreq = 0;
    this.soundEnergy = 0;

    // Bus Maestro Unidireccional (Libre de bucles)
    this.masterGain = null;
    this.masterLimiter = null;
    this.delayNode = null;
    this.delayGain = null;
    this.analyser = null;
    this.dataArray = null;

    // Gestor de voz activa (anti-rebote / anti-spam de osciladores)
    this.currentVoice = null;
    this.lastTriggeredNote = null;
    this.lastTriggeredGenre = null;

    // Cuantizador Rítmico
    this.currentBpm = 120;
    this.beatDuration = 500;
    this.autoTimeout = null;
  }

  /**
   * Inicializa el AudioContext de forma segura en respuesta al gesto del usuario
   */
  async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // 1. Ganancia Maestra
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.72, this.ctx.currentTime);

      // 2. Línea de Retardo Analógica Aislada (Envío paralelo, no en bucle)
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime);

      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.22, this.ctx.currentTime);

      // Cableado del Delay aislado
      this.masterGain.connect(this.delayNode);
      this.delayNode.connect(delayFeedback);
      delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.delayGain);

      // 3. Compresor / Limitador Maestro que recibe Directo + Retardo
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-3.0, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(6.0, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(8.0, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain.connect(this.masterLimiter);
      this.delayGain.connect(this.masterLimiter);

      // 4. Analizador FFT
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterLimiter.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (err) {
      console.error('Error al iniciar AudioEngine:', err);
    }
  }

  setBpm(bpm) {
    this.currentBpm = Math.max(40, Math.min(240, bpm));
    this.beatDuration = (60 / this.currentBpm) * 1000;
    if (this.delayNode && this.ctx && this.ctx.state === 'running') {
      try {
        const syncTime = (60 / this.currentBpm) * 0.75;
        this.delayNode.delayTime.setValueAtTime(syncTime, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  /**
   * Disparo seguro de nota con administración de ciclo de vida
   */
  playNote(noteName, genre = 'FLUTE', dynamics = 0.85, secondaryHand = null) {
    if (!this.isInitialized || !this.ctx || this.ctx.state !== 'running') return;

    const noteItem = this.scale.find(n => n.name === noteName);
    if (!noteItem) return;

    let octaveMul = 1.0;
    let brightness = 1.0;

    if (secondaryHand && secondaryHand.palmCenter) {
      if (secondaryHand.palmCenter.y < window.innerHeight * 0.38) {
        octaveMul = 2.0;
      }
      brightness = 1.0 + (secondaryHand.spanDist / 200) * 1.4;
    }

    const targetFreq = noteItem.freq * octaveMul;
    this.activeNote = noteItem.name;
    this.activeFreq = targetFreq;
    this.soundEnergy = dynamics;

    // Si la misma nota sigue activa, modula la voz sin colapsar el sistema
    if (this.currentVoice && 
        this.currentVoice.isPlaying && 
        this.lastTriggeredNote === noteName && 
        this.lastTriggeredGenre === genre) {
      this.currentVoice.modulate(dynamics, brightness, targetFreq);
      return;
    }

    // Corta la voz previa con desvanecimiento de 15ms anti-clics
    this.stopCurrentVoice();

    const now = this.ctx.currentTime;
    this.lastTriggeredNote = noteName;
    this.lastTriggeredGenre = genre;

    try {
      switch (genre) {
        case 'FLUTE':
          this.currentVoice = this.createFluteVoice(targetFreq, now, dynamics, brightness);
          break;
        case 'SYNTH':
          this.currentVoice = this.createSynthVoice(targetFreq, now, dynamics, brightness);
          break;
        case 'BELL':
          this.currentVoice = this.createBellVoice(targetFreq, now, dynamics, brightness);
          break;
        case 'BOOMBAP':
          this.currentVoice = this.createBoomBapVoice(targetFreq, now, dynamics, brightness);
          break;
        case 'ORGAN':
          this.currentVoice = this.createOrganVoice(targetFreq, now, dynamics, brightness);
          break;
        case 'CHIPTUNE':
        default:
          this.currentVoice = this.createChiptuneVoice(targetFreq, now, dynamics, brightness);
          break;
      }
    } catch (e) {
      console.warn('Fallo al sintetizar voz:', e);
    }
  }

  stopCurrentVoice() {
    if (this.currentVoice && this.currentVoice.isPlaying) {
      try {
        this.currentVoice.release(0.02);
      } catch (e) {}
      this.currentVoice = null;
    }
  }

  silence() {
    this.stopCurrentVoice();
    this.activeNote = null;
    this.lastTriggeredNote = null;
    this.soundEnergy = Math.max(0, this.soundEnergy - 0.08);
  }

  // =========================================================================
  // ARQUITECTURAS TÍMBRICAS PURAS (TOTALMENTE INDEPENDIENTES)
  // =========================================================================

  /**
   * 1. FLAUTA ANDINA: Senoidal cálida + segundo armónico + vibrato LFO + Chiff
   */
  createFluteVoice(freq, now, dynamics, brightness) {
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.0, now);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.2, now);
    osc2.connect(g2);

    // LFO vibrato a 5.2 Hz
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.2, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(3.5, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start(now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(18000, freq * 3.6 * brightness), now);
    filter.Q.setValueAtTime(3.0, now);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.5 * dynamics, now + 0.05);

    this.triggerBreathChiff(freq, now, dynamics);

    osc1.connect(filter);
    g2.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    return {
      isPlaying: true,
      release: (fade) => {
        const t = ctx.currentTime;
        voiceGain.gain.cancelScheduledValues(t);
        voiceGain.gain.setValueAtTime(Math.max(0.001, voiceGain.gain.value), t);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        osc1.stop(t + fade + 0.02);
        osc2.stop(t + fade + 0.02);
        lfo.stop(t + fade + 0.02);
      },
      modulate: (dyn, br, f) => {
        const t = ctx.currentTime;
        voiceGain.gain.linearRampToValueAtTime(0.5 * dyn, t + 0.03);
        filter.frequency.linearRampToValueAtTime(Math.min(18000, f * 3.6 * br), t + 0.03);
        osc1.frequency.linearRampToValueAtTime(f, t + 0.03);
        osc2.frequency.linearRampToValueAtTime(f * 2.0, t + 0.03);
      }
    };
  }

  /**
   * 2. CYBER SYNTH: Doble sierra desfasada en estéreo + sub-bajo cuadrado + filtro ladder
   */
  createSynthVoice(freq, now, dynamics, brightness) {
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq * 0.994, now);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.006, now);

    sub.type = 'square';
    sub.frequency.setValueAtTime(freq * 0.5, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.38, now);
    sub.connect(subGain);

    filter.type = 'lowpass';
    const initCutoff = Math.min(18000, freq * 7.0 * brightness);
    filter.frequency.setValueAtTime(initCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 1.6), now + 0.35);
    filter.Q.setValueAtTime(6.0, now);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.6 * dynamics, now + 0.015);

    osc1.connect(filter);
    osc2.connect(filter);
    subGain.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    sub.start(now);

    return {
      isPlaying: true,
      release: (fade) => {
        const t = ctx.currentTime;
        voiceGain.gain.cancelScheduledValues(t);
        voiceGain.gain.setValueAtTime(Math.max(0.001, voiceGain.gain.value), t);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        osc1.stop(t + fade + 0.02);
        osc2.stop(t + fade + 0.02);
        sub.stop(t + fade + 0.02);
      },
      modulate: (dyn, br, f) => {
        const t = ctx.currentTime;
        voiceGain.gain.linearRampToValueAtTime(0.6 * dyn, t + 0.03);
        filter.frequency.linearRampToValueAtTime(Math.min(18000, f * 4.5 * br), t + 0.03);
        osc1.frequency.linearRampToValueAtTime(f * 0.994, t + 0.03);
        osc2.frequency.linearRampToValueAtTime(f * 1.006, t + 0.03);
        sub.frequency.linearRampToValueAtTime(f * 0.5, t + 0.03);
      }
    };
  }

  /**
   * 3. CAMPANA ZEN: Síntesis FM pura inarmónica
   */
  createBellVoice(freq, now, dynamics, brightness) {
    const ctx = this.ctx;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const voiceGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, now);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2.756, now);

    modGain.gain.setValueAtTime(freq * 1.5 * brightness, now);
    modGain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.72 * dynamics, now + 0.008);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    carrier.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    carrier.start(now);
    modulator.start(now);

    return {
      isPlaying: true,
      release: (fade) => {
        const t = ctx.currentTime;
        voiceGain.gain.cancelScheduledValues(t);
        voiceGain.gain.setValueAtTime(Math.max(0.001, voiceGain.gain.value), t);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        carrier.stop(t + fade + 0.02);
        modulator.stop(t + fade + 0.02);
      },
      modulate: (dyn, br, f) => {
        const t = ctx.currentTime;
        voiceGain.gain.linearRampToValueAtTime(0.72 * dyn, t + 0.04);
        carrier.frequency.linearRampToValueAtTime(f, t + 0.04);
        modulator.frequency.linearRampToValueAtTime(f * 2.756, t + 0.04);
      }
    };
  }

  /**
   * 4. BOOM BAP 90s: Caída percusiva rápida de bombo 808 + bajo saturado
   */
  createBoomBapVoice(freq, now, dynamics, brightness) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.9, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.5), now + 0.038);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(14000, 270 * brightness), now);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.85 * dynamics, now + 0.015);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    osc.start(now);

    return {
      isPlaying: true,
      release: (fade) => {
        const t = ctx.currentTime;
        voiceGain.gain.cancelScheduledValues(t);
        voiceGain.gain.setValueAtTime(Math.max(0.001, voiceGain.gain.value), t);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        osc.stop(t + fade + 0.02);
      },
      modulate: (dyn, br) => {
        const t = ctx.currentTime;
        voiceGain.gain.linearRampToValueAtTime(0.85 * dyn, t + 0.03);
        filter.frequency.linearRampToValueAtTime(Math.min(14000, 270 * br), t + 0.03);
      }
    };
  }

  /**
   * 5. ÓRGANO SACRO: Aditiva de registros de tubos con trémolo Leslie
   */
  createOrganVoice(freq, now, dynamics, brightness) {
    const ctx = this.ctx;
    const multipliers = [1.0, 2.0, 3.0, 4.0, 5.0];
    const amplitudes = [0.42, 0.30, 0.20, 0.14, 0.08];
    const oscillators = [];

    const voiceGain = ctx.createGain();
    const tremoloGain = ctx.createGain();
    const lfo = ctx.createOscillator();

    // Altavoz rotativo Leslie a 6.0 Hz
    lfo.frequency.setValueAtTime(6.0, now);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(0.16, now);
    lfo.connect(lfoDepth);
    lfoDepth.connect(tremoloGain.gain);
    lfo.start(now);

    tremoloGain.gain.setValueAtTime(0.84, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(18000, freq * 4.8 * brightness), now);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.55 * dynamics, now + 0.05);

    multipliers.forEach((mul, i) => {
      const osc = ctx.createOscillator();
      const pGain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * mul, now);
      pGain.gain.setValueAtTime(amplitudes[i], now);

      osc.connect(pGain);
      pGain.connect(filter);
      osc.start(now);
      oscillators.push(osc);
    });

    filter.connect(tremoloGain);
    tremoloGain.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    return {
      isPlaying: true,
      release: (fade) => {
        const t = ctx.currentTime;
        voiceGain.gain.cancelScheduledValues(t);
        voiceGain.gain.setValueAtTime(Math.max(0.001, voiceGain.gain.value), t);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        oscillators.forEach(o => o.stop(t + fade + 0.02));
        lfo.stop(t + fade + 0.02);
      },
      modulate: (dyn, br, f) => {
        const t = ctx.currentTime;
        voiceGain.gain.linearRampToValueAtTime(0.55 * dyn, t + 0.03);
        filter.frequency.linearRampToValueAtTime(Math.min(18000, f * 4.8 * br), t + 0.03);
        oscillators.forEach((o, idx) => {
          o.frequency.linearRampToValueAtTime(f * multipliers[idx], t + 0.03);
        });
      }
    };
  }

  /**
   * 6. CHIPTUNE 8-BIT: Onda de pulso cuadrada pura con arpegio retro
   */
  createChiptuneVoice(freq, now, dynamics, brightness) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    // Arpegio retro ultrarrápido (Root -> 3ra -> 5ta -> Fundamental)
    osc.frequency.setValueAtTime(freq * 1.2599, now + 0.025);
    osc.frequency.setValueAtTime(freq * 1.4983, now + 0.050);
    osc.frequency.setValueAtTime(freq, now + 0.075);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(18000, 3400 * brightness), now);

    voiceGain.gain.setValueAtTime(0.001, now);
    voiceGain.gain.linearRampToValueAtTime(0.42 * dynamics, now + 0.006);

    osc.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    osc.start(now);

    return {
      isPlaying: true,
      release: (fade) => {
        const t = ctx.currentTime;
        voiceGain.gain.cancelScheduledValues(t);
        voiceGain.gain.setValueAtTime(Math.max(0.001, voiceGain.gain.value), t);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        osc.stop(t + fade + 0.02);
      },
      modulate: (dyn, br, f) => {
        const t = ctx.currentTime;
        voiceGain.gain.linearRampToValueAtTime(0.42 * dyn, t + 0.02);
        filter.frequency.linearRampToValueAtTime(Math.min(18000, 3400 * br), t + 0.02);
        osc.frequency.linearRampToValueAtTime(f, t + 0.02);
      }
    };
  }

  triggerBreathChiff(freq, now, dynamics) {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(Math.min(18000, freq * 2.3), now);
      noiseFilter.Q.setValueAtTime(5.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12 * dynamics, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + 0.07);
    } catch (e) {}
  }

  playModelInference(dataset, genre, onStepCallback, onFinishCallback) {
    if (!this.isInitialized || dataset.length === 0) return;
    this.stopPlayback();

    let step = 0;
    const playNext = () => {
      if (step >= dataset.length) {
        if (onFinishCallback) onFinishCallback();
        return;
      }

      const sample = dataset[step];
      this.playNote(sample.note, genre, sample.isCorrect ? 0.88 : 0.45);
      if (onStepCallback) onStepCallback(sample, step);

      step++;
      this.autoTimeout = setTimeout(playNext, sample.duration || 360);
    };

    playNext();
  }

  stopPlayback() {
    if (this.autoTimeout) {
      clearTimeout(this.autoTimeout);
      this.autoTimeout = null;
    }
    this.silence();
  }

  getFrequencyData() {
    if (!this.isInitialized || !this.analyser) return [];
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }
}