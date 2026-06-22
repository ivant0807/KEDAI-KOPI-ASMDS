# =============================================================
# Kedai Kopi ASMDS — image Node/Express + Prisma
# Base Debian (bukan Alpine) karena Prisma butuh OpenSSL/glibc.
# Build context = root repo (lihat docker-compose.yml).
# =============================================================
FROM node:20-bookworm-slim

# Prisma butuh OpenSSL + CA certs saat generate & runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Deps dulu agar layer ter-cache. npm ci PENUH (termasuk devDeps) karena
#    prisma CLI (devDependency) dipakai untuk `prisma generate` & `prisma db push`.
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# 2) Salin sisa repo: frontend statis di /app, backend di /app/backend.
#    node_modules & .env diabaikan via .dockerignore (tak menimpa hasil npm ci).
COPY . .

# 3) Generate Prisma Client (schema sudah ada setelah COPY di atas)
RUN cd backend && npx prisma generate

RUN chmod +x backend/docker-entrypoint.sh

# server.js menyajikan statis dari path.join(__dirname, '..') => /app (root repo)
WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
