import express from 'express';
import prisma from '../lib/prisma.js';
const router = express.Router();

router.get('/lockstatus', async (req, res) => {
  try {
    const withdrawLock = await prisma.withdrawLock.findFirst();
    const isActive = withdrawLock ? withdrawLock.isActive : true; // Default to true if no lock found
    res.json({ isActive });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdraw lock status' });
  }
});



router.post('/', async (req, res) => {
  try {
    const { userId, amount, methodInfo } = req.body;
    if (!userId || !amount || !methodInfo) return res.status(400).json({ error: 'Missing userId, amount, or methodInfo' });
    const existingPending = await prisma.withdrawRequest.findFirst({
      where: { userId: Number(userId), status: 'pending' },
    });
    if (existingPending) return res.status(409).json({ error: 'You already have a pending withdraw request' });
    const withdraw = await prisma.withdrawRequest.create({
      data: {
        userId: Number(userId),
        amount: Number(amount),
        methodInfo: String(methodInfo),
        status: 'pending',
      },
    });
    res.json({ success: true, withdraw });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create withdraw request' });
  }
});

// GET /withdraw/history?userId=123 - get withdraw history for a user
router.get('/history', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const history = await prisma.withdrawRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        methodInfo: true,
      },
    });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdraw history' });
  }
});

export default router;
