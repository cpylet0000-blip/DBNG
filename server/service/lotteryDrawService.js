const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Draw winners for a specific lottery
 * This will select 3 random winners from all purchased tickets
 */
async function drawLotteryWinners(lotteryId) {
  try {
    console.log(`[LotteryDrawService] Starting winner draw for lottery ${lotteryId}`);
    
    // Get the lottery details
    const lottery = await prisma.lottery.findUnique({
      where: { id: parseInt(lotteryId) },
    });

    if (!lottery) {
      throw new Error('Lottery not found');
    }

    // Check if winners have already been drawn
    const existingWinners = await prisma.lotteryWinner.findMany({
      where: { lotteryId: parseInt(lotteryId) },
    });

    if (existingWinners.length > 0) {
      console.log(`[LotteryDrawService] Winners already exist for lottery ${lotteryId}`);
      return existingWinners;
    }

    // Get all purchased tickets for this lottery
    const tickets = await prisma.lotteryTicket.findMany({
      where: { lotteryId: parseInt(lotteryId) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (tickets.length === 0) {
      throw new Error('No tickets found for this lottery');
    }

    console.log(`[LotteryDrawService] Found ${tickets.length} tickets for lottery ${lotteryId}`);

    // Shuffle tickets randomly
    const shuffledTickets = tickets.sort(() => Math.random() - 0.5);

    // Select winners (1st, 2nd, 3rd prize)
    const winners = [];
    const prizes = [
      { position: 1, amount: lottery.firstPrize, name: 'First Prize' },
      { position: 2, amount: lottery.secondPrize, name: 'Second Prize' },
      { position: 3, amount: lottery.thirdPrize, name: 'Third Prize' },
    ];

    for (let i = 0; i < Math.min(3, shuffledTickets.length); i++) {
      const ticket = shuffledTickets[i];
      const prize = prizes[i];

      const winner = await prisma.lotteryWinner.create({
        data: {
          lotteryId: parseInt(lotteryId),
          userId: ticket.userId,
          ticketNumber: ticket.ticketNumber,
          prizePosition: prize.position,
          prizeAmount: prize.amount,
          prizeName: prize.name,
        },
      });

      winners.push({
        ...winner,
        user: ticket.user,
      });

      console.log(`[LotteryDrawService] ${prize.name} drawn: User ${ticket.user.username} with ticket ${ticket.ticketNumber}`);
    }

    // Update lottery status to 'completed'
    await prisma.lottery.update({
      where: { id: parseInt(lotteryId) },
      data: { status: 'completed' },
    });

    console.log(`[LotteryDrawService] Winner draw completed for lottery ${lotteryId}`);
    return winners;

  } catch (error) {
    console.error(`[LotteryDrawService] Error drawing winners:`, error);
    throw error;
  }
}

/**
 * Get winners for a specific lottery
 */
async function getLotteryWinners(lotteryId) {
  try {
    const winners = await prisma.lotteryWinner.findMany({
      where: { lotteryId: parseInt(lotteryId) },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        prizePosition: 'asc',
      },
    });

    return winners;
  } catch (error) {
    console.error(`[LotteryDrawService] Error getting winners:`, error);
    throw error;
  }
}

/**
 * Get all lotteries with their winners
 */
async function getAllLotteriesWithWinners() {
  try {
    const lotteries = await prisma.lottery.findMany({
      include: {
        winners: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
          orderBy: {
            prizePosition: 'asc',
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    return lotteries;
  } catch (error) {
    console.error(`[LotteryDrawService] Error getting lotteries with winners:`, error);
    throw error;
  }
}

module.exports = {
  drawLotteryWinners,
  getLotteryWinners,
  getAllLotteriesWithWinners,
};
