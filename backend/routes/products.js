'use strict';
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const VALID_CATEGORIES = ['coffee', 'noncoffee', 'snack'];

// GET /api/products[?category=coffee]  — publik
router.get('/', async (req, res) => {
  const { category } = req.query;
  const where = { isAvailable: true };
  if (category && VALID_CATEGORIES.includes(category)) {
    where.category = category;
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    res.json(products);
  } catch (err) {
    console.error('[GET /products]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/products/:id  — publik
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'ID tidak valid.' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    res.json(product);
  } catch (err) {
    console.error('[GET /products/:id]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/products  — Admin only
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { name, description, price, category, imageUrl } = req.body ?? {};

  if (!name || !description || price == null || !category) {
    return res.status(400).json({ error: 'Nama, deskripsi, harga, dan kategori wajib diisi.' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Kategori tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}.` });
  }
  const parsedPrice = parseInt(price, 10);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'Harga harus berupa bilangan bulat positif.' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name:        String(name).trim(),
        description: String(description).trim(),
        price:       parsedPrice,
        category,
        imageUrl:    imageUrl ? String(imageUrl).trim() : null,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error('[POST /products]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// PUT /api/products/:id  — Admin only
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'ID tidak valid.' });
  }

  const { name, description, price, category, imageUrl, isAvailable } = req.body ?? {};
  const data = {};

  if (name        !== undefined) data.name        = String(name).trim();
  if (description !== undefined) data.description = String(description).trim();
  if (imageUrl    !== undefined) data.imageUrl    = imageUrl ? String(imageUrl).trim() : null;
  if (isAvailable !== undefined) data.isAvailable = Boolean(isAvailable);

  if (price !== undefined) {
    const p = parseInt(price, 10);
    if (isNaN(p) || p <= 0) {
      return res.status(400).json({ error: 'Harga harus berupa bilangan bulat positif.' });
    }
    data.price = p;
  }
  if (category !== undefined) {
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Kategori tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}.` });
    }
    data.category = category;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Tidak ada field yang diperbarui.' });
  }

  try {
    const product = await prisma.product.update({ where: { id }, data });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    console.error('[PUT /products/:id]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// DELETE /api/products/:id  — Admin only
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'ID tidak valid.' });
  }

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Produk berhasil dihapus.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    console.error('[DELETE /products/:id]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
