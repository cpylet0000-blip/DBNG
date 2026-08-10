import prisma from '../lib/prisma.js'

/**
 * Ensure a GameEarnings row exists for the given game.
 */
async function ensureGame(game) {
  const existing = await prisma.gameEarnings.findUnique({ where: { game } })
  if (existing) return existing
  return prisma.gameEarnings.create({ data: { game } })
}

export async function incrementStake(game, amount) {
  if (!amount || amount <= 0) return
  await prisma.gameEarnings.upsert({
    where: { game },
    update: { totalStakes: { increment: amount } },
    create: { game, totalStakes: amount },
  })
}

export async function refundStake(game, amount) {
  if (!amount || amount <= 0) return
  await prisma.gameEarnings.upsert({
    where: { game },
    update: { totalStakes: { decrement: amount } },
    create: { game, totalStakes: 0 },
  })
}

export async function incrementPayout(game, amount) {
  if (!amount || amount <= 0) return
  await prisma.gameEarnings.upsert({
    where: { game },
    update: { totalPayouts: { increment: amount } },
    create: { game, totalPayouts: amount },
  })
}

export async function incrementCommission(game, amount) {
  if (!amount || amount <= 0) return
  await prisma.gameEarnings.upsert({
    where: { game },
    update: { totalCommission: { increment: amount } },
    create: { game, totalCommission: amount },
  })
}

export async function refundCommission(game, amount) {
  if (!amount || amount <= 0) return
  await prisma.gameEarnings.upsert({
    where: { game },
    update: { totalCommission: { decrement: amount } },
    create: { game, totalCommission: 0 },
  })
}

export async function getSummary() {
  const rows = await prisma.gameEarnings.findMany()
  return rows.map((r) => ({
    game: r.game,
    totalStakes: r.totalStakes,
    totalPayouts: r.totalPayouts,
    totalCommission: r.totalCommission,
    // Owner earnings are the commission; payouts are from the pool
    netEarned: r.totalCommission,
    updatedAt: r.updatedAt,
  }))
}
