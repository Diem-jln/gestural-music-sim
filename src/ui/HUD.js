import { States } from '../core/GameState.js';

export class HUD {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.keyWidth = width / 8;

    // Botones del Menú Final con temporizador de permanencia aérea
    this.linkListenAI = { x: 0, y: 0, w: 230, h: 42, hover: false, dwell: 0 };
    this.linkChangeSong = { x: 0, y: 0, w: 230, h: 42, hover: false, dwell: 0 };
    this.linkRepeat = { x: 0, y: 0, w: 190, h: 42, hover: false, dwell: 0 };

    this.btnSandboxToggleAI = { x: 0, y: 0, w: 280, h: 38 };
    this.resize(width, height);
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.keyWidth = w / 8;

    const cx = w / 2;
    // Anclaje centrado de botones finales
    this.linkListenAI = { x: cx - 345, y: 125, w: 220, h: 42, hover: false, dwell: 0 };
    this.linkChangeSong = { x: cx - 110, y: 125, w: 220, h: 42, hover: false, dwell: 0 };
    this.linkRepeat = { x: cx + 125, y: 125, w: 180, h: 42, hover: false, dwell: 0 };

    this.btnSandboxToggleAI = { x: cx - 140, y: 75, w: 280, h: 36 };
  }

  // Verifica si el índice está tocando un botón en específico
  checkPointInRect(pt, r) {
    if (!pt) return false;
    return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;
  }

  draw(ctx, state, hand, audio) {
    ctx.save();

    if (state.current === States.LOBBY) {
      this.drawLobbyUI(ctx);
    } else if (state.current === States.CALIBRATION) {
      this.drawCalibrationUI(ctx, state, hand);
    } else if (state.current === States.TUTORIAL) {
      this.drawTutorialUI(ctx, state, hand, audio);
    } else if (state.current === States.TEACHING || state.current === States.AI_PLAYING) {
      this.drawTeachingUI(ctx, state, hand, audio);
    } else if (state.current === States.SONG_FINISHED) {
      this.drawSongFinishedUI(ctx, state, hand, audio);
    } else if (state.current === States.SANDBOX) {
      this.drawSandboxUI(ctx, state, hand, audio);
    }

    this.drawOscilloscope(ctx, audio);

    ctx.restore();
  }

  drawLobbyUI(ctx) {
    const cx = this.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('SELECCIONA EL TIMBRE DEL INSTRUMENTO', cx, this.height * 0.18);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText('Mantén tu dedo índice sobre la burbuja o haz clic directo', cx, this.height * 0.18 + 22);
  }

  drawCalibrationUI(ctx, state, hand) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const test = state.calibrationTests[state.calibrationStep];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(test.title, cx, cy - 150);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.fillText(test.desc, cx, cy - 122);

    ctx.strokeStyle = hand ? '#00f0ff' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 120, cy - 90, 240, 220);

    const bw = 240;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(cx - bw / 2, cy + 155, bw, 6);

    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - bw / 2, cy + 155, (bw * (state.calibHoldTimer || 0)) / 40, 6);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('SOSTÉN 1 SEGUNDO PARA CONFIRMAR', cx, cy + 178);
  }

  drawTutorialUI(ctx, state, hand, audio) {
    const cx = this.width / 2;
    const target = state.getCurrentTutorialNote();

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`TUTORIAL // TONO ${state.tutorialIndex + 1} DE ${state.tutorialNotes.length}: ${target.label} (${Math.round(target.freq)} Hz)`, cx, 75);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`GESTO: ${target.gesture}`, cx, 98);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(target.desc, cx, 118);

    const bw = 260;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(cx - bw / 2, 134, bw, 5);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - bw / 2, 134, (bw * (state.tutorialHoldProgress || 0)) / 100, 5);

    this.drawFingersDiagram(ctx, target.fingers, cx, this.height * 0.45);
    this.drawDiatonicFooter(ctx, audio, target.note);

    if (hand && hand.tagAnchor) {
      this.drawFloatingTag(ctx, hand, hand.detectedNote, audio.scale.find(n => n.name === hand.detectedNote)?.freq);
    }
  }

  drawFingersDiagram(ctx, requiredFingers, cx, cy) {
    const fingerNames = ['PUL', 'ÍND', 'MED', 'ANU', 'MEÑ'];
    const totalW = 270;
    const startX = cx - totalW / 2;

    ctx.save();
    requiredFingers.forEach((isUp, i) => {
      const fx = startX + i * 56;
      const fy = isUp ? cy - 30 : cy;

      ctx.fillStyle = isUp ? '#00f0ff' : 'rgba(100, 116, 139, 0.2)';
      ctx.strokeStyle = isUp ? '#ffffff' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(fx, fy, 38, isUp ? 68 : 42, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = isUp ? '#ffffff' : '#64748b';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(fingerNames[i], fx + 19, cy + 54);

      ctx.fillStyle = isUp ? '#ffd700' : '#475569';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isUp ? 'UP' : 'DOWN', fx + 19, cy + 68);
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

  drawSongScore(ctx, state, cx, startY) {
    const song = state.song;
    const step = state.songStep;
    const noteWidth = 48;
    const totalW = song.length * noteWidth;
    const startX = cx - totalW / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${state.songTitle} // NOTA ${step + 1} DE ${song.length}`, cx, startY - 18);

    song.forEach((item, i) => {
      const nx = startX + i * noteWidth;
      const isCurrent = i === step;
      const isDone = i < step;

      ctx.save();
      if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.fillRect(nx + 2, startY, noteWidth - 4, 40);
        ctx.strokeRect(nx + 2, startY, noteWidth - 4, 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(item.note, nx + noteWidth / 2, startY + 18);

        ctx.fillStyle = '#ffd700';
        ctx.font = '8px monospace';
        ctx.fillText(item.lyric, nx + noteWidth / 2, startY + 31);
      } else {
        ctx.fillStyle = isDone ? 'rgba(0, 240, 255, 0.1)' : 'rgba(15, 23, 42, 0.4)';
        ctx.strokeStyle = isDone ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.fillRect(nx + 2, startY, noteWidth - 4, 40);
        ctx.strokeRect(nx + 2, startY, noteWidth - 4, 40);

        ctx.fillStyle = isDone ? '#00f0ff' : '#64748b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(item.note, nx + noteWidth / 2, startY + 20);

        ctx.fillStyle = isDone ? '#94a3b8' : '#475569';
        ctx.font = '8px monospace';
        ctx.fillText(item.lyric, nx + noteWidth / 2, startY + 32);
      }
      ctx.restore();
    });
  }

  // --- FINAL CON REACCIÓN Y CARGA POR CONTACTO DEL ÍNDICE ---
  drawSongFinishedUI(ctx, state, hand, audio) {
    const cx = this.width / 2;

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('✓ MELODÍA COMPLETADA CON ÉXITO', cx, 68);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('Toca cualquier opción con el dedo índice para cargarla en el aire:', cx, 95);

    // Botón A: Escuchar Versión IA
    this.drawInteractiveAirButton(
      ctx,
      this.linkListenAI,
      '► ESCUCHAR VERSIÓN IA',
      '#00f0ff',
      'rgba(0, 240, 255, 0.15)'
    );

    // Botón B: Cambiar Melodía
    this.drawInteractiveAirButton(
      ctx,
      this.linkChangeSong,
      '♫ ESCOGER OTRA CANCIÓN',
      '#ffd700',
      'rgba(255, 215, 0, 0.15)'
    );

    // Botón C: Repetir
    this.drawInteractiveAirButton(
      ctx,
      this.linkRepeat,
      '↺ TOCAR DE NUEVO',
      '#ffffff',
      'rgba(255, 255, 255, 0.1)'
    );

    ctx.restore();

    this.drawDiatonicFooter(ctx, audio, null);
  }

  // Dibuja el botón con animación de carga perimetral/radial
  drawInteractiveAirButton(ctx, btn, label, color, bgCol) {
    ctx.save();
    const isHovered = btn.hover;

    // Fondo interactivo
    ctx.fillStyle = isHovered ? color + '33' : bgCol;
    ctx.strokeStyle = isHovered ? color : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isHovered ? 2 : 1;

    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    // Barra de progreso de carga en la base del botón
    if (btn.dwell > 0) {
      ctx.fillStyle = '#ffd700';
      const progressWidth = (btn.w * btn.dwell) / 45;
      ctx.fillRect(btn.x, btn.y + btn.h - 4, progressWidth, 4);

      // Anillo circular de carga en la esquina
      ctx.beginPath();
      ctx.arc(btn.x + btn.w - 18, btn.y + btn.h / 2, 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * btn.dwell) / 45);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Texto
    ctx.fillStyle = isHovered ? '#ffffff' : color;
    ctx.font = isHovered ? 'bold 12px monospace' : 'bold 11px monospace';
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + 26);

    ctx.restore();
  }

  drawSandboxUI(ctx, state, hand, audio) {
    const cx = this.width / 2;

    ctx.save();
    ctx.textAlign = 'center';

    ctx.fillStyle = '#ff5370';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('MODO SANDBOX // LABORATORIO DE IMPROVISACIÓN LIBRE', cx, 48);

    const b = this.btnSandboxToggleAI;
    ctx.fillStyle = state.sandboxIsAiResponding ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 83, 112, 0.18)';
    ctx.strokeStyle = state.sandboxIsAiResponding ? '#00f0ff' : '#ff5370';
    ctx.lineWidth = 1.8;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = state.sandboxIsAiResponding ? '#00f0ff' : '#ff5370';
    ctx.font = 'bold 11px monospace';
    if (state.sandboxIsAiResponding) {
      ctx.fillText('⚡ IA RESPONDIENDO CONTRAPUNTO...', b.x + b.w / 2, b.y + 23);
    } else {
      ctx.fillText(`IA ESCUCHANDO: ${state.sandboxTotalLearned} NOTAS APRENDIDAS`, b.x + b.w / 2, b.y + 23);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText('Toca libremente con tus manos. Cuando hagas una pausa, la IA te responderá mejorando tu melodía.', cx, 130);

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
        ctx.fillStyle = note.col + '22';
        ctx.fillRect(kx, 0, kw, this.height);
      } else if (isTarget) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.06)';
        ctx.fillRect(kx, 0, kw, this.height);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kx, 0);
      ctx.lineTo(kx, this.height);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = isActive ? note.col : (isTarget ? '#ffd700' : '#64748b');
      ctx.font = isActive ? 'bold 22px monospace' : 'bold 15px monospace';
      ctx.fillText(note.name, kx + kw / 2, this.height - 38);

      ctx.fillStyle = isActive ? '#ffffff' : '#475569';
      ctx.font = '9px monospace';
      ctx.fillText(note.desc, kx + kw / 2, this.height - 20);

      if (isTarget) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(kx + 4, this.height - 60, kw - 8, 48);
      }

      ctx.restore();
    });
  }

  drawFloatingTag(ctx, hand, noteName, freq) {
    const pt = hand.tagAnchor;
    if (!pt) return;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 11, 16, 0.9)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;

    ctx.fillRect(pt.x, pt.y - 14, 90, 44);
    ctx.strokeRect(pt.x, pt.y - 14, 90, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(noteName, pt.x + 12, pt.y - 8);

    ctx.fillStyle = '#00f0ff';
    ctx.font = '9px monospace';
    ctx.fillText(freq ? `${Math.round(freq)} Hz` : 'Diatónica', pt.x + 12, pt.y + 14);

    if (hand.landmarks && hand.landmarks[8]) {
      ctx.beginPath();
      ctx.moveTo(hand.landmarks[8].x, hand.landmarks[8].y);
      ctx.lineTo(pt.x, pt.y + 6);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawOscilloscope(ctx, audio) {
    const data = audio.getFrequencyData();
    if (!data || data.length === 0) return;

    const ox = this.width - 160;
    const oy = this.height - 90;
    const ow = 135;
    const oh = 35;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 11, 16, 0.8)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.fillRect(ox, oy, ow, oh);
    ctx.strokeRect(ox, oy, ow, oh);

    ctx.strokeStyle = '#00f0ff';
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
}