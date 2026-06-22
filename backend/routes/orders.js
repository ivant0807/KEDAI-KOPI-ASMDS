'use strict';
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/orders/stats — Admin only
// Statistik ringkas untuk dashboard: penjualan hari ini, jumlah pesanan,
// total produk, produk terlaris, dan tren penjualan 7 hari terakhir.
router.get('/stats', verifyToken, requireAdmin, async (_req, res) => {
  const now        = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(startToday);
  weekStart.setDate(weekStart.getDate() - 6); // jendela 7 hari termasuk hari ini

  try {
    const [ordersToday, totalOrders, productCount, topItem, weekOrders] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: startToday }, status: { not: 'CANCELLED' } },
        select: { total: true },
      }),
      prisma.order.count(),
      prisma.product.count({ where: { isAvailable: true } }),
      prisma.orderItem.groupBy({
        by: ['name'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } },
        select: { total: true, createdAt: true },
      }),
    ]);

    const salesToday = ordersToday.reduce((sum, o) => sum + o.total, 0);
    const bestSeller = topItem[0]?.name ?? '—';

    // Bangun tren 7 hari (urut dari 6 hari lalu sampai hari ini)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const day  = new Date(startToday); day.setDate(day.getDate() - i);
      const next = new Date(day);        next.setDate(next.getDate() + 1);
      const total = weekOrders
        .filter(o => o.createdAt >= day && o.createdAt < next)
        .reduce((sum, o) => sum + o.total, 0);
      trend.push({ date: day.toISOString().slice(0, 10), total });
    }

    res.json({
      salesToday,
      ordersTodayCount: ordersToday.length,
      totalOrders,
      productCount,
      bestSeller,
      trend,
    });
  } catch (err) {
    console.error('[GET /orders/stats]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// GET /api/orders — Admin only (10 pesanan terbaru)
router.get('/', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { items: true },
    });
    res.json(orders);
  } catch (err) {
    console.error('[GET /orders]', err.message);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

module.exports = router;
