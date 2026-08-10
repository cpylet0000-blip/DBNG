import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma.js';
import { authenticateUser } from '../middleware/auth.js';
import { getSpinWinSocket } from '../lib/websocket/setupWebSocket.js';

const router = express.Router();

// Wheel configuration
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const sectors = {
  'A': [32, 15, 19, 4, 21, 2],
  'B': [25, 17, 34, 6, 27, 13],
  'C': [36, 11, 30, 8, 23, 10],
  'D': [5, 24, 16, 33, 1, 20],
  'E': [14, 31, 9, 22, 18, 29],
  'F': [7, 28, 12, 35, 3, 26]
};

const getNumberColor = (num) => {
  if (num === 0) return 'green';
  return RED_NUMBERS.includes(num) ? 'red' : 'black';
};

const getNeighbors = (num) => {
  const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const index = wheelOrder.indexOf(num);
  if (index === -1) return [];

  const neighbors = [];
  for (let i = -2; i <= 2; i++) {
    const neighborIndex = (index + i + wheelOrder.length) % wheelOrder.length;
    neighbors.push(wheelOrder[neighborIndex]);
  }
  return neighbors;
};

const BET_ODDS = {
  exact: 36,
  red: 2,
  black: 2,
  green: 36,
  even: 2,
  odd: 2,
  low: 2,
  high: 2,
  dozen1: 3,
  dozen2: 3,
  dozen3: 3,
  sector: 6,
  twins: 36,
  mirrors: 2,
  finals: 10,
  sixline: 6,
  'low-red': 4,
  'low-black': 4,
  'high-red': 4,
  'high-black': 4,
  neighbors: 5
};

const STATIC_BET_VALUES = {
  red: 'RED',
  black: 'BLACK',
  green: 'GREEN',
  even: 'EVEN',
  odd: 'ODD',
  low: '1-18',
  high: '19-36',
  dozen1: '1-12',
  dozen2: '13-24',
  dozen3: '25-36',
  twins: '11&22&33',
  mirrors: 'MIRRORS',
  'low-red': '1-18 (Red)',
  'low-black': '1-18 (Black)',
  'high-red': '19-36 (Red)',
  'high-black': '19-36 (Black)'
};

const ROUND_DURATION_MS = 45 * 1000;
const parsedAutoSpinCheckMs = Number(process.env.SPIN_WIN_CHECK_MS || 1000);
const AUTO_SPIN_CHECK_MS = Number.isFinite(parsedAutoSpinCheckMs) && parsedAutoSpinCheckMs >= 200
  ? parsedAutoSpinCheckMs
  : 1000;
const ROUND_RESULT_DISPLAY_MS = 6000; // 6 seconds base display time
const WINNER_DISPLAY_EXTENSION_MS = 10000; // Additional 10 seconds if there are winners
const ENABLE_SPIN_WIN_TICK_LOGS = process.env.SPIN_WIN_TICK_DEBUG === 'true';

const roundStateByGameId = new Map();
let autoSpinTickInProgress = false;
let roundSpinInProgress = false;

const spinWinTickLog = (...args) => {
  if (ENABLE_SPIN_WIN_TICK_LOGS) {
    console.log(...args);
  }
};

