import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const ENABLE_SPIN_WIN_SOCKET_DEBUG = process.env.SPIN_WIN_SOCKET_DEBUG === 'true';

const spinWinSocketLog = (...args) => {
  if (ENABLE_SPIN_WIN_SOCKET_DEBUG) {
    console.log(...args);
  }
};

class SpinWinSocket {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socket.id
    this.gameRooms = new Map(); // gameId -> Set of user IDs
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      spinWinSocketLog('SpinWin socket connected:', socket.id);

      this.authenticateFromHandshake(socket).catch((error) => {
        console.error('SpinWin handshake auth failed:', error)
      })

      // Authenticate user
      socket.on('authenticate', async (payload) => {
        try {
          const user = await this.resolveUserFromAuthPayload(payload)
          
          if (user) {
            socket.userId = user.id;
            socket.username = user.username || user.name || payload?.username || 'Player';
            this.connectedUsers.set(user.id, socket.id);
            
            socket.emit('authenticated', { success: true, user });
            spinWinSocketLog(`User ${user.id} authenticated on socket`);
          } else {
            socket.emit('authenticated', { success: false, error: 'User not found' });
          }
        } catch (error) {
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      });

      // Join game room
      socket.on('join-game', (gameId) => {
        socket.join(gameId);
        
        if (!this.gameRooms.has(gameId)) {
          this.gameRooms.set(gameId, new Set());
        }
        if (socket.userId) {
          this.gameRooms.get(gameId).add(socket.userId);
        }

        socket.emit('joined-game', { gameId });
        spinWinSocketLog(`Socket ${socket.id} (user ${socket.userId || 'guest'}) joined game ${gameId}`);
      });

      // Leave game room
      socket.on('leave-game', (gameId) => {
        socket.leave(gameId);
        
        if (this.gameRooms.has(gameId)) {
          this.gameRooms.get(gameId).delete(socket.userId);
          if (this.gameRooms.get(gameId).size === 0) {
            this.gameRooms.delete(gameId);
          }
        }

        socket.emit('left-game', { gameId });
        spinWinSocketLog(`User ${socket.userId} left game ${gameId}`);
      });

      // Place bet (real-time notification)
      socket.on('bet-placed', async (data) => {
        if (!socket.userId) return;

        const { gameId, betType, betValue, amount } = data;
        
        // Broadcast to other players in the same game
        socket.to(gameId).emit('player-bet', {
          userId: socket.userId,
          username: socket.username,
          betType,
          betValue,
          amount: parseFloat(amount).toFixed(2)
        });

        // Update game state for all players
        const game = await prisma.spinWinGame.findUnique({
          where: { gameId },
          include: {
            bets: {
              select: {
                betType: true,
                betValue: true,
                amount: true
              }
            }
          }
        });

        if (game) {
          this.io.to(gameId).emit('game-updated', {
            totalBets: game.bets.length,
            totalAmount: game.bets.reduce((sum, bet) => sum + bet.amount, 0)
          });
        }
      });

      // Spin notification
      socket.on('spin-started', (data) => {
        if (!socket.userId) return;

        const { gameId } = data;
        
        socket.to(gameId).emit('player-spinning', {
          userId: socket.userId,
          username: socket.username
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          
          // Remove from all game rooms
          for (const [gameId, users] of this.gameRooms.entries()) {
            users.delete(socket.userId);
            if (users.size === 0) {
              this.gameRooms.delete(gameId);
            } else {
              // Notify other players
              socket.to(gameId).emit('player-disconnected', {
                userId: socket.userId,
                username: socket.username
              });
            }
          }
        }
        spinWinSocketLog('SpinWin socket disconnected:', socket.id);
      });
    });
  }

  async resolveUserFromAuthPayload(payload) {
    if (typeof payload === 'string' && payload) {
      const decoded = jwt.verify(payload, process.env.JWT_SECRET)
      return prisma.user.findUnique({ where: { id: decoded.userId } })
    }

    if (payload?.token) {
      const decoded = jwt.verify(payload.token, process.env.JWT_SECRET)
      return prisma.user.findUnique({ where: { id: decoded.userId } })
    }

    const rawUserId = payload?.userId
    if (rawUserId !== null && rawUserId !== undefined && String(rawUserId).trim() !== '') {
      const parsedUserId = Number(rawUserId)
      if (!Number.isNaN(parsedUserId)) {
        return prisma.user.findUnique({ where: { id: parsedUserId } })
      }
    }

    return null
  }

  async authenticateFromHandshake(socket) {
    const authPayload = socket.handshake?.auth || {}
    const user = await this.resolveUserFromAuthPayload(authPayload)
    if (!user) return

    socket.userId = user.id
    socket.username = user.username || user.name || authPayload?.username || 'Player'
    this.connectedUsers.set(user.id, socket.id)
    socket.emit('authenticated', { success: true, user })
  }

  broadcastBetPlaced(gameId, data) {
    this.io.to(gameId).emit('player-bet', data)
  }

  broadcastGameUpdated(gameId, data) {
    this.io.to(gameId).emit('game-updated', data)
  }

  // Broadcast spin result to game room
  // Broadcast spin result to all users
  broadcastSpinResult(gameId, spinResult) {
    const payload = {
      gameId,
      winningNumber: spinResult.winningNumber,
      winningColor: spinResult.winningColor,
      totalWinnings: spinResult.totalWinnings,
      winners: spinResult.winners || [],
      timestamp: new Date().toISOString()
    };
    this.io.emit('spin-result', payload);
  }

  broadcastRoundTimer(payload) {
    // Broadcast to all connected users for universal countdown
    this.io.emit('round-timer', {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }

  broadcastRoundStarted(payload) {
    // Broadcast to all connected users for universal round start
    this.io.emit('round-started', {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }

  broadcastRoundSpinning(payload) {
    if (!payload?.gameId) return;
    this.io.emit('round-spinning', {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Get users in specific game
  getGameUsersCount(gameId) {
    return this.gameRooms.get(gameId)?.size || 0;
  }
}

export default SpinWinSocket;
