
import express from 'express';
import kenoService from '../service/kenoService.js';
import prisma from '../lib/prisma.js';
const router = express.Router();
console.log('Keno routes initialized');
// POST /keno/play
router.post('/play', async (req, res) => {
  console.log('[KENO] /play hit', {
    headers: req.headers,
    body: req.body,
    tgUser: req.tgUser
  });
  // Add a custom header to signal frontend
  res.set('X-Keno-Backend-Touched', '1');
  if (!req.tgUser) {
    console.warn('[KENO] Unauthorized: missing tgUser');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { bet, slot, selectedNumbers } = req.body;
    const telegramId = String(req.tgUser.id);
    if (!telegramId || !bet || !slot || !Array.isArray(selectedNumbers)) {
      console.warn('[KENO] Invalid request params', { telegramId, bet, slot, selectedNumbers });
      return res.status(400).json({ error: 'Invalid request' });
    }

    const name = [req.tgUser.first_name, req.tgUser.last_name].filter(Boolean).join(' ') || null;

    const user = await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: req.tgUser.username || null,
        name,
      },
      update: {
        ...(req.tgUser.username && { username: req.tgUser.username }),
        ...(name && { name }),
      },
      include: {
        balance: true,
      },
    });

    // Check if user is banned
    if (user.banned) {
      return res.status(403).json({
        error: 'You have been banned and cannot play games',
      });
    }

    if (!user.balance) {
      await prisma.userBalance.create({
        data: { userId: user.id },
      });
    }

    const result = await kenoService.playKeno(user.id, bet, slot, selectedNumbers);
    console.log('[KENO] Success', result);
    res.json(result);
  } catch (err) {
    console.error('[KENO] Error:', err);
    if (err?.message === 'Insufficient balance') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
