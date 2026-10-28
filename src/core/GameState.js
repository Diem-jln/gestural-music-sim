export const States = {
  LOBBY: 'LOBBY',
  CALIBRATION: 'CALIBRATION',
  TUTORIAL: 'TUTORIAL',
  TEACHING: 'TEACHING',
  SONG_FINISHED: 'SONG_FINISHED',
  SANDBOX: 'SANDBOX',            // Modo libre interactivo
  AI_PLAYING: 'AI_PLAYING'
};

export class GameState {
  constructor() {
    this.current = States.LOBBY;
    this.selectedGenre = 'FLUTE';

    // Calibración biométrica
    this.calibrationStep = 0;
    this.calibrationTests = [
      { id: 'SPAN',  title: 'TEST 1/3: ENVERGADURA', desc: 'Abre completamente la mano extendiendo los 5 dedos' },
      { id: 'FIST',  title: 'TEST 2/3: FLEXIÓN',     desc: 'Cierra la mano formando un puño apretado' },
      { id: 'PINCH', title: 'TEST 3/3: PRECISIÓN',   desc: 'Junta firmemente las puntas del pulgar y el índice' }
    ];
    this.calibratedSpan = 0;
    this.calibratedPinchThreshold = 45;
    this.calibHoldTimer = 0;

    // Tutorial didáctico
    this.tutorialIndex = 0;
    this.tutorialNotes = [
      { note: 'Do',  label: 'DO',  freq: 261.63, gesture: 'PUÑO CERRADO',                     fingers: [0,0,0,0,0], desc: 'Cierra todos los dedos en un puño.' },
      { note: 'Re',  label: 'RE',  freq: 293.66, gesture: 'SOLO ÍNDICE',                      fingers: [0,1,0,0,0], desc: 'Extiende únicamente el dedo índice hacia arriba.' },
      { note: 'Mi',  label: 'MI',  freq: 329.63, gesture: 'ÍNDICE + MEDIO JUNTOS',            fingers: [0,1,1,0,0], desc: 'Extiende índice y medio juntos hacia arriba.' },
      { note: 'Fa',  label: 'FA',  freq: 349.23, gesture: 'ÍNDICE + MEDIO + ANULAR',          fingers: [0,1,1,1,0], desc: 'Extiende 3 dedos: índice, medio y anular.' },
      { note: 'Sol', label: 'SOL', freq: 392.00, gesture: 'MANO COMPLETA ABIERTA',            fingers: [1,1,1,1,1], desc: 'Abre los 5 dedos de par en par.' },
      { note: 'La',  label: 'LA',  freq: 440.00, gesture: 'PELLIZCO (PULGAR + ÍNDICE)',       fingers: [1,1,0,0,0], desc: 'Junta las yemas de pulgar e índice.' },
      { note: 'Si',  label: 'SI',  freq: 493.88, gesture: 'SEÑAL DE PAZ / V (SEPARADOS)',     fingers: [0,1,1,0,0], desc: 'Separa el índice y medio en forma de V.' },
      { note: "Do'", label: "DO'", freq: 523.25, gesture: 'MANO EN ZONA SUPERIOR',            fingers: [1,1,1,1,1], desc: 'Abre la mano y elévala hacia la mitad superior.' }
    ];
    this.tutorialHoldProgress = 0;

    // Biblioteca de canciones
    this.songLibrary = [
      {
        id: 'ODE_TO_JOY',
        title: 'HIMNO A LA ALEGRÍA',
        notes: [
          { note: 'Mi',  lyric: 'Es-' },
          { note: 'Mi',  lyric: 'cu-' },
          { note: 'Fa',  lyric: 'cha' },
          { note: 'Sol', lyric: 'her-' },
          { note: 'Sol', lyric: 'ma-' },
          { note: 'Fa',  lyric: 'no' },
          { note: 'Mi',  lyric: 'el' },
          { note: 'Re',  lyric: 'can-' },
          { note: 'Do',  lyric: 'to' },
          { note: 'Do',  lyric: 'de a-' },
          { note: 'Re',  lyric: 'le-' },
          { note: 'Mi',  lyric: 'grí-' },
          { note: 'Mi',  lyric: 'a' },
          { note: 'Re',  lyric: 'nue-' },
          { note: 'Re',  lyric: 'vo' }
        ]
      },
      {
        id: 'TWINKLE',
        title: 'ESTRELLITA DÓNDE ESTÁS',
        notes: [
          { note: 'Do',  lyric: 'Es-' },
          { note: 'Do',  lyric: 'tre-' },
          { note: 'Sol', lyric: 'lli-' },
          { note: 'Sol', lyric: 'ta' },
          { note: 'La',  lyric: 'dón-' },
          { note: 'La',  lyric: 'de es-' },
          { note: 'Sol', lyric: 'tás' },
          { note: 'Fa',  lyric: 'en' },
          { note: 'Fa',  lyric: 'el' },
          { note: 'Mi',  lyric: 'cie-' },
          { note: 'Mi',  lyric: 'lo' },
          { note: 'Re',  lyric: 'bri-' },
          { note: 'Re',  lyric: 'lla-' },
          { note: 'Do',  lyric: 'rás' }
        ]
      },
      {
        id: 'CAMPANERO',
        title: 'FRÈRE JACQUES / CAMPANERO',
        notes: [
          { note: 'Do',  lyric: 'Mar-' },
          { note: 'Re',  lyric: 'tin' },
          { note: 'Mi',  lyric: 'di-' },
          { note: 'Do',  lyric: 'llo' },
          { note: 'Do',  lyric: 'Mar-' },
          { note: 'Re',  lyric: 'tin' },
          { note: 'Mi',  lyric: 'di-' },
          { note: 'Do',  lyric: 'llo' },
          { note: 'Mi',  lyric: 'dón-' },
          { note: 'Fa',  lyric: 'de es-' },
          { note: 'Sol', lyric: 'tás' }
        ]
      }
    ];

    this.selectedSongIndex = 0;
    this.song = this.songLibrary[0].notes;
    this.songTitle = this.songLibrary[0].title;
    this.songStep = 0;
    this.noteHitTimer = 0;
    this.lastNoteTime = performance.now();

    // Memoria de la canción guiada
    this.aiDataset = [];
    this.loss = 1.0;
    this.isAiTrained = false;

    // --- MODO SANDBOX & APRENDIZAJE DE IMPROVISACIÓN ---
    this.sandboxLearningActive = true;
    this.sandboxUserNotes = [];      // Registro cronológico de lo que improvisa el usuario
    this.sandboxAiEnhancedMelody = []; // Melodía embellecida generada por la IA
    this.sandboxIdleTimer = 0;       // Detecta cuando el usuario hace pausa para que la IA responda
    this.sandboxIsAiResponding = false;
    this.sandboxTotalLearned = 0;

    this.fps = 60;
    this.lastFrameTime = performance.now();
  }