const normalizeAndValidateBet = (betType, betValue) => {
  const normalizedType = String(betType || '').trim();
  const odds = BET_ODDS[normalizedType];

  if (!odds) {
    return { valid: false, error: 'Unsupported bet type' };
  }

  if (Object.prototype.hasOwnProperty.call(STATIC_BET_VALUES, normalizedType)) {
    return {
      valid: true,
      betType: normalizedType,
      betValue: STATIC_BET_VALUES[normalizedType],
      odds
    };
  }

  if (normalizedType === 'exact') {
    // Accept comma-separated numbers for exact bets
    const numbers = String(betValue)
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 36);
    if (numbers.length === 0) {
      return { valid: false, error: 'Exact bet must target at least one number between 0 and 36' };
    }
    if (numbers.length > 5) {
      return { valid: false, error: 'Maximum exact selections is 5 per ticket' };
    }
    // Remove duplicates
    const uniqueNumbers = [...new Set(numbers)];
    if (uniqueNumbers.length !== numbers.length) {
      return { valid: false, error: 'Duplicate numbers are not allowed in exact bet' };
    }
    return {
      valid: true,
      betType: normalizedType,
      betValue: uniqueNumbers.join(','),
      odds: BET_ODDS.exact / uniqueNumbers.length
    };
  }

  if (normalizedType === 'sector') {
    const sector = String(betValue || '').trim().toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(sectors, sector)) {
      return { valid: false, error: 'Invalid sector value' };
    }

    return {
      valid: true,
      betType: normalizedType,
      betValue: sector,
      odds
    };
  }

  if (normalizedType === 'finals') {
    const digit = Number(betValue);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
      return { valid: false, error: 'Finals bet must target a digit between 0 and 9' };
    }

    return {
      valid: true,
      betType: normalizedType,
      betValue: String(digit),
      odds
    };
  }

  if (normalizedType === 'sixline') {
    const match = String(betValue || '').trim().match(/^(\d+)-(\d+)$/);
    if (!match) {
      return { valid: false, error: 'Sixline bet value must be in "start-end" format' };
    }

    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 36 || end - start !== 5) {
      return { valid: false, error: 'Sixline bet must include exactly 6 consecutive numbers between 1 and 36' };
    }

    return {
      valid: true,
      betType: normalizedType,
      betValue: `${start}-${end}`,
      odds
    };
  }

  if (normalizedType === 'neighbors') {
    const center = Number(betValue);
    if (!Number.isInteger(center) || center < 0 || center > 36) {
      return { valid: false, error: 'Neighbors bet must target a number between 0 and 36' };
    }

    return {
      valid: true,
      betType: normalizedType,
      betValue: String(center),
      odds
    };
  }

  return { valid: false, error: 'Invalid bet configuration' };
};

const ensureRoundState = (gameId) => {
  const existing = roundStateByGameId.get(gameId);
  if (existing) return existing;

  const created = {
    endsAt: Date.now() + ROUND_DURATION_MS,
    spinning: false,
    lastBroadcastSecond: null
  };
  roundStateByGameId.set(gameId, created);
  return created;
};

const resetRoundState = (gameId) => {
  const next = {
    endsAt: Date.now() + ROUND_DURATION_MS,
    spinning: false,
    lastBroadcastSecond: null
  };
  roundStateByGameId.set(gameId, next);
  return next;
};

const getRoundPayload = (gameId) => {
  const state = ensureRoundState(gameId);
  const secondsRemaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));

  return {
    gameId,
    roundEndsAt: state.endsAt,
    secondsRemaining,
    isRoundSpinning: Boolean(state.spinning)
  };
};

