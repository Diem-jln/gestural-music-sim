/**
 * main.js - Orquestador Maestro con Sincronización Inicial y Manifiesto
 */

import { GameState, States } from './core/GameState.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { HandTracker } from './vision/HandTracker.js';
import { BubbleMenu } from './physics/BubbleMenu.js';
import { LavaSystem } from './physics/LavaSystem.js';
import { ParticleSystem } from './physics/ParticleSystem.js';
import { HUD } from './ui/HUD.js';

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

const btnSoundInit = document.getElementById('btn-sound-init');
const btnProToggle = document.getElementById('btn-pro-toggle');
const btnSandbox = document.getElementById('btn-sandbox');
const btnReset = document.getElementById('btn-reset');
const hudAiPanel = document.getElementById('hud-ai-panel');

const aiStatusText = document.getElementById('ai-status-text');
const aiCoherenceBar = document.getElementById('ai-coherence-bar');
const aiLossMetric = document.getElementById('ai-loss-metric');
const aiSamplesCount = document.getElementById('ai-samples-count');
const aiTempoCoherence = document.getElementById('ai-tempo-coherence');
const hudStateChip = document.getElementById('hud-state-chip');

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

// Instancias centrales
const state = new GameState();
const audio = new AudioEngine();
const bubbles = new BubbleMenu(width, height);
const lava = new LavaSystem(width, height);
const particles = new ParticleSystem(width, height, 750);
const hud = new HUD(width, height);

let detectedHands = [];
let pointer = { x: -1000, y: -1000 };

// Cola de votación temporal anti-rebote
const HISTORY_SIZE = 5;
const noteHistory = [];
let stableNote = 'Do';

function getFilteredNote(rawNote) {
  noteHistory.push(rawNote);
  if (noteHistory.length > HISTORY_SIZE) {
    noteHistory.shift();
  }

  const votes = {};
  noteHistory.forEach((n) => {
    votes[n] = (votes[n] || 0) + 1;
  });

  let winner = rawNote;
  let maxVotes = 0;
  for (const [note, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winner = note;
    }
  }

  if (maxVotes >= 3) {
    stableNote = winner;
  }
  return stableNote;
}

const domButtons = [
  { el: btnSoundInit, dwell: 0, action: () => toggleSound() },
  { el: btnProToggle, dwell: 0, action: () => togglePro() },
  { el: btnSandbox,   dwell: 0, action: () => toggleSandbox() },
  { el: btnReset,     dwell: 0, action: () => triggerReset() }
];

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  bubbles.resize(width, height);
  lava.resize(width, height);
  particles.resize(width, height);
  hud.resize(width, height);
});

