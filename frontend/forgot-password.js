document.addEventListener('DOMContentLoaded', () => {

  /* =============================================
     TYPEWRITER ENGINE
  ============================================= */
  const CHAR_SPEED = 10;
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
     ELEMENT REFERENCES
  ============================================= */
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');

  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const emailOrPhoneInput = document.getElementById('emailOrPhone');
  const groupEmailOrPhone = document.getElementById('group-emailOrPhone');
  const sendOtpBtn = document.getElementById('sendOtpBtn');

  const otpForm = document.getElementById('otpForm');
  const otpContainer = document.getElementById('otpContainer');
  const otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
  const groupOtp = document.getElementById('group-otp');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const timerDisplay = document.getElementById('timerDisplay');
  const backToStep1Btn = document.getElementById('backToStep1Btn');

  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const groupNewPassword = document.getElementById('group-newPassword');
  const groupConfirmPassword = document.getElementById('group-confirmPassword');
  const strengthWrap = document.getElementById('strengthWrap');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  const resetPasswordBtn = document.getElementById('resetPasswordBtn');

  const successModal = document.getElementById('successModal');

  let timerInterval = null;

  /* =============================================
     STEP 1: SEND OTP HANDLER
  ============================================= */
  function validateEmailOrPhone(val) {
    const value = val.trim();
    if (!value) return false;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = /^[+\d\s-]{7,15}$/.test(value);
    return isEmail || isPhone;
  }

  emailOrPhoneInput.addEventListener('input', () => {
    if (validateEmailOrPhone(emailOrPhoneInput.value)) {
      groupEmailOrPhone.classList.remove('error');
    }
  });

  forgotPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = emailOrPhoneInput.value;

    if (!validateEmailOrPhone(value)) {
      groupEmailOrPhone.classList.add('error');
      emailOrPhoneInput.focus();
      return;
    }

    groupEmailOrPhone.classList.remove('error');
    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<span>Sending OTP...</span>';

    setTimeout(() => {
      // Transition to Step 2
      step1.classList.remove('step-active');
      step1.classList.add('step-hidden');

      step2.classList.remove('step-hidden');
      step2.classList.add('step-active');

      sendOtpBtn.disabled = false;
      sendOtpBtn.innerHTML = '<span>Send OTP</span>';

      // Start Countdown Timer & focus first OTP box
      startTimer(60);
      if (otpBoxes[0]) {
        otpBoxes[0].focus();
      }
    }, 600);
  });

  /* =============================================
     STEP 2: OTP INPUT AUTOMATION
  ============================================= */
  otpBoxes.forEach((box, idx) => {
    // Handle typing / input
    box.addEventListener('input', (e) => {
      const val = box.value.replace(/\D/g, '');
      box.value = val ? val[val.length - 1] : '';

      if (box.value) {
        box.classList.add('filled');
        groupOtp.classList.remove('error');
        // Auto focus next box
        if (idx < otpBoxes.length - 1) {
          otpBoxes[idx + 1].focus();
        }
      } else {
        box.classList.remove('filled');
      }
    });

    // Handle Backspace navigation
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!box.value && idx > 0) {
          otpBoxes[idx - 1].focus();
          otpBoxes[idx - 1].value = '';
          otpBoxes[idx - 1].classList.remove('filled');
        } else {
          box.value = '';
          box.classList.remove('filled');
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        otpBoxes[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < otpBoxes.length - 1) {
        otpBoxes[idx + 1].focus();
      }
    });

    // Handle Clipboard Paste
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const clipboardData = (e.clipboardData || window.clipboardData).getData('text');
      const digits = clipboardData.replace(/\D/g, '').slice(0, 6);

      if (digits.length > 0) {
        digits.split('').forEach((digit, i) => {
          if (otpBoxes[i]) {
            otpBoxes[i].value = digit;
            otpBoxes[i].classList.add('filled');
          }
        });
        groupOtp.classList.remove('error');

        const nextIndex = Math.min(digits.length, otpBoxes.length - 1);
        otpBoxes[nextIndex].focus();
      }
    });
  });

  /* =============================================
     COUNTDOWN TIMER & RESEND HANDLER
  ============================================= */
  function startTimer(seconds) {
    if (timerInterval) clearInterval(timerInterval);

    let timeLeft = seconds;
    resendOtpBtn.disabled = true;

    function updateDisplay() {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    updateDisplay();

    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerDisplay.textContent = '00:00';
        resendOtpBtn.disabled = false;
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  resendOtpBtn.addEventListener('click', () => {
    if (resendOtpBtn.disabled) return;

    // Reset OTP boxes
    otpBoxes.forEach(box => {
      box.value = '';
      box.classList.remove('filled');
    });

    startTimer(60);
    otpBoxes[0].focus();
  });

  /* =============================================
     BACK TO STEP 1 BUTTON
  ============================================= */
  backToStep1Btn.addEventListener('click', () => {
    if (timerInterval) clearInterval(timerInterval);

    step2.classList.remove('step-active');
    step2.classList.add('step-hidden');

    step1.classList.remove('step-hidden');
    step1.classList.add('step-active');

    emailOrPhoneInput.focus();
  });

  /* =============================================
     STEP 2 SUBMIT: VERIFY OTP -> TRANSITION TO STEP 3
  ============================================= */
  otpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const otpValue = otpBoxes.map(b => b.value).join('');

    if (otpValue.length < 6) {
      groupOtp.classList.add('error');
      const firstEmptyIndex = otpBoxes.findIndex(b => !b.value);
      if (firstEmptyIndex !== -1) {
        otpBoxes[firstEmptyIndex].focus();
      }
      return;
    }

    groupOtp.classList.remove('error');
    verifyOtpBtn.disabled = true;
    verifyOtpBtn.innerHTML = '<span>Verifying...</span>';

    setTimeout(() => {
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.innerHTML = '<span>Verify OTP</span>';
      
      // Transition from Step 2 to Step 3 (Reset Password)
      step2.classList.remove('step-active');
      step2.classList.add('step-hidden');

      step3.classList.remove('step-hidden');
      step3.classList.add('step-active');

      newPasswordInput.focus();
    }, 600);
  });

  /* =============================================
     PASSWORD VISIBILITY TOGGLES
  ============================================= */
  const toggleBtns = document.querySelectorAll('.toggle-password');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      if (isPassword) {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    });
  });

  /* =============================================
     PASSWORD STRENGTH METER
  ============================================= */
  function calculateStrength(val) {
    if (!val || val.length === 0) return { level: '', label: 'None' };
    if (val.length < 6) return { level: 'weak', label: 'Weak' };

    let score = 0;
    if (val.length >= 8) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 1) return { level: 'weak', label: 'Weak' };
    if (score <= 3) return { level: 'medium', label: 'Medium' };
    return { level: 'strong', label: 'Strong' };
  }

  newPasswordInput.addEventListener('input', () => {
    const val = newPasswordInput.value;
    const { level, label } = calculateStrength(val);

    strengthWrap.classList.remove('strength-weak', 'strength-medium', 'strength-strong');
    if (level) {
      strengthWrap.classList.add(`strength-${level}`);
    }
    strengthText.textContent = label;

    // Validate match if confirm password has input
    if (confirmPasswordInput.value.length > 0) {
      validatePasswordMatch();
    }
  });

  /* =============================================
     CONFIRM PASSWORD MATCH VALIDATION
  ============================================= */
  function validatePasswordMatch() {
    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    if (!confirmPass) {
      groupConfirmPassword.classList.remove('error');
      return true;
    }

    if (newPass !== confirmPass) {
      groupConfirmPassword.classList.add('error');
      return false;
    } else {
      groupConfirmPassword.classList.remove('error');
      return true;
    }
  }

  confirmPasswordInput.addEventListener('input', validatePasswordMatch);

  /* =============================================
     STEP 3 SUBMIT: RESET PASSWORD & SUCCESS MODAL
  ============================================= */
  resetPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    let valid = true;

    if (!newPass || newPass.length < 6) {
      groupNewPassword.classList.add('error');
      newPasswordInput.focus();
      valid = false;
    } else {
      groupNewPassword.classList.remove('error');
    }

    if (!confirmPass || newPass !== confirmPass) {
      groupConfirmPassword.classList.add('error');
      if (valid) confirmPasswordInput.focus();
      valid = false;
    } else {
      groupConfirmPassword.classList.remove('error');
    }

    if (!valid) return;

    resetPasswordBtn.disabled = true;
    resetPasswordBtn.innerHTML = '<span>Resetting Password...</span>';

    setTimeout(() => {
      resetPasswordBtn.disabled = false;
      resetPasswordBtn.innerHTML = '<span>Reset Password</span>';

      // Open Success Modal
      if (successModal) {
        successModal.classList.remove('hidden');
      }
    }, 800);
  });

});
