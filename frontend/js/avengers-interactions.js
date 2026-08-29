/* ============================================================
   AVENGERS INTERACTIONS — SRiSHTi 2k25
   Vanilla JS only. Load after all other scripts.
   ============================================================ */
(function () {
  'use strict';

  // Bail out if theme not active
  if (!document.body.hasAttribute('data-avengers-theme')) return;

  /* ==========================================================
     0. LOADING SCREEN SEQUENCE
     ========================================================== */
  (function initLoadingScreen() {
    var overlay = document.querySelector('.avng-loading');
    if (!overlay) return;

    // Auto-dismiss after 800ms max
    var timer = setTimeout(dismiss, 800);

    // Also dismiss when page fully loaded (whichever is later)
    window.addEventListener('load', function () {
      clearTimeout(timer);
      // Small delay to ensure animation completes
      setTimeout(dismiss, 100);
    });

    function dismiss() {
      overlay.classList.add('avng-loading--done');
      // Remove from DOM after transition
      setTimeout(function () {
        if (overlay.parentNode) {
          overlay.style.display = 'none';
        }
      }, 500);
    }
  })();

  /* ==========================================================
     1. CARD 3D TILT + GLOW ON HOVER
        Disabled on touch devices via hover media query check.
     ========================================================== */
  (function initCardTilt() {
    // Only enable on devices with hover capability (no touch)
    if (!window.matchMedia('(hover: hover)').matches) return;

    var cards = document.querySelectorAll('[data-avengers-theme] .card');

    cards.forEach(function (card) {
      card.addEventListener('mousemove', handleTilt);
      card.addEventListener('mouseleave', resetTilt);
    });

    function handleTilt(e) {
      var card = this;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left; // x within card
      var y = e.clientY - rect.top;  // y within card
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;

      // Calculate rotation (max ±8 degrees)
      var rotateY = ((x - centerX) / centerX) * 8;
      var rotateX = ((centerY - y) / centerY) * 8;

      card.style.transform =
        'perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.03, 1.03, 1.03)';

      // Position glow effect relative to cursor
      var glowX = (x / rect.width) * 100;
      var glowY = (y / rect.height) * 100;

      // Determine glow color based on section
      var glowColor = getCardSectionColor(card);

      card.style.backgroundImage =
        'radial-gradient(circle at ' + glowX + '% ' + glowY + '%, ' +
        glowColor + ' 0%, transparent 60%)';
    }

    function resetTilt() {
      this.style.transform = '';
      this.style.backgroundImage = '';
    }

    function getCardSectionColor(card) {
      var section = card.closest('.workshop, [data-section="workshop"]');
      if (section) return 'rgba(242, 183, 5, 0.12)';

      section = card.closest('.paperpresentation, [data-section="paper"]');
      if (section) return 'rgba(27, 58, 107, 0.18)';

      section = card.closest('.flagship, [data-section="flagship"]');
      if (section) return 'rgba(108, 58, 199, 0.15)';

      section = card.closest('.tech-events');
      if (section) return 'rgba(242, 183, 5, 0.12)';

      section = card.closest('.nontech-events');
      if (section) return 'rgba(27, 58, 107, 0.18)';

      // Default
      return 'rgba(239, 233, 221, 0.08)';
    }
  })();

  /* ==========================================================
     2. SCROLL-REVEAL ANIMATIONS
        IntersectionObserver, staggered 80ms per card.
     ========================================================== */
  (function initScrollReveal() {
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Tag elements for reveal
    var revealTargets = document.querySelectorAll(
      '[data-avengers-theme] .card, ' +
      '[data-avengers-theme] .avng-hero-banner, ' +
      '[data-avengers-theme] #section-title'
    );

    revealTargets.forEach(function (el) {
      el.classList.add('avng-scroll-reveal');
    });

    // Group cards by their parent container for stagger
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;

          // If it's a card, calculate stagger index
          if (el.classList.contains('card')) {
            var parent = el.closest('.row');
            if (parent) {
              var siblings = parent.querySelectorAll('.card');
              var index = Array.prototype.indexOf.call(siblings, el);
              el.style.transitionDelay = (index * 80) + 'ms';
            }
          }

          el.classList.add('avng-scroll-reveal--visible');
          observer.unobserve(el); // Only animate once
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  })();

  /* ==========================================================
     3. STICKY NAV BLUR ON SCROLL
     ========================================================== */
  (function initStickyNavBlur() {
    var header = document.querySelector('[data-avengers-theme] .logoheader');
    if (!header) return;

    var scrollThreshold = 100;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          if (window.scrollY > scrollThreshold) {
            header.classList.add('avng-nav-scrolled');
          } else {
            header.classList.remove('avng-nav-scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  })();

  /* ==========================================================
     4. KEYBOARD ACCESSIBILITY — Escape closes modals
     ========================================================== */
  (function initKeyboardA11y() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        // Find all visible modals and close them
        var modals = document.querySelectorAll('.modal-window');
        modals.forEach(function (modal) {
          if (modal.style.opacity === '1' || modal.style.visibility === 'visible') {
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            modal.style.pointerEvents = 'none';
          }
        });
      }
    });

    // Make close-container divs focusable
    var closeButtons = document.querySelectorAll('.close-container');
    closeButtons.forEach(function (btn) {
      if (!btn.hasAttribute('tabindex')) {
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'Close modal');
      }
      // Allow Enter/Space to trigger close
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });

    // Make View More buttons have proper role
    var viewMoreBtns = document.querySelectorAll('.interior .btn');
    viewMoreBtns.forEach(function (btn) {
      if (!btn.hasAttribute('aria-label')) {
        var titleEl = btn.closest('.card') ?
          btn.closest('.card').querySelector('.ename') : null;
        var eventName = titleEl ? titleEl.textContent.trim() : 'event';
        btn.setAttribute('aria-label', 'View more about ' + eventName);
      }
    });
  })();

  /* ==========================================================
     5. SECTION TAG INJECTOR
        Adds diagonal corner tags to cards based on section.
     ========================================================== */
  (function injectSectionTags() {
    var sections = [
      { selector: '.workshop .card', label: 'WORKSHOP', className: 'avng-section-tag--workshop' },
      { selector: '.paperpresentation .card', label: 'PAPER', className: 'avng-section-tag--paper' },
      { selector: '.flagship .card', label: 'FLAGSHIP', className: 'avng-section-tag--flagship' },
      { selector: '.tech-events .card', label: 'TECH', className: 'avng-section-tag--workshop' },
      { selector: '.nontech-events .card', label: 'NON-TECH', className: 'avng-section-tag--paper' }
    ];

    sections.forEach(function (sec) {
      var cards = document.querySelectorAll(sec.selector);
      cards.forEach(function (card) {
        // Don't double-inject
        if (card.querySelector('.avng-section-tag')) return;

        var tag = document.createElement('span');
        tag.className = 'avng-section-tag ' + sec.className;
        tag.textContent = sec.label;
        tag.setAttribute('aria-hidden', 'true');
        card.appendChild(tag);
      });
    });
  })();
  /* ==========================================================
     6. DRIFTING PARTICLE FIELD
        25 small glowing dots, gold/white, very low opacity,
        slow upward drift. Uses CSS transform animation only
        (GPU-cheap). Killed by prefers-reduced-motion in CSS.
     ========================================================== */
  (function initParticles() {
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var container = document.createElement('div');
    container.className = 'avng-particles';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);

    var PARTICLE_COUNT = 25;

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var dot = document.createElement('div');
      dot.className = 'avng-particle';

      // Random horizontal position
      dot.style.left = (Math.random() * 100) + '%';

      // Random starting vertical position
      dot.style.bottom = -(Math.random() * 20) + '%';

      // Random animation duration (12-24s)
      var duration = 12 + Math.random() * 12;
      dot.style.animationDuration = duration + 's';

      // Random delay (0-20s)
      var delay = Math.random() * 20;
      dot.style.animationDelay = -delay + 's';

      // Slight random horizontal drift via custom property
      var xDrift = -20 + Math.random() * 40;
      dot.style.setProperty('--drift-x', xDrift + 'px');

      container.appendChild(dot);
    }
  })();

  /* ==========================================================
     7. CUSTOM MENU OVERLAY
        Handles toggling the custom .ave-menu-overlay,
        focus trapping, and Escape key functionality.
     ========================================================== */
  (function initMenuOverlay() {
    var toggleBtn = document.getElementById('aveMenuToggle');
    var overlay = document.getElementById('aveMenu');
    var closeBtn = document.getElementById('aveMenuClose');
    if (!toggleBtn || !overlay || !closeBtn) return;

    var focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    var focusableContent = overlay.querySelectorAll(focusableElements);
    var firstFocusable = focusableContent[0];
    var lastFocusable = focusableContent[focusableContent.length - 1];

    function openMenu() {
      overlay.classList.add('is-open');
      document.body.classList.add('ave-menu-open');
      overlay.setAttribute('aria-hidden', 'false');
      // Focus first element after small delay to let transition start
      setTimeout(function() {
        if (closeBtn) closeBtn.focus();
      }, 100);
    }

    function closeMenu() {
      overlay.classList.remove('is-open');
      document.body.classList.remove('ave-menu-open');
      overlay.setAttribute('aria-hidden', 'true');
      toggleBtn.focus();
    }

    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openMenu();
    });

    closeBtn.addEventListener('click', closeMenu);

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeMenu();
      }
    });

    // Escape to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeMenu();
      }
    });

    // Focus Trap
    overlay.addEventListener('keydown', function(e) {
      var isTabPressed = e.key === 'Tab' || e.keyCode === 9;
      if (!isTabPressed) return;

      if (e.shiftKey) { // shift + tab
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else { // tab
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    });
  })();

  /* ==========================================================
     8. SCROLL TO TOP (Mobile Nav Arrow Button)
     ========================================================== */
  (function initScrollToTop() {
    var scrollBtns = document.querySelectorAll('.logo-icon, #aveScrollTop');
    scrollBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    });
  })();

})();
