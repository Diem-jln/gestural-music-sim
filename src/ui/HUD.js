/**
 * HUD.js - Interfaz Líquida, Escáner de Sincronización y Manifiesto
 */

import { States } from '../core/GameState.js';

export class HUD {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.keyWidth = width / 8;

    // Botón Aéreo en la Pantalla de Manifiesto
    this.btnManifestoContinue = { x: 0, y: 0, w: 290, h: 54, hover: false, dwell: 0 };

    // Botones del Menú Final
    this.linkListenAI = { x: 0, y: 0, w: 230, h: 46, hover: false, dwell: 0 };
    this.linkChangeSong = { x: 0, y: 0, w: 230, h: 46, hover: false, dwell: 0 };
    this.linkRepeat = { x: 0, y: 0, w: 190, h: 46, hover: false, dwell: 0 };

    this.btnSandboxToggleAI = { x: 0, y: 0, w: 320, h: 42 };
    this.resize(width, height);
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.keyWidth = w / 8;

    const cx = w / 2;
    const cy = h / 2;

    // Botón de desbloqueo en el Manifiesto centrado abajo
    this.btnManifestoContinue = { x: cx - 145, y: h * 0.82, w: 290, h: 52, hover: false, dwell: 0 };

    // Botones del final centrados
    this.linkListenAI = { x: cx - 345, y: 130, w: 220, h: 46, hover: false, dwell: 0 };
    this.linkChangeSong = { x: cx - 110, y: 130, w: 220, h: 46, hover: false, dwell: 0 };
    this.linkRepeat = { x: cx + 125, y: 130, w: 180, h: 46, hover: false, dwell: 0 };

