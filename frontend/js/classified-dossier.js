/**
 * CLASSIFIED AVENGERS EVENT CARDS & DOSSIER EXPERIENTIAL JS SYSTEM
 * S.H.I.E.L.D. Command & Stark HUD Interactive Engine
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initSpotlightEffect();
        initDossierModals();
        initAccessibility();
        initScrollSpy();
    });

    /**
     * ScrollSpy for Navbar Active Section Underline & Theme Update
     */
    function initScrollSpy() {
        const sections = document.querySelectorAll('#workshop, #paperpresentation, #flagship');
        const nav = document.querySelector('.avng-desktop-nav');
        if (!sections.length || !nav) return;

        const observerOptions = {
            root: null,
            rootMargin: '-25% 0px -45% 0px',
            threshold: 0.15
        };

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    nav.setAttribute('data-active', id);
                    if (window.setCinematicTheme) {
                        window.setCinematicTheme(id);
                    }
                }
            });
        }, observerOptions);

        sections.forEach(function (sec) {
            observer.observe(sec);
        });
    }

    /**
     * 1. Interactive Cursor Color Reveal Spotlight Effect
     */
    function initSpotlightEffect() {
        const imageWraps = document.querySelectorAll('.avng-card-img-wrap');

        imageWraps.forEach(function (wrap) {
            wrap.addEventListener('mousemove', function (e) {
                const rect = wrap.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                wrap.style.setProperty('--mouse-x', x.toFixed(2) + '%');
                wrap.style.setProperty('--mouse-y', y.toFixed(2) + '%');
                wrap.classList.add('spotlight-active');
            });

            wrap.addEventListener('mouseenter', function () {
                wrap.classList.add('spotlight-active');
            });

            wrap.addEventListener('mouseleave', function () {
                wrap.classList.remove('spotlight-active');
            });

            // Touch support for mobile devices
            wrap.addEventListener('touchmove', function (e) {
                if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    const rect = wrap.getBoundingClientRect();
                    const x = ((touch.clientX - rect.left) / rect.width) * 100;
                    const y = ((touch.clientY - rect.top) / rect.height) * 100;

                    wrap.style.setProperty('--mouse-x', x.toFixed(2) + '%');
                    wrap.style.setProperty('--mouse-y', y.toFixed(2) + '%');
                    wrap.classList.add('spotlight-active');
                }
            }, { passive: true });
        });
    }

    /**
     * 2. Inline Expanding Dossier Folder Component (No Popups / No Modals)
     */
    function initDossierModals() {
        // Intercept all VIEW MORE / Mission Dossier button clicks
        const dossierButtons = document.querySelectorAll('.btn-mission-dossier, [data-dossier-target]');

        dossierButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const cardCol = btn.closest('.avng-card-col');
                if (!cardCol) return;

                // Close any currently expanded folder first for clean single expansion
                document.querySelectorAll('.avng-card-col.is-expanded').forEach(function (col) {
                    if (col !== cardCol) {
                        col.classList.remove('is-expanded');
                    }
                });

                // Toggle expansion on target card
                cardCol.classList.add('is-expanded');

                if (window.SrishtiApp && SrishtiApp.Auth) {
                    updateCardRegistrationStatus(SrishtiApp.Auth.getUser());
                }

                // Smoothly scroll to bring the top of the expanded card folder into comfortable view
                const cardTop = cardCol.getBoundingClientRect().top + window.pageYOffset - 90;
                window.scrollTo({
                    top: cardTop,
                    behavior: 'smooth'
                });
            });
        });

        // Close button handlers inside expanded dossier panels
        document.addEventListener('click', function (e) {
            const closeBtn = e.target.closest('.btn-dossier-close');
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();

                const cardCol = closeBtn.closest('.avng-card-col');
                if (cardCol) {
                    cardCol.classList.remove('is-expanded');
                }
            }
        });

        // Update status on all cards based on user session
        // Three states for workshops (pay-later supported):
        //   paid → REGISTERED | registered-unpaid → REGISTERED ✓ — PAY NOW | else REGISTER NOW
        const cleanTitle = (t) => String(t || '').replace(/\s+/g, ' ').trim();
        const EMS_REGISTER_URL = 'https://events.psginstitutions.in/EMS/register/696AE7EB187';
        function updateCardRegistrationStatus(user) {
            if (!user) return;
            const paidWorkshops = user.paidWorkshops || [];
            const allConfirmed = [...paidWorkshops];

            document.querySelectorAll('.avng-card, .avng-card-col').forEach(card => {
                const titleEl = card.querySelector('.avng-card-title');
                if (!titleEl) return;
                const title = titleEl.textContent.trim();
                const badgeEl = card.querySelector('.avng-card-badge, .avng-card-category');
                const category = badgeEl ? badgeEl.textContent.trim().toUpperCase() : 'WORKSHOP';
                const regBtn = card.querySelector('.btn-dossier-register');
                if (!regBtn) return;

                // Check if workshop is paid/confirmed
                if (category.includes('WORKSHOP') || (!category.includes('PAPER') && !category.includes('FLAGSHIP'))) {
                    const normTitle = cleanTitle(title).toLowerCase();
                    const isPaid = allConfirmed.some(w => cleanTitle(w).toLowerCase() === normTitle);
                    if (isPaid) {
                        regBtn.textContent = 'REGISTERED';
                        regBtn.classList.add('btn-registered');
                        regBtn.classList.remove('btn-pay-now');
                    } else {
                        const myWorkshops = user.workshops || [];
                        const isRegistered = myWorkshops.some(w => cleanTitle(w.name || w).toLowerCase() === normTitle);
                        if (isRegistered) {
                            regBtn.textContent = 'REGISTERED ✓ — PAY NOW';
                            regBtn.classList.add('btn-registered', 'btn-pay-now');
                        }
                    }
                } else if (category.includes('PAPER')) {
                    const papers = user.papers || [];
                    if (papers.some(p => p.toLowerCase() === title.toLowerCase())) {
                        regBtn.textContent = 'REGISTERED';
                        regBtn.classList.add('btn-registered');
                    }
                } else if (category.includes('FLAGSHIP') || category.includes('BOT')) {
                    const flagship = user.flagship || [];
                    if (flagship.some(f => f.toLowerCase() === title.toLowerCase())) {
                        regBtn.textContent = 'REGISTERED';
                        regBtn.classList.add('btn-registered');
                    }
                }
            });
        }

        // Auto-run status check if user is already loaded
        if (window.SrishtiApp && SrishtiApp.Auth) {
            const user = SrishtiApp.Auth.getUser();
            if (user) {
                updateCardRegistrationStatus(user);
            } else {
                SrishtiApp.Auth.checkSession().then(updateCardRegistrationStatus);
            }
        }

        document.addEventListener('srishti:session', function(e) {
            updateCardRegistrationStatus(e.detail);
        });

        // Dynamic registration click handler for modern dossier cards
        document.addEventListener('click', async function (e) {
            const regBtn = e.target.closest('.btn-dossier-register');
            if (regBtn) {
                e.preventDefault();
                e.stopPropagation();

                const card = regBtn.closest('.avng-card') || regBtn.closest('.avng-card-col');
                if (!card) return;

                const titleEl = card.querySelector('.avng-card-title');
                const badgeEl = card.querySelector('.avng-card-badge, .avng-card-category');
                const title = titleEl ? titleEl.textContent.trim() : '';
                const category = badgeEl ? badgeEl.textContent.trim().toUpperCase() : 'WORKSHOP';

                // Check authentication state
                let user = (window.SrishtiApp && SrishtiApp.Auth) ? SrishtiApp.Auth.getUser() : null;
                if (!user && window.SrishtiApp && SrishtiApp.Auth) {
                    user = await SrishtiApp.Auth.checkSession();
                }

                // 1. IF NOT LOGGED IN -> Redirect to login page
                if (!user) {
                    alert('Please log in to your account to register for ' + title);
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }

                // 2. CHECK IF ALREADY REGISTERED & PAID
                const paidWorkshops = user.paidWorkshops || [];
                const normTitle = cleanTitle(title).toLowerCase();
                const isAlreadyPaid = paidWorkshops.some(w => cleanTitle(w).toLowerCase() === normTitle);
                if (isAlreadyPaid) {
                    alert('You are already registered and confirmed for ' + title + '!');
                    return;
                }

                // 3. WORKSHOPS: pay-later supported — register instantly, pay now or later
                if (category.includes('WORKSHOP') || (!category.includes('PAPER') && !category.includes('FLAGSHIP'))) {
                    // Already registered but unpaid → this click means PAY NOW on EMS
                    if (regBtn.classList.contains('btn-pay-now')) {
                        window.open(EMS_REGISTER_URL, '_blank');
                        return;
                    }
                    regBtn.disabled = true;
                    regBtn.textContent = 'REGISTERING...';
                    try {
                        const result = window.SrishtiApp && SrishtiApp.Reg
                            ? await SrishtiApp.Reg.registerWorkshop(cleanTitle(title))
                            : { success: false, message: 'Registration module unavailable.' };
                        if (result.success) {
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTERED ✓ — PAY NOW';
                            regBtn.classList.add('btn-registered', 'btn-pay-now');
                            alert(`Registered for "${cleanTitle(title)}"!\n\nTap PAY NOW to pay on the EMS Portal, or pay later anytime from your Profile page.`);
                        } else if (result.already) {
                            // Backend reports fees already paid for this workshop
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTERED';
                            regBtn.classList.add('btn-registered');
                            regBtn.classList.remove('btn-pay-now');
                            alert('You are already registered and confirmed for ' + cleanTitle(title) + '!');
                        } else if (result.needLogin) {
                            alert(result.message);
                            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
                        } else {
                            alert(result.message || 'Workshop registration failed.');
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTER NOW';
                        }
                    } catch (err) {
                        alert('Network error. Please try again.');
                        regBtn.disabled = false;
                        regBtn.textContent = 'REGISTER NOW';
                    }
                    return;
                }

                // 4. PAPER PRESENTATIONS
                if (category.includes('PAPER')) {
                    alert("Important Note: No payment is required for Round 1 submission. Payment (₹150) is only required if you are shortlisted for Round 2.");
                    regBtn.disabled = true;
                    regBtn.textContent = 'REGISTERING...';
                    try {
                        const result = await SrishtiApp.Reg.registerPaper(title);
                        if (result.success) {
                            alert(result.message);
                            regBtn.textContent = 'REGISTERED';
                            regBtn.classList.add('btn-registered');
                        } else if (result.genfee) {
                            const goToEms = confirm("General Registration is required to register for Paper Presentation / Project Expo.\n\nWould you like to proceed to the EMS Payment Portal now?");
                            if (goToEms) {
                                window.open('https://events.psginstitutions.in/EMS/register/696AE7EB187', '_blank');
                            }
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTER NOW';
                        } else {
                            alert(result.message || 'Registration failed.');
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTER NOW';
                        }
                    } catch (err) {
                        regBtn.disabled = false;
                        regBtn.textContent = 'REGISTER NOW';
                    }
                    return;
                }

                // 5. FLAGSHIP EVENTS
                if (category.includes('FLAGSHIP') || category.includes('BOT')) {
                    regBtn.disabled = true;
                    regBtn.textContent = 'REGISTERING...';
                    try {
                        const result = await SrishtiApp.Reg.registerFlagship(title);
                        if (result.success) {
                            alert(result.message);
                            regBtn.textContent = 'REGISTERED';
                            regBtn.classList.add('btn-registered');
                        } else if (result.genfee) {
                            const goToEms = confirm("General Registration is required to participate in Flagship events.\n\nWould you like to proceed to the EMS Payment Portal now?");
                            if (goToEms) {
                                window.open('https://events.psginstitutions.in/EMS/register/696AE7EB187', '_blank');
                            }
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTER NOW';
                        } else {
                            alert(result.message || 'Registration failed.');
                            regBtn.disabled = false;
                            regBtn.textContent = 'REGISTER NOW';
                        }
                    } catch (err) {
                        regBtn.disabled = false;
                        regBtn.textContent = 'REGISTER NOW';
                    }
                }
            }
        });
    }

    /**
     * 3. Accessibility Controls (Keyboard ESC)
     */
    function initAccessibility() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                // Handle collapse for inline folders
                const expanded = document.querySelector('.avng-card-col.is-expanded');
                if (expanded) {
                    expanded.classList.remove('is-expanded');
                }
            }
        });
    }

    // Expose utility to global window scope for inline button fallbacks
    window.openClassifiedDossier = function (modalId) {
        // Fallback or empty logic if necessary
    };

    window.closeClassifiedDossier = function (modalId) {
        if (modal) closeDossierModal(modal);
    };

})();