  setSong(index) {
    this.selectedSongIndex = index % this.songLibrary.length;
    this.song = this.songLibrary[this.selectedSongIndex].notes;
    this.songTitle = this.songLibrary[this.selectedSongIndex].title;
    this.songStep = 0;
    this.noteHitTimer = 0;
    this.aiDataset = [];
    this.loss = 1.0;
    this.isAiTrained = false;
    this.transitionTo(States.TEACHING);
  }

  setGenre(genre) {
    this.selectedGenre = genre;
    this.transitionTo(States.CALIBRATION);
  }

  transitionTo(newState) {
    this.current = newState;
    if (newState === States.CALIBRATION) {
      this.calibrationStep = 0;
      this.calibHoldTimer = 0;
    } else if (newState === States.TUTORIAL) {
      this.tutorialIndex = 0;
      this.tutorialHoldProgress = 0;
    } else if (newState === States.TEACHING) {
      this.songStep = 0;
      this.noteHitTimer = 0;
      this.aiDataset = [];
      this.lastNoteTime = performance.now();
    } else if (newState === States.SANDBOX) {
      this.sandboxUserNotes = [];
      this.sandboxAiEnhancedMelody = [];
      this.sandboxIdleTimer = 0;
      this.sandboxIsAiResponding = false;
    }
  }

  getCurrentTutorialNote() {
    return this.tutorialNotes[this.tutorialIndex] || this.tutorialNotes[0];
  }

  advanceTutorial() {
    this.tutorialIndex++;
    this.tutorialHoldProgress = 0;
    if (this.tutorialIndex >= this.tutorialNotes.length) {
      this.transitionTo(States.TEACHING);
    }
  }

  getCurrentSongItem() {
    return this.song[this.songStep] || this.song[0];
  }

  recordTeachingSample(executedNote, targetNote) {
    const now = performance.now();
    const duration = Math.min(1000, Math.max(220, now - this.lastNoteTime));
    this.lastNoteTime = now;

    const isMatch = executedNote === targetNote;

    this.aiDataset.push({
      note: executedNote,
      target: targetNote,
      duration: duration,
      isCorrect: isMatch
    });

    if (isMatch) {
      this.loss = Math.max(0.05, this.loss * 0.85);
    } else {
      this.loss = Math.min(1.2, this.loss * 1.12);
    }

    this.songStep++;

    if (this.songStep >= this.song.length) {
      this.isAiTrained = true;
      this.transitionTo(States.SONG_FINISHED);
    }
  }

  // --- MOTOR COGNITIVO DEL SANDBOX ---
  // Registra cada nota improvisada y entrena la red armónica en vivo
  recordSandboxImprovisation(note) {
    const now = performance.now();
    this.sandboxUserNotes.push({
      note,
      timestamp: now
    });

    this.sandboxTotalLearned++;
    this.sandboxIdleTimer = 0;

    // Mantener ventana móvil de las últimas 8 notas tocadas
    if (this.sandboxUserNotes.length > 8) {
      this.sandboxUserNotes.shift();
    }
  }

  // La IA toma la frase del usuario y crea una variación mejorada (armonizada y rítmica)
  generateAiResponsePhrase() {
    if (this.sandboxUserNotes.length < 3) return [];

    const diatonicScale = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', "Do'"];
    const phrase = [];

    // Algoritmo armónico: toma los motivos del usuario y les aplica contrapunto (terceras/quintas)
    this.sandboxUserNotes.forEach((sample, i) => {
      const idx = diatonicScale.indexOf(sample.note);
      // Embellecimiento melódico: arpegia a una tercera mayor o resuelve a la tónica
      let harmonyIdx = idx >= 0 ? (idx + (i % 2 === 0 ? 2 : -1) + diatonicScale.length) % diatonicScale.length : 0;
      
      phrase.push({
        note: diatonicScale[harmonyIdx],
        duration: 360
      });
    });

    // Remate conclusivo de frase
    phrase.push({ note: 'Do', duration: 600 });
    this.sandboxAiEnhancedMelody = phrase;
    return phrase;
  }

  updateFPS() {
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    if (delta > 0) this.fps = Math.round(1 / delta);
  }
}