    this.btnSandboxToggleAI = { x: cx - 160, y: 78, w: 320, h: 42 };
  }

  checkPointInRect(pt, r) {
    if (!pt) return false;
    return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;
  }

  draw(ctx, state, hand, audio) {
    ctx.save();

    if (state.current === States.HAND_SYNC) {
      this.drawHandSyncUI(ctx, state, hand);
    } else if (state.current === States.INTRO_MANIFESTO) {
      this.drawManifestoUI(ctx, state);
    } else if (state.current === States.LOBBY) {
      this.drawLobbyUI(ctx);
    } else if (state.current === States.TUTORIAL) {
      this.drawTutorialUI(ctx, state, hand, audio);
    } else if (state.current === States.TEACHING || state.current === States.AI_PLAYING) {
      this.drawTeachingUI(ctx, state, hand, audio);
      this.drawRhythmMetronome(ctx, state, audio);
    } else if (state.current === States.SONG_FINISHED) {
      this.drawSongFinishedUI(ctx, state, audio);
    } else if (state.current === States.SANDBOX) {
      this.drawSandboxUI(ctx, state, hand, audio);
    }

    if (state.current !== States.LOBBY && state.current !== States.HAND_SYNC && state.current !== States.INTRO_MANIFESTO) {
      this.drawOscilloscope(ctx, audio);
    }

    ctx.restore();
  }

  // --- FASE 1: ESCÁNER BIOMÉTRICO ATRACTIVO (SINCRONIZACIÓN DE MANOS) ---
  drawHandSyncUI(ctx, state, hand) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const currentTest = state.syncTests[state.syncStep];

    ctx.save();

    // Fondo oscurecido con viñeta cinemática
    ctx.fillStyle = 'rgba(3, 3, 5, 0.78)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';

    // Rótulo técnico superior
    ctx.fillStyle = '#ffaa00';
    ctx.font = '800 11px "Space Mono", monospace';
    ctx.fillText('SISTEMA ÓPTICO // INICIALIZACIÓN SOMÁTICA', cx, cy - 195);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px "Syne", sans-serif';
    ctx.fillText('SINCRONIZACIÓN DE MANOS', cx, cy - 155);

    ctx.fillStyle = '#ff5400';
    ctx.font = '700 14px "Space Mono", monospace';
    ctx.fillText(currentTest.title, cx, cy - 120);

    ctx.fillStyle = '#d1d5db';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(currentTest.desc, cx, cy - 95);

    // Marco del Escáner Holográfico
    const boxW = 320;
    const boxH = 260;
    const boxX = cx - boxW / 2;
    const boxY = cy - 65;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 24);
    ctx.fillStyle = hand ? 'rgba(255, 84, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = hand ? '#ffaa00' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = hand ? 2.5 : 1.5;
    ctx.fill();
    ctx.stroke();

    // Miras de esquina técnicas en el marco
    this.drawCornerReticles(ctx, boxX, boxY, boxW, boxH, hand ? '#ffbe0b' : 'rgba(255, 255, 255, 0.3)');

    // Estado en el interior del marco
    if (!hand) {
      ctx.fillStyle = '#ff5400';
      ctx.font = '800 12px "Space Mono", monospace';
      ctx.fillText('COLOCA TU MANO EN EL ENCUADRE', cx, boxY + boxH / 2 - 10);

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Buscando articulaciones MediaPipe...', cx, boxY + boxH / 2 + 15);
    } else {
      ctx.fillStyle = '#06d6a0';
      ctx.font = '800 12px "Space Mono", monospace';
      ctx.fillText(`✓ SENSOR ACOPLADO · ${hand.gestureName}`, cx, boxY + boxH / 2 - 10);

      ctx.fillStyle = '#ffd166';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`ENVERGADURA DETECTADA: ${Math.round(hand.spanDist)} px`, cx, boxY + boxH / 2 + 15);
    }
    ctx.restore();

    // Barra de Retención / Carga del Test Activo
    const barW = 300;
    const barY = boxY + boxH + 28;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cx - barW / 2, barY, barW, 6);

    ctx.fillStyle = '#ffaa00';
    const progressW = (barW * (state.syncHoldTimer || 0)) / 40;
    ctx.fillRect(cx - barW / 2, barY, progressW, 6);

    // Pasos completados (1, 2, 3)
    const stepLabels = ['ABRIR MANO', 'CERRAR PUÑO', 'PINZA'];
    stepLabels.forEach((lbl, i) => {
      const lx = cx - 110 + (i * 110);
      const isDone = i < state.syncStep;
      const isCur = i === state.syncStep;

      ctx.fillStyle = isCur ? '#ffaa00' : (isDone ? '#06d6a0' : '#4b5563');
      ctx.font = '800 10px "Space Mono", monospace';
      ctx.fillText(`${isDone ? '✓ ' : ''}${lbl}`, lx, barY + 28);
    });

    ctx.restore();
  }

  // --- FASE 2: MANIFIESTO Y CONTEXTO CONCEPTUAL ---
  drawManifestoUI(ctx, state) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const info = state.introPhilosophy;

    ctx.save();
    ctx.fillStyle = 'rgba(3, 3, 5, 0.82)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ff5400';
    ctx.font = '800 11px "Space Mono", monospace';
    ctx.fillText(info.tag, cx, cy - 210);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px "Syne", sans-serif';
    ctx.fillText(info.title, cx, cy - 165);

    ctx.fillStyle = '#ffd166';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(info.subtitle, cx, cy - 135);

    // Texto editorial
    ctx.fillStyle = '#d1d5db';
    ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
    info.body.forEach((line, idx) => {
      ctx.fillText(line, cx, cy - 85 + (idx * 28));
    });

    // Botón Aéreo de Entrada al Instrumento
    const btn = this.btnManifestoContinue;
    const isHovered = btn.hover;

    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 26);
    ctx.fillStyle = isHovered ? '#ff5400' : 'rgba(18, 19, 26, 0.85)';
    ctx.strokeStyle = isHovered ? '#ffaa00' : 'rgba(255, 170, 0, 0.4)';
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    ctx.fill();
    ctx.stroke();

    if (btn.dwell > 0) {
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y + btn.h - 4, (btn.w * btn.dwell) / 40, 4, 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fill();
    }

    ctx.fillStyle = isHovered ? '#ffffff' : '#ffaa00';
    ctx.font = '800 12px "Syne", sans-serif';
    ctx.fillText('ENTRAR AL INSTRUMENTO', btn.x + btn.w / 2, btn.y + 32);

    ctx.fillStyle = '#6b7280';
    ctx.font = '9px "Space Mono", monospace';
    ctx.fillText('COLOCA TU DEDO ÍNDICE SOBRE EL BOTÓN PARA INGRESAR', cx, btn.y + btn.h + 20);

    ctx.restore();
  }

  drawLobbyUI(ctx) {
    const cx = this.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffaa00';
    ctx.font = '800 18px "Syne", sans-serif';
    ctx.fillText('SELECCIONA EL TIMBRE DEL INSTRUMENTO', cx, this.height * 0.18);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Mantén tu dedo índice sobre la cápsula para resonar', cx, this.height * 0.18 + 22);
  }

  drawTutorialUI(ctx, state, hand, audio) {
    const cx = this.width / 2;
    const target = state.getCurrentTutorialNote();

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffaa00';
    ctx.font = '800 12px "Syne", sans-serif';
    ctx.fillText(`ESCUELA DE DIGITACIÓN // TONO ${state.tutorialIndex + 1} DE ${state.tutorialNotes.length}`, cx, 72);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Syne", sans-serif';
    ctx.fillText(`${target.label}  ·  ${Math.round(target.freq)} Hz`, cx, 104);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(target.desc, cx, 130);

    const bw = 280;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(cx - bw / 2, 146, bw, 4);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(cx - bw / 2, 146, (bw * (state.tutorialHoldProgress || 0)) / 100, 4);

    this.drawFingersDiagram(ctx, target.fingers, cx, this.height * 0.46);
    this.drawDiatonicFooter(ctx, audio, target.note);

    if (hand && hand.tagAnchor) {
      this.drawFloatingTag(ctx, hand, hand.detectedNote, audio.scale.find(n => n.name === hand.detectedNote)?.freq);
    }
  }

  drawFingersDiagram(ctx, requiredFingers, cx, cy) {
    const fingerNames = ['PUL', 'ÍND', 'MED', 'ANU', 'MEÑ'];
    const totalW = 280;
    const startX = cx - totalW / 2;

    ctx.save();
    requiredFingers.forEach((isUp, i) => {
      const fx = startX + i * 58;
      const fy = isUp ? cy - 35 : cy;

      ctx.fillStyle = isUp ? '#ff5400' : 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = isUp ? '#ffaa00' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(fx, fy, 42, isUp ? 75 : 44, 20);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = isUp ? '#ffffff' : '#6b7280';
      ctx.font = '800 9px "Syne", sans-serif';
      ctx.fillText(fingerNames[i], fx + 21, cy + 58);

      ctx.fillStyle = isUp ? '#ffaa00' : '#374151';
      ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(isUp ? 'UP' : '·', fx + 21, cy + 72);
    });
    ctx.restore();
  }

  drawTeachingUI(ctx, state, hand, audio) {
    const cx = this.width / 2;
    const isTeaching = state.current === States.TEACHING;

    this.drawSongScore(ctx, state, cx, 80);
    this.drawDiatonicFooter(ctx, audio, state.getCurrentSongItem().note);

    if (hand && isTeaching && hand.tagAnchor) {
      this.drawFloatingTag(ctx, hand, hand.detectedNote, audio.scale.find(n => n.name === hand.detectedNote)?.freq);
    }
  }

  drawRhythmMetronome(ctx, state, audio) {
    const cx = this.width / 2;
    const y = 142;
    const w = 340;
    const h = 4;

    const time = performance.now();
    const beatProgress = (time % audio.beatDuration) / audio.beatDuration;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(cx - w / 2, y, w, h);

    const cursorX = cx - w / 2 + (w * beatProgress);
    ctx.fillStyle = state.isProMode ? '#ff2a5f' : '#ffaa00';
    ctx.fillRect(cursorX - 10, y - 2, 20, h + 4);

    ctx.fillStyle = '#6b7280';
    ctx.font = '700 8px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PULSO CUANTIZADO // ${audio.currentBpm} BPM`, cx, y + 16);

    ctx.restore();
  }

  drawSongScore(ctx, state, cx, startY) {
    const song = state.song;
    const step = state.songStep;
    const noteWidth = 48;
    const maxVisibleNotes = Math.min(song.length, Math.floor((this.width - 120) / noteWidth));
    
    let startIndex = Math.max(0, step - Math.floor(maxVisibleNotes / 2));
    if (startIndex + maxVisibleNotes > song.length) {
      startIndex = Math.max(0, song.length - maxVisibleNotes);
    }
    const visibleNotes = song.slice(startIndex, startIndex + maxVisibleNotes);
    const totalW = visibleNotes.length * noteWidth;
    const startX = cx - totalW / 2;

    ctx.textAlign = 'center';

    ctx.fillStyle = state.isProMode ? '#ff2a5f' : '#ffaa00';
    ctx.font = '800 10px "Syne", sans-serif';
    const tag = state.isProMode ? '★ REPERTORIO VIRTUOSO' : '● MODO ESTÁNDAR';
    ctx.fillText(`${tag}  //  ${state.songTitle} (${step + 1}/${song.length})`, cx, startY - 22);

    visibleNotes.forEach((item, idx) => {
      const realIndex = startIndex + idx;
      const nx = startX + idx * noteWidth;
      const isCurrent = realIndex === step;
      const isDone = realIndex < step;

      ctx.save();
      if (isCurrent) {
        ctx.fillStyle = '#1c1e28';
        ctx.strokeStyle = state.isProMode ? '#ff2a5f' : '#ff5400';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(nx + 2, startY, noteWidth - 4, 46, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 16px "Syne", sans-serif';
        ctx.fillText(item.note, nx + noteWidth / 2, startY + 22);

        ctx.fillStyle = state.isProMode ? '#ff2a5f' : '#ffaa00';
        ctx.font = '800 9px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(item.lyric, nx + noteWidth / 2, startY + 36);
      } else {
        ctx.fillStyle = isDone ? '#14161f' : 'rgba(15, 16, 22, 0.45)';
        ctx.strokeStyle = isDone ? 'rgba(255, 84, 0, 0.4)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(nx + 2, startY, noteWidth - 4, 46, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDone ? '#ffaa00' : '#6b7280';
        ctx.font = '700 13px "Syne", sans-serif';
        ctx.fillText(item.note, nx + noteWidth / 2, startY + 22);

        ctx.fillStyle = isDone ? '#9ca3af' : '#4b5563';
        ctx.font = '8px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(item.lyric, nx + noteWidth / 2, startY + 36);
      }
      ctx.restore();
    });
  }

  drawSongFinishedUI(ctx, state, audio) {
    const cx = this.width / 2;

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = state.isProMode ? '#ff2a5f' : '#ffaa00';
    ctx.font = '800 12px "Syne", sans-serif';
    ctx.fillText('PIEZA INTERPRETADA CON ÉXITO', cx, 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px "Syne", sans-serif';
    ctx.fillText(`La IA ha aprendido tu versión de "${state.songTitle}"`, cx, 96);

    this.drawLavaAirButton(ctx, this.linkListenAI, 'ESCUCHAR INFERENCIA IA', '#ff5400');
    this.drawLavaAirButton(ctx, this.linkChangeSong, 'SIGUIENTE PIEZA', '#ffaa00');
    this.drawLavaAirButton(ctx, this.linkRepeat, 'REPETIR', '#f3f4f6');

    ctx.restore();
    this.drawDiatonicFooter(ctx, audio, null);
  }

  drawLavaAirButton(ctx, btn, label, accentCol) {
    ctx.save();
    const isHovered = btn.hover;

    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 24);
    ctx.fillStyle = isHovered ? '#222533' : 'rgba(18, 19, 26, 0.78)';
    ctx.strokeStyle = isHovered ? accentCol : 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = isHovered ? 2.5 : 1;
    ctx.fill();
    ctx.stroke();

    if (btn.dwell > 0) {
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y + btn.h - 4, (btn.w * btn.dwell) / 45, 4, 2);
      ctx.fillStyle = accentCol;
      ctx.fill();
    }

    ctx.fillStyle = isHovered ? '#ffffff' : accentCol;
    ctx.font = '800 11px "Syne", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + 28);

    ctx.restore();
  }

  drawSandboxUI(ctx, state, hand, audio) {
    const cx = this.width / 2;

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = '#06d6a0';
    ctx.font = '800 13px "Syne", sans-serif';
    ctx.fillText('LABORATORIO FLUIDO // CO-CREACIÓN LIBRE', cx, 48);

    const b = this.btnSandboxToggleAI;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 20);
    ctx.fillStyle = state.sandboxIsAiResponding ? 'rgba(6, 214, 160, 0.2)' : 'rgba(18, 19, 26, 0.7)';
    ctx.strokeStyle = state.sandboxIsAiResponding ? '#06d6a0' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = state.sandboxIsAiResponding ? '#06d6a0' : '#9ca3af';
    ctx.font = '800 11px "Syne", sans-serif';
    if (state.sandboxIsAiResponding) {
      ctx.fillText('⚡ IA RESONANDO EN CONTRAPUNTO...', b.x + b.w / 2, b.y + 26);
    } else {
      ctx.fillText(`ESCUCHANDO: ${state.sandboxTotalLearned} MOTIVOS ABSORBIDOS`, b.x + b.w / 2, b.y + 26);
    }

    ctx.restore();
    this.drawDiatonicFooter(ctx, audio, audio.activeNote);

    if (hand && hand.tagAnchor) {
      this.drawFloatingTag(ctx, hand, hand.detectedNote, audio.scale.find(n => n.name === hand.detectedNote)?.freq);
    }
  }

  drawDiatonicFooter(ctx, audio, targetNote) {
    const kw = this.keyWidth;
    const activeNote = audio.activeNote;

    audio.scale.forEach((note, i) => {
      const kx = i * kw;
      const isActive = activeNote === note.name;
      const isTarget = targetNote === note.name;

      ctx.save();

      if (isActive) {
        ctx.fillStyle = 'rgba(255, 84, 0, 0.18)';
        ctx.fillRect(kx, 0, kw, this.height);
      } else if (isTarget) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(kx, 0, kw, this.height);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kx, 0);
      ctx.lineTo(kx, this.height);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = isActive ? '#ffaa00' : (isTarget ? '#f3f4f6' : '#4b5563');
      ctx.font = isActive ? '800 24px "Syne", sans-serif' : '700 16px "Syne", sans-serif';
      ctx.fillText(note.name, kx + kw / 2, this.height - 44);

      ctx.fillStyle = isActive ? '#f3f4f6' : '#374151';
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(note.desc, kx + kw / 2, this.height - 24);

      if (isTarget) {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.strokeRect(kx + 8, this.height - 66, kw - 16, 52);
      }

      ctx.restore();
    });
  }

  drawFloatingTag(ctx, hand, noteName, freq) {
    const pt = hand.tagAnchor;
    if (!pt) return;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pt.x, pt.y - 12, 85, 44, 12);
    ctx.fillStyle = '#14151c';
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px "Syne", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(noteName, pt.x + 12, pt.y - 6);

    ctx.fillStyle = '#ffaa00';
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(freq ? `${Math.round(freq)} Hz` : 'Diatónica', pt.x + 12, pt.y + 16);

    if (hand.landmarks && hand.landmarks[8]) {
      ctx.beginPath();
      ctx.moveTo(hand.landmarks[8].x, hand.landmarks[8].y);
      ctx.lineTo(pt.x, pt.y + 8);
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawOscilloscope(ctx, audio) {
    const data = audio.getFrequencyData();
    if (!data || data.length === 0) return;

    const ox = this.width - 150;
    const oy = this.height - 85;
    const ow = 120;
    const oh = 32;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ox, oy, ow, oh, 10);
    ctx.fillStyle = 'rgba(18, 19, 26, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const sliceWidth = ow / data.length;
    let x = ox;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255.0;
      const y = oy + oh - (v * oh);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.restore();
  }

  drawCornerReticles(ctx, x, y, w, h, col) {
    const len = 16;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len); ctx.stroke();

    ctx.restore();
  }
}