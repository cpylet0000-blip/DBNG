import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Middleware to authenticate admin
router.use(authenticateAdmin);

// GET /analytics/spin-win/overview - Get overall SpinWin statistics
router.get('/overview', async (req, res) => {
  try {
    const [
      totalGames,
      totalBets,
      totalWagered,
      totalWon,
      totalJackpots,
      activePlayers,
      recentJackpots
    ] = await Promise.all([
      prisma.spinWinGame.count(),
      prisma.spinWinBet.count(),
      prisma.spinWinBet.aggregate({
        _sum: { amount: true }
      }),
      prisma.spinWinBet.aggregate({
        where: { status: 'won' },
        _sum: { winnings: true }
      }),
      prisma.spinWinJackpotWin.count(),
      prisma.spinWinBet.groupBy({
        by: ['userId'],
        _count: true
      }).then(result => result.length),
      prisma.spinWinJackpotWin.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true
            }
          },
          jackpot: {
            select: {
              name: true,
              type: true
            }
          }
        }
      })
    ]);

    const houseEdge = totalWagered._sum.amount || 0;
    const playerWinnings = totalWon._sum.winnings || 0;
    const netProfit = houseEdge - playerWinnings;
    const rtp = houseEdge > 0 ? ((playerWinnings / houseEdge) * 100) : 0;

    res.json({
      success: true,
      overview: {
        totalGames,
        totalBets,
        totalWagered: houseEdge,
        totalWon: playerWinnings,
        totalJackpots,
        netProfit,
        rtp: Math.round(rtp * 100) / 100,
        activePlayers
      },
      recentJackpots
    });
  } catch (error) {
    console.error('Error getting SpinWin overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load overview'
    });
  }
});

// GET /analytics/spin-win/bet-types - Get statistics by bet type
router.get('/bet-types', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const betStats = await prisma.spinWinBet.groupBy({
      by: ['betType'],
      where: dateFilter,
      _count: true,
      _sum: {
        amount: true,
        winnings: true
      }
    });

    const totalBets = betStats.reduce((sum, stat) => sum + stat._count, 0);
    const totalWagered = betStats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0);
    const totalWon = betStats.reduce((sum, stat) => sum + (stat._sum.winnings || 0), 0);

    const betTypeStats = betStats.map(stat => {
      const wagered = stat._sum.amount || 0;
      const won = stat._sum.winnings || 0;
      const profit = wagered - won;
      const rtp = wagered > 0 ? (won / wagered) * 100 : 0;

      return {
        betType: stat.betType,
        totalBets: stat._count,
        totalWagered: wagered,
        totalWon: won,
        profit,
        rtp: Math.round(rtp * 100) / 100,
        percentageOfTotal: totalBets > 0 ? Math.round((stat._count / totalBets) * 10000) / 100 : 0
      };
    }).sort((a, b) => b.totalBets - a.totalBets);

    res.json({
      success: true,
      betTypeStats,
      summary: {
        totalBets,
        totalWagered,
        totalWon,
        netProfit: totalWagered - totalWon
      }
    });
  } catch (error) {
    console.error('Error getting bet type statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load bet type statistics'
    });
  }
});

// GET /analytics/spin-win/numbers - Get statistics by winning numbers
router.get('/numbers', async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const numberStats = await prisma.spinWinSpin.groupBy({
      by: ['winningNumber', 'winningColor'],
      where: dateFilter,
      _count: true
    });

    const totalSpins = numberStats.reduce((sum, stat) => sum + stat._count, 0);

    const numberAnalysis = numberStats.map(stat => ({
      number: stat.winningNumber,
      color: stat.winningColor,
      count: stat._count,
      percentage: Math.round((stat._count / totalSpins) * 10000) / 100
    })).sort((a, b) => a.number - b.number);

    // Color distribution
    const colorStats = numberStats.reduce((acc, stat) => {
      if (!acc[stat.winningColor]) {
        acc[stat.winningColor] = { count: 0, percentage: 0 };
      }
      acc[stat.winningColor].count += stat._count;
      return acc;
    }, {});

    Object.keys(colorStats).forEach(color => {
      colorStats[color].percentage = Math.round((colorStats[color].count / totalSpins) * 10000) / 100;
    });

    res.json({
      success: true,
      numberAnalysis,
      colorStats,
      totalSpins
    });
  } catch (error) {
    console.error('Error getting number statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load number statistics'
    });
  }
});

