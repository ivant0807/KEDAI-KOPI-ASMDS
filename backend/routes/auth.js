'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body ?? {};

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, dan password wajib diisi.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Format email tidak valid.' });
  }
  if (typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username minimal 3 karakter.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.trim() }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Email atau username sudah terdaftar.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email:    email.toLowerCase(),
        username: username.trim(),
        password: hash,
        role:     'USER',
      },
      select: { id: true, email: true, username: true, role: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ message: 'Registrasi berhasil.', user, token });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const user  = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const valid = user && await bcrypt.compare(password, user.password);

    if (!valid) {
      // Pesan generik untuk mencegah user enumeration
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login berhasil.',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
    });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
