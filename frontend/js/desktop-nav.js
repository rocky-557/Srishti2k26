/* ============================================================
   DESKTOP NAVBAR — Scroll Effect & Active Page Detection
   ============================================================ */
(function () {
  'use strict';

  var nav = document.querySelector('.avng-desktop-nav');
  if (!nav) return;

  /* --- Scroll Effect ----------------------------------------- */
  var scrollThreshold = 50;

  function handleScroll() {
    if (window.scrollY > scrollThreshold) {
      nav.classList.add('avng-nav-scrolled');
    } else {
      nav.classList.remove('avng-nav-scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check

  /* --- Active Page Detection --------------------------------- */
  var links = nav.querySelectorAll('.avng-desktop-nav__links a');

  function getActiveSectionFromURL() {
    // Check hash first (single-page scroll navigation)
    var hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    // Legacy: check ?section= query param
    var params = new URLSearchParams(window.location.search);
    var section = params.get('section');
    if (section) return section;
    // Fall back to data-active attribute on the nav element
    return nav.getAttribute('data-active') || '';
  }

  function updateActiveNav() {
    var activePage = getActiveSectionFromURL();

    // Remove avng-nav-active from ALL links first
    links.forEach(function (link) {
      link.classList.remove('avng-nav-active');
    });

    // Add avng-nav-active only to the matching link
    if (activePage) {
      links.forEach(function (link) {
        var linkId = link.getAttribute('data-nav-id');
        if (linkId === activePage) {
          link.classList.add('avng-nav-active');
        }
      });
    }
  }

  // Run on initial load
  updateActiveNav();

  // Re-run when browser history changes (back/forward)
  window.addEventListener('popstate', updateActiveNav);
})();
