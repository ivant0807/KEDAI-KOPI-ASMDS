# Kedai Kopi ASMDS

**Live:** https://kedai-kopi-asmds.store

<img width="1727" height="995" alt="image" src="https://github.com/user-attachments/assets/cefa90c4-d73e-48de-88f1-e1d31719de71" />

## Anggota Tim

| Nama | NIM |
|------|-----|
| Ivan Tampansyah | 2350231023 |
| Muhammad Gizka Naufal Rizkullah | 2350231003 |
| Billy Iin Nazwa Gemilang | 2350231012 |

## Deskripsi

Website kedai kopi modern yang dibangun untuk tugas mata kuliah **Cloud Computing**. Project ini dikembangkan dengan frontend statis (HTML/CSS/JS) dan backend REST API yang di-deploy ke VPS sendiri dengan domain custom.

## Fitur

### Frontend
- Landing page responsif dengan dark/light theme
- Daftar menu dinamis (data dari backend API)
- Filter menu berdasarkan kategori (Coffee / Non Coffee / Snack)
- Cart / keranjang pesanan sederhana
- Login modal terintegrasi dengan backend
- Admin Panel (`admin.html`) untuk manajemen produk

### Backend (REST API)
- Register & Login dengan JWT authentication (password di-hash bcrypt)
- CRUD produk dengan validasi input server-side
- Endpoint search produk yang aman dari SQL Injection (parameterized query via Prisma)
- Role-based access: `USER` dan `ADMIN`

### Demo Keamanan (XSS)
- `search.html` — versi **vulnerable** (input langsung ke `innerHTML`)
- `search-patched.html` — versi **patched** (escapeHTML + CSP header)

## Teknologi

| Layer | Stack |
|-------|-------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | Node.js, Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JSON Web Token (JWT) + bcryptjs |
| Server | VPS Ubuntu + Nginx (reverse proxy) + PM2 |
| SSL | Let's Encrypt (Certbot) |

## Struktur Project

```
KEDAI-KOPI-ASMDS/
├── index.html              # Landing page utama
├── admin.html              # Panel CRUD produk (admin only)
├── search.html             # Demo XSS vulnerable
├── search-patched.html     # Demo XSS patched
├── style.css
├── script.js
├── DEPLOY.md               # Panduan deploy ke VPS
└── backend/
    ├── server.js
    ├── package.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma   # Model User + Product
    │   └── seed.js         # Data awal (admin + produk)
    ├── middleware/
    │   └── auth.js         # JWT verify + admin guard
    └── routes/
        ├── auth.js         # POST /api/auth/register|login
        ├── products.js     # GET/POST/PUT/DELETE /api/products
        └── search.js       # GET /api/search?q=
```

## API Endpoints

| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/auth/register` | — | Daftar akun baru |
| POST | `/api/auth/login` | — | Login, mendapat JWT |
| GET | `/api/products` | — | List semua produk |
| GET | `/api/products/:id` | — | Detail produk |
| POST | `/api/products` | Admin | Tambah produk |
| PUT | `/api/products/:id` | Admin | Edit produk |
| DELETE | `/api/products/:id` | Admin | Hapus produk |
| GET | `/api/search?q=` | — | Cari produk (aman dari SQL injection) |
| GET | `/api/health` | — | Health check server |

## Cara Menjalankan Lokal

### Prasyarat
- Node.js 20+
- PostgreSQL (lokal atau [Neon](https://neon.tech) free tier)

### Langkah

```bash
# 1. Clone repository
git clone https://github.com/ivant0807/KEDAI-KOPI-ASMDS.git
cd KEDAI-KOPI-ASMDS/backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env: isi DATABASE_URL dan JWT_SECRET

# 4. Setup database
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js

# 5. Jalankan server
npm run dev        # development (nodemon)
# atau
npm start          # production
```

Buka browser ke `http://localhost:3000`

### Kredensial Default (seed)

> ⚠️ Ganti password ini segera setelah deploy ke VPS!

| Field | Nilai |
|-------|-------|
| Email | `admin@kedaikopi-asmds.store` |
| Password | `Admin@KopiASMDS2026` |
| Role | `ADMIN` |

## Deploy ke VPS

Lihat **[DEPLOY.md](DEPLOY.md)** untuk panduan lengkap mencakup:
- Install PostgreSQL di Ubuntu VPS
- Setup PM2 sebagai process manager
- Konfigurasi Nginx sebagai reverse proxy
- Setup SSL dengan Certbot (HTTPS)

## Tujuan Project

Project ini dibuat untuk mempraktikkan:
- Kolaborasi tim menggunakan Git
- Deployment aplikasi web ke VPS dengan domain custom
- Implementasi backend REST API dan database relasional
- Konsep keamanan web: XSS, SQL Injection, JWT, hashing password
- Konfigurasi server: Nginx, PM2, SSL/TLS
