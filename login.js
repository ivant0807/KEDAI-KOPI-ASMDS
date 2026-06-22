/* ============================================================
 * login.js — Logika halaman Login + Register
 * ============================================================ */
'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Jika sudah login, langsung arahkan sesuai role
(function redirectIfLoggedIn() {
  const user = KopiAuth.getUser();
  if (user && KopiAuth.getToken()) {
    window.location.replace(user.role === 'ADMIN' ? 'dashboard.html' : 'index.html');
  }
})();

// ── Toggle antar view login / register ──────────────────────
const loginView    = document.getElementById('loginView');
const registerView = document.getElementById('registerView');

function showView(view) {
  const showLogin = view === 'login';
  loginView.hidden    = !showLogin;
  registerView.hidden = showLogin;
  // restart animasi entrance
  const active = showLogin ? loginView : registerView;
  active.classList.remove('view-enter');
  void active.offsetWidth; // reflow
  active.classList.add('view-enter');
}

document.getElementById('toRegister').addEventListener('click', (e) => { e.preventDefault(); showView('register'); });
document.getElementById('toLogin').addEventListener('click',    (e) => { e.preventDefault(); showView('login'); });

document.getElementById('forgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  alert('Fitur reset password belum tersedia. Hubungi admin untuk bantuan.');
});

// ── Toggle show/hide password ───────────────────────────────
document.querySelectorAll('[data-pw-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.closest('.password-wrap').querySelector('input');
    const show  = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
    btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  });
});

// ── Helper validasi per-field ───────────────────────────────
function setFieldError(input, message) {
  const field = input.closest('[data-field]');
  const errEl = field.querySelector('[data-error]');
  if (message) {
    field.classList.add('has-error');
    errEl.textContent = message;
    // shake halus
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
  } else {
    field.classList.remove('has-error');
    errEl.textContent = '';
  }
  return !message;
}

// Hapus error saat user mulai mengetik lagi
document.querySelectorAll('[data-field] input').forEach((input) => {
  input.addEventListener('input', () => setFieldError(input, ''));
});

// ── Helper loading state tombol ─────────────────────────────
function setLoading(btn, loading) {
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.spinner');
  btn.disabled = loading;
  label.style.opacity = loading ? '0.5' : '1';
  spinner.hidden = !loading;
}

function showFormError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

// ── Submit: Login ───────────────────────────────────────────
const loginForm  = document.getElementById('loginForm');
const loginError = document.getElementById('loginFormError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const emailInput = document.getElementById('loginIdentifier');
  const pwInput    = document.getElementById('loginPassword');
  const email      = emailInput.value.trim();
  const password   = pwInput.value;

  let valid = true;
  if (!email)               valid = setFieldError(emailInput, 'Email wajib diisi.') && valid;
  else if (!EMAIL_RE.test(email)) valid = setFieldError(emailInput, 'Format email tidak valid.') && valid;
  if (!password)            valid = setFieldError(pwInput, 'Password wajib diisi.') && valid;
  if (!valid) return;

  const submitBtn = document.getElementById('loginSubmit');
  setLoading(submitBtn, true);

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(submitBtn, false);
      showFormError(loginError, data.error || 'Login gagal.');
      return;
    }

    const remember = document.getElementById('rememberMe').checked;
    KopiAuth.saveSession(data.token, data.user, remember);
    await successTransition();
    window.location.replace(data.user.role === 'ADMIN' ? 'dashboard.html' : 'index.html');
  } catch {
    setLoading(submitBtn, false);
    showFormError(loginError, 'Tidak dapat terhubung ke server. Pastikan backend berjalan.');
  }
});

// ── Submit: Register ────────────────────────────────────────
const registerForm  = document.getElementById('registerForm');
const registerError = document.getElementById('registerFormError');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.hidden = true;

  const userInput = document.getElementById('regUsername');
  const emailInput = document.getElementById('regEmail');
  const pwInput    = document.getElementById('regPassword');
  const username = userInput.value.trim();
  const email    = emailInput.value.trim();
  const password = pwInput.value;

  let valid = true;
  if (username.length < 3)  valid = setFieldError(userInput, 'Username minimal 3 karakter.') && valid;
  if (!email)               valid = setFieldError(emailInput, 'Email wajib diisi.') && valid;
  else if (!EMAIL_RE.test(email)) valid = setFieldError(emailInput, 'Format email tidak valid.') && valid;
  if (password.length < 8)  valid = setFieldError(pwInput, 'Password minimal 8 karakter.') && valid;
  if (!valid) return;

  const submitBtn = document.getElementById('registerSubmit');
  setLoading(submitBtn, true);

  try {
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(submitBtn, false);
      showFormError(registerError, data.error || 'Registrasi gagal.');
      return;
    }

    // Register sukses → backend mengembalikan token, langsung login (akun baru = USER)
    KopiAuth.saveSession(data.token, data.user, true);
    await successTransition();
    window.location.replace(data.user.role === 'ADMIN' ? 'dashboard.html' : 'index.html');
  } catch {
    setLoading(submitBtn, false);
    showFormError(registerError, 'Tidak dapat terhubung ke server. Pastikan backend berjalan.');
  }
});

// ── Transisi keluar halus sebelum redirect ──────────────────
function successTransition() {
  return new Promise((resolve) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return resolve();
    document.querySelector('.auth-page').classList.add('auth-leaving');
    setTimeout(resolve, 320);
  });
}