const evaluateBetWin = (bet, winningNumber, winningColor) => {
  switch (bet.betType) {
    case 'exact':
      return String(bet.betValue)
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isInteger(value))
        .includes(winningNumber);
    case 'red':
      return winningColor === 'red';
    case 'black':
      return winningColor === 'black';
    case 'green':
      return winningNumber === 0;
    case 'even':
      return winningNumber !== 0 && winningNumber % 2 === 0;
    case 'odd':
      return winningNumber !== 0 && winningNumber % 2 === 1;
    case 'low':
      return winningNumber >= 1 && winningNumber <= 18;
    case 'high':
      return winningNumber >= 19 && winningNumber <= 36;
    case 'dozen1':
      return winningNumber >= 1 && winningNumber <= 12;
    case 'dozen2':
      return winningNumber >= 13 && winningNumber <= 24;
    case 'dozen3':
      return winningNumber >= 25 && winningNumber <= 36;
    case 'sector':
      return sectors[bet.betValue]?.includes(winningNumber) || false;
    case 'twins':
      return [11, 22, 33].includes(winningNumber);
    case 'mirrors': {
      const mirrorPairs = [12, 13, 14, 15, 16, 17, 18, 23, 24, 25, 26, 27, 28, 29, 34, 35, 36];
      return mirrorPairs.includes(winningNumber);
    }
    case 'finals':
      return winningNumber % 10 === Number.parseInt(bet.betValue, 10);
    case 'sixline': {
      const [start, end] = String(bet.betValue).split('-').map(Number);
      return winningNumber >= start && winningNumber <= end;
    }
    case 'low-red':
      return winningNumber >= 1 && winningNumber <= 18 && winningColor === 'red';
    case 'low-black':
      return winningNumber >= 1 && winningNumber <= 18 && winningColor === 'black';
    case 'high-red':
      return winningNumber >= 19 && winningNumber <= 36 && winningColor === 'red';
    case 'high-black':
      return winningNumber >= 19 && winningNumber <= 36 && winningColor === 'black';
    case 'neighbors': {
      const neighborNumbers = getNeighbors(Number.parseInt(bet.betValue, 10));
      return neighborNumbers.includes(winningNumber);
    }
    default:
      return false;
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processRoundSpin = async (gameId) => {
  if (roundSpinInProgress) {
    return { success: false, reason: 'busy' };
  }

  roundSpinInProgress = true;

  try {
    const game = await prisma.spinWinGame.findUnique({
      where: { gameId },
      include: {
        bets: {
          where: { status: 'pending' }
        }
      }
    });

    if (!game || game.status !== 'active') {
      return { success: false, reason: 'invalid-game' };
    }

    const pendingBets = game.bets;
    
    // Debug logging to track bet timing
    console.log(`[SPIN DEBUG] Processing spin for game ${gameId}. Pending bets: ${pendingBets.length}`);
    if (pendingBets.length > 0) {
      pendingBets.forEach(bet => {
        console.log(`[SPIN DEBUG] Bet: ID=${bet.id}, User=${bet.userId}, Amount=${bet.amount}, Status=${bet.status}, Type=${bet.betType}`);
      });
    }

    // Always spin the wheel for consistent user experience, even with no bets
    // This prevents race conditions where bets placed just before timer expires aren't counted
    const randomIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length);
    const winningNumber = WHEEL_NUMBERS[randomIndex];
    const winningColor = getNumberColor(winningNumber);

    let participantUsers = [];
    let roundResult;

    if (pendingBets.length > 0) {
      // Process bets and winnings only if there are bets
      const participantIds = Array.from(new Set(pendingBets.map((bet) => bet.userId)));
      participantUsers = await prisma.user.findMany({
        where: { id: { in: participantIds } },
        select: {
          id: true,
          username: true,
          name: true
        }
      });
      const participantMap = new Map(participantUsers.map((user) => [user.id, user]));

      roundResult = await prisma.$transaction(async (tx) => {
        const timestamp = new Date().toISOString();

        if (participantIds.length > 0) {
          await tx.spinWinSpin.createMany({
            data: participantIds.map((participantId) => ({
              gameId,
              userId: participantId,
              winningNumber,
              winningColor,
              spinResult: {
                wheelIndex: randomIndex,
                rotation: randomIndex * (360 / WHEEL_NUMBERS.length),
                timestamp
              }
            }))
          });
        }

        const processedBets = [];
        const winningsByUser = new Map();
        for (const bet of pendingBets) {
          const won = evaluateBetWin(bet, winningNumber, winningColor);
          const winnings = won ? bet.amount * bet.odds : 0;

          const updatedBet = await tx.spinWinBet.update({
            where: { id: bet.id },
            data: {
              status: won ? 'won' : 'lost',
              winnings: won ? winnings : null
            }
          });
          processedBets.push(updatedBet);

          if (winnings > 0) {
            const current = winningsByUser.get(bet.userId) || 0;
            winningsByUser.set(bet.userId, current + winnings);
          }
        }
        for (const [winnerId, amountWon] of winningsByUser.entries()) {
          await tx.userBalance.update({
            where: { userId: winnerId },
            data: {
              currentBalance: {
                increment: amountWon
              }
            }
          });
        }

        await tx.spinWinGame.update({
          where: { gameId },
          data: {
            startedAt: new Date() // Reset start time instead of creating new game
          }
        });

        const totalWinnings = Array.from(winningsByUser.values()).reduce((sum, value) => sum + value, 0);

        return {
          processedBets,
          totalWinnings,
          nextGameId: gameId // Return the same gameId
        };
      });
    } else {
      // No bets - just reset the game and broadcast spin result for animation
      await prisma.spinWinGame.update({
        where: { gameId },
        data: {
          startedAt: new Date() // Reset start time
        }
      });

      roundResult = {
        processedBets: [],
        totalWinnings: 0,
        nextGameId: gameId
      };
    }

    const spinWinSocket = getSpinWinSocket();
    if (spinWinSocket) {
      const winners = pendingBets.length > 0 ? roundResult.processedBets
        .filter(bet => bet.status === 'won')
        .map(bet => ({
          username: participantUsers.find(u => u.id === bet.userId)?.username || participantUsers.find(u => u.id === bet.userId)?.name || 'Anonymous',
          amount: bet.winnings || 0,
          winningNumber,
          betType: bet.betType,
          betValue: bet.betValue
        })) : [];

      spinWinSocket.broadcastSpinResult(gameId, {
        gameId,
        winningNumber,
        winningColor,
        totalWinnings: roundResult.totalWinnings,
        winners: winners
      });

      spinWinSocket.broadcastGameUpdated(gameId, {
        totalBets: 0,
        totalAmount: 0
      });
    }

    // Calculate display time - extend if there are winners
    const hasWinners = pendingBets.length > 0 && roundResult.processedBets.some(bet => bet.status === 'won');
    const displayTime = hasWinners ? ROUND_RESULT_DISPLAY_MS + WINNER_DISPLAY_EXTENSION_MS : ROUND_RESULT_DISPLAY_MS;

    await wait(displayTime);

    roundStateByGameId.delete(gameId);
    resetRoundState(gameId);

    if (spinWinSocket) {
      spinWinSocket.broadcastRoundStarted(getRoundPayload(gameId));
    }

    return {
      success: true,
      spun: true,
      gameId,
      winningNumber,
      winningColor,
      totalWinnings: roundResult.totalWinnings,
      nextGameId: roundResult.nextGameId
    };
  } finally {
    roundSpinInProgress = false;
  }
};

