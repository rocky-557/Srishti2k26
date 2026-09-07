document.addEventListener('DOMContentLoaded', () => {

  /* =============================================
     TYPEWRITER ENGINE
  ============================================= */
  const CHAR_SPEED = 10; // snappy speed matching registration page

  const twElements = Array.from(document.querySelectorAll('[data-typewriter]'));
  const originalTexts = twElements.map(el => {
    const text = el.textContent.trim();
    el.textContent = '';
    return text;
  });

  const cursor = document.createElement('span');
  cursor.className = 'tw-cursor';

  function typeElement(index) {
    if (index >= twElements.length) {
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      return;
    }

    const el = twElements[index];
    const text = originalTexts[index];
    el.appendChild(cursor);

    let charIndex = 0;

    function typeNextChar() {
      if (charIndex < text.length) {
        const charNode = document.createTextNode(text[charIndex]);
        el.insertBefore(charNode, cursor);
        charIndex++;
        setTimeout(typeNextChar, CHAR_SPEED);
      } else {
        setTimeout(() => typeElement(index + 1), CHAR_SPEED * 4);
      }
    }

    typeNextChar();
  }

  setTimeout(() => typeElement(0), 300);

  /* =============================================
     PASSWORD VISIBILITY TOGGLE
  ============================================= */
  const toggleBtn = document.querySelector('.toggle-password');
  const passwordInput = document.getElementById('password');

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      // Update eye icon state
      if (isPassword) {
        toggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        toggleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  }

  /* =============================================
     QUICK PASSWORD RESET MODAL HANDLER
  ============================================= */
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const resetModal = document.getElementById('resetModal');
  const closeResetModalBtn = document.getElementById('closeResetModalBtn');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const quickResetForm = document.getElementById('quickResetForm');
  const resetStatusAlert = document.getElementById('resetStatusAlert');

  if (forgotPasswordBtn && resetModal) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetModal.style.display = 'flex';
      resetStatusAlert.style.display = 'none';
      quickResetForm.reset();
    });

    [closeResetModalBtn, cancelResetBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        resetModal.style.display = 'none';
      });
    });

    quickResetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitQuickResetBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Verifying &amp; Resetting...</span>';

      const payload = {
        identifier: document.getElementById('resetIdentifier').value.trim(),
        mobile: document.getElementById('resetMobile').value.trim(),
        newPassword: document.getElementById('resetNewPassword').value.trim()
      };

      try {
        const res = await fetch('/api/auth/quick-reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === 'success') {
          resetStatusAlert.style.background = 'rgba(94, 255, 122, 0.15)';
          resetStatusAlert.style.border = '1px solid #5eff7a';
          resetStatusAlert.style.color = '#5eff7a';
          resetStatusAlert.innerHTML = `<strong>${data.message}</strong>`;
          resetStatusAlert.style.display = 'block';

          setTimeout(() => {
            resetModal.style.display = 'none';
            document.getElementById('email').value = payload.identifier;
            if (data.password) {
              document.getElementById('password').value = data.password;
            }
          }, 2000);
        } else {
          resetStatusAlert.style.background = 'rgba(226, 54, 54, 0.15)';
          resetStatusAlert.style.border = '1px solid #ff6b6b';
          resetStatusAlert.style.color = '#ff6b6b';
          resetStatusAlert.textContent = data.message || 'Verification failed.';
          resetStatusAlert.style.display = 'block';
        }
      } catch (err) {
        resetStatusAlert.style.background = 'rgba(226, 54, 54, 0.15)';
        resetStatusAlert.style.border = '1px solid #ff6b6b';
        resetStatusAlert.style.color = '#ff6b6b';
        resetStatusAlert.textContent = 'Connection error: ' + err.message;
        resetStatusAlert.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Reset Password</span>';
      }
    });
  }

  /* =============================================
     FORM VALIDATION
  ============================================= */
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');

  const validators = {
    email: v => v && v.trim().length >= 2,
    password: v => v && v.trim().length > 0
  };

  function showError(id) {
    const g = document.getElementById(`group-${id}`);
    if (g) g.classList.add('error');
  }

  function clearError(id) {
    const g = document.getElementById(`group-${id}`);
    if (g) g.classList.remove('error');
  }

  [emailInput, passwordInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (validators[el.id](el.value)) {
        clearError(el.id);
      }
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    if (!validators.email(emailInput.value)) {
      showError('email');
      valid = false;
    } else {
      clearError('email');
    }

    if (!validators.password(passwordInput.value)) {
      showError('password');
      valid = false;
    } else {
      clearError('password');
    }

    if (!valid) return;

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: emailInput.value.trim(),
        username: emailInput.value.trim(),
        password: passwordInput.value
      })
    })
    .then(res => res.text())
    .then(text => {
      if (text === 'true' || text.includes('success')) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'profile.html';
        window.location.href = redirect;
      } else if (text === 'pass' || text.includes('Invalid') || text.includes('Incorrect')) {
        showError('password');
        alert('Incorrect password. Please try again or reset your password.');
      } else if (text === 'false' || text === 'email' || text.includes('not registered') || text.includes('User not found')) {
        showError('email');
        alert('No registered account found with this Email / SRiSHTi ID / Mobile. Please sign up or check your details.');
      } else {
        alert('Login failed: ' + text);
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      alert('Unable to connect to server. Please try again later.');
    })
    .finally(() => {
      btn.disabled = false;
      btn.textContent = 'Login';
    });
  });

});
