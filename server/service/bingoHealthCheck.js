/**
 * Bingo Game Health Check Service
 * Monitors for stuck games and provides diagnostic information
 * Created: 2026-02-04 10:20:01
 */

import prisma from '../lib/prisma.js';
import * as bingoRoomService from './bingoRoomService.js';

// Configuration
const STUCK_GAME_THRESHOLD_MINUTES = 30;
const STUCK_COUNTDOWN_THRESHOLD_MINUTES = 2;
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let healthCheckInterval = null;

/**
 * Check for stuck active games (games running too long)
 */
export async function findStuckActiveGames() {
  const thresholdTime = new Date(Date.now() - STUCK_GAME_THRESHOLD_MINUTES * 60 * 1000);
  
  const stuckGames = await prisma.bingoSession.findMany({
    where: {
      status: 'active',
      createdAt: { lt: thresholdTime }
    },
    include: {
      _count: { select: { players: true } }
    }
  });

  return stuckGames.map(game => ({
    sessionId: game.id,
    stake: game.stake,
    roomNumber: game.roomNumber,
    status: game.status,
    playerCount: game._count.players,
    createdAt: game.createdAt,
    minutesActive: Math.floor((Date.now() - game.createdAt.getTime()) / 60000),
    calledNumbersCount: game.calledNumbers?.length || 0
  }));
}

/**
 * Check for stuck countdown sessions
 */
export async function findStuckCountdowns() {
  const now = Date.now();
  
  const countdownSessions = await prisma.bingoSession.findMany({
    where: {
      status: 'countdown',
      countdownEndsAt: { not: null }
    },
    include: {
      _count: { select: { players: true } }
    }
  });

  return countdownSessions
    .filter(session => {
      const timeOverdue = now - (session.countdownEndsAt || 0);
      return timeOverdue > STUCK_COUNTDOWN_THRESHOLD_MINUTES * 60 * 1000;
    })
    .map(session => ({
      sessionId: session.id,
      stake: session.stake,
      roomNumber: session.roomNumber,
      playerCount: session._count.players,
      countdownEndsAt: session.countdownEndsAt,
      minutesOverdue: Math.floor((now - (session.countdownEndsAt || 0)) / 60000)
    }));
}

/**
 * Check for orphaned players (players in non-existent sessions)
 */
export async function findOrphanedPlayers() {
  // This shouldn't happen with proper foreign keys, but let's check
  const allPlayers = await prisma.bingoSessionPlayer.findMany({
    select: {
      id: true,
      userId: true,
      sessionId: true,
      session: {
        select: { id: true, status: true }
      }
    }
  });

  return allPlayers.filter(player => !player.session);
}

/**
 * Check for sessions with no players
 */
export async function findEmptySessions() {
  const sessions = await prisma.bingoSession.findMany({
    where: {
      status: { in: ['waiting', 'countdown'] }
    },
    include: {
      _count: { select: { players: true } }
    }
  });

  return sessions
    .filter(session => session._count.players === 0)
    .map(session => ({
      sessionId: session.id,
      stake: session.stake,
      roomNumber: session.roomNumber,
      status: session.status,
      createdAt: session.createdAt,
      minutesOld: Math.floor((Date.now() - session.createdAt.getTime()) / 60000)
    }));
}

/**
 * Get overall health status
 */
export async function getHealthStatus() {
  const [stuckGames, stuckCountdowns, orphanedPlayers, emptySessions] = await Promise.all([
    findStuckActiveGames(),
    findStuckCountdowns(),
    findOrphanedPlayers(),
    findEmptySessions()
  ]);

  const hasIssues = 
    stuckGames.length > 0 || 
    stuckCountdowns.length > 0 || 
    orphanedPlayers.length > 0 || 
    emptySessions.length > 0;

  return {
    status: hasIssues ? 'WARNING' : 'HEALTHY',
    timestamp: new Date().toISOString(),
    issues: {
      stuckActiveGames: stuckGames,
      stuckCountdowns: stuckCountdowns,
      orphanedPlayers: orphanedPlayers,
      emptySessions: emptySessions
    },
    summary: {
      totalIssues: stuckGames.length + stuckCountdowns.length + orphanedPlayers.length + emptySessions.length,
      stuckGamesCount: stuckGames.length,
      stuckCountdownsCount: stuckCountdowns.length,
      orphanedPlayersCount: orphanedPlayers.length,
      emptySessionsCount: emptySessions.length
    }
  };
}

/**
 * Auto-resolve stuck games (force finish)
 */
