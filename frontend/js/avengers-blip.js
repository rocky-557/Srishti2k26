(function() {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', () => {
        // Check for reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return; // Exit and let simple CSS fallbacks handle hover
        }

        const cards = document.querySelectorAll('.card');
        if (cards.length === 0) return;

        // Activate the blip effect CSS overrides
        document.body.classList.add('avengers-blip-active');

        // Particle colors: Blue, Purple, White, Cyan, Orange sparks
        const colors = ['#2F6FED', '#6C3AC7', '#FFFFFF', '#00FFFF', '#FFA500'];

        cards.forEach(card => {
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'blip-canvas';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '15';
            card.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            let width = card.offsetWidth || 300;
            let height = card.offsetHeight || 300;
            canvas.width = width;
            canvas.height = height;

            let particles = [];
            let animationFrameId = null;
            let phase = 'idle'; // 'idle', 'disintegrating', 'content', 'reforming'
            let contentTimeout = null;

            function createDisintegrationParticles() {
                particles = [];
                const numParticles = 200 + Math.random() * 100;
                for (let i = 0; i < numParticles; i++) {
                    // Spread particles mostly over the central image area (approx 50 to 250 px width)
                    particles.push({
                        x: 20 + Math.random() * (width - 40),
                        y: 20 + Math.random() * (height - 40),
                        vx: (Math.random() - 0.5) * 4, // Drift sideways
                        vy: -1 - Math.random() * 3,    // Drift upwards
                        size: 1 + Math.random() * 2.5,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: 0,
                        maxLife: 40 + Math.random() * 40,
                        alpha: 1
                    });
                }
            }

            function createReformationParticles() {
                particles = [];
                const numParticles = 200 + Math.random() * 100;
                for (let i = 0; i < numParticles; i++) {
                    // Target is where they will end up (inside the image area)
                    const targetX = 20 + Math.random() * (width - 40);
                    const targetY = 20 + Math.random() * (height - 40);
                    
                    // Start position is scattered outwards and slightly below
                    const startX = targetX + (Math.random() - 0.5) * 150;
                    const startY = targetY + 50 + Math.random() * 100;
                    
                    const maxLife = 40 + Math.random() * 30;

                    particles.push({
                        x: startX,
                        y: startY,
                        targetX: targetX,
                        targetY: targetY,
                        vx: (targetX - startX) / maxLife,
                        vy: (targetY - startY) / maxLife,
                        size: 1 + Math.random() * 2.5,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: 0,
                        maxLife: maxLife,
                        alpha: 0
                    });
                }
            }

            function animate() {
                ctx.clearRect(0, 0, width, height);
                let aliveCount = 0;

                particles.forEach(p => {
                    p.life++;
                    if (p.life <= p.maxLife) {
                        aliveCount++;
                        
                        if (phase === 'disintegrating') {
                            p.x += p.vx;
                            p.y += p.vy;
                            // Add slight drift
                            p.vx += (Math.random() - 0.5) * 0.2;
                            // Fade out
                            p.alpha = 1 - (p.life / p.maxLife);
                        } else if (phase === 'reforming') {
                            p.x += p.vx;
                            p.y += p.vy;
                            // Fade in then out slightly, or just fade in
                            p.alpha = p.life / p.maxLife;
                        }

                        // Draw glowing particle
                        ctx.save();
                        ctx.globalAlpha = p.alpha;
                        ctx.fillStyle = p.color;
                        ctx.shadowBlur = 8;
                        ctx.shadowColor = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                });

                if (aliveCount > 0) {
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    ctx.clearRect(0, 0, width, height);
                    if (phase === 'reforming') {
                        phase = 'idle';
                        card.classList.remove('is-blipped');
                    }
                }
            }

            card.addEventListener('mouseenter', () => {
                clearTimeout(contentTimeout);
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                
                phase = 'disintegrating';
                card.classList.remove('is-content-visible');
                card.classList.add('is-blipped');
                
                createDisintegrationParticles();
                animate();

                // Show content slightly before particles completely die out (~400ms)
                contentTimeout = setTimeout(() => {
                    if (phase === 'disintegrating') {
                        phase = 'content';
                        card.classList.add('is-content-visible');
                    }
                }, 400);
            });

            card.addEventListener('mouseleave', () => {
                clearTimeout(contentTimeout);
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                
                phase = 'reforming';
                card.classList.remove('is-content-visible');
                
                createReformationParticles();
                animate();
            });
            
            // Handle window resize dynamically if needed
            window.addEventListener('resize', () => {
                width = card.offsetWidth || 300;
                height = card.offsetHeight || 300;
                canvas.width = width;
                canvas.height = height;
            });
        });
    });
})();
