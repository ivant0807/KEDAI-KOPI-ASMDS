'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const searchRoutes  = require('./routes/search');
const orderRoutes   = require('./routes/orders');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Sajikan file statis (index.html, style.css, dll.) dari root project
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/orders',   orderRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Fallback 404 untuk endpoint API yang tidak dikenal
app.use('/api/*', (_req, res) =>
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' })
);

app.listen(PORT, () =>
  console.log(`[server] Berjalan di http://localhost:${PORT}`)
);
