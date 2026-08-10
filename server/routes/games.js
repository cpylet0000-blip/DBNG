import express from 'express';
import prisma from '../lib/prisma.js';
const router = express.Router();

const upsertUserFromTelegram = async (tgUser) => {
  const { id, username, first_name, last_name } = tgUser;
  const telegramId = String(id);
  const name = [first_name, last_name].filter(Boolean).join(' ') || null;

  const user = await prisma.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username: username || null,
      name,
    },
    update: {
      ...(username && { username }),
      ...(name && { name }),
    },
  });

  await prisma.userBalance.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return user;
};

const getUserForMiniApp = async (req) => {
  if (req.tgUser) {
    return upsertUserFromTelegram(req.tgUser);
  }

  const bodyUserId = Number(req.body?.userId);
  if (Number.isFinite(bodyUserId) && bodyUserId > 0) {
    const user = await prisma.user.findUnique({ where: { id: bodyUserId } });
    if (user) {
      await prisma.userBalance.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      return user;
    }
  }

  return null;
};
router.get('/games', async (_req, res) => {
  try {
    const games = await prisma.game.findMany();
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: 'Faileddddd to fetch games' });
    
  }
});

router.post('/withdraw', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 50) {
      return res.status(400).json({ success: false, error: 'Minimum withdraw amount is 50 ETB' });
    }

    const user = await getUserForMiniApp(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const balance = await prisma.userBalance.findUnique({ where: { userId: user.id } });
    const currentBalance = balance?.currentBalance ?? 0;
    if (amount > currentBalance) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    const request = await prisma.withdrawRequest.create({
      data: {
        userId: user.id,
        amount,
        methodInfo: req.body?.methodInfo,
        status: 'pending',
      },
    });

    return res.json({ success: true, request });
  } catch (err) {
    console.error('Failed to create withdraw request', err);
    return res.status(500).json({ success: false, error: 'Failed to create withdraw request' });
  }
});

// POST /deposit - create a deposit request
router.post('/deposit', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid deposit amount' });
    }

      // Accept userId as internal user.id (number)
      let user = null;
      if (req.body?.userId) {
        user = await prisma.user.findUnique({ where: { id: Number(req.body.userId) } });
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const request = await prisma.depositRequest.create({
      data: {
        userId: user.id,
        amount,
        status: 'pending',
      },
    });
    return res.json({ success: true, request });
  } catch (err) {
    console.error('Failed to create deposit request', err);
    return res.status(500).json({ success: false, error: 'Failed to create deposit request' });
  }
});

export default router;
