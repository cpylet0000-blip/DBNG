import crypto from 'crypto'
import prisma from '../lib/prisma.js'

// Simple in-memory run store for quick lookup; persistent data stored in DB if needed.
const runs = new Map()

// Constants
const SERVER_SECRET = process.env.AVATAR_SERVER_SECRET || 'avatar-secret'
const DEFAULT_RATE = 0.02 // multiplier increase rate per second baseline

function hmacSeed(runId) {
  return crypto.createHmac('sha256', SERVER_SECRET).update(String(runId)).digest('hex')
}

function deterministicRandomFromSeed(seedHex) {
  // Convert first 8 bytes of hex to integer and normalize
  const slice = seedHex.slice(0, 16)
  const num = parseInt(slice, 16)
  return (num % 1e9) / 1e9
}

function sampleStopTime(u, lambda = 0.2) {
  // Example: exponential distribution inverse CDF: -ln(1-u)/lambda
  const v = Math.max(1e-12, Math.min(1 - 1e-12, u))
  return -Math.log(1 - v) / lambda
}

function multiplierAt(tSeconds, r) {
  // Linear multiplier example: 1 + r * t
  return 1 + r * tSeconds
}

export async function createRun(runId) {
  const seed = hmacSeed(runId)
  const u = deterministicRandomFromSeed(seed)
  const stopTime = sampleStopTime(u)
  const r = DEFAULT_RATE + 0.05 * u
  const run = {
    id: String(runId),
    seed,
    stopTime,
    rate: r,
    status: 'WAITING',
    T0: null,
  }
  runs.set(String(runId), run)
  return run
}

export async function startRun(runId) {
  const run = runs.get(String(runId))
  if (!run) throw new Error('Run not found')
  if (run.status !== 'WAITING') throw new Error('Run already started')

  // If AvatarBalance is zero or negative, mark run finished immediately
  const bal = await prisma.avatarBalance.findFirst()
  if (bal && BigInt(bal.currentBalance) <= BigInt(0)) {
    run.status = 'FINISHED'
    run.T0 = Date.now()
    run.finalizedAt = run.T0
    runs.set(String(runId), run)
    return run
  }

  run.T0 = Date.now()
  run.status = 'RUNNING'
  runs.set(String(runId), run)

  // schedule finalize (server authoritative)
  setTimeout(async () => {
    try {
      await finalizeRun(runId)
    } catch (e) {
      console.error('Finalizing run error', e)
    }
  }, Math.max(0, Math.floor(run.stopTime * 1000)))

  return run
}

export async function finalizeRun(runId) {
  const run = runs.get(String(runId))
  if (!run) throw new Error('Run not found')
  if (run.status === 'FINISHED') return run

  run.status = 'FINISHED'
  run.finalizedAt = Date.now()

  // Any remaining running bets become lost. Update DB accordingly.
  // We assume a `Bet` table will be created; for now attempt to update if exists.
  try {
    await prisma.$transaction(async (tx) => {
      // find running bets for this run
      const runningBets = await tx.bet.findMany({ where: { runId: String(runId), status: 'running' } })
      for (const b of runningBets) {
        await tx.bet.update({ where: { id: b.id }, data: { status: 'lost', payout: 0 } })
      }

      // compute net profit/loss for the run and update AvatarBalance
      // simple: sum stakes of running bets (they are lost) minus payouts (0)
      const lostTotal = runningBets.reduce((s, b) => s + Number(b.stake), 0)
      // convert to cents (assume stake already in cents)
      const bal = await tx.avatarBalance.findFirst()
      if (bal) {
        const next = BigInt(bal.currentBalance) + BigInt(Math.floor(-lostTotal))
        await tx.avatarBalance.update({ where: { id: bal.id }, data: { currentBalance: next } })
      }
    })
  } catch (e) {
    // If Bet or AvatarBalance tables don't exist yet, ignore but log
    console.warn('DB finalizeRun partial failure (maybe tables missing):', e.message)
  }

  runs.set(String(runId), run)
  return run
}

export async function placeBet(runId, userId, stake) {
  // stake is expected in smallest currency unit (integer)
  // Reserve stake by creating a Bet (status: running) and deducting user balance elsewhere
  // Here we only persist bet if Bet model exists
  try {
    const bet = await prisma.bet.create({ data: { runId: String(runId), userId: Number(userId), stake: Number(stake), status: 'running', placedAt: new Date() } })
    return bet
  } catch (e) {
    console.warn('placeBet DB create failed:', e.message)
    // fallback: return in-memory bet placeholder
    const id = `local-${Date.now()}`
    return { id, runId: String(runId), userId, stake, status: 'running', placedAt: new Date() }
  }
}

export async function cashOut(runId, betId) {
  const run = runs.get(String(runId))
  if (!run) throw new Error('Run not found')
  if (run.status !== 'RUNNING') throw new Error('Run not running')

  const now = Date.now()
  const t = (now - run.T0) / 1000
  if (t >= run.stopTime) throw new Error('Too late to cash out')

  const mult = multiplierAt(t, run.rate)

  // load bet
  let bet
  try {
    bet = await prisma.bet.findUnique({ where: { id: betId } })
  } catch (e) {
    console.warn('cashOut failed to load bet:', e.message)
  }

  if (bet && bet.status !== 'running') throw new Error('Bet not running')

  const payout = Math.floor(Number((bet ? Number(bet.stake) : 0) * mult))

  try {
    await prisma.$transaction(async (tx) => {
      if (bet) {
        await tx.bet.update({ where: { id: betId }, data: { status: 'cashed_out', cashedOutAt: new Date(), payout } })
      }
      // credit player balance if PlayerBalance exists
      try {
        const ub = await tx.userBalance.findUnique({ where: { userId: bet.userId } })
        if (ub) {
          await tx.userBalance.update({ where: { userId: bet.userId }, data: { currentBalance: { increment: payout } } })
        }
      } catch (e) {
        // ignore if userBalance model missing
      }

      // update AvatarBalance: subtract payout (game pays the payout)
      try {
        const bal = await tx.avatarBalance.findFirst()
        if (bal) {
          const next = BigInt(bal.currentBalance) - BigInt(payout)
          await tx.avatarBalance.update({ where: { id: bal.id }, data: { currentBalance: next } })
        }
      } catch (e) {
        // ignore missing avatarBalance
      }
    })
  } catch (e) {
    console.error('cashOut transaction failed', e)
    throw new Error('Cashout failed')
  }

  return { payout, multiplier: mult }
}

export default {
  createRun,
  startRun,
  finalizeRun,
  placeBet,
  cashOut,
  _runs: runs,
}
