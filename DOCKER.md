# Dockerisasi Kedai Kopi ASMDS

Migrasi stack dari **native** (PM2 + PostgreSQL native + Nginx host + Let's Encrypt)
ke **Docker** tanpa kehilangan data (6 produk + 18 order + akun) dan tanpa kehilangan HTTPS.

```
Internet ──443/80──> [nginx container] ──/ statis──> file frontend (di image)
                                        ──/api──────> [app container :3000] ──> [db container :5432]
                                                                                   volume: pgdata
       /etc/letsencrypt (host, mount RO) ───────────^ TLS
```

## Komponen
| Service | Image / Build | Port | Catatan |
|---------|---------------|------|---------|
| `db`    | `postgres:16-alpine` | internal (tak di-publish) | data di volume `pgdata` |
| `app`   | `backend/Dockerfile` (node:20) | internal `:3000` | Express + Prisma, sajikan /api |
| `nginx` | `nginx/Dockerfile` | `80`, `443` | statis + proxy /api + TLS |

Rahasia ada di file **`.env`** (folder yang sama dgn `docker-compose.yml`). Template: `.env.docker.example`.

---

## Runbook migrasi (jalankan di VPS)

> Ganti placeholder: `<APP_DIR>` (mis. `kedai-kopi` / `kedai-kopi-asmds`), `<DBNAME>`
> (mis. `kedaikopi` / `kedaikopi_db`), `<CERT_DIR>` (`ls /etc/letsencrypt/live/`).

### 0) Discovery (read-only)
```bash
ls -d /var/www/kedai-kopi*
sudo cat /var/www/<APP_DIR>/backend/.env
sudo -u postgres psql -l | grep -i kopi
sudo ls /etc/letsencrypt/live/
pm2 list; systemctl is-active nginx postgresql
df -h /; free -m; docker --version 2>/dev/null
git -C /var/www/<APP_DIR> remote -v
```

### 1) BACKUP (wajib pertama, verifikasi, tarik ke laptop) ⛔
```bash
sudo mkdir -p /root/backup-kedaikopi && cd /root/backup-kedaikopi
D=$(date +%Y%m%d)
sudo -u postgres pg_dump --no-owner --no-privileges <DBNAME> > kedaikopi_db_$D.sql
sudo tar -czf kedaikopi_app_$D.tar.gz -C /var/www <APP_DIR>
ls -lh kedaikopi_db_$D.sql kedaikopi_app_$D.tar.gz
wc -l kedaikopi_db_$D.sql
tar -tzf kedaikopi_app_$D.tar.gz | grep backend/.env
grep -c "INSERT\|COPY" kedaikopi_db_$D.sql
# dari LAPTOP:
# scp root@202.155.13.108:/root/backup-kedaikopi/kedaikopi_* .
```
**Jangan lanjut sebelum backup ada di laptop.**

### 2) Install Docker (layanan lama TIDAK dihapus — situs tetap live)
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version && docker compose version
sudo systemctl enable docker
```

### 3) Ambil file Docker & isi secrets
```bash
cd /var/www/<APP_DIR> && git pull origin main
cp .env.docker.example .env && nano .env   # isi POSTGRES_PASSWORD, POSTGRES_DB, JWT_SECRET (ASLI)
sed -i 's/<CERT_DIR>/'"$(ls /etc/letsencrypt/live/ | grep kedai | head -1)"'/g' nginx/conf.d/kedai-kopi.conf
```

### 4) Build + DB + RESTORE + verifikasi (port uji: 3001 / 8080 / 8443)
```bash
C="docker compose -f docker-compose.yml -f docker-compose.test.yml"
$C build
$C up -d db
$C ps   # tunggu db (healthy)
cat /root/backup-kedaikopi/kedaikopi_db_*.sql | $C exec -T db psql -U kopiuser -d <DBNAME>
$C exec db psql -U kopiuser -d <DBNAME> -c \
  "select (select count(*) from products) products,(select count(*) from orders) orders,(select count(*) from users) users;"
$C up -d app nginx
$C ps
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/products | head -c 300
curl -I  --resolve kedai-kopi-asmds.store:8443:127.0.0.1 https://kedai-kopi-asmds.store:8443/
curl -s  -o /dev/null -w "%{http_code}\n" --resolve kedai-kopi-asmds.store:8443:127.0.0.1 https://kedai-kopi-asmds.store:8443/api/orders/stats
```
Harus: products=6, orders=18, users≥1; health ok; HTTPS 200; stats → 401.

### 5) Cutover ke 80/443 (downtime beberapa detik)
```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml down   # volume pgdata TETAP
sudo systemctl stop nginx
pm2 stop all
docker compose up -d --build
docker compose ps
curl -I http://kedai-kopi-asmds.store        # 301 -> https
curl -I https://kedai-kopi-asmds.store        # 200
curl -s https://kedai-kopi-asmds.store/api/products | head -c 300
```
Lalu uji browser: login admin + register user baru + dashboard.

**Rollback:** `docker compose down && sudo systemctl start nginx && pm2 start all`

### 6) Stabilkan (tanpa uninstall)
```bash
pm2 delete all && pm2 save
sudo systemctl disable nginx postgresql   # tetap terinstall (rollback), tak auto-start
sudo systemctl enable docker
# Renewal cert pindah ke webroot (plugin nginx host tak berlaku lagi):
sudo certbot certonly --webroot -w /var/www/<APP_DIR>/nginx/certbot-webroot \
  -d kedai-kopi-asmds.store -d www.kedai-kopi-asmds.store \
  --deploy-hook "docker compose -f /var/www/<APP_DIR>/docker-compose.yml exec nginx nginx -s reload"
sudo certbot renew --dry-run
```

---

## Operasional sehari-hari
```bash
docker compose ps
docker compose logs -f app
docker compose up -d --build          # deploy ulang setelah git pull
docker compose restart app
# Backup DB dari container:
docker compose exec -T db pg_dump -U kopiuser <DBNAME> > backup_$(date +%F).sql
```

## Catatan
- **Data** datang dari restore SQL dump, bukan seed. `RUN_DB_PUSH`/`RUN_SEED` di `.env`
  biarkan `false` saat migrasi; set `true` hanya untuk database kosong.
- `JWT_SECRET` harus sama dgn server lama agar sesi/token login lama tetap valid.
- DB tidak meng-expose port ke host (lebih aman). Akses via `docker compose exec`.
