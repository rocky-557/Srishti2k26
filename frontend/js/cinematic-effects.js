/**
 * cinematic-effects.js
 * ====================
 * Marvel Cinematic Universe — Atmosphere Engine for SRiSHTi 2K25 Events Page.
 *
 * What this file does:
 *   1. Floats six Infinity Stones with smooth sinusoidal drift + rotation.
 *   2. Runs a canvas-based particle system (energy particles + cosmic dust).
 *   3. Fires rare Thor lightning bolt flashes.
 *   4. Triggers Doctor Strange portal spark bursts on section scroll-into-view.
 *
 * What this file does NOT do:
 *   - Touch any existing JS (registerEvent, modal logic, tab switchers, #btn_N).
 *   - Modify any existing DOM element.
 *   - Add event listeners that could conflict with existing handlers.
 *
 * Linked ONLY from event.html.
 */
(function () {
  'use strict';

  /* ── 0. GUARD: accessibility & browser support ── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof requestAnimationFrame === 'undefined') return;

  /* ── 0. DEVICE CAPABILITY DETECTION ── */
  const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
  const IS_LOW_POWER = (navigator.hardwareConcurrency || 8) <= 2;

  /* ── 0B. DYNAMIC ATMOSPHERE BASE LAYERS (cin-bg, cin-overlay, cin-grain) ── */
  function initBaseLayers() {
    const target = document.getElementById('cin-nebula') || document.body.firstChild;
    if (!target || !target.parentNode) return;

    if (!document.getElementById('cin-bg')) {
      const bg = document.createElement('div');
      bg.id = 'cin-bg';
      bg.className = 'cin-layer';
      target.parentNode.insertBefore(bg, target);
    }

    if (!document.getElementById('cin-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'cin-overlay';
      overlay.className = 'cin-layer';
      target.parentNode.insertBefore(overlay, target);
    }

    if (!document.getElementById('cin-grain')) {
      const grain = document.createElement('div');
      grain.id = 'cin-grain';
      grain.className = 'cin-layer';
      target.parentNode.insertBefore(grain, target);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBaseLayers);
  } else {
    initBaseLayers();
  }

  /* ════════════════════════════════════════════════════
     1. INFINITY STONES
     Each stone has:
       - A fixed DOM element created and appended to body
       - A "home" base position (% of viewport)
       - Two independent sinusoidal drift axes (X, Y)
       - Rotation driven by elapsed time
       - JS sets transform:translate(x,y) rotate(deg) each rAF frame
       - CSS handles color gradient and glow breathing animation
     ════════════════════════════════════════════════════ */

  /**
   * Stone configuration.
   * baseX/Y: starting % position of viewport (stones drift around this point)
   * f1-f4:   drift frequency pairs — summed to avoid obvious periodicity
   * phase:   per-stone time offset so all 6 move independently
   * depth:   'far'|'mid'|'near' — affects drift amplitude and blur
   */
  const STONE_CONFIGS = [
    {
      id: 'space', depth: 'far', size: IS_MOBILE ? 22 : 34,
      baseX: 7, baseY: 14, f1: 0.055, f2: 0.100, f3: 0.072, f4: 0.130, phase: 0.00
    },
    {
      id: 'reality', depth: 'mid', size: IS_MOBILE ? 18 : 26,
      baseX: 84, baseY: 20, f1: 0.080, f2: 0.125, f3: 0.062, f4: 0.098, phase: 1.30
    },
    {
      id: 'mind', depth: 'near', size: IS_MOBILE ? 20 : 30,
      baseX: 22, baseY: 70, f1: 0.068, f2: 0.092, f3: 0.110, f4: 0.074, phase: 2.60
    },
    {
      id: 'time', depth: 'far', size: IS_MOBILE ? 16 : 24,
      baseX: 73, baseY: 77, f1: 0.090, f2: 0.118, f3: 0.068, f4: 0.088, phase: 0.80
    },
    {
      id: 'soul', depth: 'mid', size: IS_MOBILE ? 18 : 28,
      baseX: 48, baseY: 38, f1: 0.048, f2: 0.098, f3: 0.088, f4: 0.115, phase: 4.10
    },
    {
      id: 'power', depth: 'near', size: IS_MOBILE ? 20 : 32,
      baseX: 91, baseY: 58, f1: 0.108, f2: 0.070, f3: 0.095, f4: 0.062, phase: 5.50
    },
  ];

  /** Drift amplitude (px) per depth layer */
  const AMPLITUDE = { far: 38, mid: 58, near: 78 };
  /** Rotation speed (deg/s) per depth layer */
  const ROT_SPEED = { far: 7, mid: 12, near: 17 };
  /** Base opacity per depth layer */
  const OPACITY = { far: 0.22, mid: 0.32, near: 0.42 };
  /** CSS blur per depth layer */
  const BLUR = { far: '3px', mid: '1.2px', near: '0px' };

  /* Build stone DOM elements and attach to body */
  const stoneNodes = STONE_CONFIGS.map(cfg => {
    const el = document.createElement('div');
    el.className = `cin-stone cin-depth-${cfg.depth}`;
    el.setAttribute('data-stone', cfg.id);
    el.style.width = cfg.size + 'px';
    el.style.height = cfg.size + 'px';
    el.style.opacity = OPACITY[cfg.depth];
    el.style.filter = `blur(${BLUR[cfg.depth]})`;
    document.body.appendChild(el);
    return { el, cfg };
  });

  /**
   * Compute a stone's pixel position at time t (seconds).
   * Uses two summed sinusoids per axis for natural-looking non-periodic drift.
   */
  function getStonePos(cfg, t) {
    const amp = AMPLITUDE[cfg.depth];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bx = (cfg.baseX / 100) * vw;
    const by = (cfg.baseY / 100) * vh;
    const dx = Math.sin(t * cfg.f1 + cfg.phase) * amp * 0.65
      + Math.sin(t * cfg.f2 + cfg.phase * 1.7) * amp * 0.35;
    const dy = Math.sin(t * cfg.f3 + cfg.phase + 1.05) * amp * 0.65
      + Math.sin(t * cfg.f4 + cfg.phase * 0.85) * amp * 0.35;
    return { x: bx + dx - cfg.size / 2, y: by + dy - cfg.size / 2 };
  }

  /* ════════════════════════════════════════════════════
     2. CANVAS PARTICLE SYSTEM
     Draws energy particles and cosmic dust onto a
     dedicated <canvas id="cin-canvas"> element.
     This canvas is separate from the existing
     #cosmosCanvas (stars) so the two systems
     are fully independent and non-conflicting.
     ════════════════════════════════════════════════════ */

  const canvas = document.getElementById('cin-canvas');
  if (!canvas) return; /* Safety guard if HTML not updated yet */
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  /* ── Energy Particles ── */
  const PARTICLE_COUNT = IS_LOW_POWER ? 28 : IS_MOBILE ? 42 : 85;

  /* Stone-tinted color palette — particles share the Infinity Stone hues */
  const PTCL_PALETTE = [
    'rgba(255,255,255,',       /* white starlight  */
    'rgba(203,213,225,',       /* silver           */
    'rgba(147,197,253,',       /* space blue       */
    'rgba(253,224,71,',        /* mind yellow      */
    'rgba(216,180,254,',       /* power purple     */
    'rgba(253,186,116,',       /* soul orange      */
    'rgba(134,239,172,',       /* time green       */
  ];

  class Particle {
    constructor(initRandom) {
      this.spawn(initRandom);
    }
    spawn(randY) {
      this.x = Math.random() * canvas.width;
      this.y = randY ? Math.random() * canvas.height : canvas.height + 4;
      this.vx = (Math.random() - 0.5) * 0.22;
      this.vy = -(Math.random() * 0.32 + 0.07);
      this.radius = Math.random() * 1.2 + 0.4;
      this.maxLife = Math.random() * 200 + 120;
      this.life = this.maxLife;
      this.col = PTCL_PALETTE[Math.floor(Math.random() * PTCL_PALETTE.length)];
    }
    tick() {
      this.x += this.vx; this.y += this.vy; this.life--;
      if (this.life <= 0 || this.y < -4) this.spawn(false);
    }
    draw() {
      const a = (this.life / this.maxLife) * 0.50;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 6.2832);
      ctx.fillStyle = this.col + a + ')';
      ctx.fill();
    }
  }

  /* ── Cosmic Dust Motes (larger, slower, lower opacity) ── */
  const DUST_COUNT = IS_LOW_POWER ? 8 : IS_MOBILE ? 16 : 36;

  class Dust {
    constructor(initRandom) {
      this.spawn(initRandom);
    }
    spawn(randY) {
      this.x = Math.random() * canvas.width;
      this.y = randY ? Math.random() * canvas.height : -12;
      this.vx = (Math.random() - 0.5) * 0.10;
      this.vy = Math.random() * 0.10 + 0.03;
      this.radius = Math.random() * 2.8 + 1.2;
      this.maxLife = Math.random() * 700 + 300;
      this.life = this.maxLife;
    }
    tick() {
      this.x += this.vx; this.y += this.vy; this.life--;
      if (this.life <= 0 || this.y > canvas.height + 12) this.spawn(false);
    }
    draw() {
      const a = (this.life / this.maxLife) * 0.09;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 6.2832);
      ctx.fillStyle = 'rgba(195,205,255,' + a + ')';
      ctx.fill();
    }
  }

  const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle(true));
  const dustMotes = Array.from({ length: DUST_COUNT }, () => new Dust(true));

  /* ════════════════════════════════════════════════════
     3. MAIN ANIMATION LOOP
     Single rAF loop drives both particle canvas
     and stone position updates.
     ════════════════════════════════════════════════════ */
  let rafHandle;
  let originTs = null;

  function mainLoop(ts) {
    if (originTs === null) originTs = ts;
    const t = (ts - originTs) * 0.001; /* elapsed seconds */

    /* ── Canvas: clear + draw particles + dust ── */
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) { p.tick(); p.draw(); }
    for (const d of dustMotes) { d.tick(); d.draw(); }

    /* ── Stones: smooth sinusoidal drift + rotation ── */
    for (const { el, cfg } of stoneNodes) {
      const { x, y } = getStonePos(cfg, t);
      const rot = (t * ROT_SPEED[cfg.depth]) % 360;
      el.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg)`;
    }

    rafHandle = requestAnimationFrame(mainLoop);
  }

  /* Defer start so existing page scripts initialise first */
  requestAnimationFrame(mainLoop);

  /* ════════════════════════════════════════════════════
     4. THOR LIGHTNING
     Fires a rare flash: a full-screen blue-white
     flicker + a jagged bolt div. Triggers every
     20–50 seconds on desktop only.
     ════════════════════════════════════════════════════ */
  if (!IS_MOBILE) {
    const lightningContainer = document.getElementById('cin-lightning');

    function fireFlash() {
      if (!lightningContainer) return;

      /* ── screen tint flash ── */
      lightningContainer.style.background = 'rgba(147,197,253,0.055)';
      lightningContainer.style.transition = 'background 0.08s ease';
      setTimeout(() => {
        lightningContainer.style.background = 'transparent';
      }, 130);

      /* ── bolt shape (clip-path polygon = zigzag lightning) ── */
      const bolt = document.createElement('div');
      const leftPct = 12 + Math.random() * 76;
      const topPct = 4 + Math.random() * 38;
      bolt.style.cssText = [
        'position:absolute',
        'pointer-events:none',
        `left:${leftPct}%`,
        `top:${topPct}%`,
        'width:52px',
        'height:210px',
        'background:linear-gradient(to bottom,rgba(147,197,253,0) 0%,rgba(255,255,255,1) 28%,rgba(147,197,253,0.9) 68%,rgba(147,197,253,0) 100%)',
        'clip-path:polygon(42% 0%,58% 0%,63% 36%,100% 36%,38% 100%,56% 48%,0% 48%)',
        'filter:blur(1.2px)',
        'box-shadow:0 0 8px 4px rgba(147,197,253,0.7),0 0 22px 8px rgba(37,99,235,0.4)',
        'animation:cin-bolt-flash 0.58s ease forwards',
      ].join(';');
      lightningContainer.appendChild(bolt);
      setTimeout(() => bolt.remove(), 650);

      /* Schedule next: 20–50 s */
      const nextDelay = 20000 + Math.random() * 30000;
      setTimeout(fireFlash, nextDelay);
    }

    /* First flash after 12–22 s so page loads calmly first */
    setTimeout(fireFlash, 12000 + Math.random() * 10000);
  }

  /* ════════════════════════════════════════════════════
     5. DOCTOR STRANGE PORTAL SPARKS
     IntersectionObserver triggers a burst of coloured
     sparks when each event section enters the viewport.
     Fires once per section per page load.
     ════════════════════════════════════════════════════ */
  if (!IS_MOBILE && 'IntersectionObserver' in window) {
    const SPARK_COLORS = [
      '#fde047', /* mind yellow   */
      '#fb923c', /* soul orange   */
      '#c084fc', /* power purple  */
      '#60a5fa', /* space blue    */
      '#4ade80', /* time green    */
      '#f87171', /* reality red   */
    ];

    function spawnSparks(rect) {
      /* Burst origin: horizontally centred, near the top of the section */
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + Math.min(80, rect.height * 0.15);
      const n = 20;

      for (let i = 0; i < n; i++) {
        const spark = document.createElement('div');
        spark.className = 'cin-portal-spark';

        /* Evenly-spaced angles + small random jitter */
        const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        const dist = 25 + Math.random() * 75;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const color = SPARK_COLORS[i % SPARK_COLORS.length];
        const dur = 650 + Math.random() * 350;

        spark.style.cssText = [
          `left:${cx}px`,
          `top:${cy}px`,
          `background:${color}`,
          `box-shadow:0 0 5px 2px ${color}`,
          `transition:transform ${dur}ms cubic-bezier(0.22,1,0.36,1),opacity ${dur}ms ease`,
        ].join(';');
        document.body.appendChild(spark);

        /* Double-rAF ensures transition fires after paint */
        requestAnimationFrame(() => requestAnimationFrame(() => {
          spark.style.transform = `translate(${tx}px,${ty}px) scale(0.15)`;
          spark.style.opacity = '0';
        }));
        setTimeout(() => spark.remove(), dur + 60);
      }
    }

    /* Observe each major event section */
    const eventSections = document.querySelectorAll(
      '.tech-events, .nontech-events, .gaming-events'
    );

    if (eventSections.length > 0) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            spawnSparks(entry.target.getBoundingClientRect());
            sectionObserver.unobserve(entry.target); /* once only per session */
          }
        });
      }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

      eventSections.forEach(s => sectionObserver.observe(s));
    }
  }

  /* ── Cleanup on navigate away ── */
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(rafHandle);
  }, { once: true });

})();
