import express from 'express';
import prisma from '../lib/prisma.js';
import { adminAuthMiddleware } from '../lib/auth/adminMiddleware.js';

const router = express.Router();

// GET /api/lottery - list all lotteries from DB
router.get('/', async (req, res) => {
  try {
    const lotteries = await prisma.lottery.findMany({
      orderBy: { stake_amount: 'desc' },
      include: {
        tickets: true,
      },
    });
    const result = lotteries.map((lottery) => {
      const totalTickets = lottery.total_tickets;
      const claimed = lottery.tickets.filter((t) => t.userId !== null).length;
      const availableTickets = totalTickets - claimed;
      return {
        id: lottery.id,
        drawDate: lottery.draw_date.toISOString().split('T')[0],
        drawTime: lottery.draw_time.toISOString(),
        stake: lottery.stake_amount,
        jackpot: lottery.first_prize_amount,
        firstPrize: lottery.first_prize_amount,
        secondPrize: lottery.second_prize_amount,
        thirdPrize: lottery.third_prize_amount,
        totalTickets,
        availableTickets,
        status: lottery.status,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch lotteries:', err);
    res.status(500).json({ error: 'Failed to fetch lotteries' });
  }
});

// GET /api/lottery/:id - lottery details with aggregates
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: { tickets: true },
    });

    if (!lottery) return res.status(404).json({ error: 'Lottery not found' });

    const totalTickets = lottery.total_tickets;
    const claimed = lottery.tickets.filter((t) => t.userId !== null).length;
    const availableTickets = totalTickets - claimed;

    return res.json({
      id: lottery.id,
      drawDate: lottery.draw_date.toISOString().split('T')[0],
      drawTime: lottery.draw_time.toISOString(),
      stake: lottery.stake_amount,
      firstPrize: lottery.first_prize_amount,
      secondPrize: lottery.second_prize_amount,
      thirdPrize: lottery.third_prize_amount,
      totalTickets,
      availableTickets,
      status: lottery.status,
    });
  } catch (err) {
    console.error('Failed to fetch lottery detail:', err);
    res.status(500).json({ error: 'Failed to fetch lottery detail' });
  }
});

// GET /api/lottery/:id/tickets - get all tickets for a specific lottery
router.get('/:id/tickets', async (req, res) => {
  const { id } = req.params;
  const { status = 'all', q } = req.query;
  try {
    const filters = [{ lotteryId: id }];
    if (status === 'claimed') filters.push({ userId: { not: null } });
    if (status === 'available') filters.push({ userId: null });

    const orFilters = [];
    if (q && typeof q === 'string') {
      const qNumber = Number(q);
      if (!Number.isNaN(qNumber)) {
        orFilters.push({ ticket_number: qNumber });
      }
      orFilters.push({ user: { username: { contains: q, mode: 'insensitive' } } });
      orFilters.push({ user: { name: { contains: q, mode: 'insensitive' } } });
    }

    const tickets = await prisma.lotteryTicket.findMany({
      where: {
        AND: filters,
        ...(orFilters.length ? { OR: orFilters } : {}),
      },
      orderBy: { ticket_number: 'asc' },
      include: {
        user: {
          select: {
            username: true,
            name: true,
          },
        },
      },
    });
    res.json(tickets);
  } catch (err) {
    console.error('Failed to fetch tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Admin: update a lottery
router.put('/admin/update', adminAuthMiddleware, async (req, res) => {
  const { lottery_id, stake_amount, draw_date, draw_time, first_prize_amount, second_prize_amount, third_prize_amount, total_tickets, status } = req.body;
  
  try {
      const updateData = {};
    if (stake_amount !== undefined) updateData.stake_amount = Number(stake_amount);
    if (draw_date !== undefined) updateData.draw_date = new Date(draw_date);
    if (draw_time !== undefined) updateData.draw_time = new Date(draw_time);
    if (first_prize_amount !== undefined) updateData.first_prize_amount = Number(first_prize_amount);
    if (second_prize_amount !== undefined) updateData.second_prize_amount = Number(second_prize_amount);
    if (third_prize_amount !== undefined) updateData.third_prize_amount = Number(third_prize_amount);
    if (total_tickets !== undefined) updateData.total_tickets = Number(total_tickets);
    if (status !== undefined) updateData.status = status;

    const updatedLottery = await prisma.lottery.update({
      where: { id: lottery_id },
      data: updateData,
    });

    return res.json({ success: true, lottery: updatedLottery });
  } catch (err) {
    console.error('Failed to update lottery:', err);
    return res.status(500).json({ error: 'Failed to update lottery: ' + err.message });
  }
});

// Admin: delete a lottery when all tickets are claimed
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { adminPassword } = req.body || {};
  try {
    // Require admin password from env
    const ADMIN_BALANCE_PASSWORD = process.env.ADMIN_BALANCE_PASSWORD;
    if (!adminPassword || adminPassword !== ADMIN_BALANCE_PASSWORD) {
      return res.status(403).json({ error: 'Invalid admin password' });
    }

    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: { tickets: true },
    });

    if (!lottery) return res.status(404).json({ error: 'Lottery not found' });

    await prisma.$transaction([
      prisma.lotteryWinner.deleteMany({ where: { lotteryId: id } }),
      prisma.lotteryTicket.deleteMany({ where: { lotteryId: id } }),
      prisma.lottery.delete({ where: { id } }),
    ]);

    return res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete lottery:', err);
    res.status(500).json({ error: 'Failed to delete lottery: ' + err.message });
  }
});

