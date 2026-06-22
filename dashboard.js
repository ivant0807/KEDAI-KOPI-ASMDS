/* ============================================================
 * dashboard.js — Logika dashboard admin
 * ============================================================ */
'use strict';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Guard: hanya admin yang boleh ───────────────────────────
const currentUser = KopiAuth.getUser();
if (!currentUser || !KopiAuth.getToken()) {
  window.location.replace('login.html');
} else if (currentUser.role !== 'ADMIN') {
  // User biasa tidak punya akses dashboard
  window.location.replace('index.html');
}

// ── Theme toggle ────────────────────────────────────────────
const themeBtn = document.querySelector('[data-theme-toggle]');
const root = document.documentElement;
let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
root.setAttribute('data-theme', theme);
syncThemeIcon();
themeBtn.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', theme);
  syncThemeIcon();
  if (salesChart) renderChart(lastTrend); // re-render warna chart sesuai tema
});
function syncThemeIcon() { themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙'; }

// ── Info user di topbar ─────────────────────────────────────
if (currentUser) {
  document.getElementById('avatarInitial').textContent = (currentUser.username || 'A').charAt(0).toUpperCase();
  document.getElementById('avatarName').textContent    = currentUser.username || 'Admin';
  document.getElementById('avatarEmail').textContent   = currentUser.email || '';
}

// ── Avatar dropdown ─────────────────────────────────────────
const avatarBtn = document.getElementById('avatarBtn');
const avatarDropdown = document.getElementById('avatarDropdown');
avatarBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = !avatarDropdown.hidden;
  avatarDropdown.hidden = open;
  avatarBtn.setAttribute('aria-expanded', String(!open));
});
document.addEventListener('click', () => { avatarDropdown.hidden = true; avatarBtn.setAttribute('aria-expanded', 'false'); });

document.getElementById('logoutBtn').addEventListener('click', () => {
  KopiAuth.clearSession();
  window.location.replace('login.html');
});

// ── Sidebar collapse (desktop) + drawer (mobile) ────────────
const layout    = document.getElementById('dashLayout');
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('dashOverlay');

document.getElementById('collapseBtn').addEventListener('click', () => {
  layout.classList.toggle('sidebar-collapsed');
});
document.getElementById('burgerBtn').addEventListener('click', () => {
  sidebar.classList.add('drawer-open');
  overlay.hidden = false;
});
overlay.addEventListener('click', closeDrawer);
function closeDrawer() {
  sidebar.classList.remove('drawer-open');
  overlay.hidden = true;
}
document.querySelectorAll('.sidebar-link').forEach(l => l.addEventListener('click', closeDrawer));

// ── Helper format ───────────────────────────────────────────
function fmtRp(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}
const STATUS_LABEL = {
  PENDING:    { text: 'Menunggu',  cls: 'badge-pending' },
  PROCESSING: { text: 'Diproses',  cls: 'badge-processing' },
  COMPLETED:  { text: 'Selesai',   cls: 'badge-completed' },
  CANCELLED:  { text: 'Dibatalkan', cls: 'badge-cancelled' },
};

// ── Animasi count-up untuk angka statistik ──────────────────
function countUp(el, target, formatter) {
  if (REDUCE_MOTION || target === 0) { el.textContent = formatter(target); return; }
  const duration = 900;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = formatter(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = formatter(target);
  }
  requestAnimationFrame(frame);
}

// ── Render kartu statistik ──────────────────────────────────
function renderStats(stats) {
  const cards = [
    { icon: '💰', label: 'Penjualan Hari Ini', value: stats.salesToday,       fmt: fmtRp },
    { icon: '🧾', label: 'Pesanan Hari Ini',   value: stats.ordersTodayCount, fmt: (n) => String(n) },
    { icon: '📦', label: 'Produk Aktif',        value: stats.productCount,     fmt: (n) => String(n) },
    { icon: '⭐', label: 'Produk Terlaris',     value: stats.bestSeller,       fmt: null },
  ];
  const row = document.getElementById('statRow');
  row.innerHTML = cards.map((c, i) => `
    <article class="dstat-card stat-enter" style="--delay:${i * 80}ms">
      <span class="dstat-ico">${c.icon}</span>
      <div class="dstat-body">
        <p class="dstat-label">${c.label}</p>
        <p class="dstat-value" data-stat-index="${i}">${c.fmt ? c.fmt(0) : escHtml(c.value)}</p>
      </div>
    </article>
  `).join('');

  cards.forEach((c, i) => {
    if (!c.fmt) return; // produk terlaris = teks, tidak di-count-up
    const el = row.querySelector(`[data-stat-index="${i}"]`);
    countUp(el, c.value, c.fmt);
  });
}

