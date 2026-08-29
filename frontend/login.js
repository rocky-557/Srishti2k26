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
     FORGOT PASSWORD HANDLER (Redirect to Contact Section)
  ============================================= */
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'home.html#contact';
    });
  }

  /* =============================================
     FORM VALIDATION
  ============================================= */
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');

  const validators = {
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: v => v.trim().length > 0
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
        alert('Invalid email or password. Please try again.');
      } else if (text === 'email' || text.includes('not registered') || text.includes('User not found')) {
        showError('email');
        alert('No account found with this email. Please register first.');
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
