import prisma from '../lib/prisma.js';
/**
 * Draw winners for a specific lottery
 * This will select 3 random winners from all purchased tickets
 */
async function drawLotteryWinners(lotteryId) {
  try {
    console.log(`[AdminLotteryDrawService] Starting winner draw for lottery ${lotteryId}`);
    
    // Get the lottery details
    const lottery = await prisma.lottery.findUnique({
      where: { id: lotteryId },
    });

    if (!lottery) {
      throw new Error('Lottery not found');
    }

    // Check if winners have already been drawn
    const existingWinners = await prisma.lotteryWinner.findMany({
      where: { lotteryId: lotteryId },
    });

    if (existingWinners.length > 0) {
      console.log(`[AdminLotteryDrawService] Winners already exist for lottery ${lotteryId}`);
      return existingWinners;
    }

    // Get all purchased tickets for this lottery
    const tickets = await prisma.lotteryTicket.findMany({
      where: { lotteryId: lotteryId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            name: true,
          },
        },
      },
    });

    if (tickets.length === 0) {
      throw new Error('No tickets found for this lottery');
    }

    console.log(`[AdminLotteryDrawService] Found ${tickets.length} tickets for lottery ${lotteryId}`);

      // Map ticket_number to ticketNumber for compatibility
      const mappedTickets = tickets.map(ticket => ({
        ...ticket,
        ticketNumber: ticket.ticket_number,
        userId: ticket.userId,
      }));

      // Shuffle tickets randomly using Fisher-Yates shuffle
      const shuffledTickets = [...mappedTickets];
      for (let i = shuffledTickets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTickets[i], shuffledTickets[j]] = [shuffledTickets[j], shuffledTickets[i]];
      }


    // Select winners (1st, 2nd, 3rd prize)
    const winners = [];
    const prizes = [
      { position: 1, amount: lottery.first_prize_amount || 0, name: 'First Prize' },
      { position: 2, amount: lottery.second_prize_amount || 0, name: 'Second Prize' },
      { position: 3, amount: lottery.third_prize_amount || 0, name: 'Third Prize' },
    ];

    // Validate that prize amounts are set
    for (const prize of prizes) {
      if (!prize.amount || prize.amount <= 0) {
        throw new Error(`Prize amount for ${prize.name} is not set or invalid`);
      }
    }

      for (let i = 0; i < Math.min(3, shuffledTickets.length); i++) {
        const ticket = shuffledTickets[i];
        const prize = prizes[i];

        const winner = await prisma.lotteryWinner.create({
          data: {
            lotteryId: lotteryId,
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

        console.log(`[AdminLotteryDrawService] ${prize.name} drawn: User ${ticket.user.username} with ticket ${ticket.ticketNumber}`);
      }

    // Update lottery status to 'PAID' when draw is triggered
    await prisma.lottery.update({
      where: { id: lotteryId },
      data: { 
        status: 'PAID',
        draw_time: new Date().toISOString()
      },
    });

    console.log(`[AdminLotteryDrawService] Winner draw completed for lottery ${lotteryId}`);
    return winners;

  } catch (error) {
    console.error(`[AdminLotteryDrawService] Error drawing winners:`, error);
    throw error;
  }
}

/**
 * Get winners for a specific lottery
 */
async function getLotteryWinners(lotteryId) {
  try {
    const winners = await prisma.lotteryWinner.findMany({
      where: { lotteryId: lotteryId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            name: true,
          },
        },
      },
      orderBy: {
        prizePosition: 'asc',
      },
    });

    return winners;
  } catch (error) {
    console.error(`[AdminLotteryDrawService] Error getting winners:`, error);
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
                telegramId: true,
                name: true,
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
    console.error(`[AdminLotteryDrawService] Error getting lotteries with winners:`, error);
    throw error;
  }
}

export {
  drawLotteryWinners,
  getLotteryWinners,
  getAllLotteriesWithWinners,
};
