export class BubbleMenu {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.bubbles = [];
    this.initBubbles();
  }

  initBubbles() {
    // 6 Géneros con personalidades acústicas y cromáticas contrastadas
    const genres = [
      { id: 'FLUTE',     label: 'Flauta Andina', sub: 'Modelado Viento & Aire', col: '#00f0ff' },
      { id: 'SYNTH',     label: 'Cyber Synth',   sub: 'Lead Sawtooth & Sub 808', col: '#ff5370' },
      { id: 'BELL',      label: 'Campana Zen',   sub: 'Inarmónicos & Decay',     col: '#ffd700' },
      { id: 'BOOMBAP',   label: 'Boom Bap 90s',  sub: 'Bajo Analógico Saturado', col: '#ff944d' },
      { id: 'ORGAN',     label: 'Órgano Sacro',  sub: 'Armónicos Multi-tubo',    col: '#9933ff' },
      { id: 'CHIPTUNE',  label: 'Chiptune 8-Bit',sub: 'Onda Cuadrada Retro',     col: '#33cc33' }
    ];

    this.bubbles = [];
    const count = genres.length;
    const centerX = this.width / 2;
    const centerY = this.height * 0.52;
    const radiusOrbitX = Math.min(this.width * 0.36, 420);
    const radiusOrbitY = Math.min(this.height * 0.22, 160);

    genres.forEach((g, i) => {
      const angle = (i / count) * Math.PI * 2;
      const tx = centerX + Math.cos(angle) * radiusOrbitX;
      const ty = centerY + Math.sin(angle) * radiusOrbitY;

      this.bubbles.push({
        id: g.id,
        label: g.label,
        sub: g.sub,
        color: g.col,
        x: tx,
        y: ty,
        targetX: tx,
        targetY: ty,
        baseAngle: angle,
        vx: 0,
        vy: 0,
        radius: 68,
        baseRadius: 68,
        hover: false,
        dwellTimer: 0
      });
    });
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    const count = this.bubbles.length;
    const centerX = w / 2;
    const centerY = h * 0.52;
    const radiusOrbitX = Math.min(w * 0.36, 420);
    const radiusOrbitY = Math.min(h * 0.22, 160);

    this.bubbles.forEach((b, i) => {
      b.targetX = centerX + Math.cos(b.baseAngle) * radiusOrbitX;
      b.targetY = centerY + Math.sin(b.baseAngle) * radiusOrbitY;
    });
  }

  update(pointer) {
    const time = performance.now() * 0.0012;

    this.bubbles.forEach((b, i) => {
      // Oscilación armónica senoidal combinada
      const floatX = Math.cos(time + i * 1.3) * 12;
      const floatY = Math.sin(time * 1.4 + i * 1.5) * 14;

      // Resorte físico restaurador hacia la posición orbital
      const ax = ((b.targetX + floatX) - b.x) * 0.05;
      const ay = ((b.targetY + floatY) - b.y) * 0.05;

      b.vx = (b.vx + ax) * 0.84;
      b.vy = (b.vy + ay) * 0.84;

      b.x += b.vx;
      b.y += b.vy;

      // Interacción con dedo o puntero
      if (pointer && pointer.x > 0) {
        const dx = pointer.x - b.x;
        const dy = pointer.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist < b.radius + 18) {
          b.hover = true;
          b.radius += (b.baseRadius * 1.22 - b.radius) * 0.25;
          b.vx -= (dx / (dist || 1)) * 1.8;
          b.vy -= (dy / (dist || 1)) * 1.8;
          b.dwellTimer = Math.min(50, b.dwellTimer + 1.2);
        } else {
          b.hover = false;
          b.radius += (b.baseRadius - b.radius) * 0.1;
          b.dwellTimer = Math.max(0, b.dwellTimer - 1.5);
        }
      } else {
        b.hover = false;
        b.radius += (b.baseRadius - b.radius) * 0.1;
        b.dwellTimer = Math.max(0, b.dwellTimer - 1.5);
      }
    });
  }

  checkClick(x, y) {
    for (const b of this.bubbles) {
      const dist = Math.hypot(x - b.x, y - b.y);
      if (dist < b.radius) return b.id;
    }
    return null;
  }

  draw(ctx) {
    this.bubbles.forEach(b => {
      ctx.save();

      // Halo luminoso
      const glow = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * 1.35);
      glow.addColorStop(0, b.hover ? b.color + '55' : 'rgba(255,255,255,0.03)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Membrana de burbuja
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.hover ? 'rgba(12, 17, 24, 0.95)' : 'rgba(8, 11, 16, 0.85)';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.hover ? 3 : 1.5;
      ctx.fill();
      ctx.stroke();

      // Anillo de carga por permanencia (Dwell time)
      if (b.dwellTimer > 0) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * b.dwellTimer) / 45);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Tipografía
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x, b.y - 8);

      ctx.fillStyle = b.color;
      ctx.font = '9px monospace';
      ctx.fillText(b.sub, b.x, b.y + 12);

      ctx.restore();
    });
  }
}