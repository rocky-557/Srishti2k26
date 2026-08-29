/**
 * cinematic.js — Floating glowing particles
 * ─────────────────────────────────────────
 * Renders warm orange/gold/white micro-particles that drift upward
 * slowly on a full-screen canvas. Uses requestAnimationFrame for
 * smooth 60 FPS animation. All transforms happen on the GPU.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* ── Palette matching the orange/gold theme ── */
  const PALETTE = [
    'rgba(255, 180,  60, ',   /* gold-orange      */
    'rgba(255, 140,  20, ',   /* deep amber       */
    'rgba(255, 220, 120, ',   /* warm yellow      */
    'rgba(255, 255, 200, ',   /* near-white glow  */
    'rgba(100, 210, 255, ',   /* arc-reactor cyan */
  ];

  const COUNT = 18;         /* total particles (subtle & minimal) */
  const MIN_R = 0.6;
  const MAX_R = 1.8;
  const MIN_SPD = 0.08;       /* px / frame — very slow gentle drift */
  const MAX_SPD = 0.28;

  let W, H, particles = [];

  /* ── Resize canvas to viewport ── */
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* ── Spawn a single particle at a random x near the bottom ── */
  function spawnParticle(forceBottom = false) {
    const r = MIN_R + Math.random() * (MAX_R - MIN_R);
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    return {
      x: Math.random() * W,
      y: forceBottom ? H + r : Math.random() * H,   /* distribute on init */
      r,
      alpha: 0.1 + Math.random() * 0.55,
      speed: MIN_SPD + Math.random() * (MAX_SPD - MIN_SPD),
      drift: (Math.random() - 0.5) * 0.18,              /* gentle horizontal sway */
      color,
      pulse: Math.random() * Math.PI * 2,               /* phase offset for twinkle */
    };
  }

  /* ── Initialise pool ── */
  function init() {
    resize();
    particles = Array.from({ length: COUNT }, () => spawnParticle(false));
  }

  /* ── Main render loop ── */
  let lastTime = 0;
  function render(ts) {
    const dt = Math.min(ts - lastTime, 50);   /* cap delta, prevent jumps */
    lastTime = ts;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      /* Move upward with gentle lateral drift */
      p.y -= p.speed * (dt / 16.67);
      p.x += p.drift * (dt / 16.67);
      p.pulse += 0.025 * (dt / 16.67);

      /* Twinkle: alpha oscillates ±20 % */
      const a = Math.max(0, p.alpha * (0.8 + 0.2 * Math.sin(p.pulse)));

      /* Recycle when it drifts off-screen */
      if (p.y < -p.r * 4 || p.x < -20 || p.x > W + 20) {
        particles[i] = spawnParticle(true);
        continue;
      }

      /* Draw soft glowing dot */
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, p.color + (a * 1.0).toFixed(3) + ')');
      grad.addColorStop(0.4, p.color + (a * 0.5).toFixed(3) + ')');
      grad.addColorStop(1, p.color + '0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  /* ── Boot ── */
  window.addEventListener('resize', resize, { passive: true });
  init();
  requestAnimationFrame(render);
})();
