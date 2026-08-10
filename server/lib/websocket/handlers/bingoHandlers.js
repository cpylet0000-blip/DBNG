/**
 * New Bingo WebSocket Handlers
 * Handles real-time bingo game events for fixed stake rooms
 */

import * as bingoRoomService from '../../../service/bingoRoomService.js'

// Active game timers (one per stake)
const gameTimers = new Map()
// Active countdown timers (one per stake)
const countdownTimers = new Map()
// Prevent duplicate recovery starts for the same stake-room
const gameLoopRecoveryLocks = new Set()

/**
 * FIXED: Proper timer cleanup and management
 */

// Set a game timer with automatic cleanup
function setGameTimer(stake, roomNumber, callback, delay) {
  const key = `${stake}-${roomNumber}`
  
  // Clear existing timer if any
  const existingTimer = gameTimers.get(key)
  if (existingTimer) {
    clearTimeout(existingTimer)
    console.log(`[Timer] Cleared existing game timer for ${key}`)
  }
  
  // Set new timer with auto-cleanup
  const timer = setTimeout(() => {
    callback()
    gameTimers.delete(key)  // Auto-remove after execution
    console.log(`[Timer] Game timer ${key} executed and removed`)
  }, delay)
  
  gameTimers.set(key, timer)
  console.log(`[Timer] Set game timer for ${key}, delay: ${delay}ms`)
  return timer
}

// Set a countdown timer with automatic cleanup
function setCountdownTimer(stake, roomNumber, callback, delay) {
  const key = `${stake}-${roomNumber}`
  
  // Clear existing timer if any
  const existingTimer = countdownTimers.get(key)
  if (existingTimer) {
    clearTimeout(existingTimer)
    console.log(`[Timer] Cleared existing countdown timer for ${key}`)
  }
  
  // Set new timer with auto-cleanup
  const timer = setTimeout(() => {
    callback()
    countdownTimers.delete(key)  // Auto-remove after execution
    console.log(`[Timer] Countdown timer ${key} executed and removed`)
  }, delay)
  
  countdownTimers.set(key, timer)
  console.log(`[Timer] Set countdown timer for ${key}, delay: ${delay}ms`)
  return timer
}

// Clear specific game timer
function clearGameTimer(stake, roomNumber) {
  const key = `${stake}-${roomNumber}`
  const timer = gameTimers.get(key)
  if (timer) {
    clearTimeout(timer)
    gameTimers.delete(key)
    console.log(`[Timer] Cleared game timer for ${key}`)
    return true
  }
  return false
}

// Clear specific countdown timer
function clearCountdownTimer(stake, roomNumber) {
  const key = `${stake}-${roomNumber}`
  const timer = countdownTimers.get(key)
  if (timer) {
    clearTimeout(timer)
    countdownTimers.delete(key)
    console.log(`[Timer] Cleared countdown timer for ${key}`)
    return true
  }
  return false
}

function hasGameTimer(stake, roomNumber) {
  return gameTimers.has(`${stake}-${roomNumber}`)
}

async function ensureActiveGameLoop(stake, roomNumber, clients, broadcastToRoom) {
  const key = `${stake}-${roomNumber}`

  if (hasGameTimer(stake, roomNumber) || gameLoopRecoveryLocks.has(key)) {
    return
  }

  gameLoopRecoveryLocks.add(key)
  try {
    const session = await bingoRoomService.getSessionDetails(stake, roomNumber)
    if (!session || session.status !== 'active') {
      return
    }

    console.log(`[BingoHandler] Recovering missing active loop for stake ${stake}, room ${roomNumber}`)
    callNextBallForStake(stake, clients, broadcastToRoom, roomNumber)
  } catch (error) {
    console.error(`[BingoHandler] Failed to recover active loop for ${key}:`, error)
  } finally {
    gameLoopRecoveryLocks.delete(key)
  }
}

// Clear all timers (for cleanup)
export function cleanupAllTimers() {
  console.log("[Timer] Cleaning up all timers...")
  
  // Clear all game timers
  gameTimers.forEach((timer, key) => {
    clearTimeout(timer)
    console.log(`[Timer] Cleared game timer: ${key}`)
  })
  gameTimers.clear()
  
  // Clear all countdown timers
  countdownTimers.forEach((timer, key) => {
    clearTimeout(timer)
    console.log(`[Timer] Cleared countdown timer: ${key}`)
  })
  countdownTimers.clear()
  
  console.log(`[Timer] All timers cleaned up`)
}

// Get timer status (for debugging)
export function getTimerStatus() {
  return {
    gameTimers: Array.from(gameTimers.keys()),
    countdownTimers: Array.from(countdownTimers.keys()),
    totalTimers: gameTimers.size + countdownTimers.size
  }
}

