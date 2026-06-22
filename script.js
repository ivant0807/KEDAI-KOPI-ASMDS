const filterButtons = document.querySelectorAll('.filter-btn');
const cartItemsEl = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const cartTotalEl = document.getElementById('cartTotal');
const selectedMenuInput = document.getElementById('selectedMenu');
const orderForm = document.getElementById('orderForm');
const toast = document.getElementById('toast');
const themeButton = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

let cart = [];
let currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
root.setAttribute('data-theme', currentTheme);
updateThemeButton();

function updateThemeButton() {
  themeButton.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  themeButton.setAttribute(
    'aria-label',
    currentTheme === 'dark' ? 'Ubah ke tema terang' : 'Ubah ke tema gelap'
  );
}

themeButton.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', currentTheme);
  updateThemeButton();
});

menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  mobileNav.hidden = expanded;
  mobileNav.classList.toggle('show', !expanded);
});

document.querySelectorAll('.mobile-nav a').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.hidden = true;
    mobileNav.classList.remove('show');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;

    document.querySelectorAll('.menu-card').forEach(card => {
      const isVisible = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !isVisible);
    });
  });
});

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

function renderCart() {
  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="empty-state">Belum ada menu yang dipilih.</p>';
    cartCountEl.textContent = '0 item';
    cartTotalEl.textContent = 'Rp0';
    return;
  }

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div>
        <strong>${item.name}</strong>
        <p>${item.qty} x ${formatRupiah(item.price)}</p>
      </div>
      <strong>${formatRupiah(item.qty * item.price)}</strong>
    </div>
  `).join('');

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  cartCountEl.textContent = `${count} item`;
  cartTotalEl.textContent = formatRupiah(total);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function bindAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', () => {
      const name  = button.dataset.name;
      const price = Number(button.dataset.price);
      selectedMenuInput.value = name;

      const existing = cart.find(item => item.name === name);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ name, price, qty: 1 });
      }

      renderCart();
      showToast(`${name} ditambahkan ke pesanan.`);
    });
  });
}

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('customerName').value.trim();
  const menu = selectedMenuInput.value.trim();
  const qty = Number(document.getElementById('quantity').value);

  if (!name || !menu || qty < 1) {
    showToast('Lengkapi data pesanan terlebih dahulu.');
    return;
  }

  showToast(`Terima kasih, ${name}. Pesanan ${menu} sedang diproses.`);
  orderForm.reset();
  document.getElementById('quantity').value = 1;
});

renderCart();

// ── Escape HTML (aman dari XSS saat render data dari API) ──────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Render kartu menu dari data produk API ─────────────────────────────────
function createMenuCard(product) {
  const fallbackImg = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80';
  const img  = product.imageUrl || fallbackImg;
  const name = escapeHtml(product.name);
  const desc = escapeHtml(product.description);
  const price = formatRupiah(product.price);
  return `
    <article class="menu-card" data-category="${escapeHtml(product.category)}">
      <img src="${escapeHtml(img)}" alt="${name}" loading="lazy">
      <div class="menu-content">
        <div class="menu-top"><h3>${name}</h3><span>${price}</span></div>
        <p>${desc}</p>
        <button class="btn btn-small add-to-cart"
                data-name="${name}"
                data-price="${product.price}">Tambah Pesanan</button>
      </div>
    </article>`;
}

// ── Fetch produk dari backend dan render ke menu grid ─────────────────────
async function loadProducts() {
  const menuGrid = document.getElementById('menuGrid');
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Response bukan OK');
    const products = await res.json();

    if (!products.length) {
      menuGrid.innerHTML = '<p class="menu-loading">Menu belum tersedia.</p>';
      return;
    }

    menuGrid.innerHTML = products.map(createMenuCard).join('');
    bindAddToCartButtons();
  } catch {
    menuGrid.innerHTML = '<p class="menu-loading">Gagal memuat menu. Coba muat ulang halaman.</p>';
  }
}

loadProducts();

// ── Auth: Login Modal ─────────────────────────────────────────────────────
const TOKEN_KEY  = 'kopi_token';
const USER_KEY   = 'kopi_user';
const loginModal = document.getElementById('loginModal');

function openLoginModal() {
  loginModal.hidden = false;
  document.getElementById('loginEmail').focus();
}

function closeLoginModal() {
  loginModal.hidden = true;
  document.getElementById('loginForm').reset();
  document.getElementById('loginModalError').hidden = true;
}

document.getElementById('loginOpenBtn').addEventListener('click', openLoginModal);
document.getElementById('loginModalClose').addEventListener('click', closeLoginModal);
loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !loginModal.hidden) closeLoginModal(); });

// ── Auth: Submit Login ─────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginModalError');
  errEl.hidden   = true;

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Login gagal.';
      errEl.hidden = false;
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY,  JSON.stringify(data.user));
    closeLoginModal();
    updateAuthUI(data.user);
    showToast(`Selamat datang, ${data.user.username}!`);
  } catch {
    errEl.textContent = 'Tidak dapat terhubung ke server.';
    errEl.hidden = false;
  }
});

// ── Auth: Tampilkan status login di header ─────────────────────────────────
function updateAuthUI(user) {
  const authArea = document.getElementById('authArea');
  if (user) {
    const adminLink = user.role === 'ADMIN'
      ? `<a href="admin.html" class="btn btn-secondary btn-small">Admin Panel</a>`
      : '';
    authArea.innerHTML = `
      <span class="user-label">${escapeHtml(user.username)}</span>
      ${adminLink}
      <button class="btn btn-secondary btn-small" id="logoutBtn">Logout</button>`;
    document.getElementById('logoutBtn').addEventListener('click', doLogout);
  } else {
    authArea.innerHTML = `<button class="btn btn-secondary btn-small" id="loginOpenBtn">Login</button>`;
    document.getElementById('loginOpenBtn').addEventListener('click', openLoginModal);
  }
}

function doLogout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  updateAuthUI(null);
  showToast('Berhasil logout.');
}

// ── Auth: Cek sesi yang tersimpan saat halaman dibuka ─────────────────────
(function initAuth() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    if (user && localStorage.getItem(TOKEN_KEY)) {
      updateAuthUI(user);
    }
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
})();