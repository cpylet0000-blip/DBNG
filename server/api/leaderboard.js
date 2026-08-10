import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();
const EXCLUDED_LEADERBOARD_USER_IDS = [99, 116, 80,27053]; 

// GET /api/leaderboard?type=PLAY|INVITATION&period=DAILY|WEEKLY|MONTHLY|TOTAL&limit=25
router.get('/', async (req, res) => {
  try {
    const { type = 'PLAY', period = 'DAILY', limit = 25 } = req.query;
    const leaderboard = await prisma.userLeaderboardStat.findMany({
      where: {
        type,
        period,
        userId: { notIn: EXCLUDED_LEADERBOARD_USER_IDS },
      },
      orderBy: { value: 'desc' },
      take: Number(limit),
      include: { user: { select: { id: true, name: true, username: true } } },
    });
    res.json(
      leaderboard.map((entry, i) => ({
        rank: i + 1,
        userId: entry.userId,
        name: entry.user?.name || entry.user?.username || `User ${entry.userId}`,
        value: entry.value,
      }))
    );
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