/**
 * Central message handler for bingo WS messages
 * Signature matches how setupWebSocket calls it: (ws, type, payload, clients, wss, broadcastToRoom)
 */
export async function registerBingoHandlers(ws, type, payload, clients, wss, broadcastToRoom) {
  // Helper to fetch client info object
  const getClientInfo = () => clients.get(ws)

  const handlers = {
    // Client joins/watches a stake room
    'bingo:join_room': async (data) => {
      try {
        const { stake, userId, roomNumber = 1 } = data
        const clientInfo = getClientInfo()
        if (clientInfo) {
          clientInfo.roomId = `bingo-${stake}`
          clientInfo.userId = userId || clientInfo.userId
        }

        // Send current session state to the joining client
        let session = await bingoRoomService.getSessionDetails(stake, roomNumber)
        ws.send(JSON.stringify({ event: 'bingo:room_joined', data: { stake, session } }))

        // Robustness: if at least 2 players are in waiting state, start countdown here too
        if (session && session.players && session.players.length >= 2 && session.status === 'waiting') {
          console.log(`[BingoHandler] join_room: Starting countdown for stake ${stake}, room ${session.roomNumber}, players: ${session.players.length}, status: ${session.status}`)
          
          // Clear any existing countdown timer for this stake
          clearCountdownTimer(stake, session.roomNumber)
          
          const countdown = await bingoRoomService.startCountdown(stake, session.roomNumber)
          session = await bingoRoomService.getSessionDetails(stake, session.roomNumber)
          console.log(`[BingoHandler] join_room: Countdown started, ends at: ${countdown.countdownEndsAt}`)
          broadcastToRoom(`bingo-${stake}`, 'bingo:countdown_started', { countdownEndsAt: countdown.countdownEndsAt, session })

          const now = Date.now()
          const delay = Math.max(0, countdown.countdownEndsAt - now)
          setCountdownTimer(stake, session.roomNumber, () => { startGameForStake(stake, clients, broadcastToRoom, session.roomNumber) }, delay)
        }

        // Server restart recovery: if session is active but timer is missing, restart loop.
        if (session && session.status === 'active') {
          await ensureActiveGameLoop(stake, roomNumber, clients, broadcastToRoom)
        }
        return { success: true }
      } catch (err) {
        console.error('join_room error', err)
        return { success: false, error: err.message }
      }
    },

    // Player selects a card
    'bingo:select_card': async (data) => {
      try {
        const { stake, userId, cardId } = data

        // Check if user is banned
        try {
          const user = await bingoRoomService.prisma.user.findUnique({
            where: { id: userId }
          });
          if (user && user.banned) {
            ws.send(JSON.stringify({ event: 'bingo:banned', data: { message: 'You have been banned and cannot play games' } }));
            return { success: false, error: 'User is banned' };
          }
        } catch (err) {
          console.error('Error checking if user is banned:', err);
        }

        // Check if user is banned for this session (in-memory, not persistent)
        if (bingoRoomService.isUserBannedForSession(stake, userId)) {
          ws.send(JSON.stringify({ event: 'bingo:banned', data: { message: 'You are banned from this game for a false bingo claim.' } }));
          return { success: false, error: 'User is banned for this session' };
        }

        const player = await bingoRoomService.selectCard(stake, userId, cardId)
        console.log(`[BingoHandler] Card selected: ${cardId} by user ${userId}, room: ${player.roomNumber}`)
        let session = await bingoRoomService.getSessionDetails(stake, player.roomNumber || 1)
        console.log(`[BingoHandler] Session after card selection:`, session ? { status: session.status, playerCount: session.players?.length || 0 } : 'null')

        // Ensure this WebSocket client is assigned to the room
        const clientInfo = getClientInfo()
        if (clientInfo) {
          clientInfo.roomId = `bingo-${stake}`
          clientInfo.userId = userId
        }

        // Broadcast player joined to room
        broadcastToRoom(`bingo-${stake}`, 'bingo:player_joined', { player, session })

        // Start countdown when at least two players join and session is waiting
        if (session && session.players && session.players.length >= 2 && session.status === 'waiting') {
          console.log(`[BingoHandler] Starting countdown for stake ${stake}, room ${session.roomNumber}, players: ${session.players.length}, status: ${session.status}`)
          
          // Clear any existing countdown timer for this stake
          clearCountdownTimer(stake, session.roomNumber)
          
          const countdown = await bingoRoomService.startCountdown(stake, session.roomNumber)
          // refresh session after starting countdown so clients get updated state
          session = await bingoRoomService.getSessionDetails(stake, session.roomNumber)
          console.log(`[BingoHandler] Countdown started, ends at: ${countdown.countdownEndsAt}`)
          broadcastToRoom(`bingo-${stake}`, 'bingo:countdown_started', { countdownEndsAt: countdown.countdownEndsAt, session })

          // Schedule game start using the actual countdown timestamp
          const now = Date.now()
          const delay = Math.max(0, countdown.countdownEndsAt - now)
          setCountdownTimer(stake, session.roomNumber, () => { startGameForStake(stake, clients, broadcastToRoom, session.roomNumber) }, delay)
        }

        return { success: true, player, session }
      } catch (error) {
        console.error('Error selecting card:', error)
        return { success: false, error: error.message }
      }
    },

    // Toggle auto-mark
    'bingo:toggle_automark': async (data) => {
      try {
        const { stake, userId, autoMark } = data

        const result = await bingoRoomService.toggleAutoMark(stake, userId, autoMark)

        // Reply to requesting client
        ws.send(JSON.stringify({ event: 'bingo:automark_updated', data: result }))

        return { success: true, ...result }
      } catch (error) {
        console.error('Error toggling auto-mark:', error)
        return { success: false, error: error.message }
      }
    },

    // Manual mark/unmark cell
    'bingo:mark': async (data) => {
      try {
        const { stake, userId, cellIndex, mark = true } = data

        const result = await bingoRoomService.toggleMark(stake, userId, cellIndex, mark)

        // Broadcast to room
        broadcastToRoom(`bingo-${stake}`, 'bingo:cell_marked', { userId, cellIndex, mark, markedCells: result.markedCells })

        return { success: true, ...result }
      } catch (error) {
        console.error('Error marking cell:', error)
        return { success: false, error: error.message }
      }
    },

    // Claim win
    'bingo:claim': async (data) => {
      try {
        const { stake, userId } = data;
        try {
          const winResult = await bingoRoomService.claimWin(stake, userId);

          // Stop game timer
          const timer = gameTimers.get(stake);
          if (timer) {
            clearTimeout(timer);
            gameTimers.delete(stake);
          }

          // Broadcast win
          broadcastToRoom(`bingo-${stake}`, 'bingo:game_won', winResult);

          // Schedule new game after 10 seconds
          setTimeout(() => {
            resetGameForStake(stake, clients, broadcastToRoom);
          }, 10000);

          return { success: true, ...winResult };
        } catch (error) {
          // If error is 'No winning pattern found', ban the user for this game only (session ban)
          if (error.message && error.message.includes('No winning pattern')) {
            try {
              // Mark user as banned in session (in-memory, not DB)
              await bingoRoomService.banUserForSession(stake, userId);
              ws.send(JSON.stringify({ event: 'bingo:banned', data: { message: 'You are banned from this game for a false bingo claim.' } }));
              broadcastToRoom(`bingo-${stake}`, 'bingo:user_banned', { userId });
            } catch (banErr) {
              console.error('Error banning user for session:', banErr);
            }
          }
          console.error('Error claiming win:', error);
          return { success: false, error: error.message };
        }
      } catch (error) {
        console.error('Error in bingo:claim handler:', error);
        return { success: false, error: error.message };
      }
    },
  }

  // Dispatch to handler if exists
  const handler = handlers[type]
  if (handler) return handler(payload)

  // Unknown type
  ws.send(JSON.stringify({ event: 'error', data: { message: `Unknown bingo message: ${type}` } }))
  return { success: false, error: 'Unknown message' }
}

