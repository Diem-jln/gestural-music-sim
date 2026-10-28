/**
 * GameState.js - Máquina de Estados del Simulador Gestual
 * Secuencia: Sincronización Biométrica (Hand Sync) -> Manifiesto Filosófico (Intro) -> Lobby
 */

export const States = {
  HAND_SYNC: 'HAND_SYNC',          // Fase 1: Calibrador biométrico visual (3 pruebas)
  INTRO_MANIFESTO: 'INTRO_MANIFESTO', // Fase 2: Contexto y filosofía de la experiencia
  LOBBY: 'LOBBY',                  // Fase 3: Selección de timbre acústico
  TUTORIAL: 'TUTORIAL',            // Fase 4: Escuela de digitación diatónica
  TEACHING: 'TEACHING',            // Fase 5: Interpretación y entrenamiento del modelo
  SONG_FINISHED: 'SONG_FINISHED',  // Menú final de inferencia y biblioteca
  SANDBOX: 'SANDBOX',              // Co-creación libre
  AI_PLAYING: 'AI_PLAYING'         // Inferencia en bucle del modelo
};

export class GameState {
  constructor() {
    // Iniciamos estrictamente con la Sincronización Biométrica de Manos
    this.current = States.HAND_SYNC;
    this.selectedGenre = 'FLUTE';
    this.isProMode = false;

    // --- FASE 1: CALIBRADOR Y SINCRONIZADOR BIOMÉTRICO (3 Tests Reales) ---
    this.syncStep = 0;
    this.syncTests = [
      { id: 'SPAN',  title: '01 // ENVERGADURA PALMAR', desc: 'Abre completamente la mano extendiendo los 5 dedos frente al sensor' },
      { id: 'FIST',  title: '02 // FLEXIÓN METACARPIANA', desc: 'Cierra todos los dedos formando un puño sólido y compacto' },
      { id: 'PINCH', title: '03 // PINZA DE PRECISIÓN',   desc: 'Junta firmemente las yemas del pulgar y el índice' }
    ];
    this.calibratedSpan = 0;
    this.calibratedPinchThreshold = 45;
    this.syncHoldTimer = 0;

    // --- FASE 2: MANIFIESTO Y CONTEXTO CONCEPTUAL ---
    this.introDwellTimer = 0;
    this.introPhilosophy = {
      tag: "WHY BOTHER? // CONTEXTO & MANIFIESTO",
      title: "RESONANCIA SOMÁTICA",
      subtitle: "La recuperación de la fricción física en la era de la síntesis artificial",
      body: [
        "En un mundo donde cualquier melodía puede ser delegada a una IA en microsegundos...",
        "¿Por qué molestarse en dominar la fricción y torpeza de un instrumento físico?",
        "Porque la música no es el archivo resultante: es el eco de la disciplina de tu propio cuerpo.",
        "Este entorno no admite teclado ni ratón: se articula exclusivamente con el espacio aéreo de tus manos.",
        "El modelo que habita aquí no inventará nada por ti: aprenderá y replicará tus propios tempos y errores."
      ]
    };

    // Tutorial didáctico (8 notas diatónicas)
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

    // Repertorio Estándar
    this.standardLibrary = [
      {
        id: 'ODE_TO_JOY',
        title: 'HIMNO A LA ALEGRÍA',
        author: 'L. V. Beethoven',
        tempo: 420,
        bpm: 120,
        notes: [
          { note: 'Mi',  lyric: 'Es-' }, { note: 'Mi',  lyric: 'cu-' }, { note: 'Fa',  lyric: 'cha' },
          { note: 'Sol', lyric: 'her-' }, { note: 'Sol', lyric: 'ma-' }, { note: 'Fa',  lyric: 'no' },
          { note: 'Mi',  lyric: 'el' }, { note: 'Re',  lyric: 'can-' }, { note: 'Do',  lyric: 'to' },
          { note: 'Do',  lyric: 'de a-' }, { note: 'Re',  lyric: 'le-' }, { note: 'Mi',  lyric: 'grí-' },
          { note: 'Mi',  lyric: 'a' }, { note: 'Re',  lyric: 'nue-' }, { note: 'Re',  lyric: 'vo' }
        ]
      },
      {
        id: 'TWINKLE',
        title: 'ESTRELLITA DÓNDE ESTÁS',
        author: 'Tradicional',
        tempo: 400,
        bpm: 100,
        notes: [
          { note: 'Do',  lyric: 'Es-' }, { note: 'Do',  lyric: 'tre-' }, { note: 'Sol', lyric: 'lli-' },
          { note: 'Sol', lyric: 'ta' }, { note: 'La',  lyric: 'dón-' }, { note: 'La',  lyric: 'de es-' },
          { note: 'Sol', lyric: 'tás' }, { note: 'Fa',  lyric: 'en' }, { note: 'Fa',  lyric: 'el' },
          { note: 'Mi',  lyric: 'cie-' }, { note: 'Mi',  lyric: 'lo' }, { note: 'Re',  lyric: 'bri-' },
          { note: 'Re',  lyric: 'lla-' }, { note: 'Do',  lyric: 'rás' }
        ]
      },
      {
        id: 'CAMPANERO',
        title: 'FRÈRE JACQUES / CAMPANERO',
        author: 'Tradicional Francés',
        tempo: 420,
        bpm: 110,
        notes: [
          { note: 'Do',  lyric: 'Mar-' }, { note: 'Re',  lyric: 'tin' }, { note: 'Mi',  lyric: 'di-' },
          { note: 'Do',  lyric: 'llo' }, { note: 'Do',  lyric: 'Mar-' }, { note: 'Re',  lyric: 'tin' },
          { note: 'Mi',  lyric: 'di-' }, { note: 'Do',  lyric: 'llo' }, { note: 'Mi',  lyric: 'dón-' },
          { note: 'Fa',  lyric: 'de es-' }, { note: 'Sol', lyric: 'tás' }
        ]
      }
    ];

    // Repertorio Avanzado / Virtuoso
    this.proLibrary = [
      {
        id: 'BELLA_CIAO',
        title: 'BELLA CIAO (CANTO PARTISANO)',
        author: 'Folk / Resistencia',
        tempo: 320,
        bpm: 138,
        notes: [
          { note: 'Mi',  lyric: 'U-' }, { note: 'La',  lyric: 'na' }, { note: 'Si',  lyric: 'mat-' },
          { note: 'Do',  lyric: 'ti-' }, { note: 'La',  lyric: 'na' }, { note: 'Mi',  lyric: 'mi' },
          { note: 'La',  lyric: 'so' }, { note: 'Si',  lyric: 'sve-' }, { note: 'Do',  lyric: 'glia-' },
          { note: 'La',  lyric: 'to' }, { note: 'Mi',  lyric: 'o' }, { note: 'La',  lyric: 'bel-' },
          { note: 'Si',  lyric: 'la' }, { note: 'Do',  lyric: 'ciao' }, { note: 'Si',  lyric: 'ciao' },
          { note: 'La',  lyric: 'ciao' }, { note: 'Do',  lyric: 'ciao' }, { note: 'Si',  lyric: 'ciao' },
          { note: 'La',  lyric: 'ciao' }, { note: 'Mi',  lyric: 'u-' }, { note: 'Mi',  lyric: 'na' },
          { note: 'Fa',  lyric: 'mat-' }, { note: 'Sol', lyric: 'ti-' }, { note: 'Fa',  lyric: 'na' },
          { note: 'Mi',  lyric: 'ho' }, { note: 'Fa',  lyric: 'tro-' }, { note: 'Mi',  lyric: 'va-' },
          { note: 'Re',  lyric: 'to' }, { note: 'Mi',  lyric: 'l\'in-' }, { note: 'Re',  lyric: 'va-' },
          { note: 'Do',  lyric: 'sor' }
        ]
      },
      {
        id: 'GODFATHER',
        title: 'THE GODFATHER (TEMA DE AMOR)',
        author: 'Nino Rota',
        tempo: 460,
        bpm: 76,
        notes: [
          { note: 'Do',  lyric: 'Par-' }, { note: 'Fa',  lyric: 'la' }, { note: 'Sol', lyric: 'più' },
          { note: 'Fa',  lyric: 'pia-' }, { note: 'Mi',  lyric: 'no' }, { note: 'Fa',  lyric: 'e' },
          { note: 'Sol', lyric: 'nes-' }, { note: 'Fa',  lyric: 'su-' }, { note: 'Mi',  lyric: 'no' },
          { note: 'Re',  lyric: 'sen-' }, { note: 'Do',  lyric: 'ti-' }, { note: 'Re',  lyric: 'rà' },
          { note: 'Fa',  lyric: 'el' }, { note: 'Mi',  lyric: 'nos-' }, { note: 'Re',  lyric: 'tro' },
          { note: 'Do',  lyric: 'a-' }, { note: 'Si',  lyric: 'mor' }
        ]
      },
      {
        id: 'FUR_ELISE',
        title: 'FÜR ELISE (PARA ELISA)',
        author: 'L. V. Beethoven',
        tempo: 280,
        bpm: 152,
        notes: [
          { note: 'Mi',  lyric: 'E' }, { note: 'Re',  lyric: 'D#' }, { note: 'Mi',  lyric: 'E' },
          { note: 'Re',  lyric: 'D#' }, { note: 'Mi',  lyric: 'E' }, { note: 'Si',  lyric: 'B' },
          { note: 'Re',  lyric: 'D' }, { note: 'Do',  lyric: 'C' }, { note: 'La',  lyric: 'A' },
          { note: 'Do',  lyric: 'C' }, { note: 'Mi',  lyric: 'E' }, { note: 'La',  lyric: 'A' },
          { note: 'Si',  lyric: 'B' }, { note: 'Mi',  lyric: 'E' }, { note: 'Sol', lyric: 'G#' },
          { note: 'Si',  lyric: 'B' }, { note: 'Do',  lyric: 'C' }
        ]
      },
      {
        id: 'EL_CONDOR_PASA',
        title: 'EL CÓNDOR PASA (PRELUDIO)',
        author: 'Daniel Alomía Robles',
        tempo: 430,
        bpm: 88,
        notes: [
          { note: 'Sol', lyric: 'Oh' }, { note: 'La',  lyric: 'majes-' }, { note: 'Do',  lyric: 'tuo-' },
          { note: 'Re',  lyric: 'so' }, { note: 'Mi',  lyric: 'Cón-' }, { note: 'Sol', lyric: 'dor' },
          { note: 'Mi',  lyric: 'de' }, { note: 'Re',  lyric: 'los' }, { note: 'Do',  lyric: 'An-' },
          { note: 'La',  lyric: 'des' }, { note: 'Sol', lyric: 'llé-' }, { note: 'La',  lyric: 'va-' },
          { note: 'Do',  lyric: 'me a' }, { note: 'Re',  lyric: 'mi' }, { note: 'Do',  lyric: 'ho-' },
          { note: 'Si',  lyric: 'gar' }
        ]
      }
    ];

    this.selectedSongIndex = 0;
    this.activeLibrary = this.standardLibrary;
    this.song = this.activeLibrary[0].notes;
    this.songTitle = this.activeLibrary[0].title;
    this.songTempo = this.activeLibrary[0].tempo;

    this.songStep = 0;
    this.noteHitTimer = 0;
    this.lastNoteTime = performance.now();

    this.aiDataset = [];
    this.loss = 1.0;
    this.isAiTrained = false;

    this.sandboxUserNotes = [];
    this.sandboxAiEnhancedMelody = [];
    this.sandboxIdleTimer = 0;
    this.sandboxIsAiResponding = false;
    this.sandboxTotalLearned = 0;

    this.fps = 60;
    this.lastFrameTime = performance.now();
  }