export async function resolveStuckGame(sessionId) {
  try {
    console.log('[HealthCheck] Resolving stuck game:');
    
    const session = await prisma.bingoSession.findUnique({
      where: { id: sessionId },
      include: { players: true }
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const result = await bingoRoomService.forceFinishSessionWithRefund(
      session.stake,
      session.roomNumber,
    );

    console.log('[HealthCheck] Stuck game marked as finished with refunds');
    return {
      success: true,
      sessionId,
      message: 'Game force-finished with refunds',
      refunded: {
        players: result.refundedPlayers,
        cards: result.refundedCards,
        amount: result.refundedAmount,
      },
      alreadyFinished: result.alreadyFinished,
    };
  } catch (error) {
    console.error('[HealthCheck] Error resolving stuck game :', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-resolve stuck countdown
 */
export async function resolveStuckCountdown(sessionId) {
  try {
    console.log('[HealthCheck] Resolving stuck countdown:');
    
    const session = await prisma.bingoSession.findUnique({
      where: { id: sessionId },
      include: { players: true }
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Reset to waiting if enough players, otherwise mark finished
    if (session.players.length >= 2) {
      await prisma.bingoSession.update({
        where: { id: sessionId },
        data: {
          status: 'waiting',
          countdownEndsAt: null
        }
      });
      console.log('[HealthCheck] Stuck countdown reset to waiting');
      return { success: true, sessionId, message: 'Countdown reset to waiting' };
    } else {
      const result = await bingoRoomService.forceFinishSessionWithRefund(
        session.stake,
        session.roomNumber,
      );
      console.log('[HealthCheck] Stuck countdown marked as finished (not enough players) with refunds');
      return {
        success: true,
        sessionId,
        message: 'Countdown cancelled, game finished with refunds',
        refunded: {
          players: result.refundedPlayers,
          cards: result.refundedCards,
          amount: result.refundedAmount,
        },
        alreadyFinished: result.alreadyFinished,
      };
    }
  } catch (error) {
    console.error('[HealthCheck] Error resolving stuck countdown:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clean up empty sessions
 */
export async function cleanupEmptySessions() {
  try {
    const emptySessions = await findEmptySessions();
    const results = [];

    for (const session of emptySessions) {
      try {
        await prisma.bingoSession.delete({
          where: { id: session.sessionId }
        });
        results.push({ sessionId: session.sessionId, success: true });
        console.log('[HealthCheck] Deleted empty session');
      } catch (error) {
        results.push({ sessionId: session.sessionId, success: false, error: error.message });
      }
    }

    return { success: true, cleaned: results.length, results };
  } catch (error) {
    console.error('[HealthCheck] Error cleaning up empty sessions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start automatic health monitoring
 */
export function startHealthMonitoring(autoResolve = false) {
  if (healthCheckInterval) {
    console.log('[HealthCheck] Health monitoring already running');
    return;
  }

  console.log('[HealthCheck] Starting health monitoring...');
  
  healthCheckInterval = setInterval(async () => {
    try {
      const health = await getHealthStatus();
      
      if (health.status === 'WARNING') {
        console.warn('[HealthCheck] ⚠️ Issues detected:', health.summary);
        
        // Auto-resolve if enabled
        if (autoResolve) {
          // Resolve stuck countdowns
          for (const countdown of health.issues.stuckCountdowns) {
            await resolveStuckCountdown(countdown.sessionId);
          }
          
          // Resolve stuck games
          for (const game of health.issues.stuckActiveGames) {
            await resolveStuckGame(game.sessionId);
          }
          
          // Clean up empty sessions
          if (health.issues.emptySessions.length > 0) {
            await cleanupEmptySessions();
          }
        }
      } else {
        console.log('[HealthCheck] ✅ All systems healthy');
      }
    } catch (error) {
      console.error('[HealthCheck] Error during health check:', error);
    }
  }, HEALTH_CHECK_INTERVAL_MS);

  console.log('[HealthCheck] Monitoring started (checking every', HEALTH_CHECK_INTERVAL_MS / 60000, 'minutes)');
}
export function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[HealthCheck] Health monitoring stopped');
  }
}

/**
 * Get game statistics
 */
export async function getGameStatistics() {
  const [totalSessions, activeSessions, waitingSessions, countdownSessions, finishedToday] = await Promise.all([
    prisma.bingoSession.count(),
    prisma.bingoSession.count({ where: { status: 'active' } }),
    prisma.bingoSession.count({ where: { status: 'waiting' } }),
    prisma.bingoSession.count({ where: { status: 'countdown' } }),
    prisma.bingoSession.count({
      where: {
        status: 'finished',
        finishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  return {
    totalSessions,
    activeSessions,
    waitingSessions,
    countdownSessions,
    finishedToday,
    timestamp: new Date().toISOString()
  };
}