/**
 * Start game for stake (after countdown)
 */
async function startGameForStake(stake, clients, broadcastToRoom, roomNumber = 1) {
  try {
    await bingoRoomService.startGame(stake, roomNumber)

    // Ensure no leftover call timer exists for this stake-room before starting loop
    clearGameTimer(stake, roomNumber)

    broadcastToRoom(`bingo-${stake}`, 'bingo:game_started', { stake })

    // Start calling balls
    callNextBallForStake(stake, clients, broadcastToRoom, roomNumber)
  } catch (error) {
    console.error('Error starting game:', error)
  }
}

/**
 * Call next ball every 3-5 seconds
 */
async function callNextBallForStake(stake, clients, broadcastToRoom, roomNumber = 1) {
  try {
    const result = await bingoRoomService.callNextNumber(stake, roomNumber)

    if (result.gameOver) {
      // All balls drawn, no winner - reset game
      broadcastToRoom(`bingo-${stake}`, 'bingo:game_over', { stake, reason: 'all_balls_drawn' })

      setTimeout(() => {
        resetGameForStake(stake, clients, broadcastToRoom, roomNumber)
      }, 5000)
      return
    }

    // Broadcast ball
    broadcastToRoom(`bingo-${stake}`, 'bingo:ball_drawn', {
      number: result.number,
      calledNumbers: result.calledNumbers,
    })

    // Update auto-mark for all players with auto-mark enabled
    await bingoRoomService.updateAutoMarkForBall(stake, result.number, roomNumber)

    // Check for auto-win (players with auto-mark enabled)
    const autoWinner = await bingoRoomService.checkAutoWin(stake, roomNumber)
    if (autoWinner) {
      // Stop game timer
      clearGameTimer(stake, roomNumber)

      // Broadcast win
      broadcastToRoom(`bingo-${stake}`, 'bingo:game_won', autoWinner)

      // Schedule new game after 10 seconds
      setTimeout(() => {
        resetGameForStake(stake, clients, broadcastToRoom, roomNumber)
      }, 5000)
      return
    }

    // Schedule next ball
    const delay = 3000
    setGameTimer(stake, roomNumber, () => {
      callNextBallForStake(stake, clients, broadcastToRoom, roomNumber)
    }, delay)
  } catch (error) {
    console.error('Error calling ball:', error)

    // Recover from transient errors instead of permanently stalling the game loop
    try {
      const session = await bingoRoomService.getSessionDetails(stake, roomNumber)
      if (session && session.status === 'active') {
        setGameTimer(stake, roomNumber, () => {
          callNextBallForStake(stake, clients, broadcastToRoom, roomNumber)
        }, 1500)
      }
    } catch (sessionError) {
      console.error('Error checking session after call failure:', sessionError)
    }
  }
}

