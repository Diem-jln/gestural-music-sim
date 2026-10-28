import { GameState, States } from './core/GameState.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { HandTracker } from './vision/HandTracker.js';
import { BubbleMenu } from './physics/BubbleMenu.js';
import { ParticleSystem } from './physics/ParticleSystem.js';
import { HUD } from './ui/HUD.js';

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

const btnSoundInit = document.getElementById('btn-sound-init');
const btnSandbox = document.getElementById('btn-sandbox');
const btnReset = document.getElementById('btn-reset');
const hudAiPanel = document.getElementById('hud-ai-panel');

const aiStatusText = document.getElementById('ai-status-text');
const aiCoherenceBar = document.getElementById('ai-coherence-bar');
const aiLossMetric = document.getElementById('ai-loss-metric');
const hudStateChip = document.getElementById('hud-state-chip');

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

// Instancias
const state = new GameState();
const audio = new AudioEngine();
const bubbles = new BubbleMenu(width, height);
const particles = new ParticleSystem(width, height, 1800);
const hud = new HUD(width, height);

let detectedHands = [];
let pointer = { x: -1000, y: -1000 };

// Estabilizador gestual
let stableNote = 'Do';
let candidateNote = 'Do';
let candidateFrames = 0;
const DEBOUNCE_FRAMES = 3;

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  bubbles.resize(width, height);
  particles.resize(width, height);
  hud.resize(width, height);
});

