// Broadcast active user count per stake
function broadcastStakeCounts(wss) {
  const stakeCounts = {};
  for (const [stake, session] of sessions.entries()) {
    console.log(`[WS] Processing session stake ${stake}:`, {
      status: session.status,
      playerCount: session.players?.length || 0,
      players: session.players?.map(p => ({ userId: p.userId, username: p.username, wsConnected: p.ws.readyState === 1 }))
    });
    
    // Count only connected players in sessions that are not finished
    const connectedPlayers = session.players?.filter(p => p.ws && p.ws.readyState === 1) || [];
    
    if ((session.status === 'waiting' || session.status === 'active') && connectedPlayers.length > 0) {
      stakeCounts[stake] = connectedPlayers.length;
      console.log(`[WS] Stake ${stake}: ${connectedPlayers.length} connected players (${session.status})`);
    }
  }
  
  console.log('[WS] Final stakeCounts to broadcast:', stakeCounts);
  
  // Broadcast to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ event: 'tictactoe:stake_counts', data: { stakeCounts } }));
    }
  });
}

// Periodically broadcast every 3 seconds (reduced from 5 for faster updates)
setInterval(() => {
  if (typeof globalThis._ticTacToeWSS !== 'undefined') {
    console.log('[WS] Periodic stake count broadcast');
    broadcastStakeCounts(globalThis._ticTacToeWSS);
  }
}, 3000);

// Tic Tac Toe WebSocket Handlers
// Handles real-time Tic Tac Toe game events
// Similar structure to numberPuzzleHandlers.js

import { updateTicTacToeBalance } from '../../../service/ticTacToeService.js';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../lib/prisma.js';

const sessions = new Map(); // key: stake, value: session (only one session per stake)

function sanitizeSession(session) {
  const { _timer, _gameTimer, _moveTimer, winner, ...safe } = session;
  // Remove circular references from players
  if (safe.players) {
    safe.players = safe.players.map(player => {
      const { ws, ...playerSafe } = player;
      return playerSafe;
    });
  }
  // Provide winnerId (number) or null for draws
  safe.winnerId = session.winnerId ?? null;
  return safe;
}

function getOpponentSymbol(symbol) {
  return symbol === 'X' ? 'O' : 'X';
}

// Helper to start/refresh inactivity timer
function startMoveTimer(session) {
  if (session._moveTimer) clearTimeout(session._moveTimer);
  session._moveTimer = setTimeout(() => {
    // If no move in 30s, skip turn (do not remove player, just skip turn)
    if (session.status === 'active') {
      session.currentTurn = getOpponentSymbol(session.currentTurn);
      session.players.forEach(p => {
        p.ws.send(JSON.stringify({ event: 'tictactoe:skip', data: sanitizeSession(session) }));
      });
      // Start timer again for the new turn
      startMoveTimer(session);
    }
  }, 30 * 1000);
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell)) return 'Draw';
  return null;
}

