// Admin User Analytics API routes
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get user registration analytics with filtering
router.get('/registrations', async (req, res) => {
  try {
    const { 
      period = 'daily', 
      startDate, 
      endDate, 
      search = '',
      page = 1,
      limit = 50 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

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

    // Build search filter
    const searchFilter = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { telegramId: { contains: search, mode: 'insensitive' } },
        { userNumber: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: {
        createdAt: dateFilter,
        ...searchFilter
      }
    });

    // Get users with pagination and filtering
    const users = await prisma.user.findMany({
      where: {
        createdAt: dateFilter,
        ...searchFilter
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        name: true,
        userNumber: true,
        createdAt: true,
        banned: true,
        activeInvitation: true,
        totalInvitation: true,
        numberOfTotalPlay: true,
        balance: {
          select: {
            currentBalance: true,
            totalDeposits: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limitNum
    });

    // Get registration statistics
    const stats = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate daily/weekly/monthly counts
    const registrationCounts = {};
    stats.forEach(stat => {
      const date = stat.createdAt.toISOString().split('T')[0];
      registrationCounts[date] = stat._count.id;
    });

    res.json({
      success: true,
      data: {
        users,
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        registrationCounts,
        period,
        dateRange: dateFilter
      }
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics'
    });
  }
});

// Get registration summary statistics
router.get('/registration-summary', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const [
      totalUsers,
      todayUsers,
      weekUsers,
      monthUsers,
      bannedUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: weekAgo } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: monthAgo } }
      }),
      prisma.user.count({
        where: { banned: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        todayUsers,
        weekUsers,
        monthUsers,
        bannedUsers,
        activeUsers: totalUsers - bannedUsers
      }
    });

  } catch (error) {
    console.error('Error fetching registration summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration summary'
    });
  }
});

export default router;
