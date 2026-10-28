export class ParticleSystem {
  constructor(width, height, count = 1200) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.noiseTime = 0;
    this.shockwaves = [];
    this.init(count);
  }

  init(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        px: Math.random() * this.width,
        py: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  triggerShockwave(x, y, power = 18) {
    this.shockwaves.push({ x, y, radius: 8, maxRadius: 280, power });
  }

  update(hand, soundEnergy = 0) {
    this.noiseTime += 0.005;

    this.shockwaves.forEach(sw => { sw.radius += 12; });
    this.shockwaves = this.shockwaves.filter(sw => sw.radius < sw.maxRadius);

    const len = this.particles.length;

    for (let i = 0; i < len; i++) {
      const p = this.particles[i];

      // Campo de turbulencia sutil
      const angle = (Math.sin(p.x * 0.0025 + this.noiseTime) + Math.cos(p.y * 0.0025 + this.noiseTime)) * Math.PI;
      p.vx += Math.cos(angle) * 0.22;
      p.vy += Math.sin(angle) * 0.22;

      // Interacción con la mano
      if (hand && hand.palmCenter) {
        const dx = hand.palmCenter.x - p.x;
        const dy = hand.palmCenter.y - p.y;
        const distSq = dx * dx + dy * dy;
        const rad = 240;

        if (distSq < rad * rad && distSq > 9) {
          const dist = Math.sqrt(distSq);
          if (hand.isFist) {
            const pull = (1 - dist / rad) * 6.5;
            p.vx += (dx / dist) * pull;
            p.vy += (dy / dist) * pull;
          } else {
            const vortex = (1 - dist / rad) * 4.2;
            p.vx += (-dy / dist) * vortex;
            p.vy += (dx / dist) * vortex;
          }
        }
      }

      // Ondas de choque por articulación de notas
      for (let s = 0; s < this.shockwaves.length; s++) {
        const sw = this.shockwaves[s];
        const dx = p.x - sw.x;
        const dy = p.y - sw.y;
        const dist = Math.hypot(dx, dy);
        const delta = Math.abs(dist - sw.radius);
        if (delta < 35 && dist > 1) {
          const push = ((35 - delta) / 35) * sw.power;
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
        }
      }

      p.vx *= 0.92;
      p.vy *= 0.92;

      p.px = p.x;
      p.py = p.y;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) { p.x += this.width; p.px = p.x; }
      if (p.x >= this.width) { p.x -= this.width; p.px = p.x; }
      if (p.y < 0) { p.y += this.height; p.py = p.y; }
      if (p.y >= this.height) { p.y -= this.height; p.py = p.y; }
    }
  }

  draw(ctx, soundEnergy = 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      const speed = Math.hypot(p.vx, p.vy);

      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      // Trazo fino color marfil con acento dorado al activarse el audio
      ctx.strokeStyle = `rgba(240, 242, 245, ${0.15 + speed * 0.08 + soundEnergy * 0.2})`;
      ctx.lineWidth = Math.max(0.8, Math.min(2.5, 0.8 + soundEnergy * 1.2));
      ctx.stroke();
    }

    // Ondas expansivas discretas
    this.shockwaves.forEach(sw => {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 107, 0, ${0.8 * (1 - sw.radius / sw.maxRadius)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.restore();
  }
}