export function ticTacToeHandlers(wss, ws, req, user) {
    // Save wss globally for broadcasting
    globalThis._ticTacToeWSS = wss;

  // Helper to remove player and clean up session
  function removePlayerFromSession(ws) {
    for (const [stake, session] of sessions.entries()) {
      const idx = session.players.findIndex(p => p.ws === ws);
      if (idx !== -1) {
        console.log(`[WS] Removing player from session stake ${stake}`);
        session.players.splice(idx, 1);
        
        // Clean up all timers
        if (session._timer) {
          clearInterval(session._timer);
          session._timer = null;
          console.log('[WS] Cleared countdown timer on disconnect');
        }
        if (session._gameTimer) {
          clearTimeout(session._gameTimer);
          session._gameTimer = null;
          console.log('[WS] Cleared game timer on disconnect');
        }
        if (session._moveTimer) {
          clearTimeout(session._moveTimer);
          session._moveTimer = null;
          console.log('[WS] Cleared move timer on disconnect');
        }
        
        // Reset session state
        session.status = 'waiting';
        session.countdown = null;
        
        // Only delete session if no players left
        if (session.players.length === 0) {
          sessions.delete(stake);
          console.log(`[WS] Deleted empty session for stake ${stake}`);
        }
        
        broadcastStakeCounts(wss);
        break;
      }
    }
  }

  ws.on('close', () => {
    removePlayerFromSession(ws);
  });

  ws.on('message', async (msg) => {
    let data;
    try {
      if (Buffer.isBuffer(msg)) msg = msg.toString();
      data = JSON.parse(msg);
    } catch {
      console.warn('[WS] Invalid JSON message:', msg);
      return;
    }
    const { event, payload } = data;
    if (event === 'tictactoe:join') {
      if (typeof payload === 'undefined') {
        console.warn(`[WS] Received: ${event} with undefined payload!`, data);
        ws.send(JSON.stringify({ event: 'tictactoe:error', data: { message: 'Join payload is undefined!' } }));
        return;
      } else {
        console.log(`[WS] Received: ${event}`, payload);
      }
      console.log('[WS] User info:', JSON.stringify(user));
      // Check if user has sufficient balance
      try {
        // First try to find user by telegramId to get the internal ID
        const userRecord = await prisma.user.findUnique({
          where: { telegramId: user.userId.toString() }
        });
        
        if (!userRecord) {
          console.log('[WS] User not found in database, creating new user...');
          // Create user if doesn't exist
          const newUser = await prisma.user.create({
            data: {
              telegramId: user.userId.toString(),
              username: user.name,
              name: user.name
            }
          });
          console.log('[WS] Created new user:', newUser);
        }

        // Check if user is banned
        const finalUserRecord = userRecord || newUser;
        if (finalUserRecord.banned) {
          ws.send(JSON.stringify({ event: 'tictactoe:banned', data: { message: 'You have been banned and cannot play games' } }));
          return;
        }
        
        // Now get user balance using the internal ID
        const userBalance = await prisma.userBalance.findUnique({
          where: { userId: finalUserRecord.id }
        });
        
        if (!userBalance || userBalance.currentBalance < payload.stake) {
          ws.send(JSON.stringify({ event: 'tictactoe:insufficient_balance', data: { required: payload.stake, current: userBalance?.currentBalance || 0 } }));
          return;
        }
        
        console.log('[WS] Balance check passed:', { currentBalance: userBalance?.currentBalance, required: payload.stake });
      } catch (err) {
        console.error('[WS] Error checking user balance:', err);
        // Don't block the game if balance check fails - let them play
        console.log('[WS] Allowing game despite balance check error');
      }
      const allowedStakes = [5, 10, 15, 25];
      if (!allowedStakes.includes(payload.stake)) {
        ws.send(JSON.stringify({ event: 'tictactoe:invalid_stake' }));
        return;
      }
      // Only one session per stake
      let session = sessions.get(payload.stake);
      if (!session) {
        session = {
          id: uuidv4(),
          board: Array(9).fill(null),
          players: [{ userId: user.userId, username: user.name, symbol: 'X', ws }],
          currentTurn: 'X',
          status: 'waiting',
          stake: payload.stake,
          _timer: null,
          _gameTimer: null,
          countdown: null,
        };
        sessions.set(payload.stake, session);
        console.log(`[WS] Created new session for stake ${payload.stake}`);
        console.log(`[WS] First player joined:`, { userId: user.userId, username: user.name });
        // Broadcast stakeCounts immediately after creating session
        broadcastStakeCounts(wss);
      } else {
        // Prevent duplicate join
        if (session.players.find(p => p.userId === user.userId)) {
          console.log(`[WS] Duplicate join attempt: userId ${user.userId} already in session`);
          ws.send(JSON.stringify({ event: 'tictactoe:already_joined' }));
          return;
        }
        if (session.players.length >= 2) {
          ws.send(JSON.stringify({ event: 'tictactoe:full' }));
          return;
        }
        session.players.push({ userId: user.userId, username: user.name, symbol: 'O', ws });
        session.status = 'waiting';
      }
      // Always broadcast full session to all players after join
      session.players.forEach(p => {
        p.ws.send(JSON.stringify({ event: 'tictactoe:joined', data: sanitizeSession(session) }));
      });
      
      // Broadcast stakeCounts immediately after join
      console.log(`[WS] Broadcasting stake counts after player join. Players: ${session.players.length}`);
      broadcastStakeCounts(wss);
      
      console.log(`[WS] Player joined successfully. Total players: ${session.players.length}`);
      console.log(`[WS] Session details:`, {
        stake: session.stake,
        status: session.status,
        players: session.players.map(p => ({ userId: p.userId, username: p.username, symbol: p.symbol }))
      });
      console.log(`[WS] Current user who joined:`, { userId: user.userId, username: user.name });
      
      // If two players, start 15s countdown immediately
      if (session.players.length === 2) {
        console.log('[WS] Two players joined, starting countdown...');
        
        // Clear any existing timer first
        if (session._timer) {
          clearInterval(session._timer);
          console.log('[WS] Cleared existing countdown timer');
        }
        
        session.countdown = 15;
        session._timer = setInterval(() => {
          session.countdown--;
          console.log(`[WS] Countdown: ${session.countdown}`);
          session.players.forEach(p => {
            p.ws.send(JSON.stringify({ event: 'tictactoe:countdown', data: { countdown: session.countdown } }));
          });
          if (session.countdown <= 0) {
            clearInterval(session._timer);
            session._timer = null;
            session.status = 'active';
            session.countdown = null;
            console.log('[WS] Game started!');
            session.players.forEach(p => {
              p.ws.send(JSON.stringify({ event: 'tictactoe:started', data: sanitizeSession(session) }));
            });
            // Start 3 minute game timer
            session._gameTimer = setTimeout(async () => {
              // End game, remove both players, decrease balances
              session.status = 'finished';
              await updateTicTacToeBalance({
                winnerId: 'TIMEOUT',
                stake: session.stake,
                players: session.players.map(p => ({ userId: p.userId })),
              });
              session.players.forEach(p => {
                p.ws.send(JSON.stringify({ event: 'tictactoe:timeout', data: sanitizeSession(session) }));
                p.ws.close();
              });
              sessions.delete(session.stake);
              broadcastStakeCounts(wss);
            }, 3 * 60 * 1000);
            // Start inactivity timer for first move
            startMoveTimer(session);
          }
        }, 1000);
      }
    }
    if (event === 'tictactoe:move') {
      // Find session by stake
      const session = sessions.get(payload.stake);
      if (!session || session.status !== 'active') return;
      const player = session.players.find(p => p.userId === user.userId);
      if (!player) return;
      if (session.currentTurn !== player.symbol) return;
      if (session.board[payload.index]) return;
      session.board[payload.index] = player.symbol;
      // Refresh inactivity timer after a valid move
      startMoveTimer(session);
      const winner = checkWinner(session.board);
      if (winner) {
        session.status = 'finished';
        // Save winnerId as telegram userId (number) or null for draw
        session.winnerId = winner === 'Draw' ? null : player.userId;
        if (session._gameTimer) clearTimeout(session._gameTimer);
        if (session._moveTimer) clearTimeout(session._moveTimer);
        // Update balances
        await updateTicTacToeBalance({
          winnerId: winner === 'Draw' ? 'DRAW' : player.userId,
          stake: session.stake,
          players: session.players.map(p => ({ userId: p.userId })),
        });
        // Inform players but KEEP sockets open for replay
        session.players.forEach(p => {
          p.ws.send(JSON.stringify({ event: 'tictactoe:gameover', data: sanitizeSession(session) }));
        });
        broadcastStakeCounts(wss);
      } else {
        session.currentTurn = getOpponentSymbol(player.symbol);
        console.log(`[WS] Move made. New turn: ${session.currentTurn}`);
        session.players.forEach(p => {
          p.ws.send(JSON.stringify({ event: 'tictactoe:update', data: sanitizeSession(session) }));
        });
      }
    }
    if (event === 'tictactoe:reset') {
      const session = [...sessions.values()].find(s => s.players.some(p => p.userId === user.userId));
      if (!session) return;
      // Clear timers before restarting
      if (session._gameTimer) { clearTimeout(session._gameTimer); session._gameTimer = null; }
      if (session._moveTimer) { clearTimeout(session._moveTimer); session._moveTimer = null; }
      session.board = Array(9).fill(null);
      session.currentTurn = 'X';
      session.status = 'active';
      session.winnerId = null;
      // Start a fresh 3-minute game timer
      session._gameTimer = setTimeout(async () => {
        session.status = 'finished';
        await updateTicTacToeBalance({
          winnerId: 'TIMEOUT',
          stake: session.stake,
          players: session.players.map(p => ({ userId: p.userId })),
        });
        session.players.forEach(p => {
          p.ws.send(JSON.stringify({ event: 'tictactoe:timeout', data: sanitizeSession(session) }));
        });
        broadcastStakeCounts(wss);
      }, 3 * 60 * 1000);
      // Start inactivity timer for first move
      startMoveTimer(session);
      session.players.forEach(p => {
        p.ws.send(JSON.stringify({ event: 'tictactoe:update', data: sanitizeSession(session) }));
      });
    }
  });
}
