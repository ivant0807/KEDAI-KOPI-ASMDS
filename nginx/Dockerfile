# =============================================================
# Kedai Kopi ASMDS — image Nginx (reverse proxy + statis + TLS)
# Hanya menyalin aset statis yang dikenal (hindari bocor source backend/).
# Build context = root repo (lihat docker-compose.yml).
# =============================================================
FROM nginx:1.27-alpine

# Aset frontend statis (HTML/CSS/JS di root repo) + CNAME
COPY *.html *.css *.js CNAME /usr/share/nginx/html/

# Konfigurasi server (statis + proxy /api + HTTPS)
COPY nginx/conf.d/kedai-kopi.conf /etc/nginx/conf.d/default.conf
