'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Kredensial default — WAJIB diganti setelah deploy ke VPS
const ADMIN_EMAIL    = 'admin@kedaikopi-asmds.store';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@KopiASMDS2026';

const products = [
  {
    name:        'Espresso',
    description: 'Shot espresso pekat dengan crema lembut dan aroma roasted yang tajam.',
    price:       18000,
    category:    'coffee',
    imageUrl:    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=80',
  },
  {
    name:        'Cappuccino',
    description: 'Perpaduan espresso, steamed milk, dan milk foam yang lembut dan klasik.',
    price:       25000,
    category:    'coffee',
    imageUrl:    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=80',
  },
  {
    name:        'Caramel Latte',
    description: 'Latte creamy dengan sentuhan manis caramel yang cocok untuk semua suasana.',
    price:       28000,
    category:    'coffee',
    imageUrl:    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=80',
  },
  {
    name:        'Matcha Latte',
    description: 'Minuman creamy dengan rasa matcha lembut dan tampilan segar yang elegan.',
    price:       27000,
    category:    'noncoffee',
    imageUrl:    'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=700&q=80',
  },
  {
    name:        'Chocolate',
    description: 'Hot chocolate kental dengan rasa manis seimbang dan tekstur halus.',
    price:       24000,
    category:    'noncoffee',
    imageUrl:    'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?auto=format&fit=crop&w=700&q=80',
  },
  {
    name:        'Croissant Butter',
    description: 'Pastry renyah berlapis dengan aroma butter yang lembut dan gurih.',
    price:       20000,
    category:    'snack',
    imageUrl:    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=80',
  },
];

async function main() {
  console.log('Memulai seed database...\n');

  // Seed admin user (upsert: buat jika belum ada, skip jika sudah)
  const hash  = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL },
    update: {},
    create: {
      email:    ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: hash,
      role:     'ADMIN',
    },
  });
  console.log(`✅ Admin: ${admin.email} (role: ${admin.role})`);

  // Seed produk — hanya jika tabel masih kosong
  const existingCount = await prisma.product.count();
  if (existingCount === 0) {
    await prisma.product.createMany({ data: products });
    console.log(`✅ ${products.length} produk berhasil di-seed.`);
  } else {
    console.log(`ℹ️  ${existingCount} produk sudah ada — seed produk dilewati.`);
  }

  console.log('\n🎉 Seed selesai.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