const autoSpinTick = async () => {
  if (autoSpinTickInProgress) return;
  autoSpinTickInProgress = true;

  try {
    spinWinTickLog('Auto-spin tick checking...');

    // Only handle the universal game
    const UNIVERSAL_GAME_ID = 'spin-win-universal';
    const activeGame = await prisma.spinWinGame.findUnique({
      where: { gameId: UNIVERSAL_GAME_ID }
    });

    if (!activeGame || activeGame.status !== 'active') {
      return;
    }

    const spinWinSocket = getSpinWinSocket();
    const state = ensureRoundState(activeGame.gameId);
    const now = Date.now();
    const secondsRemaining = Math.max(0, Math.ceil((state.endsAt - now) / 1000));

    spinWinTickLog(`Game ${activeGame.gameId}: ${secondsRemaining}s remaining, spinning: ${state.spinning}`);

    if (spinWinSocket && state.lastBroadcastSecond !== secondsRemaining) {
      state.lastBroadcastSecond = secondsRemaining;
      spinWinSocket.broadcastRoundTimer({
        gameId: activeGame.gameId,
        roundEndsAt: state.endsAt,
        secondsRemaining,
        isRoundSpinning: Boolean(state.spinning)
      });
    }

    if (state.spinning) {
      return;
    }

    if (now >= state.endsAt) {
      spinWinTickLog(`Countdown reached 0! Starting spin for game ${activeGame.gameId}`);
      state.spinning = true;

      if (spinWinSocket) {
        spinWinTickLog(`Broadcasting round-spinning for game ${activeGame.gameId}`);
        spinWinSocket.broadcastRoundSpinning({
          gameId: activeGame.gameId,
          roundEndsAt: state.endsAt
        });
      }

      try {
        spinWinTickLog(`Calling processRoundSpin for game ${activeGame.gameId}`);
        const spinResult = await processRoundSpin(activeGame.gameId);
        spinWinTickLog('Spin result:', spinResult);
        if (!spinResult?.success) {
          state.spinning = false;
        }
      } catch (error) {
        state.spinning = false;
        console.error('SpinWin process round error:', error);
      }
    }
  } catch (error) {
    console.error('SpinWin auto-spin tick error:', error);
  } finally {
    autoSpinTickInProgress = false;
  }
};