window.addEventListener('mousemove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

btnSoundInit.addEventListener('click', () => {
  audio.init();
  btnSoundInit.innerText = 'Audio ✓';
  btnSoundInit.style.borderColor = '#64ffda';
  btnSoundInit.style.color = '#64ffda';
});

btnSandbox.addEventListener('click', () => {
  audio.init();
  audio.stopPlayback();

  if (state.current === States.SANDBOX) {
    state.transitionTo(States.TEACHING);
    btnSandbox.innerText = 'Modo Sandbox';
    btnSandbox.classList.remove('active');
    hudStateChip.innerText = 'ENSEÑANZA IA';
    hudStateChip.className = 'hud-status-chip chip-active';
  } else {
    state.transitionTo(States.SANDBOX);
    btnSandbox.innerText = 'Salir de Sandbox';
    btnSandbox.classList.add('active');
    btnReset.style.display = 'inline-block';
    hudStateChip.innerText = 'MODO SANDBOX LIBRE';
    hudStateChip.className = 'hud-status-chip chip-sandbox';
  }
});

btnReset.addEventListener('click', () => {
  audio.stopPlayback();
  state.transitionTo(States.LOBBY);
  btnReset.style.display = 'none';
  hudAiPanel.style.display = 'none';
  btnSandbox.innerText = 'Modo Sandbox';
  btnSandbox.classList.remove('active');
  hudStateChip.innerText = 'LOBBY';
  hudStateChip.className = 'hud-status-chip chip-active';
});

// Respaldo por clic de ratón
window.addEventListener('click', (e) => {
  audio.init();

  if (state.current === States.LOBBY) {
    const selected = bubbles.checkClick(e.clientX, e.clientY);
    if (selected) handleGenreSelect(selected);
  } else if (state.current === States.SONG_FINISHED) {
    handleFinalSelection(e.clientX, e.clientY);
  }
});

function handleGenreSelect(genreId) {
  state.setGenre(genreId);
  btnReset.style.display = 'inline-block';
  hudStateChip.innerText = `CALIBRACIÓN // ${genreId}`;
}

// Ejecuta la acción elegida por clic o permanencia de la mano
function handleFinalSelection(x, y) {
  const pt = { x, y };

  // 1. Escuchar versión IA
  if (hud.checkPointInRect(pt, hud.linkListenAI)) {
    audio.stopPlayback();
    state.current = States.AI_PLAYING;
    hudStateChip.innerText = 'IA TOCANDO TU VERSIÓN';

    audio.playModelInference(
      state.aiDataset,
      state.selectedGenre,
      (sample, step) => {
        state.songStep = step % state.song.length;
        particles.triggerShockwave(width / 2, height / 2, sample.isCorrect ? 25 : 12);
      },
      () => {
        state.current = States.SONG_FINISHED;
        hudStateChip.innerText = 'MELODÍA COMPLETADA';
      }
    );
  }

  // 2. Escoger otra canción
  if (hud.checkPointInRect(pt, hud.linkChangeSong)) {
    audio.stopPlayback();
    state.setSong(state.selectedSongIndex + 1);
    hudStateChip.innerText = `NUEVA: ${state.songTitle}`;
  }

  // 3. Tocar de nuevo
  if (hud.checkPointInRect(pt, hud.linkRepeat)) {
    audio.stopPlayback();
    state.transitionTo(States.TEACHING);
    hudStateChip.innerText = 'ENSEÑANZA IA';
  }
}

const tracker = new HandTracker(video, (hands) => {
  detectedHands = hands;
});
tracker.init();

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

function drawHand(ctx, hand, isPrimary = true) {
  if (!hand || !hand.landmarks) return;
  const lm = hand.landmarks;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  ctx.beginPath();
  HAND_CONNECTIONS.forEach(([start, end]) => {
    if (lm[start] && lm[end]) {
      ctx.moveTo(lm[start].x, lm[start].y);
      ctx.lineTo(lm[end].x, lm[end].y);
    }
  });

  ctx.strokeStyle = isPrimary 
    ? (hand.isFist ? 'rgba(255, 83, 112, 0.85)' : 'rgba(0, 240, 255, 0.75)') 
    : 'rgba(255, 215, 0, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  lm.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  if (hand.palmCenter) {
    ctx.beginPath();
    ctx.arc(hand.palmCenter.x, hand.palmCenter.y, 40, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      hand.palmCenter.x, hand.palmCenter.y, 2,
      hand.palmCenter.x, hand.palmCenter.y, 40
    );
    grad.addColorStop(0, isPrimary ? 'rgba(0, 240, 255, 0.35)' : 'rgba(255, 215, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Puntero visible en el índice
  if (lm[8]) {
    ctx.beginPath();
    ctx.arc(lm[8].x, lm[8].y, 9, 0, Math.PI * 2);
    ctx.fillStyle = isPrimary ? '#00f0ff' : '#ffd700';
    ctx.fill();
  }

  ctx.restore();
}

function updateHUDDOM() {
  state.updateFPS();

  if (state.current === States.TEACHING || state.current === States.AI_PLAYING) {
    hudAiPanel.style.display = 'flex';
    const coherencePct = Math.round((1 - Math.min(1, state.loss)) * 100);
    aiCoherenceBar.style.width = `${coherencePct}%`;
    aiLossMetric.innerText = `${coherencePct}%`;
    aiStatusText.innerText = state.songTitle;
  } else {
    hudAiPanel.style.display = 'none';
  }
}

function loop() {
  try {
    ctx.fillStyle = 'rgba(3, 4, 6, 0.35)';
    ctx.fillRect(0, 0, width, height);

    const primaryHand = detectedHands.length > 0 ? detectedHands[0] : null;
    const secondaryHand = detectedHands.length > 1 ? detectedHands[1] : null;

    if (primaryHand) {
      if (primaryHand.detectedNote === candidateNote) {
        candidateFrames++;
        if (candidateFrames >= DEBOUNCE_FRAMES) stableNote = candidateNote;
      } else {
        candidateNote = primaryHand.detectedNote;
        candidateFrames = 0;
      }
    }

    // --- MÁQUINA DE ESTADOS ---
    if (state.current === States.LOBBY) {
      const activePointer = (primaryHand && primaryHand.landmarks) ? primaryHand.landmarks[8] : pointer;
      bubbles.update(activePointer);
      bubbles.draw(ctx);

      if (primaryHand && primaryHand.landmarks) {
        bubbles.bubbles.forEach(b => {
          if (b.dwellTimer >= 45) {
            handleGenreSelect(b.id);
            b.dwellTimer = 0;
          }
        });
      }
    } else if (state.current === States.CALIBRATION) {
      if (primaryHand) {
        const test = state.calibrationTests[state.calibrationStep];
        let testPassed = false;

        if (test.id === 'SPAN') {
          if (primaryHand.fingersCount >= 4 && primaryHand.hasThumb && primaryHand.spanDist > 130) {
            testPassed = true;
            state.calibratedSpan = primaryHand.spanDist;
          }
        } else if (test.id === 'FIST') {
          if (primaryHand.isFist) testPassed = true;
        } else if (test.id === 'PINCH') {
          if (primaryHand.isPinching) {
            testPassed = true;
            state.calibratedPinchThreshold = primaryHand.pinchDist + 8;
          }
        }

        if (testPassed) {
          state.calibHoldTimer++;
          if (state.calibHoldTimer >= 40) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 24);
            state.calibrationStep++;
            state.calibHoldTimer = 0;
            if (state.calibrationStep >= state.calibrationTests.length) {
              state.transitionTo(States.TUTORIAL);
              hudStateChip.innerText = 'TUTORIAL';
            }
          }
        } else {
          state.calibHoldTimer = Math.max(0, state.calibHoldTimer - 1);
        }
      } else {
        state.calibHoldTimer = 0;
      }
    } else if (state.current === States.TUTORIAL) {
      const target = state.getCurrentTutorialNote();

      if (primaryHand) {
        const dynamics = Math.min(1.0, Math.max(0.4, 1.2 - primaryHand.palmCenter.y / height));
        audio.playNote(stableNote, state.selectedGenre, dynamics, secondaryHand);

        if (stableNote === target.note) {
          state.tutorialHoldProgress = Math.min(100, state.tutorialHoldProgress + 2.5);
          if (state.tutorialHoldProgress >= 100) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 25);
            state.advanceTutorial();
            if (state.current === States.TEACHING) {
              hudStateChip.innerText = 'ENSEÑANZA IA';
            }
          }
        } else {
          state.tutorialHoldProgress = Math.max(0, state.tutorialHoldProgress - 1.2);
        }
      } else {
        audio.silence();
        state.tutorialHoldProgress = 0;
      }
    } else if (state.current === States.TEACHING) {
      const currentTarget = state.getCurrentSongItem();

      if (primaryHand) {
        const dynamics = Math.min(1.0, Math.max(0.4, 1.2 - primaryHand.palmCenter.y / height));
        audio.playNote(stableNote, state.selectedGenre, dynamics, secondaryHand);

        if (stableNote === currentTarget.note) {
          state.noteHitTimer++;
          if (state.noteHitTimer >= 18) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 24);
            state.recordTeachingSample(stableNote, currentTarget.note);
            state.noteHitTimer = 0;
          }
        } else {
          if (state.noteHitTimer > 0) state.noteHitTimer--;
        }
      } else {
        audio.silence();
        state.noteHitTimer = 0;
      }
    } else if (state.current === States.SONG_FINISHED) {
      // --- INTERACCIÓN GESTUAL CON LOS BOTONES FINALES ---
      const activePoint = (primaryHand && primaryHand.landmarks) ? primaryHand.landmarks[8] : pointer;
      const buttons = [hud.linkListenAI, hud.linkChangeSong, hud.linkRepeat];

      buttons.forEach(btn => {
        if (hud.checkPointInRect(activePoint, btn)) {
          btn.hover = true;
          btn.dwell++;

          // Feedback visual de carga en la punta del índice
          if (primaryHand) {
            ctx.beginPath();
            ctx.arc(activePoint.x, activePoint.y, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * btn.dwell) / 45);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Al completarse el segundo de contacto continuo
          if (btn.dwell >= 45) {
            particles.triggerShockwave(btn.x + btn.w / 2, btn.y + btn.h / 2, 28);
            handleFinalSelection(btn.x + 10, btn.y + 10);
            btn.dwell = 0;
            btn.hover = false;
          }
        } else {
          btn.hover = false;
          btn.dwell = Math.max(0, btn.dwell - 1.5);
        }
      });
    } else if (state.current === States.SANDBOX) {
      if (primaryHand && !state.sandboxIsAiResponding) {
        const dynamics = Math.min(1.0, Math.max(0.4, 1.2 - primaryHand.palmCenter.y / height));
        audio.playNote(stableNote, state.selectedGenre, dynamics, secondaryHand);

        if (primaryHand.detectedNote === stableNote) {
          state.noteHitTimer++;
          if (state.noteHitTimer === 12) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 22);
            state.recordSandboxImprovisation(stableNote);
          }
        }
      } else if (!state.sandboxIsAiResponding) {
        audio.silence();
        state.noteHitTimer = 0;
        state.sandboxIdleTimer++;

        if (state.sandboxIdleTimer > 90 && state.sandboxUserNotes.length >= 3) {
          state.sandboxIsAiResponding = true;
          state.sandboxIdleTimer = 0;
          const aiPhrase = state.generateAiResponsePhrase();

          audio.playModelInference(
            aiPhrase,
            state.selectedGenre,
            () => {
              particles.triggerShockwave(width / 2, height / 2, 26);
            },
            () => {
              state.sandboxIsAiResponding = false;
              state.sandboxUserNotes = [];
            }
          );
        }
      }
    }

    particles.update(primaryHand, audio.activeNote, audio.soundEnergy);
    particles.draw(ctx, audio.soundEnergy);

    if (primaryHand) drawHand(ctx, primaryHand, true);
    if (secondaryHand) drawHand(ctx, secondaryHand, false);

    hud.draw(ctx, state, primaryHand, audio);
    updateHUDDOM();

  } catch (err) {
    console.error('Error en loop:', err);
  }

  requestAnimationFrame(loop);
}

loop();