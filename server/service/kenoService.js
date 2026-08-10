
import prisma from '../lib/prisma.js';

function getRandomDraw() {
  const nums = Array.from({ length: 80 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums.slice(0, 20);
}

const payoutTable = [
  [0, 3],
  [0, 1, 12],
  [0, 1, 3, 43],
  [0, 0, 2, 10, 120],
  [0, 0, 1, 5, 20, 800],
  [0, 0, 1, 3, 15, 50, 1600],
  [0, 0, 0, 2, 6, 20, 100, 5000],
  [0, 0, 0, 1, 4, 15, 50, 500, 15000],
  [0, 0, 0, 1, 3, 10, 30, 200, 1500, 25000],
  [0, 0, 0, 0, 2, 5, 20, 80, 500, 5000, 100000],
];

export async function playKeno(userId, bet, slot, selectedNumbers) {
  // Draw 20 numbers
  const drawnNumbers = getRandomDraw();
  const matches = selectedNumbers.filter(n => drawnNumbers.includes(n));
  const payoutRow = payoutTable[slot - 1] || [];
  const win = payoutRow[matches.length] ? payoutRow[matches.length] * bet : 0;

  // Use a transaction for atomic balance update (like lottery)
  const result = await prisma.$transaction(async (tx) => {
    // Fetch user balance
    const userBalance = await tx.userBalance.findUnique({ where: { userId } });
    if (!userBalance || userBalance.currentBalance < bet) {
      throw new Error('Insufficient balance');
    }
    
    // Calculate net change: remove bet, add winnings
    const netChange = win - bet;
    const actualLoss = win < bet ? bet - win : 0;
    
    // Update balance with calculated values
    const updated = await tx.userBalance.update({
      where: { userId },
      data: {
        currentBalance: userBalance.currentBalance + netChange,
        totalLosses: { increment: actualLoss },
      },
    });
    // Optionally, log the game result
    // await tx.kenoGame.create({ ... })
    return updated.currentBalance;
  });

  return {
    drawnNumbers,
    matches,
    win,
    newBalance: result,
  };
}


export default { playKeno };