setInterval(() => {
  autoSpinTick().catch((error) => {
    console.error('SpinWin auto-spin scheduler failure:', error);
  });
}, AUTO_SPIN_CHECK_MS);

// Middleware to authenticate user
router.use(authenticateUser);

// GET /spin-win/game - Get or create active game
router.get('/game', async (req, res) => {
  try {
    const userId = req.user.id;

    // Use a universal game ID for all players
    const UNIVERSAL_GAME_ID = 'spin-win-universal';

    // Find or create universal active game
    let game = await prisma.spinWinGame.findUnique({
      where: {
        gameId: UNIVERSAL_GAME_ID
      },
      include: {
        bets: {
          where: { userId },
          include: { user: true }
        },
        spins: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!game) {
      game = await prisma.spinWinGame.create({
        data: {
          gameId: UNIVERSAL_GAME_ID,
          status: 'active'
        },
        include: {
          bets: true,
          spins: true
        }
      });

      resetRoundState(game.gameId);
    } else {
      ensureRoundState(game.gameId);
    }

    const roundPayload = getRoundPayload(game.gameId);

    // Get current jackpots
    const jackpots = await prisma.spinWinJackpot.findMany({
      where: { isActive: true }
    });

    res.json({
      success: true,
      game,
      jackpots,
      wheelNumbers: WHEEL_NUMBERS,
      roundEndsAt: roundPayload.roundEndsAt,
      roundSecondsRemaining: roundPayload.secondsRemaining,
      isRoundSpinning: roundPayload.isRoundSpinning
    });
  } catch (error) {
    console.error('Error getting SpinWin game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load game'
    });
  }
});

// POST /spin-win/bet - Place a bet
router.post('/bet', async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId, betType, betValue, amount } = req.body;

    const amountNumber = Number(amount);

    if (!gameId || !betType || betValue === undefined || !Number.isFinite(amountNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required bet information'
      });
    }

    if (amountNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Bet amount must be greater than zero'
      });
    }

    const normalizedBet = normalizeAndValidateBet(betType, betValue);
    if (!normalizedBet.valid) {
      return res.status(400).json({
        success: false,
        error: normalizedBet.error
      });
    }

    const activeGame = await prisma.spinWinGame.findUnique({
      where: { gameId },
      select: { gameId: true, status: true }
    });

    if (!activeGame || activeGame.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Game is not active'
      });
    }

    const roundState = ensureRoundState(gameId);
    if (roundState.spinning || Date.now() >= roundState.endsAt) {
      return res.status(400).json({
        success: false,
        error: 'Betting is closed for this round'
      });
    }

    // For 'exact' bets, always create a new bet, even if the same number was already bet before.
    // No merging or updating of previous bets; each bet is independent.

    // Get user balance
    const userBalance = await prisma.userBalance.findUnique({
      where: { userId }
    });

    if (!userBalance || userBalance.currentBalance < amountNumber) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from balance
      const balanceUpdate = await tx.userBalance.updateMany({
        where: {
          userId,
          currentBalance: { gte: amountNumber }
        },
        data: {
          currentBalance: {
            decrement: amountNumber
          }
        }
      });

      if (balanceUpdate.count === 0) {
        const insufficientError = new Error('Insufficient balance');
        insufficientError.code = 'INSUFFICIENT_BALANCE';
        throw insufficientError;
      }

      // Create bet
      const bet = await tx.spinWinBet.create({
        data: {
          gameId,
          userId,
          betType: normalizedBet.betType,
          betValue: normalizedBet.betValue,
          amount: amountNumber,
          odds: normalizedBet.odds,
          status: 'pending'
        }
      });

      return bet;
    });

    const [pendingBetsCount, pendingBetsAmount] = await Promise.all([
      prisma.spinWinBet.count({
        where: { gameId, status: 'pending' }
      }),
      prisma.spinWinBet.aggregate({
        where: { gameId, status: 'pending' },
        _sum: { amount: true }
      })
    ])

    const spinWinSocket = getSpinWinSocket()
    if (spinWinSocket) {
      spinWinSocket.broadcastBetPlaced(gameId, {
        userId,
        username: req.user.username || req.user.name || 'Player',
        betType: normalizedBet.betType,
        betValue: normalizedBet.betValue,
        amount: amountNumber.toFixed(2)
      })

      spinWinSocket.broadcastGameUpdated(gameId, {
        totalBets: pendingBetsCount,
        totalAmount: pendingBetsAmount?._sum?.amount || 0
      })
    }

    res.json({
      success: true,
      bet: result
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    console.error('Error placing bet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to place bet'
    });
  }
});

