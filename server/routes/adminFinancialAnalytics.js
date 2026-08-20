// Admin Financial Analytics API routes
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get bot telegram IDs from environment
function getBotTelegramIds() {
  const botAccountsEnv = process.env.BOT_ACCOUNTS || '';
  if (!botAccountsEnv) return [];
  return botAccountsEnv.split(',').map(id => id.trim()).filter(id => id.length > 0);
}

// Get bot user IDs from database
async function getBotUserIds() {
  const botTelegramIds = getBotTelegramIds();
  if (botTelegramIds.length === 0) return [];
  
  const botUsers = await prisma.user.findMany({
    where: {
      telegramId: {
        in: botTelegramIds
      }
    },
    select: { id: true }
  });
  
  return botUsers.map(u => u.id);
}

// Get financial analytics with filtering
router.get('/earnings', async (req, res) => {
  try {
    const { 
      period = 'daily', 
      startDate, 
      endDate, 
      page = 1,
      limit = 50 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get bot user IDs to exclude from balance calculations
    const botUserIds = await getBotUserIds();

    // Calculate date range based on period
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else {
      switch (period) {
        case 'daily':
          dateFilter = {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lte: now
          };
          break;
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = {
            gte: weekAgo,
            lte: now
          };
          break;
        case 'monthly':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          dateFilter = {
            gte: monthAgo,
            lte: now
          };
          break;
      }
    }

    // Get deposit earnings
    const depositEarnings = await prisma.depositRequest.aggregate({
      where: {
        createdAt: dateFilter,
        status: 'approved'  // Changed from 'completed' to 'approved'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get withdraw amounts
    const withdrawAmounts = await prisma.withdrawRequest.aggregate({
      where: {
        createdAt: dateFilter,
        status: 'approved'  // Changed from 'completed' to 'approved'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get game earnings - since PlayerSession doesn't have stake, we'll count active sessions
    const gameEarnings = await prisma.playerSession.aggregate({
      where: {
        createdAt: dateFilter
      },
      _count: {
        id: true
      }
    });

    // Get total current balance of all users (EXCLUDING BOTS)
    const totalUserBalance = await prisma.userBalance.aggregate({
      where: botUserIds.length > 0 ? { userId: { notIn: botUserIds } } : {},
      _sum: {
        currentBalance: true
      }
    });

    // Calculate earnings using the correct formula:
    // Net Earnings = Total Approved Deposits - Users' Current Balance - Total Approved Withdrawals
    const totalDepositsAmount = depositEarnings._sum.amount || 0;
    const totalWithdrawsAmount = withdrawAmounts._sum.amount || 0;
    const totalCurrentBalance = totalUserBalance._sum.currentBalance || 0;
    const netEarnings = totalDepositsAmount - totalCurrentBalance - totalWithdrawsAmount;

    res.json({
      success: true,
      data: {
        period,
        dateRange: dateFilter,
        earnings: {
          totalDeposits: totalDepositsAmount,
          totalWithdraws: totalWithdrawsAmount,
          totalUserBalance: totalCurrentBalance,
          netEarnings,
          depositCount: depositEarnings._count.id,
          withdrawCount: withdrawAmounts._count.id,
          gameCount: gameEarnings._count.id
        },
        summary: {
          averageDailyEarnings: netEarnings / 1, // Simplified for single period
          profitMargin: totalDepositsAmount > 0 ? ((netEarnings / totalDepositsAmount) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial analytics'
    });
  }
});

// Get financial summary statistics
router.get('/financial-summary', async (req, res) => {
  try {
    // Get bot user IDs to exclude from balance calculations
    const botUserIds = await getBotUserIds();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Total earnings (all time)
    const totalDeposits = await prisma.depositRequest.aggregate({
      where: { status: 'approved' },  // Changed from 'completed' to 'approved'
      _sum: { amount: true },
      _count: { id: true }
    });

    const totalWithdraws = await prisma.withdrawRequest.aggregate({
      where: { status: 'approved' },  // Changed from 'completed' to 'approved'
      _sum: { amount: true },
      _count: { id: true }
    });

    // Today's earnings
    const todayDeposits = await prisma.depositRequest.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'approved'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const todayWithdraws = await prisma.withdrawRequest.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'approved'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Weekly earnings
    const weekDeposits = await prisma.depositRequest.aggregate({
      where: {
        createdAt: { gte: weekAgo },
        status: 'approved'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const weekWithdraws = await prisma.withdrawRequest.aggregate({
      where: {
        createdAt: { gte: weekAgo },
        status: 'approved'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Monthly earnings
    const monthDeposits = await prisma.depositRequest.aggregate({
      where: {
        createdAt: { gte: monthAgo },
        status: 'approved'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const monthWithdraws = await prisma.withdrawRequest.aggregate({
      where: {
        createdAt: { gte: monthAgo },
        status: 'approved'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Get total current balance of all users (EXCLUDING BOTS)
    const totalUserBalance = await prisma.userBalance.aggregate({
      where: botUserIds.length > 0 ? { userId: { notIn: botUserIds } } : {},
      _sum: {
        currentBalance: true
      }
    });


    // Only subtract totalUserBalance for totalEarnings (all time)
    const calcTotalEarnings = (deposits, withdraws, userBalance) => {
      const totalDeposits = deposits._sum.amount || 0;
      const totalWithdraws = withdraws._sum.amount || 0;
      const totalBalance = userBalance._sum.currentBalance || 0;
      return {
        totalDeposits,
        totalWithdraws,
        totalUserBalance: totalBalance,
        netEarnings: totalDeposits - totalBalance - totalWithdraws,
        depositCount: deposits._count.id,
        withdrawCount: withdraws._count.id
      };
    };

    // For period earnings, do NOT subtract totalUserBalance
    const calcPeriodEarnings = (deposits, withdraws) => {
      const totalDeposits = deposits._sum.amount || 0;
      const totalWithdraws = withdraws._sum.amount || 0;
      return {
        totalDeposits,
        totalWithdraws,
        netEarnings: totalDeposits - totalWithdraws,
        depositCount: deposits._count.id,
        withdrawCount: withdraws._count.id
      };
    };

    const totalEarnings = calcTotalEarnings(totalDeposits, totalWithdraws, totalUserBalance);
    const todayEarnings = calcPeriodEarnings(todayDeposits, todayWithdraws);
    const weekEarnings = calcPeriodEarnings(weekDeposits, weekWithdraws);
    const monthEarnings = calcPeriodEarnings(monthDeposits, monthWithdraws);

    res.json({
      success: true,
      data: {
        totalEarnings,
        todayEarnings,
        weekEarnings,
        monthEarnings,
        metrics: {
          totalTransactions: totalEarnings.depositCount + totalEarnings.withdrawCount,
          averageDeposit: totalEarnings.depositCount > 0 ? totalEarnings.totalDeposits / totalEarnings.depositCount : 0,
          profitMargin: totalEarnings.totalDeposits > 0 ? ((totalEarnings.netEarnings / totalEarnings.totalDeposits) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial summary'
    });
  }
});

export default router;
