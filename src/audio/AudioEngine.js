export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Escala Diatónica de Do Mayor (C4 a C5)
    this.scale = [
      { name: 'Do',  freq: 261.63, col: '#ff4d4d', desc: 'Puño cerrado' },
      { name: 'Re',  freq: 293.66, col: '#ff944d', desc: 'Solo Índice' },
      { name: 'Mi',  freq: 329.63, col: '#ffd11a', desc: 'Índice + Medio Juntos' },
      { name: 'Fa',  freq: 349.23, col: '#33cc33', desc: 'Índice + Medio + Anular' },
      { name: 'Sol', freq: 392.00, col: '#00e6e6', desc: 'Mano Abierta (5 dedos)' },
      { name: 'La',  freq: 440.00, col: '#3385ff', desc: 'Pellizco Pulgar-Índice' },
      { name: 'Si',  freq: 493.88, col: '#9933ff', desc: 'Señal de Paz (Separados)' },
      { name: "Do'", freq: 523.25, col: '#ff3399', desc: 'Mano en Zona Alta' }
    ];

    this.activeNote = null;
    this.activeFreq = 0;
    this.soundEnergy = 0;

    this.masterGain = null;
    this.analyser = null;
    this.dataArray = null;

    this.autoTimeout = null;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.72, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.isInitialized = true;
  }

  playNote(noteName, genre = 'FLUTE', dynamics = 0.8, secondaryHand = null) {
    if (!this.isInitialized || !this.ctx) return;

    const note = this.scale.find(n => n.name === noteName);
    if (!note) return;

    this.activeNote = note.name;

    let octaveMultiplier = 1;
    let brightness = 1;

    if (secondaryHand) {
      if (secondaryHand.palmCenter.y < window.innerHeight * 0.4) {
        octaveMultiplier = 2;
      }
      brightness = 1 + (secondaryHand.spanDist / 200) * 1.5;
    }

    const freq = note.freq * octaveMultiplier;
    this.activeFreq = freq;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (genre === 'FLUTE') {
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.5 * brightness, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.42 * dynamics, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      this.triggerAirBreath(freq, now, dynamics);
    } else if (genre === 'SYNTH') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 0.5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 5.5 * brightness, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.45 * dynamics, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    } else if (genre === 'BELL') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2.76, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * brightness, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.6 * dynamics, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    } else if (genre === 'BOOMBAP') {
      osc1.type = 'sine';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq * 0.5, now);
      osc2.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260 * brightness, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.65 * dynamics, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    } else if (genre === 'ORGAN') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 3, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.2 * brightness, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.4 * dynamics, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    } else { // CHIPTUNE
      osc1.type = 'square';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.005, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3800 * brightness, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32 * dynamics, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    }

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);

    this.soundEnergy = dynamics;
  }

  triggerAirBreath(freq, now, dynamics) {
    const bufSize = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.2, now);
    filter.Q.setValueAtTime(5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12 * dynamics, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  silence() {
    this.activeNote = null;
    this.soundEnergy = Math.max(0, this.soundEnergy - 0.05);
  }

  // Reproducción por inferencia que copia fielmente la velocidad y errores del usuario
  playModelInference(dataset, genre, onStepCallback, onFinishCallback) {
    if (!this.isInitialized || dataset.length === 0) return;
    this.stopPlayback();

    let step = 0;
    const playNext = () => {
      if (step >= dataset.length) {
        if (onFinishCallback) onFinishCallback();
        step = 0;
      }

      const sample = dataset[step];
      this.playNote(sample.note, genre, sample.isCorrect ? 0.85 : 0.4);
      if (onStepCallback) onStepCallback(sample, step);

      step++;
      // Usar exactamente la duración y ritmo que el usuario demostró
      this.autoTimeout = setTimeout(playNext, sample.duration || 450);
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