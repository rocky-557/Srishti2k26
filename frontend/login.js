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
     SEQUENTIAL PASSWORD RESET WIZARD HANDLER
  ============================================= */
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const resetModal = document.getElementById('resetModal');
  const closeResetModalBtn = document.getElementById('closeResetModalBtn');
  const cancelResetBtn = document.getElementById('cancelResetBtn');

  // Step containers
  const resetStep1 = document.getElementById('resetStep1');
  const resetStep2 = document.getElementById('resetStep2');
  const resetStep3 = document.getElementById('resetStep3');
  const stepIndicator = document.getElementById('stepIndicator');
  const resetModalTitle = document.getElementById('resetModalTitle');

  // Step 1 Form
  const verifyIdentityForm = document.getElementById('verifyIdentityForm');
  const step1Alert = document.getElementById('step1Alert');
  const btnVerifyIdentity = document.getElementById('btnVerifyIdentity');

  // Step 2 Form
  const setNewPasswordForm = document.getElementById('setNewPasswordForm');
  const step2Alert = document.getElementById('step2Alert');
  const btnSubmitNewPassword = document.getElementById('btnSubmitNewPassword');
  const btnBackToStep1 = document.getElementById('btnBackToStep1');
  const btnUseDefaultPwChip = document.getElementById('btnUseDefaultPwChip');
  const defaultPwLabel = document.getElementById('defaultPwLabel');
  const verifiedUserName = document.getElementById('verifiedUserName');
  const verifiedUserSrishtiId = document.getElementById('verifiedUserSrishtiId');

  // Step 3
  const btnFinishAndLogin = document.getElementById('btnFinishAndLogin');

  let verifiedUserData = null;

  function showResetStep(stepNum) {
    if (stepNum === 1) {
      resetStep1.style.display = 'block';
      resetStep2.style.display = 'none';
      resetStep3.style.display = 'none';
      stepIndicator.style.display = 'block';
      stepIndicator.textContent = 'Step 1 of 2';
      resetModalTitle.textContent = 'Find Your Account';
      step1Alert.style.display = 'none';
    } else if (stepNum === 2) {
      resetStep1.style.display = 'none';
      resetStep2.style.display = 'block';
      resetStep3.style.display = 'none';
      stepIndicator.style.display = 'block';
      stepIndicator.textContent = 'Step 2 of 2';
      resetModalTitle.textContent = 'Choose New Password';
      step2Alert.style.display = 'none';
      document.getElementById('step2NewPassword').value = '';
      document.getElementById('step2ConfirmPassword').value = '';
    } else if (stepNum === 3) {
      resetStep1.style.display = 'none';
      resetStep2.style.display = 'none';
      resetStep3.style.display = 'block';
      stepIndicator.style.display = 'none';
      resetModalTitle.textContent = 'Success!';
    }
  }

  if (forgotPasswordBtn && resetModal) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetModal.style.display = 'flex';
      verifyIdentityForm.reset();
      showResetStep(1);
    });

    [closeResetModalBtn, cancelResetBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        resetModal.style.display = 'none';
      });
    });

    // Step 1: Verify Identity
    verifyIdentityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnVerifyIdentity.disabled = true;
      btnVerifyIdentity.innerHTML = '<span>Verifying...</span>';

      const identifier = document.getElementById('resetIdentifier').value.trim();
      const mobile = document.getElementById('resetMobile').value.trim();

      try {
        const res = await fetch('/api/auth/verify-identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, mobile })
        });
        const data = await res.json();

        if (data.status === 'success') {
          verifiedUserData = {
            identifier,
            mobile,
            name: data.name,
            srishtiId: data.srishtiId,
            defaultSuggestion: data.defaultSuggestion
          };

          verifiedUserName.textContent = data.name;
          verifiedUserSrishtiId.textContent = data.srishtiId;
          defaultPwLabel.textContent = data.defaultSuggestion;
          showResetStep(2);
        } else {
          step1Alert.style.background = 'rgba(226, 54, 54, 0.15)';
          step1Alert.style.border = '1px solid #ff6b6b';
          step1Alert.style.color = '#ff6b6b';
          step1Alert.textContent = data.message || 'Account not found. Please verify details.';
          step1Alert.style.display = 'block';
        }
      } catch (err) {
        step1Alert.style.background = 'rgba(226, 54, 54, 0.15)';
        step1Alert.style.border = '1px solid #ff6b6b';
        step1Alert.style.color = '#ff6b6b';
        step1Alert.textContent = 'Connection error: ' + err.message;
        step1Alert.style.display = 'block';
      } finally {
        btnVerifyIdentity.disabled = false;
        btnVerifyIdentity.innerHTML = '<span>Verify Account &rarr;</span>';
      }
    });

    // Step 2: Back button
    btnBackToStep1.addEventListener('click', () => {
      showResetStep(1);
    });

    // Step 2: Quick default button
    btnUseDefaultPwChip.addEventListener('click', () => {
      if (verifiedUserData && verifiedUserData.defaultSuggestion) {
        document.getElementById('step2NewPassword').value = verifiedUserData.defaultSuggestion;
        document.getElementById('step2ConfirmPassword').value = verifiedUserData.defaultSuggestion;
      }
    });

    // Step 2: Submit New Password
    setNewPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('step2NewPassword').value.trim();
      const confirmPassword = document.getElementById('step2ConfirmPassword').value.trim();

      if (newPassword.length < 8) {
        step2Alert.style.background = 'rgba(226, 54, 54, 0.15)';
        step2Alert.style.border = '1px solid #ff6b6b';
        step2Alert.style.color = '#ff6b6b';
        step2Alert.textContent = 'Password must be at least 8 characters long.';
        step2Alert.style.display = 'block';
        return;
      }

      if (newPassword !== confirmPassword) {
        step2Alert.style.background = 'rgba(226, 54, 54, 0.15)';
        step2Alert.style.border = '1px solid #ff6b6b';
        step2Alert.style.color = '#ff6b6b';
        step2Alert.textContent = 'Passwords do not match.';
        step2Alert.style.display = 'block';
        return;
      }

      btnSubmitNewPassword.disabled = true;
      btnSubmitNewPassword.innerHTML = '<span>Updating...</span>';

      try {
        const res = await fetch('/api/auth/quick-reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: verifiedUserData.identifier,
            mobile: verifiedUserData.mobile,
            newPassword,
            confirmPassword
          })
        });
        const data = await res.json();

        if (data.status === 'success') {
          showResetStep(3);
          document.getElementById('email').value = verifiedUserData.identifier;
          document.getElementById('password').value = newPassword;
        } else {
          step2Alert.style.background = 'rgba(226, 54, 54, 0.15)';
          step2Alert.style.border = '1px solid #ff6b6b';
          step2Alert.style.color = '#ff6b6b';
          step2Alert.textContent = data.message || 'Failed to update password.';
          step2Alert.style.display = 'block';
        }
      } catch (err) {
        step2Alert.style.background = 'rgba(226, 54, 54, 0.15)';
        step2Alert.style.border = '1px solid #ff6b6b';
        step2Alert.style.color = '#ff6b6b';
        step2Alert.textContent = 'Connection error: ' + err.message;
        step2Alert.style.display = 'block';
      } finally {
        btnSubmitNewPassword.disabled = false;
        btnSubmitNewPassword.innerHTML = '<span>Update Password</span>';
      }
    });

    // Step 3: Finish and Login button
    btnFinishAndLogin.addEventListener('click', () => {
      resetModal.style.display = 'none';
      document.getElementById('loginBtn').click();
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
