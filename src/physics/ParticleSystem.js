export class ParticleSystem {
  constructor(width, height, count = 1800) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.noiseTime = 0;
    this.targetHue = 180;
    this.currentHue = 180;
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
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        mass: Math.random() * 0.7 + 0.3
      });
    }
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  triggerShockwave(x, y, power = 18) {
    this.shockwaves.push({ x, y, radius: 10, maxRadius: 320, power });
  }

  update(hand, activeNote, soundEnergy = 0) {
    this.noiseTime += 0.007;

    const noteHues = {
      'Do': 0, 'Re': 28, 'Mi': 52, 'Fa': 135,
      'Sol': 185, 'La': 225, 'Si': 285, "Do'": 325
    };

    if (activeNote && noteHues[activeNote] !== undefined) {
      this.targetHue = noteHues[activeNote];
    }
    this.currentHue += (this.targetHue - this.currentHue) * 0.12;

    // Actualizar ondas de choque
    this.shockwaves.forEach(sw => { sw.radius += 14; });
    this.shockwaves = this.shockwaves.filter(sw => sw.radius < sw.maxRadius);

    const len = this.particles.length;

    for (let i = 0; i < len; i++) {
      const p = this.particles[i];

      // Campo de turbulencia continua (Curl-like turbulence)
      const angle = (Math.sin(p.x * 0.003 + this.noiseTime) + Math.cos(p.y * 0.003 + this.noiseTime)) * Math.PI;
      p.vx += Math.cos(angle) * 0.32;
      p.vy += Math.sin(angle) * 0.32;

      // Interacción física con la mano
      if (hand && hand.palmCenter) {
        const dx = hand.palmCenter.x - p.x;
        const dy = hand.palmCenter.y - p.y;
        const distSq = dx * dx + dy * dy;
        const rad = 320;

        if (distSq < rad * rad && distSq > 9) {
          const dist = Math.sqrt(distSq);
          if (hand.isFist) {
            const pull = (1 - dist / rad) * 8.5;
            p.vx += (dx / dist) * pull;
            p.vy += (dy / dist) * pull;
          } else {
            const vortex = (1 - dist / rad) * 5.5;
            p.vx += (-dy / dist) * vortex;
            p.vy += (dx / dist) * vortex;
          }
        }
      }

      // Resolver ondas de choque
      for (let s = 0; s < this.shockwaves.length; s++) {
        const sw = this.shockwaves[s];
        const dx = p.x - sw.x;
        const dy = p.y - sw.y;
        const dist = Math.hypot(dx, dy);
        const delta = Math.abs(dist - sw.radius);
        if (delta < 45 && dist > 1) {
          const push = ((45 - delta) / 45) * sw.power;
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
    ctx.globalCompositeOperation = 'lighter';

    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      const speed = Math.hypot(p.vx, p.vy);

      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = `hsla(${this.currentHue}, 90%, ${55 + soundEnergy * 25}%, ${0.28 + speed * 0.12})`;
      ctx.lineWidth = Math.max(1, Math.min(3.5, speed * 0.6 + soundEnergy * 2.0));
      ctx.stroke();
    }

    // Dibujar ondas de choque
    this.shockwaves.forEach(sw => {
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${1 - sw.radius / sw.maxRadius})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    ctx.restore();
  }
}