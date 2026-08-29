// cosmos.js

const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');

let stars = [];
let nebulas = [];
const numStars = 149; // reduced count for natural look
const numNebulas = 4;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Star {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.radius = Math.random() * 1.5 + 0.2;
    this.speedY = Math.random() * 0.05 + 0.02;
    this.alpha = Math.random() * 0.5 + 0.5;
    const colors = [
      `rgba(255, 255, 255, ${this.alpha})`,
      `rgba(180, 200, 255, ${this.alpha})`,
      `rgba(255, 200, 200, ${this.alpha})`
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.twinkleFactor = Math.random() * 0.02 + 0.005;
  }
  update() {
    this.y += this.speedY;
    if (this.y > canvas.height) {
      this.reset();
      this.y = 0;
    }
    this.alpha += this.twinkleFactor * (Math.random() > 0.5 ? 1 : -1);
    this.alpha = Math.max(0.3, Math.min(1, this.alpha));
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.color.replace(/\d\.\d+\)/, `${this.alpha})`);
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Nebula {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.radius = Math.random() * 400 + 200;
    const nebulaColors = [
      'rgba(100, 50, 150, 0.42)',
      'rgba(50, 100, 200, 0.36)',
      'rgba(200, 100, 150, 0.30)'
    ];
    this.color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
  }
  draw() {
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initScene() {
  stars = [];
  nebulas = [];
  for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
  }
  for (let i = 0; i < numNebulas; i++) {
    nebulas.push(new Nebula());
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const nebula of nebulas) {
    nebula.draw();
  }
  for (const s of stars) {
    s.update();
    s.draw();
  }
  requestAnimationFrame(animate);
}

initScene();
animate();
