document.addEventListener('DOMContentLoaded', () => {

  /* =============================================
     FORM VALIDATION
  ============================================= */
  const form = document.getElementById('loginForm');
  const idInput = document.getElementById('srishtiId');
  const phoneInput = document.getElementById('phone');

  // Prefill when arriving from signup ("already registered") or a shared link
  const prefill = new URLSearchParams(window.location.search);
  const prefillId = prefill.get('srishtiId');
  const prefillPhone = prefill.get('phone');
  if (prefillId && idInput) idInput.value = prefillId;
  if (prefillPhone && phoneInput) phoneInput.value = prefillPhone.replace(/\D/g, '').slice(-10);

  // Field 1 accepts EITHER a valid email OR an S-ID (any digits, e.g. 1024 / SRiSHTi251024)
  const validators = {
    srishtiid: v => {
      if (!v) return false;
      const t = v.trim();
      if (!t) return false;
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return true;          // email
      return t.replace(/\D/g, '').length >= 1;                          // S-ID
    },
    phone: v => v && v.replace(/\D/g, '').length === 10
  };

  function showError(id) {
    const g = document.getElementById(`group-${id}`);
    if (g) g.classList.add('error');
  }

  function clearError(id) {
    const g = document.getElementById(`group-${id}`);
    if (g) g.classList.remove('error');
  }

  [idInput, phoneInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => {
      const key = el.id === 'srishtiId' ? 'srishtiid' : 'phone';
      if (validators[key](el.value)) clearError(key);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    if (!validators.srishtiid(idInput.value)) {
      showError('srishtiid');
      valid = false;
    } else {
      clearError('srishtiid');
    }

    if (!validators.phone(phoneInput.value)) {
      showError('phone');
      valid = false;
    } else {
      clearError('phone');
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
        srishtiId: idInput.value.trim(),
        phone: phoneInput.value.replace(/\D/g, '').slice(-10)
      })
    })
      .then(res => res.text())
      .then(text => {
        if (text === 'true' || text.includes('success')) {
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect') || 'profile.html';
          window.location.href = redirect;
        } else {
          showError('srishtiid');
          showError('phone');
          alert('No account found with this SRiSHTi ID / email + mobile number combination. Please check your details or sign up first.');
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