/**
 * Handle player disconnect - remove from session if game not started
 */
export async function handlePlayerDisconnect(stake, userId, clients, wss, broadcastToRoom) {
  try {
    const session = await bingoRoomService.getSessionDetails(stake)
    
    // Only attempt removal if game hasn't started yet (waiting or countdown)
    if (session && (session.status === 'waiting' || session.status === 'countdown')) {
      const removed = await bingoRoomService.removePlayerFromSession(stake, userId)
      // Only broadcast if player was actually removed (should never happen now)
      if (removed) {
        console.log(`[Bingo] Player ${userId} removed from stake ${stake} session (disconnected)`)
        const updatedSession = await bingoRoomService.getSessionDetails(stake)
        broadcastToRoom(wss, clients, `bingo-${stake}`, 'bingo:player_left', { userId, session: updatedSession })
      }
    }
  } catch (err) {
    console.error('Error handling player disconnect:', err)
  }
}

/**
 * Reset game and notify queue
 */
/**
 * Reset game and notify queue (FIXED: Proper timer cleanup)
 */
async function resetGameForStake(stake, clients, broadcastToRoom, roomNumber = 1) {
  try {
    // Clear all timers for this stake-room combination
    clearGameTimer(stake, roomNumber)
    clearCountdownTimer(stake, roomNumber)
    
    // Get new session
    const session = await bingoRoomService.getOrCreateSession(stake, roomNumber)

    broadcastToRoom(`bingo-${stake}`, 'bingo:game_reset', { stake, session })
    console.log(`[Reset] Game reset for stake ${stake}, room ${roomNumber}`)
  } catch (error) {
    console.error('Error resetting game:', error)
  }
}

/**
 * Periodic check for stuck countdowns (every 5 seconds)
 * FIXED: Proper timer cleanup
 */
let periodicCheckInterval = null

export function startPeriodicCountdownCheck(clients, broadcastToRoom) {
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval)
  }
  
  periodicCheckInterval = setInterval(async () => {
    try {
      // Check all active stakes (10, 20, 50, 100)
      const stakes = [10, 20, 50, 100]
      
      for (const stake of stakes) {
        // Check rooms 1 and 2 for each stake
        for (const roomNumber of [1, 2]) {
          const session = await bingoRoomService.getSessionDetails(stake, roomNumber)
          
          if (session && session.status === 'countdown' && session.countdownEndsAt) {
            const now = Date.now()
            const timeRemaining = session.countdownEndsAt - now
            
            // If countdown should have ended but game hasn't started, start it
            if (timeRemaining <= 0) {
              console.log(`[BingoHandler] Found stuck countdown for stake ${stake}, room ${roomNumber}. Starting game now.`)
              await startGameForStake(stake, clients, broadcastToRoom, roomNumber)
              
              // Clear the countdown timer
              clearCountdownTimer(stake, roomNumber)
            }
          }

          if (session && session.status === 'active') {
            await ensureActiveGameLoop(stake, roomNumber, clients, broadcastToRoom)
          }
        }
      }
    } catch (error) {
      console.error('Error in periodic countdown check:', error)
    }
  }, 5000) // Check every 5 seconds
}

// Stop periodic check (for cleanup)
export function stopPeriodicCountdownCheck() {
  if (periodicCheckInterval) {
    clearInterval(periodicCheckInterval)
    periodicCheckInterval = null
    console.log('[Timer] Stopped periodic countdown check')
  }
}



