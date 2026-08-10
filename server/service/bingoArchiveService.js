// Service for archiving bingo session data before deletion
// FIXED: Atomic archiving with transaction to prevent data loss
import prisma from '../lib/prisma.js';

/**
 * Archive a complete bingo session and all its players
 * FIXED: This is now wrapped in a transaction to ensure atomicity
 */
export async function archiveBingoSession(sessionId) {
  try {    
    // Use transaction to ensure archive and delete are atomic
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the original session with all players and their user info
      const originalSession = await tx.bingoSession.findUnique({
        where: { id: sessionId },
        include: {
          players: {
            include: {
              user: {
                select: { name: true, username: true }
              }
            }
          }
        }
      });

      if (!originalSession) {
        throw new Error('Session not found');
      }

      console.log('[Archive] Found session with', originalSession.players.length, 'players');

      // 2. Create archived session
      const archivedSession = await tx.bingoSessionArchive.create({
        data: {
          originalId: originalSession.id,
          stake: originalSession.stake,
          roomNumber: originalSession.roomNumber,
          status: originalSession.status,
          calledNumbers: originalSession.calledNumbers,
          countdownEndsAt: originalSession.countdownEndsAt,
          winnerId: originalSession.winnerId,
          winnerCardId: originalSession.winnerCardId,
          winnerName: originalSession.winnerName,
          winPattern: originalSession.winPattern,
          winningCells: originalSession.winningCells,
          createdAt: originalSession.createdAt,
          finishedAt: originalSession.finishedAt,
        }
      });

      console.log('[Archive] Created archived session with ID', archivedSession.id);

      // 3. Archive all players in this session
      const archivedPlayers = await Promise.all(
        originalSession.players.map(player =>
          tx.bingoSessionPlayerArchive.create({
            data: {
              originalId: player.id,
              sessionId: archivedSession.id,
              userId: player.userId,
              name: player.user?.name || null,
              username: player.user?.username || null,
              cardId: player.cardId,
              cardNumbers: player.cardNumbers,
              markedCells: player.markedCells,
              autoMark: player.autoMark,
              prize: player.prize,
              joinedAt: player.joinedAt,
            }
          })
        )
      );

      console.log('[Archive] Archived', archivedPlayers.length, 'players');

      // 4. Delete original session (within same transaction)
      await tx.bingoSession.delete({
        where: { id: sessionId }
      });

      console.log('[Archive] Deleted original session', sessionId);

      return {
        success: true,
        archivedSession,
        archivedPlayers,
        totalPlayers: archivedPlayers.length
      };
    }, {
      isolationLevel: 'Serializable',
      // Prisma does not support timeout option here, so you may remove or handle it separately
    });

    return result;

  } catch (error) {
    console.error('[Archive] Error archiving session:', error);
    throw error;
  }
}

/**
 * Archive multiple sessions (batch operation)
 * FIXED: Each session archived in its own transaction
 */
export async function archiveMultipleSessions(sessionIds) {
  const results = [];
  
  for (const sessionId of sessionIds) {
    try {
      const result = await archiveBingoSession(sessionId);
      results.push({ sessionId, success: true, ...result });
    } catch (error) {
      console.error('[Archive] Failed to archive session:', error);
      results.push({ sessionId, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Get archived session by original ID
 */
export async function getArchivedSession(originalSessionId) {
  return await prisma.bingoSessionArchive.findUnique({
    where: { originalId: originalSessionId },
    include: {
      players: true
    }
  });
}

/**
 * Get all archived sessions for a specific stake
 */
export async function getArchivedSessionsByStake(stake, limit = 50) {
  return await prisma.bingoSessionArchive.findMany({
    where: { stake },
    include: {
      players: true
    },
    orderBy: { archivedAt: 'desc' },
    take: limit
  });
}

/**
 * Get archived sessions for a specific user
 */
export async function getArchivedSessionsByUser(userId, limit = 20) {
  return await prisma.bingoSessionArchive.findMany({
    where: {
      players: {
        some: { userId }
      }
    },
    include: {
      players: {
        where: { userId }
      }
    },
    orderBy: { archivedAt: 'desc' },
    take: limit
  });
}

/**
 * Clean up old archived sessions (older than specified days)
 * FIXED: Use transaction for batch delete
 */
export async function cleanupOldArchivedSessions(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const deletedSessions = await prisma.$transaction(async (tx) => {
    // First delete all associated players
    await tx.bingoSessionPlayerArchive.deleteMany({
      where: {
        session: {
          archivedAt: {
            lt: cutoffDate
          }
        }
      }
    });

    // Then delete sessions
    const result = await tx.bingoSessionArchive.deleteMany({
      where: {
        archivedAt: {
          lt: cutoffDate
        }
      }
    });

    return result;
  });

  console.log('[Archive] Cleaned up old archived sessions');
  return deletedSessions;
}

/**
 * Get archive statistics
 */
export async function getArchiveStatistics() {
  const [totalSessions, totalPlayers, recentSessions] = await Promise.all([
    prisma.bingoSessionArchive.count(),
    prisma.bingoSessionPlayerArchive.count(),
    prisma.bingoSessionArchive.count({
      where: {
        archivedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
  ]);

  return {
    totalArchivedSessions: totalSessions,
    totalArchivedPlayers: totalPlayers,
    recentArchivedSessions: recentSessions
  };
}