// ── Render grafik (Chart.js) ────────────────────────────────
let salesChart = null;
let lastTrend  = [];

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function renderChart(trend) {
  lastTrend = trend;
  const canvas  = document.getElementById('salesChart');
  const skeleton = document.querySelector('.skeleton-chart');
  if (skeleton) skeleton.remove();
  canvas.hidden = false;

  const labels = trend.map(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
  });
  const values = trend.map(t => t.total);

  const accent = cssVar('--primary') || '#c38b5a';
  const text   = cssVar('--muted') || '#999';
  const line   = cssVar('--line') || 'rgba(255,255,255,0.08)';

  if (salesChart) salesChart.destroy();
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, accent + '66');
  gradient.addColorStop(1, accent + '05');

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: accent,
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: accent,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: REDUCE_MOTION ? false : { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => fmtRp(c.parsed.y) },
        },
      },
      scales: {
        x: { grid: { color: line }, ticks: { color: text } },
        y: {
          grid: { color: line },
          ticks: { color: text, callback: (v) => 'Rp' + (v / 1000) + 'k' },
          beginAtZero: true,
        },
      },
    },
  });
}

// ── Render tabel pesanan terbaru ────────────────────────────
function renderOrders(orders) {
  const box = document.getElementById('ordersBox');
  if (!orders.length) {
    box.innerHTML = `
      <div class="empty-state-box">
        <span class="empty-ico">📭</span>
        <p>Belum ada pesanan masuk.</p>
      </div>`;
    return;
  }

  box.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr><th>Pelanggan</th><th>Item</th><th>Total</th><th>Status</th><th>Tanggal</th></tr>
      </thead>
      <tbody>
        ${orders.map((o, i) => {
          const st = STATUS_LABEL[o.status] || { text: o.status, cls: '' };
          const itemCount = o.items.reduce((s, it) => s + it.quantity, 0);
          const date = new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          return `
            <tr class="order-row" style="--delay:${i * 50}ms">
              <td><strong>${escHtml(o.customerName)}</strong></td>
              <td>${itemCount} item</td>
              <td>${fmtRp(o.total)}</td>
              <td><span class="badge ${st.cls}">${st.text}</span></td>
              <td class="muted-cell">${date}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── Muat data dashboard ─────────────────────────────────────
async function loadDashboard() {
  document.getElementById('dashError').hidden = true;
  try {
    const [statsRes, ordersRes] = await Promise.all([
      fetch('/api/orders/stats', { headers: KopiAuth.authHeaders() }),
      fetch('/api/orders',       { headers: KopiAuth.authHeaders() }),
    ]);

    if (statsRes.status === 401 || statsRes.status === 403) {
      KopiAuth.clearSession();
      window.location.replace('login.html');
      return;
    }
    if (!statsRes.ok || !ordersRes.ok) throw new Error('Bad response');

    const stats  = await statsRes.json();
    const orders = await ordersRes.json();

    renderStats(stats);
    renderOrders(orders);
    if (window.Chart) renderChart(stats.trend);
    else window.addEventListener('load', () => renderChart(stats.trend));
  } catch {
    document.getElementById('dashError').hidden = false;
    document.getElementById('statRow').innerHTML = '';
    document.getElementById('ordersBox').innerHTML = '';
  }
}

document.getElementById('retryBtn').addEventListener('click', loadDashboard);

// Mulai dengan skeleton (sudah ada di HTML), lalu muat data
renderSkeletonStats();
loadDashboard();

function renderSkeletonStats() {
  const row = document.getElementById('statRow');
  row.innerHTML = Array.from({ length: 4 }).map(() =>
    `<article class="dstat-card"><div class="skeleton skeleton-stat"></div></article>`
  ).join('');
}
