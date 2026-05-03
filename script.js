const filterButtons = document.querySelectorAll('.filter-btn');
const menuCards = document.querySelectorAll('.menu-card');
const addButtons = document.querySelectorAll('.add-to-cart');
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

    menuCards.forEach(card => {
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

addButtons.forEach(button => {
  button.addEventListener('click', () => {
    const name = button.dataset.name;
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