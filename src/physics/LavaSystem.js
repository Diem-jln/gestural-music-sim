export class LavaSystem {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.blobs = [];
    this.initBlobs(14);
    this.time = 0;
  }

  initBlobs(count) {
    this.blobs = [];
    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 45 + 45;
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 0.8 + 0.2, // Profundidad 3D (0.2 = fondo, 1.0 = primer plano)
        baseRadius: radius,
        radius: radius,
        vy: -(Math.random() * 0.5 + 0.3), // Flotabilidad de convección térmica
        vx: (Math.random() - 0.5) * 0.25,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.018 + 0.008,
        temperature: Math.random() * 0.4 + 0.6,
        colorType: i % 3 // 0: magma puro, 1: oro incandescente, 2: bermellón
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  update(hand, soundEnergy = 0) {
    this.time += 0.008;
    const len = this.blobs.length;

    for (let i = 0; i < len; i++) {
      const b = this.blobs[i];

      // Oscilación armónica de la masa de fluido
      b.wobblePhase += b.wobbleSpeed;
      b.radius = b.baseRadius * b.z + Math.sin(b.wobblePhase) * 6 + soundEnergy * 24;

      // Convección 3D (las gotas calientes y cercanas suben más rápido)
      b.y += (b.vy * b.z) - (soundEnergy * 2.2);
      b.x += b.vx + Math.sin(this.time * 2 + i) * 0.4;

      // Desplazamiento reactivo al interactuar con las manos
      if (hand && hand.palmCenter) {
        const dx = b.x - hand.palmCenter.x;
        const dy = b.y - hand.palmCenter.y;
        const distSq = dx * dx + dy * dy;
        const threshold = (b.radius + 100);

        if (distSq < threshold * threshold && distSq > 4) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / threshold) * 5.0;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }
      }

      b.vx *= 0.95;

      // Ciclo convectivo infinito (cuando sube, se enfría y vuelve a la base)
      if (b.y < -b.radius * 2) {
        b.y = this.height + b.radius * 1.5;
        b.x = Math.random() * this.width;
        b.z = Math.random() * 0.8 + 0.2;
      }
      if (b.x < -b.radius * 1.5) b.x = this.width + b.radius;
      if (b.x > this.width + b.radius * 1.5) b.x = -b.radius;
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Ordenar gotas por profundidad Z para renderizado 3D correcto
    const sortedBlobs = [...this.blobs].sort((a, b) => a.z - b.z);

    // 1. Resplandor volumétrico de fondo
    ctx.globalCompositeOperation = 'screen';
    sortedBlobs.forEach(b => {
      const glowRad = b.radius * 1.8;
      const glowGrad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, glowRad);
      glowGrad.addColorStop(0, 'rgba(255, 84, 0, 0.25)');
      glowGrad.addColorStop(0.5, 'rgba(255, 170, 0, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, glowRad, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Cuerpos volumétricos con sombreado especular Blinn-Phong simulado
    ctx.globalCompositeOperation = 'source-over';
    sortedBlobs.forEach(b => {
      // Centro de luz especular superior izquierdo simulando foco 3D
      const lightOffsetX = b.x - b.radius * 0.32;
      const lightOffsetY = b.y - b.radius * 0.32;

      const bodyGrad = ctx.createRadialGradient(
        lightOffsetX, lightOffsetY, b.radius * 0.08,
        b.x, b.y, b.radius
      );

      // Colores según temperatura
      if (b.colorType === 0) {
        bodyGrad.addColorStop(0, '#fff3b0'); // Núcleo incandescente
        bodyGrad.addColorStop(0.3, '#ffaa00');
        bodyGrad.addColorStop(0.7, '#ff5400');
        bodyGrad.addColorStop(1, '#660c00'); // Borde viscoso oscuro
      } else if (b.colorType === 1) {
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.35, '#ffd166');
        bodyGrad.addColorStop(0.75, '#ff7700');
        bodyGrad.addColorStop(1, '#550800');
      } else {
        bodyGrad.addColorStop(0, '#ffd8be');
        bodyGrad.addColorStop(0.3, '#ff4800');
        bodyGrad.addColorStop(0.75, '#c81d25');
        bodyGrad.addColorStop(1, '#400406');
      }

      ctx.save();
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();

      // Deformación de Bézier para contorno líquido elástico
      const segments = 10;
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const deform = Math.sin(theta * 2.5 + b.wobblePhase) * (4 * b.z);
        const r = b.radius + deform;
        const px = b.x + Math.cos(theta) * r;
        const py = b.y + Math.sin(theta) * r;

        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.closePath();
      ctx.fill();

      // Brillo especular de vidrio orgánico
      ctx.beginPath();
      ctx.arc(lightOffsetX, lightOffsetY, b.radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * b.z})`;
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }
}