// POST /spin-win/spin - Disabled (automatic spin handled by shared round timer)
router.post('/spin', async (req, res) => {
  return res.status(400).json({
    success: false,
    error: 'Spin is automatic and starts for all players when the shared timer reaches zero'
  });
});

// GET /spin-win/history - Get user's spin history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.max(1, Number.parseInt(limit, 10) || 50);
    const parsedOffset = Math.max(0, Number.parseInt(offset, 10) || 0);

    const spins = await prisma.spinWinSpin.findMany({
      where: { userId },
      include: {
        game: {
          include: {
            bets: {
              where: { userId },
              select: {
                betType: true,
                betValue: true,
                amount: true,
                odds: true,
                status: true,
                winnings: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
      skip: parsedOffset
    });

    const total = await prisma.spinWinSpin.count({
      where: { userId }
    });

    res.json({
      success: true,
      spins,
      total,
      hasMore: parsedOffset + parsedLimit < total
    });
  } catch (error) {
    console.error('Error getting spin history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load history'
    });
  }
});

// POST /spin-win/clear-bets - Clear all pending bets for current game
router.post('/clear-bets', async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'Game ID required'
      });
    }

    // Get pending bets
    const pendingBets = await prisma.spinWinBet.findMany({
      where: {
        gameId,
        userId,
        status: 'pending'
      }
    });

    if (pendingBets.length === 0) {
      return res.json({
        success: true,
        message: 'No pending bets to clear',
        refundedAmount: 0
      });
    }

    const totalRefund = pendingBets.reduce((sum, bet) => sum + bet.amount, 0);

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Refund to user balance
      await tx.userBalance.update({
        where: { userId },
        data: {
          currentBalance: {
            increment: totalRefund
          }
        }
      });

      // Update bet statuses
      await tx.spinWinBet.updateMany({
        where: {
          gameId,
          userId,
          status: 'pending'
        },
        data: {
          status: 'cancelled'
        }
      });
    });

    const spinWinSocket = getSpinWinSocket()
    if (spinWinSocket) {
      const [pendingBetsCount, pendingBetsAmount] = await Promise.all([
        prisma.spinWinBet.count({
          where: { gameId, status: 'pending' }
        }),
        prisma.spinWinBet.aggregate({
          where: { gameId, status: 'pending' },
          _sum: { amount: true }
        })
      ])

      spinWinSocket.broadcastGameUpdated(gameId, {
        totalBets: pendingBetsCount,
        totalAmount: pendingBetsAmount?._sum?.amount || 0
      })
    }

    res.json({
      success: true,
      message: 'Bets cleared successfully',
      refundedAmount: totalRefund,
      clearedBets: pendingBets.length
    });
  } catch (error) {
    console.error('Error clearing bets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear bets'
    });
  }
});

export default router;