import prisma from '../lib/prisma.js';

/**
 * Get all tickets for a lottery for step-by-step drawing
 */
async function getLotteryTicketsForDraw(lotteryId) {
  try {
    // lotteryId is a string (UUID)
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

    // Map ticket_number to ticketNumber for compatibility
    const mappedTickets = tickets.map(ticket => ({
      ...ticket,
      ticketNumber: ticket.ticket_number,
      userId: ticket.userId,
    }));

    return mappedTickets;
  } catch (error) {
    console.error('[StepByStepDraw] Error fetching tickets:', error);
    throw error;
  }
}

/**
 * Draw winner for specific prize position
 */
async function drawPrizeWinner(lotteryId, prizePosition, availableTickets) {
  try {
    // lotteryId is a string (UUID)
    if (availableTickets.length === 0) {
      throw new Error('No tickets available for draw');
    }

    // Shuffle tickets randomly using Fisher-Yates shuffle
    const shuffledTickets = [...availableTickets];
    for (let i = shuffledTickets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTickets[i], shuffledTickets[j]] = [shuffledTickets[j], shuffledTickets[i]];
    }

    const winningTicket = shuffledTickets[0];
    
    // Get prize amount based on position
    const lottery = await prisma.lottery.findUnique({
      where: { id: lotteryId },
    });

    let prizeAmount = 0;
    let prizeName = '';
    
    switch (prizePosition) {
      case 1:
        prizeAmount = lottery.first_prize_amount;
        prizeName = 'First Prize';
        break;
      case 2:
        prizeAmount = lottery.second_prize_amount;
        prizeName = 'Second Prize';
        break;
      case 3:
        prizeAmount = lottery.third_prize_amount;
        prizeName = 'Third Prize';
        break;
    }

    // Create winner record
    const winner = await prisma.lotteryWinner.create({
      data: {
        lotteryId: lotteryId,
        userId: winningTicket.userId,
        ticketNumber: winningTicket.ticketNumber,
        prizePosition,
        prizeAmount,
        prizeName,
      },
    });

    return {
      ...winner,
      user: winningTicket.user,
      ticket: winningTicket,
    };
  } catch (error) {
    console.error(`[StepByStepDraw] Error drawing ${prizePosition} prize:`, error);
    throw error;
  }
}

/**
 * Get current draw status and winners
 */
async function getDrawStatus(lotteryId) {
  try {
    // lotteryId is a string (UUID)
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
      orderBy: { prizePosition: 'asc' },
    });

    const tickets = await getLotteryTicketsForDraw(lotteryId);
    
    // Get ticket numbers that have already won
    const winningTicketNumbers = winners.map(w => w.ticketNumber);
    
    // Get available tickets (not yet won)
    const availableTickets = tickets.filter(
      ticket => !winningTicketNumbers.includes(ticket.ticketNumber)
    );

    return {
      totalTickets: tickets.length,
      availableTickets,
      winners,
      isComplete: winners.length >= 3,
    };
  } catch (error) {
    console.error('[StepByStepDraw] Error getting draw status:', error);
    throw error;
  }
}

/**
 * Complete the draw process and update lottery status
 */
async function completeDraw(lotteryId) {
  try {
    // lotteryId is a string (UUID)
    await prisma.lottery.update({
      where: { id: lotteryId },
      data: { status: 'COMPLETED' },
    });

    return { success: true };
  } catch (error) {
    console.error('[StepByStepDraw] Error completing draw:', error);
    throw error;
  }
}

export {
  getLotteryTicketsForDraw,
  drawPrizeWinner,
  getDrawStatus,
  completeDraw,
};
