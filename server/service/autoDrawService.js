import prisma from '../lib/prisma.js';

/**
 * Automatic drawing service for expired lotteries
 * This runs periodically to check for lotteries that need drawing
 */
async function checkAndDrawExpiredLotteries() {
  try {
    console.log('[AutoDrawService] Checking for expired lotteries...');
    
    // Find PAID lotteries where draw time has passed but no winners exist
    const expiredLotteries = await prisma.lottery.findMany({
      where: {
        status: 'PAID',
        draw_time: {
          lte: new Date()
        }
      },
      include: {
        winners: true
      }
    });

    console.log(`[AutoDrawService] Found ${expiredLotteries.length} expired lotteries`);

    for (const lottery of expiredLotteries) {
      // Skip if winners already exist
      if (lottery.winners && lottery.winners.length > 0) {
        console.log(`[AutoDrawService] Lottery ${lottery.id} already has winners, skipping`);
        continue;
      }

      console.log(`[AutoDrawService] Auto-drawing lottery ${lottery.id}`);
      
      // Get all tickets for this lottery
      const tickets = await prisma.lotteryTicket.findMany({
        where: { lotteryId: lottery.id },
        include: {
          user: true
        }
      });

      if (tickets.length === 0) {
        console.log(`[AutoDrawService] No tickets found for lottery ${lottery.id}`);
        continue;
      }

      // Shuffle tickets using Fisher-Yates algorithm
      const shuffledTickets = [...tickets];
      for (let i = shuffledTickets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTickets[i], shuffledTickets[j]] = [shuffledTickets[j], shuffledTickets[i]];
      }

      // Define prizes
      const prizes = [
        { position: 1, amount: lottery.first_prize_amount, name: 'First Prize' },
        { position: 2, amount: lottery.second_prize_amount, name: 'Second Prize' },
        { position: 3, amount: lottery.third_prize_amount, name: 'Third Prize' }
      ];

      const winners = [];
      const maxPrizes = Math.min(3, shuffledTickets.length);

      // Draw winners
      for (let i = 0; i < maxPrizes; i++) {
        const ticket = shuffledTickets[i];
        const prize = prizes[i];
        
        const winner = await prisma.lotteryWinner.create({
          data: {
            lotteryId: lottery.id,
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
          prizePosition: prize.position,
          prizeAmount: prize.amount,
          prizeName: prize.name,
        });
      }

      // Update lottery status to completed
      await prisma.lottery.update({
        where: { id: lottery.id },
        data: { status: 'completed' }
      });

      console.log(`[AutoDrawService] Successfully drew ${winners.length} winners for lottery ${lottery.id}`);
    }

  } catch (error) {
    console.error('[AutoDrawService] Error in auto-draw:', error);
  }
}

export { checkAndDrawExpiredLotteries };
