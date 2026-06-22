# Panduan Deploy – Kedai Kopi ASMDS

Domain: **kedai-kopi-asmds.store**  
Stack : Node.js + Express + Prisma ORM + PostgreSQL + Nginx + PM2

---

## Daftar Isi

1. [Prasyarat VPS](#1-prasyarat-vps)
2. [Clone Repository](#2-clone-repository)
3. [Install & Setup PostgreSQL](#3-install--setup-postgresql)
4. [Setup Backend](#4-setup-backend)
5. [Jalankan Migrasi & Seed](#5-jalankan-migrasi--seed)
6. [Jalankan Backend dengan PM2](#6-jalankan-backend-dengan-pm2)
7. [Konfigurasi Nginx](#7-konfigurasi-nginx)
8. [SSL dengan Certbot (HTTPS)](#8-ssl-dengan-certbot-https)
9. [Kredensial Default & Keamanan](#9-kredensial-default--keamanan)
10. [Neon PostgreSQL (Opsional)](#10-neon-postgresql-opsional)

---

## 1. Prasyarat VPS

OS: **Ubuntu 22.04 LTS** (rekomendasi), spesifikasi minimum 1 vCPU / 1 GB RAM.

### Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # pastikan v20.x.x
npm -v
```

### Install PM2

```bash
sudo npm install -g pm2
```

### Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 2. Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/<username>/KEDAI-KOPI-ASMDS.git kedai-kopi-asmds
sudo chown -R $USER:$USER /var/www/kedai-kopi-asmds
cd /var/www/kedai-kopi-asmds
```

---

## 3. Install & Setup PostgreSQL

### Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Buat User & Database

```bash
sudo -u postgres psql
```

Di dalam psql:

```sql
CREATE USER kopiuser WITH PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT';
CREATE DATABASE kedaikopi_db OWNER kopiuser;
GRANT ALL PRIVILEGES ON DATABASE kedaikopi_db TO kopiuser;
\q
```

> **Catatan:** Ganti `GANTI_DENGAN_PASSWORD_KUAT` dengan password acak yang kuat
> (minimal 16 karakter, campuran huruf, angka, dan simbol).

---

## 4. Setup Backend

```bash
cd /var/www/kedai-kopi-asmds/backend
npm install
```

### Buat file .env

```bash
cp .env.example .env
nano .env
```

Isi nilai yang diperlukan:

```env
DATABASE_URL="postgresql://kopiuser:GANTI_DENGAN_PASSWORD_KUAT@localhost:5432/kedaikopi_db"
JWT_SECRET="<string acak panjang — generate dengan perintah di bawah>"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=production
ALLOWED_ORIGIN="https://kedai-kopi-asmds.store"
```

Generate JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## 5. Jalankan Migrasi & Seed

### Buat tabel via Prisma Migrate

```bash
# Di dalam folder backend/
npx prisma migrate deploy
```

Jika ini deployment pertama dan belum ada folder `prisma/migrations/`, jalankan:

```bash
npx prisma migrate dev --name init
```

### Isi data awal (admin + produk contoh)

```bash
node prisma/seed.js
```

Output sukses:

```
Memulai seed database...

✅ Admin: admin@kedaikopi-asmds.store (role: ADMIN)
✅ 6 produk berhasil di-seed.

🎉 Seed selesai.
```

---

## 6. Jalankan Backend dengan PM2

```bash
cd /var/www/kedai-kopi-asmds/backend
pm2 start server.js --name kedai-kopi-api
pm2 save
pm2 startup   # ikuti instruksi yang muncul untuk auto-start saat reboot
```

### Perintah PM2 yang berguna

```bash
pm2 status                    # lihat status semua proses
pm2 logs kedai-kopi-api       # lihat log real-time
pm2 restart kedai-kopi-api    # restart proses
pm2 stop kedai-kopi-api       # hentikan proses
```

---

## 7. Konfigurasi Nginx

Nginx bertugas:
- Melayani file statis (HTML/CSS/JS) langsung
- Meneruskan request `/api/*` ke Node.js (port 3000)

### Buat konfigurasi virtual host

```bash
sudo nano /etc/nginx/sites-available/kedai-kopi-asmds
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name kedai-kopi-asmds.store www.kedai-kopi-asmds.store;

    root /var/www/kedai-kopi-asmds;
    index index.html;

    # File statis dilayani langsung oleh Nginx
    location / {
        try_files $uri $uri/ =404;
    }

    # /api/* diteruskan ke Node.js
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Keamanan: sembunyikan versi Nginx
    server_tokens off;

    # Header keamanan dasar
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/kedai-kopi-asmds /etc/nginx/sites-enabled/
sudo nginx -t          # pastikan tidak ada error
sudo systemctl reload nginx
```

### Arahkan DNS domain ke VPS

Di panel DNS domain `kedai-kopi-asmds.store`, tambahkan/edit:

| Type | Name | Value          | TTL |
|------|------|----------------|-----|
| A    | @    | IP_VPS_KAMU    | 300 |
| A    | www  | IP_VPS_KAMU    | 300 |

---

## 8. SSL dengan Certbot (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kedai-kopi-asmds.store -d www.kedai-kopi-asmds.store
```

Certbot akan otomatis memodifikasi konfigurasi Nginx untuk redirect HTTP → HTTPS.

Verifikasi auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## 9. Kredensial Default & Keamanan

> ⚠️ **PENTING: Ganti semua kredensial default sebelum/segera setelah deploy!**

### Akun Admin Default (dari seed)

| Field    | Nilai                              |
|----------|------------------------------------|
| Email    | `admin@kedaikopi-asmds.store`      |
| Password | `Admin@KopiASMDS2026`              |
| Role     | `ADMIN`                            |

**Cara ganti password admin setelah deploy:**

```bash
# Di dalam folder backend/
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('PASSWORD_BARU_YANG_KUAT', 12);
  await prisma.user.update({
    where: { email: 'admin@kedaikopi-asmds.store' },
    data:  { password: hash },
  });
  console.log('Password berhasil diperbarui.');
  await prisma.\$disconnect();
})();
"
```

### Checklist Keamanan Setelah Deploy

- [ ] Ganti `JWT_SECRET` dengan string acak yang kuat (sudah dilakukan di langkah 4)
- [ ] Ganti password admin default
- [ ] Ganti password PostgreSQL user `kopiuser`
- [ ] Pastikan `NODE_ENV=production` di `.env`
- [ ] Pastikan `ALLOWED_ORIGIN` diisi domain yang benar (bukan `*`)
- [ ] File `.env` tidak ter-commit ke git (cek `.gitignore`)

---

## 10. Neon PostgreSQL (Opsional)

Untuk **development lokal** tanpa install PostgreSQL, gunakan
[Neon](https://neon.tech) (free tier tersedia).

1. Buat project di neon.tech
2. Copy connection string dari dashboard Neon
3. Isi `DATABASE_URL` di `.env`:

```env
DATABASE_URL="postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

4. Lanjutkan dari langkah 5 (migrasi & seed)

> Untuk deployment **VPS** (tugas ini), tetap gunakan PostgreSQL lokal (langkah 3)
> agar tidak bergantung pada layanan eksternal.

---

## Troubleshooting Umum

| Masalah | Solusi |
|---------|--------|
| `Cannot connect to database` | Cek `DATABASE_URL` di `.env`, pastikan PostgreSQL berjalan: `sudo systemctl status postgresql` |
| `Port 3000 already in use` | `pm2 restart kedai-kopi-api` atau `sudo lsof -i :3000` |
| `502 Bad Gateway` di Nginx | Backend tidak berjalan: `pm2 status`, `pm2 logs kedai-kopi-api` |
| `Prisma Client not generated` | Jalankan `npx prisma generate` di folder `backend/` |
| Menu tidak muncul di website | Buka DevTools → Network, cek apakah `/api/products` mengembalikan JSON |
