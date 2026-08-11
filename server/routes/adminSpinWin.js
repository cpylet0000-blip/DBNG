import express from 'express';
import prisma from '../lib/prisma.js';
import { adminAuthMiddleware } from '../lib/auth/adminMiddleware.js';

const router = express.Router();

// Apply admin auth to all routes
router.use(adminAuthMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get distinct rounds from spin records.
 * Each "round" is identified by the spin's winningNumber + winningColor + timestamp.
 * Multiple spin records can share the same timestamp (one per participant).
 * We de-duplicate by rounding timestamps to the nearest second.
 */
async function getDistinctRounds(limit = 100) {
  // Use raw query to get unique rounds by their distinct spin timestamp
  // Group by winningNumber + winningColor + date-truncated-to-second
  const spins = await prisma.spinWinSpin.findMany({
    take: limit * 5, // Over-fetch to handle duplicates
    orderBy: { createdAt: 'desc' },
  });

  // De-duplicate: keep one spin per "second bucket"
  const seen = new Set();
  const uniqueSpins = [];
  for (const spin of spins) {
    // Key: truncate to the second + winningNumber
    const bucket = `${Math.floor(new Date(spin.createdAt).getTime() / 1000)}-${spin.winningNumber}`;
    if (!seen.has(bucket)) {
      seen.add(bucket);
      uniqueSpins.push(spin);
    }
    if (uniqueSpins.length >= limit) break;
  }

  return uniqueSpins;
}

// ─── GET /api/admin/spin-win/rounds?limit=100 ─────────────────────────────────
router.get('/rounds', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

    const uniqueSpins = await getDistinctRounds(limit);

    if (uniqueSpins.length === 0) {
      return res.json({ rounds: [] });
    }

    // For each round, find bets placed between this round's previous spin and this spin
    // Build round boundaries: [prevSpinAt, spinAt]
    const rounds = [];

    for (let i = 0; i < uniqueSpins.length; i++) {
      const spin = uniqueSpins[i];
      const spinAt = new Date(spin.createdAt);
      // Previous spin is the next element (since array is sorted newest first)
      const prevSpin = uniqueSpins[i + 1] ?? null;
      const prevSpinAt = prevSpin ? new Date(prevSpin.createdAt) : null;

      // Bets placed before this spin's timestamp (and after the previous spin's timestamp)
      const whereClause = {
        gameId: spin.gameId,
        createdAt: {
          lte: spinAt,
          ...(prevSpinAt ? { gt: prevSpinAt } : {}),
        },
      };

      const betAgg = await prisma.spinWinBet.aggregate({
        where: whereClause,
        _count: true,
        _sum: { amount: true, winnings: true },
      });

      const totalBets = betAgg._count ?? 0;
      const totalWagered = Number(betAgg._sum.amount) || 0;
      const totalPaid = Number(betAgg._sum.winnings) || 0;
      const profit = totalWagered - totalPaid;

      rounds.push({
        roundId: spin.id,
        roundAt: spin.createdAt,
        prevRoundAt: prevSpin ? prevSpin.createdAt : null,
        winningNumber: spin.winningNumber,
        winningColor: spin.winningColor,
        participants: totalBets,
        totalBets,
        totalWagered,
        totalPaid,
        profit,
        gameId: spin.gameId,
      });
    }

    return res.json({ rounds });
  } catch (err) {
    console.error('[admin/spin-win/rounds] error:', err);
    return res.status(500).json({ error: 'Failed to load spin-win rounds', details: err.message });
  }
});

// ─── GET /api/admin/spin-win/summary ──────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();

    const periodStart = {
      daily: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      monthly: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const summarize = async (since) => {
      const agg = await prisma.spinWinBet.aggregate({
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { amount: true, winnings: true },
      });

      const totalBets = agg._count ?? 0;
      const totalWagered = Number(agg._sum.amount) || 0;
      const totalPaid = Number(agg._sum.winnings) || 0;
      const netProfit = totalWagered - totalPaid;

      return { totalBets, totalWagered, totalPaid, netProfit };
    };

    const [daily, weekly, monthly] = await Promise.all([
      summarize(periodStart.daily),
      summarize(periodStart.weekly),
      summarize(periodStart.monthly),
    ]);

    return res.json({ summary: { daily, weekly, monthly } });
  } catch (err) {
    console.error('[admin/spin-win/summary] error:', err);
    return res.status(500).json({ error: 'Failed to load spin-win summary', details: err.message });
  }
});

// ─── GET /api/admin/spin-win/round-details?roundAt=<ISO>&gameId=<string> ──────
// Returns the bets that belong to a specific spin round.
// A spin round's bets = bets placed between the previous spin and this spin.
router.get('/round-details', async (req, res) => {
  try {
    const { roundAt, gameId } = req.query;

    if (!roundAt) {
      return res.status(400).json({ error: 'roundAt query param is required' });
    }

    const spinAt = new Date(roundAt);
    if (isNaN(spinAt.getTime())) {
      return res.status(400).json({ error: 'Invalid roundAt date' });
    }

    // Find the spin just before this one (to get the lower bound of bets)
    const targetGameId = gameId || 'spin-win-universal';

    // Find the immediately preceding spin (created strictly before this spin's time)
    const prevSpin = await prisma.spinWinSpin.findFirst({
      where: {
        gameId: targetGameId,
        createdAt: { lt: new Date(spinAt.getTime() - 100) }, // 100ms buffer
      },
      orderBy: { createdAt: 'desc' },
    });

    const whereClause = {
      gameId: targetGameId,
      createdAt: {
        lte: spinAt,
        ...(prevSpin ? { gt: new Date(prevSpin.createdAt) } : {}),
      },
    };

    const rawBets = await prisma.spinWinBet.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const bets = rawBets.map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      userId: b.userId,
      username: b.user?.username || b.user?.name || `User ${b.userId}`,
      betType: b.betType,
      betValue: b.betValue,
      amount: Number(b.amount),
      odds: Number(b.odds),
      status: b.status,
      winnings: Number(b.winnings || 0),
    }));

    return res.json({ bets });
  } catch (err) {
    console.error('[admin/spin-win/round-details] error:', err);
    return res.status(500).json({ error: 'Failed to load round details', details: err.message });
  }
});

export default router;