// Admin: create a new lottery and generate its tickets
router.post('/admin/create', adminAuthMiddleware, async (req, res) => {
  const {
    stake_amount,
    total_tickets,
    first_prize_amount,
    second_prize_amount,
    third_prize_amount,
    draw_date,
    draw_time,
  } = req.body || {};

  if (
    !stake_amount ||
    !total_tickets ||
    !first_prize_amount ||
    !second_prize_amount ||
    !third_prize_amount ||
    !draw_date ||
    !draw_time
  ) {
    return res.status(400).json({ error: 'Missing required lottery fields' });
  }

  try {
    const drawDateObj = new Date(draw_date);
    const drawTimeObj = new Date(draw_time);

    const created = await prisma.lottery.create({
      data: {
        stake_amount: Number(stake_amount),
        total_tickets: Number(total_tickets),
        first_prize_amount: Number(first_prize_amount),
        second_prize_amount: Number(second_prize_amount),
        third_prize_amount: Number(third_prize_amount),
        draw_date: drawDateObj,
        draw_time: drawTimeObj,
        status: 'OPEN',
      },
    });

    const tickets = Array.from({ length: created.total_tickets }, (_, i) => ({
      lotteryId: created.id,
      ticket_number: i + 1,
    }));
    await prisma.lotteryTicket.createMany({ data: tickets });

    return res.json({ success: true, lottery: created });
  } catch (err) {
    console.error('Failed to create lottery:', err);
    return res.status(500).json({ error: 'Failed to create lottery' });
  }
});

// POST /api/lottery/:id/buy-tickets - claim tickets and update user balance
router.post('/:id/buy-tickets', async (req, res) => {
  const { id } = req.params;
  const { userId, ticketNumbers } = req.body;
  if (!userId || !Array.isArray(ticketNumbers) || ticketNumbers.length === 0) {
    return res.status(400).json({ error: 'Missing userId or ticketNumbers' });
  }

  const requestedTickets = ticketNumbers
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));

  if (requestedTickets.length !== ticketNumbers.length) {
    return res.status(400).json({ error: 'Invalid ticketNumbers' });
  }

  try {
    // Check if user is banned
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.banned) {
      return res.status(403).json({
        error: 'You have been banned and cannot play games',
      });
    }

    // Fetch lottery and stake
    const lottery = await prisma.lottery.findUnique({
      where: { id },
    });
    if (!lottery) return res.status(404).json({ error: 'Lottery not found' });
    const stake = lottery.stake_amount;

    // Fetch user balance
    const userBalance = await prisma.userBalance.findUnique({
      where: { userId: Number(userId) },
    });
    if (!userBalance) return res.status(404).json({ error: 'User balance not found' });

    const totalCost = stake * ticketNumbers.length;
    if (userBalance.currentBalance < totalCost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Claim tickets atomically
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      const updated = await tx.lotteryTicket.updateMany({
        where: {
          lotteryId: id,
          ticket_number: { in: requestedTickets },
          userId: null,
        },
        data: {
          userId: Number(userId),
          purchase_time: now,
        },
      });

      if (updated.count !== requestedTickets.length) {
        const e = new Error('Some tickets already claimed');
        e.status = 409;
        throw e;
      }

      await tx.userBalance.update({
        where: { userId: Number(userId) },
        data: {
          currentBalance: { decrement: totalCost },
          totalLosses: { increment: totalCost },
        },
      });
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Buy tickets error:', err);
    const status = err?.status || 500;
    res.status(status).json({ error: err.message || 'Failed to buy tickets' });
  }
});

export default router;