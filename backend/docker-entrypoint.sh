#!/bin/sh
# =============================================================
# Entrypoint app Kedai Kopi ASMDS
# Default AMAN: TIDAK menyentuh skema/data — karena data produksi
# di-restore dari SQL dump (tabel sudah ada).
# Hanya untuk DB KOSONG (fresh install) set env berikut SEKALI:
#   RUN_DB_PUSH=true  -> buat skema via `prisma db push`
#   RUN_SEED=true     -> isi data awal (admin + produk + order contoh)
# depends_on: service_healthy menjamin DB siap sebelum app start.
# =============================================================
set -e

if [ "${RUN_DB_PUSH}" = "true" ]; then
  echo "[entrypoint] Menerapkan skema Prisma (db push)..."
  npx prisma db push --skip-generate
fi

if [ "${RUN_SEED}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  node prisma/seed.js
fi

echo "[entrypoint] Menjalankan: $*"
exec "$@"
