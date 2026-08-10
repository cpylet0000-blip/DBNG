// leaderboardService.js
// Helper for updating leaderboard stats for invitations and play counts
import prisma from '../lib/prisma.js';

export function getLeaderboardPeriodStart(period, referenceDate = new Date()) {
  const now = referenceDate;
  if (period === 'DAILY') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'WEEKLY') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (period === 'MONTHLY') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  // TOTAL: use epoch
  return new Date(1970, 0, 1);
}

export async function updateLeaderboardStat(userId, type) {
  const periods = ['DAILY', 'WEEKLY', 'MONTHLY', 'TOTAL'];
  for (const period of periods) {
    const periodStart = getLeaderboardPeriodStart(period);
    await prisma.userLeaderboardStat.upsert({
      where: {
        userId_type_period_periodStart: {
          userId,
          type,
          period,
          periodStart,
        },
      },
      update: { value: { increment: 1 } },
      create: {
        userId,
        type,
        period,
        periodStart,
        value: 1,
      },
    });
  }
}
