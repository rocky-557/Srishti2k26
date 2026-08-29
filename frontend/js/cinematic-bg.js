/* ============================================================
   CINEMATIC BACKGROUND ANIMATION ENGINE — FIXED WALLPAPER LAYER
   ============================================================ */
(function () {
  'use strict';

  var currentTheme = 'workshop';
  var wrapper, canvas, ctx;
  var width = window.innerWidth;
  var height = window.innerHeight;

  // Particle systems for the 3 themes
  var workshopParticles = [];
  var paperParticles = [];
  var flagshipParticles = [];

  // Theme-specific animation states
  var arcPulseAngle = 0;
  var shieldScanY = 0;
  var cosmicTime = 0;

  function init() {
    wrapper = document.getElementById('cinematic-bg-wrapper');
    canvas = document.getElementById('cinematic-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize, { passive: true });

    createWorkshopParticles();
    createPaperParticles();
    createFlagshipParticles();

    requestAnimationFrame(render);
  }

  function resize() {
    if (!canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  // --- 1. WORKSHOP (IRON MAN / ARC REACTOR) PARTICLES ---
  function createWorkshopParticles() {
    workshopParticles = [];
    var count = Math.min(45, Math.floor(width / 30));
    for (var i = 0; i < count; i++) {
      workshopParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.6,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        colorType: Math.random() > 0.3 ? 'orange' : 'cyan' // Sparks & Arc Reactor cyan accent
      });
    }
  }

  // --- 2. PAPER PRESENTATION (SPIDER-MAN / TECH) PARTICLES ---
  function createPaperParticles() {
    paperParticles = [];
    var count = Math.min(25, Math.floor(width / 45));
    for (var i = 0; i < count; i++) {
      paperParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        speedY: -(Math.random() * 0.2 + 0.05),
        speedX: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.3 + 0.1,
        colorType: Math.random() > 0.5 ? 'red' : 'blue'
      });
    }
  }

  // --- 3. FLAGSHIP (INFINITY WAR / DEEP SPACE) PARTICLES ---
  function createFlagshipParticles() {
    flagshipParticles = [];
    var count = Math.min(60, Math.floor(width / 25));
    var colors = [
      'rgba(255, 215, 0, ',   // Mind Stone Gold
      'rgba(160, 50, 240, ',  // Power Stone Purple
      'rgba(0, 220, 255, ',   // Space Stone Cyan
      'rgba(50, 220, 100, ',  // Time Stone Green
      'rgba(255, 60, 60, ',   // Reality Stone Red
      'rgba(255, 140, 0, '    // Soul Stone Amber
    ];
    for (var i = 0; i < count; i++) {
      flagshipParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 0.5,
        speedY: -(Math.random() * 0.25 + 0.08),
        speedX: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkle: Math.random() * 0.02 + 0.005
      });
    }
  }

  // --- RENDER LOOP ---
  function render() {
    ctx.clearRect(0, 0, width, height);

    if (currentTheme === 'workshop') {
      renderWorkshopTheme();
    } else if (currentTheme === 'paperpresentation') {
      renderPaperPresentationTheme();
    } else if (currentTheme === 'flagship') {
      renderFlagshipTheme();
    }

    requestAnimationFrame(render);
  }

  // 1. WORKSHOP (Iron Man Arc Reactor Sparks & Light Rays)
  function renderWorkshopTheme() {
    arcPulseAngle += 0.015;

    // Ambient Arc Reactor Radial Glow
    var centerX = width * 0.5;
    var centerY = height * 0.35;
    var pulseScale = 1 + Math.sin(arcPulseAngle) * 0.08;

    var radGlow = ctx.createRadialGradient(
      centerX, centerY, 10,
      centerX, centerY, Math.max(width, height) * 0.5 * pulseScale
    );
    radGlow.addColorStop(0, 'rgba(255, 120, 20, 0.08)');
    radGlow.addColorStop(0.5, 'rgba(0, 180, 255, 0.03)');
    radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, width, height);

    // Sparks & Floating Energy Particles
    for (var i = 0; i < workshopParticles.length; i++) {
      var p = workshopParticles[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.alpha += Math.sin(arcPulseAngle * 2 + i) * 0.005;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < 0 || p.x > width) p.speedX *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      if (p.colorType === 'cyan') {
        ctx.fillStyle = 'rgba(0, 220, 255, ' + Math.max(0.1, Math.min(0.8, p.alpha)) + ')';
      } else {
        ctx.fillStyle = 'rgba(255, 150, 40, ' + Math.max(0.1, Math.min(0.8, p.alpha)) + ')';
      }
      ctx.fill();
    }
  }

  // 2. PAPER PRESENTATION (Spider-Man Minimal Red & Blue Particles)
  function renderPaperPresentationTheme() {
    shieldScanY += 0.4;
    if (shieldScanY > height + 100) shieldScanY = -100;

    // Very faint horizontal scanning glow
    var scanGlow = ctx.createLinearGradient(0, shieldScanY - 30, 0, shieldScanY + 30);
    scanGlow.addColorStop(0, 'rgba(40, 120, 240, 0)');
    scanGlow.addColorStop(0.5, 'rgba(40, 120, 240, 0.03)');
    scanGlow.addColorStop(1, 'rgba(40, 120, 240, 0)');
    ctx.fillStyle = scanGlow;
    ctx.fillRect(0, shieldScanY - 30, width, 60);

    // Subtle Hexagonal Grid overlay lines
    ctx.strokeStyle = 'rgba(40, 120, 240, 0.015)';
    ctx.lineWidth = 1;
    var gridSize = 70;
    for (var x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Floating Red & Blue Spider-Man Particles
    for (var i = 0; i < paperParticles.length; i++) {
      var p = paperParticles[i];
      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < 0 || p.x > width) p.speedX *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      if (p.colorType === 'red') {
        ctx.fillStyle = 'rgba(235, 45, 60, ' + Math.max(0.05, Math.min(0.25, p.alpha)) + ')';
      } else {
        ctx.fillStyle = 'rgba(45, 130, 240, ' + Math.max(0.05, Math.min(0.25, p.alpha)) + ')';
      }
      ctx.fill();
    }
  }

  // 3. FLAGSHIP (Infinity War Cosmic Space & Infinity Stones)
  function renderFlagshipTheme() {
    cosmicTime += 0.01;

    // Drifting Purple Nebula Cloud Glow
    var nebX = width * 0.5 + Math.sin(cosmicTime * 0.5) * 80;
    var nebY = height * 0.4 + Math.cos(cosmicTime * 0.3) * 50;

    var nebGlow = ctx.createRadialGradient(
      nebX, nebY, 50,
      nebX, nebY, Math.max(width, height) * 0.6
    );
    nebGlow.addColorStop(0, 'rgba(160, 40, 220, 0.08)');
    nebGlow.addColorStop(0.5, 'rgba(80, 20, 160, 0.04)');
    nebGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGlow;
    ctx.fillRect(0, 0, width, height);

    // Infinity Stone Particles with glowing trails
    for (var i = 0; i < flagshipParticles.length; i++) {
      var p = flagshipParticles[i];
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(cosmicTime + i) * 0.15;
      p.alpha += Math.sin(cosmicTime * 3 + i) * 0.006;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < 0 || p.x > width) p.speedX *= -1;

      var currentAlpha = Math.max(0.15, Math.min(0.85, p.alpha));

      // Particle body
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + currentAlpha + ')';
      ctx.fill();
    }
  }

  // Global Function to set active theme
  window.setCinematicTheme = function (themeName) {
    if (['workshop', 'paperpresentation', 'flagship'].indexOf(themeName) === -1) {
      themeName = 'workshop';
    }
    currentTheme = themeName;

    if (!wrapper) wrapper = document.getElementById('cinematic-bg-wrapper');
    if (!wrapper) return;

    // Toggle active background images
    var imgs = wrapper.querySelectorAll('.cinematic-bg-img');
    imgs.forEach(function (img) {
      if (img.classList.contains('bg-' + themeName)) {
        img.classList.add('active');
      } else {
        img.classList.remove('active');
      }
    });

    // Toggle active overlays
    var overlays = wrapper.querySelectorAll('.cinematic-overlay');
    overlays.forEach(function (ov) {
      if (ov.classList.contains('overlay-' + themeName)) {
        ov.classList.add('active');
      } else {
        ov.classList.remove('active');
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
