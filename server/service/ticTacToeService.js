import prisma from '../lib/prisma.js'

export async function updateTicTacToeBalance({ winnerId, stake, players }) {
  try {
    if (players.some(p => p.userId === undefined || p.userId === null || isNaN(Number(p.userId)))) {
      console.error('[TicTacToe] One or more players missing valid userId:', players);
      return;
    }
    
    // Convert telegram user IDs to database user IDs
    const playerIds = [];
    for (const player of players) {
      const userRecord = await prisma.user.findUnique({
        where: { telegramId: player.userId.toString() }
      });
      if (userRecord) {
        playerIds.push(userRecord.id);
      }
    }
    
    let winnerDbId = null;
    if (winnerId && winnerId !== 'DRAW' && winnerId !== 'TIMEOUT') {
      const winnerRecord = await prisma.user.findUnique({
        where: { telegramId: winnerId.toString() }
      });
      winnerDbId = winnerRecord?.id;
    }
    
    if (winnerDbId && winnerId !== 'DRAW' && winnerId !== 'TIMEOUT') {
      const totalPool = stake * players.length;
      const prize = Math.floor(totalPool * 0.9);
      await prisma.userBalance.update({
        where: { userId: winnerDbId },
        data: { currentBalance: { increment: prize } },
      });
      // Deduct stake from all players
      for (const playerDbId of playerIds) {
        await prisma.userBalance.update({
          where: { userId: playerDbId },
          data: { currentBalance: { decrement: stake } },
        });
      }
    } else if (winnerId === 'DRAW') {
      // Draw: deduct 40% of stake from each player
      const penalty = Math.floor(stake * 0.4);
      for (const playerDbId of playerIds) {
        await prisma.userBalance.update({
          where: { userId: playerDbId },
          data: { currentBalance: { decrement: penalty } },
        });
      }
    } else if (winnerId === 'TIMEOUT') {
      // Timeout: deduct full stake from each player
      for (const playerDbId of playerIds) {
        await prisma.userBalance.update({
          where: { userId: playerDbId },
          data: { currentBalance: { decrement: stake } },
        });
      }
    }
  } catch (err) {
    console.error('[TicTacToe] updateTicTacToeBalance error:', err);
  }
}