// GET /analytics/spin-win/jackpots - Get jackpot statistics
router.get('/jackpots', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const [
      jackpotWins,
      currentJackpots,
      totalJackpotWon
    ] = await Promise.all([
      prisma.spinWinJackpotWin.findMany({
        where: dateFilter,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true
            }
          },
          jackpot: {
            select: {
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.spinWinJackpot.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.spinWinJackpotWin.aggregate({
        where: dateFilter,
        _sum: { amount: true },
        _count: true
      })
    ]);

    const jackpotStats = jackpotWins.reduce((acc, win) => {
      if (!acc[win.jackpot.name]) {
        acc[win.jackpot.name] = {
          name: win.jackpot.name,
          type: win.jackpot.type,
          totalWins: 0,
          totalWon: 0,
          wins: []
        };
      }
      acc[win.jackpot.name].totalWins++;
      acc[win.jackpot.name].totalWon += win.amount;
      acc[win.jackpot.name].wins.push(win);
      return acc;
    }, {});

    res.json({
      success: true,
      currentJackpots,
      jackpotStats: Object.values(jackpotStats),
      summary: {
        totalJackpotsWon: totalJackpotWon._count,
        totalJackpotAmount: totalJackpotWon._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Error getting jackpot statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load jackpot statistics'
    });
  }
});

// GET /analytics/spin-win/players - Get top players
router.get('/players', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const topPlayers = await prisma.spinWinBet.groupBy({
      by: ['userId'],
      where: dateFilter,
      _sum: {
        amount: true,
        winnings: true
      },
      _count: true
    });

    const playersWithDetails = await Promise.all(
      topPlayers.map(async (player) => {
        const user = await prisma.user.findUnique({
          where: { id: player.userId },
          select: {
            id: true,
            username: true,
            name: true,
            createdAt: true
          }
        });

        const totalWagered = player._sum.amount || 0;
        const totalWon = player._sum.winnings || 0;
        const netProfit = totalWon - totalWagered;
        const rtp = totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0;

        return {
          user,
          totalBets: player._count,
          totalWagered,
          totalWon,
          netProfit,
          rtp: Math.round(rtp * 100) / 100
        };
      })
    );

    const sortedPlayers = playersWithDetails
      .sort((a, b) => b.totalWagered - a.totalWagered)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      topPlayers: sortedPlayers
    });
  } catch (error) {
    console.error('Error getting player statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load player statistics'
    });
  }
});

// GET /analytics/spin-win/performance - Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let startDate;
    const endDate = new Date();

    switch (period) {
      case '24h':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_bets,
        COALESCE(SUM(amount), 0) as total_wagered,
        COALESCE(SUM(CASE WHEN status = 'won' THEN winnings ELSE 0 END), 0) as total_won
      FROM spin_win_bets
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const performanceMetrics = dailyStats.map(day => {
      const profit = day.total_wagered - day.total_won;
      const rtp = day.total_wagered > 0 ? (day.total_won / day.total_wagered) * 100 : 0;

      return {
        date: day.date,
        totalBets: parseInt(day.total_bets),
        totalWagered: parseFloat(day.total_wagered),
        totalWon: parseFloat(day.total_won),
        profit,
        rtp: Math.round(rtp * 100) / 100
      };
    });

    const totals = performanceMetrics.reduce((acc, day) => ({
      totalBets: acc.totalBets + day.totalBets,
      totalWagered: acc.totalWagered + day.totalWagered,
      totalWon: acc.totalWon + day.totalWon,
      profit: acc.profit + day.profit
    }), { totalBets: 0, totalWagered: 0, totalWon: 0, profit: 0 });

    const averageRtp = performanceMetrics.length > 0 
      ? performanceMetrics.reduce((sum, day) => sum + day.rtp, 0) / performanceMetrics.length 
      : 0;

    res.json({
      success: true,
      period,
      dailyStats: performanceMetrics,
      totals,
      averageRtp: Math.round(averageRtp * 100) / 100
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load performance metrics'
    });
  }
});

export default router;
