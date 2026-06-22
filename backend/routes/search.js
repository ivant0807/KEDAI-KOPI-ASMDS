'use strict';
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/search?q=kata+kunci  — publik, aman dari SQL injection (parameterized via Prisma)
router.get('/', async (req, res) => {
  let { q } = req.query;

  if (typeof q !== 'string' || !q.trim()) {
    return res.status(400).json({ error: 'Parameter q (kata kunci) wajib diisi.' });
  }

  // Sanitasi: potong panjang maksimum, trim whitespace
  q = q.trim().substring(0, 100);

  try {
    const results = await prisma.product.findMany({
      where: {
        isAvailable: true,
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    });

    res.json({ query: q, count: results.length, results });
  } catch (err) {
    console.error('[GET /search]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