  toggleProMode() {
    this.isProMode = !this.isProMode;
    this.activeLibrary = this.isProMode ? this.proLibrary : this.standardLibrary;
    this.selectedSongIndex = 0;
    this.loadCurrentSong();
  }

  loadCurrentSong() {
    const item = this.activeLibrary[this.selectedSongIndex];
    this.song = item.notes;
    this.songTitle = item.title;
    this.songTempo = item.tempo;
    this.songStep = 0;
    this.noteHitTimer = 0;
    this.aiDataset = [];
    this.loss = 1.0;
    this.isAiTrained = false;
    this.lastNoteTime = performance.now();
  }

  setSong(index) {
    this.selectedSongIndex = index % this.activeLibrary.length;
    this.loadCurrentSong();
    this.transitionTo(States.TEACHING);
  }

  setGenre(genre) {
    this.selectedGenre = genre;
    this.transitionTo(States.TUTORIAL);
  }

  transitionTo(newState) {
    this.current = newState;
    if (newState === States.HAND_SYNC) {
      this.syncStep = 0;
      this.syncHoldTimer = 0;
    } else if (newState === States.INTRO_MANIFESTO) {
      this.introDwellTimer = 0;
    } else if (newState === States.LOBBY) {
      // Estado libre de selección
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
    const duration = Math.min(1000, Math.max(180, now - this.lastNoteTime));
    this.lastNoteTime = now;

    const isMatch = executedNote === targetNote;

    this.aiDataset.push({
      note: executedNote,
      target: targetNote,
      duration: duration,
      isCorrect: isMatch
    });

    if (isMatch) {
      this.loss = Math.max(0.04, this.loss * 0.86);
    } else {
      this.loss = Math.min(1.2, this.loss * 1.14);
    }

    this.songStep++;

    if (this.songStep >= this.song.length) {
      this.isAiTrained = true;
      this.transitionTo(States.SONG_FINISHED);
    }
  }

  recordSandboxImprovisation(note) {
    const now = performance.now();
    this.sandboxUserNotes.push({ note, timestamp: now });
    this.sandboxTotalLearned++;
    this.sandboxIdleTimer = 0;

    if (this.sandboxUserNotes.length > 8) {
      this.sandboxUserNotes.shift();
    }
  }

  generateAiResponsePhrase() {
    if (this.sandboxUserNotes.length < 3) return [];

    const diatonicScale = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', "Do'"];
    const phrase = [];

    this.sandboxUserNotes.forEach((sample, i) => {
      const idx = diatonicScale.indexOf(sample.note);
      let harmonyIdx = idx >= 0 ? (idx + (i % 2 === 0 ? 2 : -1) + diatonicScale.length) % diatonicScale.length : 0;
      phrase.push({
        note: diatonicScale[harmonyIdx],
        duration: 340
      });
    });

    phrase.push({ note: 'Do', duration: 580 });
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