export class BubbleMenu {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.bubbles = [];
    this.initBubbles();
  }

  initBubbles() {
    const genres = [
      { id: 'FLUTE',     label: 'Flauta Andina', sub: 'Modelado Acústico / Aire', col: '#ffbe0b' },
      { id: 'SYNTH',     label: 'Cyber Synth',   sub: 'Diente de Sierra & Sub 808', col: '#ff5400' },
      { id: 'BELL',      label: 'Campana Zen',   sub: 'Inarmónicos & Resonancia', col: '#f3f4f6' },
      { id: 'BOOMBAP',   label: 'Boom Bap 90s',  sub: 'Bajo Saturado & Ataque', col: '#e85d04' },
      { id: 'ORGAN',     label: 'Órgano Sacro',  sub: 'Armónicos Multi-tubo',    col: '#9d4edd' },
      { id: 'CHIPTUNE',  label: 'Chiptune 8-Bit',sub: 'Onda Cuadrada Retro',     col: '#06d6a0' }
    ];

    this.bubbles = [];
    const count = genres.length;
    const centerX = this.width / 2;
    const centerY = this.height * 0.54;
    const radiusOrbitX = Math.min(this.width * 0.38, 440);
    const radiusOrbitY = Math.min(this.height * 0.22, 170);

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
        radius: 66,
        baseRadius: 66,
        hover: false,
        dwellTimer: 0,
        liquidPhase: Math.random() * Math.PI
      });
    });
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    const centerX = w / 2;
    const centerY = h * 0.54;
    const radiusOrbitX = Math.min(w * 0.38, 440);
    const radiusOrbitY = Math.min(h * 0.22, 170);

    this.bubbles.forEach((b) => {
      b.targetX = centerX + Math.cos(b.baseAngle) * radiusOrbitX;
      b.targetY = centerY + Math.sin(b.baseAngle) * radiusOrbitY;
    });
  }

  update(pointer) {
    const time = performance.now() * 0.0014;

    this.bubbles.forEach((b, i) => {
      b.liquidPhase += 0.02;

      const floatX = Math.cos(time + i * 1.3) * 12;
      const floatY = Math.sin(time * 1.2 + i * 1.5) * 14;

      const ax = ((b.targetX + floatX) - b.x) * 0.045;
      const ay = ((b.targetY + floatY) - b.y) * 0.045;

      b.vx = (b.vx + ax) * 0.86;
      b.vy = (b.vy + ay) * 0.86;

      b.x += b.vx;
      b.y += b.vy;

      if (pointer && pointer.x > 0) {
        const dx = pointer.x - b.x;
        const dy = pointer.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist < b.radius + 20) {
          b.hover = true;
          b.radius += (b.baseRadius * 1.18 - b.radius) * 0.2;
          b.vx -= (dx / (dist || 1)) * 1.4;
          b.vy -= (dy / (dist || 1)) * 1.4;
          b.dwellTimer = Math.min(50, b.dwellTimer + 1.2);
        } else {
          b.hover = false;
          b.radius += (b.baseRadius - b.radius) * 0.12;
          b.dwellTimer = Math.max(0, b.dwellTimer - 1.5);
        }
      } else {
        b.hover = false;
        b.radius += (b.baseRadius - b.radius) * 0.12;
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

      // Halo térmico exterior
      const glow = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * 1.45);
      glow.addColorStop(0, b.hover ? b.color + '55' : 'rgba(255, 84, 0, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Cápsula volcánica con gradiente
      const blobGrad = ctx.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1,
        b.x, b.y, b.radius
      );
      blobGrad.addColorStop(0, b.hover ? '#2d1808' : '#140c06');
      blobGrad.addColorStop(1, b.hover ? '#120702' : '#080503');

      ctx.beginPath();
      const segments = 12;
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const r = b.radius + Math.sin(angle * 3 + b.liquidPhase) * 2.2;
        const px = b.x + Math.cos(angle) * r;
        const py = b.y + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = blobGrad;
      ctx.strokeStyle = b.hover ? b.color : 'rgba(255, 170, 0, 0.25)';
      ctx.lineWidth = b.hover ? 2.5 : 1.2;
      ctx.fill();
      ctx.stroke();

      // Destello especular de superficie vítrea
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();

      // Anillo de tensión superficial al tocar con el dedo
      if (b.dwellTimer > 0) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * b.dwellTimer) / 45);
        ctx.strokeStyle = '#ffbe0b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Tipografía integrada
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 13px "Syne", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x, b.y + 1);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(b.sub, b.x, b.y + 18);

      ctx.restore();
    });
  }
}