/**
 * SRiSHTi 2K26 — Shared Application Module
 * Connected to Node.js / Express backend with MongoDB persistence.
 */

window.SrishtiApp = (() => {
    'use strict';

    let currentUser = null;

    const API = {
        session: '/api/auth/session',
        login: '/api/auth/login',
        signup: '/api/auth/signup',
        logout: '/api/auth/logout',
        profile: '/api/user/profile',
        eventReg: '/api/register/event',
        workshopReg: '/api/register/workshop',
        paperReg: '/api/register/paper',
        flagshipReg: '/api/register/flagship'
    };

    // ===================== AUTH MODULE =====================
    const Auth = {
        async checkSession() {
            try {
                const res = await fetch(API.session, { credentials: 'same-origin' });
                const data = await res.json();
                currentUser = data.loggedIn ? data.user : null;
                Nav.updateAuthButton();
                document.dispatchEvent(new CustomEvent('srishti:session', { detail: currentUser }));
                return currentUser;
            } catch (err) {
                console.warn('Session check error:', err);
                currentUser = null;
                Nav.updateAuthButton();
                document.dispatchEvent(new CustomEvent('srishti:session', { detail: null }));
                return null;
            }
        },

        async login(email, password) {
            if (!email || !password) {
                return { success: false, message: 'Please fill in all fields.' };
            }
            try {
                const res = await fetch(API.login, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email, password })
                });
                const text = await res.text();
                if (text === 'true' || text.includes('success')) {
                    await this.checkSession();
                    return { success: true, message: 'Login successful!' };
                } else if (text === 'pass') {
                    return { success: false, message: 'Incorrect password.' };
                } else if (text === 'email') {
                    return { success: false, message: 'Email not found.' };
                } else {
                    return { success: false, message: text || 'Login failed.' };
                }
            } catch (err) {
                return { success: false, message: 'Server connection error.' };
            }
        },

        isLoggedIn() {
            return currentUser !== null;
        },

        getUser() {
            return currentUser;
        },

        async logout() {
            try {
                await fetch(API.logout, { method: 'POST', credentials: 'same-origin' });
            } catch (e) {}
            currentUser = null;
            window.location.href = 'home.html';
        }
    };

    // ===================== REGISTRATION MODULE =====================
    const Reg = {
        async registerEvent(eventName) {
            try {
                const res = await fetch(API.eventReg, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ evname: eventName })
                });
                const text = await res.text();
                if (text === 'true') return { success: true, message: 'You have successfully registered for ' + eventName + '!' };
                if (text === 'rem' || text === 'already') return { success: false, already: true, message: 'You are already registered for this event.' };
                if (text === 'genfee') return { success: false, genfee: true, message: 'General fee payment required.' };
                if (text === 'full') return { success: false, message: 'Sorry, all slots are full for this event.' };
                if (text === 'false') return { success: false, needLogin: true, message: 'Please log in to register for ' + eventName + '.' };
                return { success: false, message: text || 'Registration failed.' };
            } catch (err) {
                return { success: false, message: 'Network error. Please try again.' };
            }
        },

        async registerWorkshop(wsName) {
            try {
                const res = await fetch(API.workshopReg, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ wsname: wsName })
                });
                const text = await res.text();
                if (text === 'true') return { success: true, message: 'You have successfully registered for ' + wsName + '!' };
                if (text === 'rem' || text === 'already') return { success: false, already: true, message: 'You are already registered for this workshop.' };
                if (text === 'full') return { success: false, message: 'Sorry, all slots are full for this workshop.' };
                if (text === 'false') return { success: false, needLogin: true, message: 'Please log in to register for ' + wsName + '.' };
                return { success: false, message: text || 'Workshop registration failed.' };
            } catch (err) {
                return { success: false, message: 'Network error. Please try again.' };
            }
        },

        async registerPaper(paperName) {
            try {
                const res = await fetch(API.paperReg, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ ppname: paperName })
                });
                const text = await res.text();
                if (text === 'true') return { success: true, message: 'Paper registered successfully!' };
                if (text === 'rem' || text === 'already') return { success: false, already: true, message: 'You are already registered for this paper presentation.' };
                if (text === 'genfee') return { success: false, genfee: true, message: 'General fee required.' };
                if (text === 'false') return { success: false, needLogin: true, message: 'Please log in to register for ' + paperName + '.' };
                return { success: false, message: text || 'Paper registration failed.' };
            } catch (err) {
                return { success: false, message: 'Network error. Please try again.' };
            }
        },

        async registerFlagship(flagshipName) {
            try {
                const res = await fetch(API.flagshipReg, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ flname: flagshipName })
                });
                const text = await res.text();
                if (text === 'true') return { success: true, message: 'Flagship event registered successfully!' };
                if (text === 'rem' || text === 'already') return { success: false, already: true, message: 'You are already registered for this flagship event.' };
                if (text === 'genfee') return { success: false, genfee: true, message: 'General fee required.' };
                if (text === 'false') return { success: false, needLogin: true, message: 'Please log in to register for ' + flagshipName + '.' };
                return { success: false, message: text || 'Flagship registration failed.' };
            } catch (err) {
                return { success: false, message: 'Network error. Please try again.' };
            }
        }
    };

    // ===================== NAV MODULE =====================
    const Nav = {
        updateAuthButton() {
            const user = Auth.getUser();
            const navAuthSlots = document.querySelectorAll(
                '.nav-auth-slot, [data-user-nav], .avng-desktop-nav__register, .ave-nav-register, #loginBtn'
            );

            if (user) {
                const firstName = user.name ? user.name.split(' ')[0] : 'Profile';
                navAuthSlots.forEach(slot => {
                    slot.innerHTML = `
                        <a href="profile.html" class="nav-user-badge" style="color:#ffb700; text-decoration:none; font-weight:700; padding: 6px 14px; border: 1px solid rgba(255, 183, 0, 0.4); border-radius: 4px; background: rgba(255, 183, 0, 0.1); display: inline-block;">
                            ${firstName}
                        </a>
                    `;
                });
            } else {
                navAuthSlots.forEach(slot => {
                    if (slot.classList.contains('avng-desktop-nav__register')) {
                        slot.innerHTML = `<a href="register.html">Register Now</a>`;
                    }
                });
            }
        },

        updateUserNavLink() {
            this.updateAuthButton();
        },

        init() {
            Auth.checkSession();
        }
    };

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Nav.init);
    } else {
        Nav.init();
    }

    return {
        Auth,
        Reg,
        Nav,
        API
    };
})();

var SrishtiApp = window.SrishtiApp;
