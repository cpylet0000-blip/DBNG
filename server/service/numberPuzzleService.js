import prisma from '../lib/prisma.js'

export async function updateNumberPuzzleBalance({ winnerId, stake, players }) {
  try {
    // Log player count and stake for debugging
    console.log(`[NumberPuzzle] updateNumberPuzzleBalance: stake=${stake}, players=${players.length}, winnerId=${winnerId}`);
    if (players.some(p => p.userId === undefined || p.userId === null || isNaN(Number(p.userId)))) {
      console.error('[NumberPuzzle] One or more players missing valid userId:', players);
      return;
    }
    if (winnerId) {
      const totalPool = stake * players.length;
      const prize = Math.floor(totalPool * 0.9);
      await prisma.userBalance.update({
        where: { userId: parseInt(winnerId, 10) },
        data: { currentBalance: { increment: prize } },
      });
      // Deduct stake from all players
      for (const player of players) {
        await prisma.userBalance.update({
          where: { userId: parseInt(player.userId, 10) },
          data: { currentBalance: { decrement: stake } },
        });
      }
    } else {
      // No winner: just deduct stake from all players
      for (const player of players) {
        await prisma.userBalance.update({
          where: { userId: parseInt(player.userId, 10) },
          data: { currentBalance: { decrement: stake } },
        });
      }
    }
  } catch (err) {
    console.error('[NumberPuzzle] updateNumberPuzzleBalance error:', err);
  }
}