window.addEventListener('mousemove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

function toggleSound() {
  audio.init();
  btnSoundInit.innerText = 'Audio ✓';
  btnSoundInit.style.borderColor = 'var(--lava-gold)';
  btnSoundInit.style.color = 'var(--lava-gold)';
}

function togglePro() {
  audio.init();
  audio.stopPlayback();
  state.toggleProMode();
  audio.setBpm(state.songTempo);

  if (state.isProMode) {
    btnProToggle.innerText = 'Modo Estándar';
    btnProToggle.classList.add('active');
    hudStateChip.innerText = `VIRTUOSO // ${state.songTitle}`;
    hudStateChip.className = 'hud-status-chip chip-pro';
  } else {
    btnProToggle.innerText = 'Modo Avanzado';
    btnProToggle.classList.remove('active');
    hudStateChip.innerText = `ESTÁNDAR // ${state.songTitle}`;
    hudStateChip.className = 'hud-status-chip';
  }

  if (state.current !== States.HAND_SYNC && state.current !== States.INTRO_MANIFESTO && state.current !== States.LOBBY && state.current !== States.TUTORIAL) {
    state.transitionTo(States.TEACHING);
  }
}

function toggleSandbox() {
  audio.init();
  audio.stopPlayback();

  if (state.current === States.SANDBOX) {
    state.transitionTo(States.TEACHING);
    btnSandbox.innerText = 'Modo Sandbox';
    btnSandbox.classList.remove('active');
    hudStateChip.innerText = 'ENSEÑANZA // MODELO';
    hudStateChip.className = 'hud-status-chip';
  } else {
    state.transitionTo(States.SANDBOX);
    btnSandbox.innerText = 'Salir de Sandbox';
    btnSandbox.classList.add('active');
    btnReset.style.display = 'inline-block';
    hudStateChip.innerText = 'LABORATORIO // CO-CREACIÓN';
    hudStateChip.className = 'hud-status-chip chip-sandbox';
  }
}

function triggerReset() {
  audio.stopPlayback();
  state.transitionTo(States.LOBBY);
  btnReset.style.display = 'none';
  hudAiPanel.style.display = 'none';
  btnSandbox.innerText = 'Modo Sandbox';
  btnSandbox.classList.remove('active');
  hudStateChip.innerText = 'CÁMARA TÉRMICA // LOBBY';
  hudStateChip.className = 'hud-status-chip';
}

btnSoundInit.addEventListener('click', toggleSound);
btnProToggle.addEventListener('click', togglePro);
btnSandbox.addEventListener('click', toggleSandbox);
btnReset.addEventListener('click', triggerReset);

// Clic de ratón como respaldo
window.addEventListener('click', (e) => {
  audio.init();

  if (state.current === States.INTRO_MANIFESTO) {
    const pt = { x: e.clientX, y: e.clientY };
    if (hud.checkPointInRect(pt, hud.btnManifestoContinue)) {
      unlockManifestoToLobby();
    }
  } else if (state.current === States.LOBBY) {
    const selected = bubbles.checkClick(e.clientX, e.clientY);
    if (selected) handleGenreSelect(selected);
  } else if (state.current === States.SONG_FINISHED) {
    handleFinalSelection(e.clientX, e.clientY);
  }
});

function unlockManifestoToLobby() {
  particles.triggerShockwave(width / 2, height / 2, 35);
  state.transitionTo(States.LOBBY);
  hudStateChip.innerText = 'CÁMARA TÉRMICA // LOBBY';
  hudStateChip.className = 'hud-status-chip';
}

function handleGenreSelect(genreId) {
  state.setGenre(genreId);
  audio.setBpm(state.songTempo);
  btnReset.style.display = 'inline-block';
  hudStateChip.innerText = `TUTORIAL // ${genreId}`;
}

function handleFinalSelection(x, y) {
  const pt = { x, y };

  if (hud.checkPointInRect(pt, hud.linkListenAI)) {
    audio.stopPlayback();
    state.current = States.AI_PLAYING;
    hudStateChip.innerText = 'INFERENCIA IA // REPRODUCCIÓN';

    audio.playModelInference(
      state.aiDataset,
      state.selectedGenre,
      (sample, step) => {
        state.songStep = step % state.song.length;
        particles.triggerShockwave(width / 2, height / 2, sample.isCorrect ? 24 : 10);
      },
      () => {
        state.current = States.SONG_FINISHED;
        hudStateChip.innerText = 'EJECUCIÓN COMPLETADA';
      }
    );
  }

  if (hud.checkPointInRect(pt, hud.linkChangeSong)) {
    audio.stopPlayback();
    state.setSong(state.selectedSongIndex + 1);
    audio.setBpm(state.songTempo);
    hudStateChip.innerText = `PIEZA // ${state.songTitle}`;
  }

  if (hud.checkPointInRect(pt, hud.linkRepeat)) {
    audio.stopPlayback();
    state.transitionTo(States.TEACHING);
    hudStateChip.innerText = 'ENSEÑANZA // MODELO';
  }
}

function processDomAirTouch(point) {
  if (!point) return;

  domButtons.forEach(btn => {
    if (!btn.el || btn.el.style.display === 'none') return;
    const rect = btn.el.getBoundingClientRect();
    const isInside = point.x >= rect.left && point.x <= rect.right &&
                     point.y >= rect.top && point.y <= rect.bottom;

    if (isInside) {
      btn.dwell++;
      btn.el.classList.add('air-hovered');

      ctx.save();
      ctx.beginPath();
      ctx.arc(point.x, point.y, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * btn.dwell) / 40);
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      if (btn.dwell >= 40) {
        particles.triggerShockwave(rect.left + rect.width / 2, rect.top + rect.height / 2, 22);
        btn.action();
        btn.dwell = 0;
        btn.el.classList.remove('air-hovered');
      }
    } else {
      btn.dwell = Math.max(0, btn.dwell - 1.5);
      btn.el.classList.remove('air-hovered');
    }
  });
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
  ctx.globalCompositeOperation = 'screen';

  ctx.beginPath();
  HAND_CONNECTIONS.forEach(([start, end]) => {
    if (lm[start] && lm[end]) {
      ctx.moveTo(lm[start].x, lm[start].y);
      ctx.lineTo(lm[end].x, lm[end].y);
    }
  });

  const strokeCol = isPrimary 
    ? (hand.isFist ? 'rgba(255, 84, 0, 0.95)' : 'rgba(255, 170, 0, 0.75)') 
    : 'rgba(6, 214, 160, 0.75)';
  ctx.strokeStyle = strokeCol;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  lm.forEach(pt => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  if (hand.palmCenter) {
    ctx.beginPath();
    ctx.arc(hand.palmCenter.x, hand.palmCenter.y, 38, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      hand.palmCenter.x, hand.palmCenter.y, 2,
      hand.palmCenter.x, hand.palmCenter.y, 38
    );
    grad.addColorStop(0, isPrimary ? 'rgba(255, 84, 0, 0.45)' : 'rgba(6, 214, 160, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  if (lm[8]) {
    ctx.beginPath();
    ctx.arc(lm[8].x, lm[8].y, 7, 0, Math.PI * 2);
    ctx.fillStyle = isPrimary ? '#ffaa00' : '#06d6a0';
    ctx.fill();
  }

  ctx.restore();
}

function updateHUDDOM() {
  state.updateFPS();

  if (state.current === States.HAND_SYNC) {
    hudStateChip.innerText = 'FASE 1 // SINCRONIZACIÓN BIOMÉTRICA';
    hudAiPanel.style.display = 'none';
  } else if (state.current === States.INTRO_MANIFESTO) {
    hudStateChip.innerText = 'FASE 2 // CONTEXTO & MANIFIESTO';
    hudAiPanel.style.display = 'none';
  } else if (state.current === States.TEACHING || state.current === States.AI_PLAYING) {
    hudAiPanel.style.display = 'flex';
    const coherencePct = Math.round((1 - Math.min(1, state.loss)) * 100);
    aiCoherenceBar.style.width = `${coherencePct}%`;
    aiLossMetric.innerText = `LOSS: ${state.loss.toFixed(3)}`;
    aiStatusText.innerText = state.songTitle;
    aiSamplesCount.innerText = `DATASET: ${state.aiDataset.length} NOTAS`;
    aiTempoCoherence.innerText = `RITMO: ${coherencePct}% COHERENTE`;
  } else {
    hudAiPanel.style.display = 'none';
  }
}

function loop() {
  try {
    ctx.fillStyle = 'rgba(3, 3, 5, 0.35)';
    ctx.fillRect(0, 0, width, height);

    const primaryHand = detectedHands.length > 0 ? detectedHands[0] : null;
    const secondaryHand = detectedHands.length > 1 ? detectedHands[1] : null;

    let activeFilteredNote = 'Do';
    if (primaryHand) {
      activeFilteredNote = getFilteredNote(primaryHand.detectedNote);
    } else {
      noteHistory.length = 0;
    }

    // 1. Lava 3D de fondo
    lava.update(primaryHand, audio.soundEnergy);
    lava.draw(ctx);

    const activePoint = (primaryHand && primaryHand.landmarks) ? primaryHand.landmarks[8] : pointer;

    // 2. Air-Touch en los botones del DOM
    if (state.current !== States.HAND_SYNC && state.current !== States.INTRO_MANIFESTO) {
      processDomAirTouch(activePoint);
    }

    // --- MÁQUINA DE ESTADOS SECUENCIAL ---

    // FASE 1: CALIBRADOR Y SINCRONIZADOR BIOMÉTRICO
    if (state.current === States.HAND_SYNC) {
      if (primaryHand) {
        const test = state.syncTests[state.syncStep];
        let testPassed = false;

        if (test.id === 'SPAN') {
          // Requiere mano completamente extendida
          if (primaryHand.fingersCount >= 4 && primaryHand.hasThumb && primaryHand.spanDist > 130) {
            testPassed = true;
            state.calibratedSpan = primaryHand.spanDist;
          }
        } else if (test.id === 'FIST') {
          // Requiere puño cerrado
          if (primaryHand.isFist) testPassed = true;
        } else if (test.id === 'PINCH') {
          // Requiere pinza pulgar-índice
          if (primaryHand.isPinching) {
            testPassed = true;
            state.calibratedPinchThreshold = primaryHand.pinchDist + 8;
          }
        }

        if (testPassed) {
          state.syncHoldTimer++;
          if (state.syncHoldTimer >= 40) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 22);
            audio.playNote('Sol', 'BELL', 0.6); // Pulso sutil de confirmación
            state.syncStep++;
            state.syncHoldTimer = 0;

            // AL COMPLETAR LAS 3 PRUEBAS -> PASA A LA PANTALLA DE MANIFIESTO Y CONTEXTO
            if (state.syncStep >= state.syncTests.length) {
              particles.triggerShockwave(width / 2, height / 2, 30);
              state.transitionTo(States.INTRO_MANIFESTO);
            }
          }
        } else {
          state.syncHoldTimer = Math.max(0, state.syncHoldTimer - 1);
        }
      } else {
        state.syncHoldTimer = 0;
      }
    }
    // FASE 2: MANIFIESTO Y CONTEXTO CONCEPTUAL
    else if (state.current === States.INTRO_MANIFESTO) {
      const btn = hud.btnManifestoContinue;
      if (hud.checkPointInRect(activePoint, btn)) {
        btn.hover = true;
        btn.dwell++;

        if (primaryHand) {
          ctx.beginPath();
          ctx.arc(activePoint.x, activePoint.y, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * btn.dwell) / 40);
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        if (btn.dwell >= 40) {
          unlockManifestoToLobby();
          btn.dwell = 0;
          btn.hover = false;
        }
      } else {
        btn.hover = false;
        btn.dwell = Math.max(0, btn.dwell - 1.5);
      }
    }
    // FASE 3: LOBBY DE GÉNEROS
    else if (state.current === States.LOBBY) {
      bubbles.update(activePoint);
      bubbles.draw(ctx);

      if (primaryHand && primaryHand.landmarks) {
        bubbles.bubbles.forEach(b => {
          if (b.dwellTimer >= 45) {
            handleGenreSelect(b.id);
            b.dwellTimer = 0;
          }
        });
      }
    }
    // FASE 4: TUTORIAL DE DIGITACIÓN
    else if (state.current === States.TUTORIAL) {
      const target = state.getCurrentTutorialNote();

      if (primaryHand) {
        const dynamics = Math.min(1.0, Math.max(0.4, 1.2 - primaryHand.palmCenter.y / height));
        audio.playNote(activeFilteredNote, state.selectedGenre, dynamics, secondaryHand);

        if (activeFilteredNote === target.note) {
          state.tutorialHoldProgress = Math.min(100, state.tutorialHoldProgress + 2.5);
          if (state.tutorialHoldProgress >= 100) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 24);
            state.advanceTutorial();
            if (state.current === States.TEACHING) {
              hudStateChip.innerText = 'ENSEÑANZA // FLUJO';
            }
          }
        } else {
          state.tutorialHoldProgress = Math.max(0, state.tutorialHoldProgress - 1.2);
        }
      } else {
        audio.silence();
        state.tutorialHoldProgress = 0;
      }
    }
    // FASE 5: EJECUCIÓN MUSICAL Y ENTRENAMIENTO DE IA
    else if (state.current === States.TEACHING) {
      const currentTarget = state.getCurrentSongItem();

      if (primaryHand) {
        const dynamics = Math.min(1.0, Math.max(0.4, 1.2 - primaryHand.palmCenter.y / height));
        audio.playNote(activeFilteredNote, state.selectedGenre, dynamics, secondaryHand);

        if (activeFilteredNote === currentTarget.note) {
          state.noteHitTimer++;
          const hitThreshold = state.isProMode ? 13 : 18;
          if (state.noteHitTimer >= hitThreshold) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 24);
            state.recordTeachingSample(activeFilteredNote, currentTarget.note);
            state.noteHitTimer = 0;
          }
        } else {
          if (state.noteHitTimer > 0) state.noteHitTimer--;
        }
      } else {
        audio.silence();
        state.noteHitTimer = 0;
      }
    }
    // MENÚ FINAL
    else if (state.current === States.SONG_FINISHED) {
      const buttons = [hud.linkListenAI, hud.linkChangeSong, hud.linkRepeat];

      buttons.forEach(btn => {
        if (hud.checkPointInRect(activePoint, btn)) {
          btn.hover = true;
          btn.dwell++;

          if (primaryHand) {
            ctx.beginPath();
            ctx.arc(activePoint.x, activePoint.y, 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * btn.dwell) / 45);
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          if (btn.dwell >= 45) {
            particles.triggerShockwave(btn.x + btn.w / 2, btn.y + btn.h / 2, 26);
            handleFinalSelection(btn.x + 10, btn.y + 10);
            btn.dwell = 0;
            btn.hover = false;
          }
        } else {
          btn.hover = false;
          btn.dwell = Math.max(0, btn.dwell - 1.5);
        }
      });
    }
    // MODO SANDBOX LIBRE
    else if (state.current === States.SANDBOX) {
      if (primaryHand && !state.sandboxIsAiResponding) {
        const dynamics = Math.min(1.0, Math.max(0.4, 1.2 - primaryHand.palmCenter.y / height));
        audio.playNote(activeFilteredNote, state.selectedGenre, dynamics, secondaryHand);

        if (activeFilteredNote === stableNote) {
          state.noteHitTimer++;
          if (state.noteHitTimer === 12) {
            particles.triggerShockwave(primaryHand.palmCenter.x, primaryHand.palmCenter.y, 20);
            state.recordSandboxImprovisation(activeFilteredNote);
          }
        }
      } else if (!state.sandboxIsAiResponding) {
        audio.silence();
        state.noteHitTimer = 0;
        state.sandboxIdleTimer++;

        if (state.sandboxIdleTimer > 85 && state.sandboxUserNotes.length >= 3) {
          state.sandboxIsAiResponding = true;
          state.sandboxIdleTimer = 0;
          const aiPhrase = state.generateAiResponsePhrase();

          audio.playModelInference(
            aiPhrase,
            state.selectedGenre,
            () => {
              particles.triggerShockwave(width / 2, height / 2, 24);
            },
            () => {
              state.sandboxIsAiResponding = false;
              state.sandboxUserNotes = [];
            }
          );
        }
      }
    }

    particles.update(primaryHand, audio.soundEnergy);
    particles.draw(ctx, audio.soundEnergy);

    if (primaryHand) drawHand(ctx, primaryHand, true);
    if (secondaryHand) drawHand(ctx, secondaryHand, false);

    hud.draw(ctx, state, primaryHand, audio);
    updateHUDDOM();

  } catch (err) {
    console.error('Error en loop principal:', err);
  }

  requestAnimationFrame(loop);
}

loop();