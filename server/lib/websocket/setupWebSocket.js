/**
 * WebSocket Setup
 * Configures WebSocket server and attaches to Express app
 */

import { WebSocketServer } from 'ws'
import { registerBingoHandlers, startPeriodicCountdownCheck } from './handlers/bingoHandlers.js'
import { registerNumberPuzzleHandlers } from './handlers/numberPuzzleHandlers.js';
import { ticTacToeHandlers } from './handlers/ticTacToeHandlers.js';
import SpinWinSocket from './spinWinSocket.js';

let spinWinSocketInstance = null

export function getSpinWinSocket() {
  return spinWinSocketInstance
}

/**
 * Setup WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
export async function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  // Initialize SpinWin Socket.IO handler (will use Socket.IO instead of WS for SpinWin)
  let spinWinSocket = null;
  
  try {
    // Import and initialize Socket.IO for SpinWin
    const { Server } = await import('socket.io');
    const io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:5173"],
        methods: ["GET", "POST"]
      }
    });
    
    spinWinSocket = new SpinWinSocket(io);
    spinWinSocketInstance = spinWinSocket
    console.log('[Socket.IO] SpinWin socket handler initialized');
  } catch (error) {
    console.error('[Socket.IO] Failed to initialize SpinWin socket:', error);
  }

  // Track connected clients with their user info
  const clients = new Map()


  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7)
    console.log(`[WS] Client connected: ${clientId}`)

    // Extract user info from query parameters or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const rawId = url.searchParams.get('userId');
    const userId = rawId !== null && rawId !== undefined ? Number(rawId) : null;
    const username = url.searchParams.get('username') || 'Player';
    
    console.log(`[WS] User connection - userId: ${userId}, username: ${username}`);
    
    clients.set(ws, { clientId, userId, username, roomId: null })

    // Register Tic Tac Toe handler ONCE per connection with actual user info
    ticTacToeHandlers(wss, ws, req, { userId, name: username });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        const type = message.type || message.event
        const payload = message.data

        // Only log non-tictactoe events here; tictactoe events are logged in their handler
        if (!String(type).startsWith('tictactoe:')) {
          console.log(`[WS] Received: ${type}`, payload)
        }

        // Route message to appropriate handler; pass a broadcast helper
        if (String(type).startsWith('bingo:')) {
          await registerBingoHandlers(ws, type, payload, clients, wss, (roomId, evt, d) => broadcastToRoom(wss, clients, roomId, evt, d))
        } else if (String(type).startsWith('numberpuzzle:')) {
          await registerNumberPuzzleHandlers(ws, type, payload, clients, wss, (stake, evt, d) => broadcastToRoom(wss, clients, `numberpuzzle-${stake}`, evt, d));
        } else if (String(type).startsWith('tictactoe:')) {
          // Already handled by ticTacToeHandlers
        } else {
          ws.send(JSON.stringify({ event: 'error', data: { message: 'Unknown message type' } }))
        }
      } catch (err) {
        console.error('[WS] Message error:', err)
        ws.send(JSON.stringify({ event: 'error', data: { message: err.message } }))
      }
    })

    ws.on('close', async () => {
      console.log(`[WS] Client disconnected: ${clientId}`)
      const clientInfo = clients.get(ws)
      
      // If client was in a bingo room, handle disconnection
      if (clientInfo && clientInfo.roomId && clientInfo.roomId.startsWith('bingo-')) {
        let stake = null
        const roomMatch = /^bingo-(\d+)-(\d+)$/.exec(clientInfo.roomId)
        if (roomMatch) {
          stake = parseInt(roomMatch[1], 10)
        } else {
          // Single-room mode: room id is bingo-<stake>
          stake = parseInt(clientInfo.roomId.replace('bingo-', ''), 10)
        }
        const userId = clientInfo.userId
        
        if (userId && stake) {
          try {
            // Import dynamically to avoid circular dependency
            const { handlePlayerDisconnect } = await import('./handlers/bingoHandlers.js')
            await handlePlayerDisconnect(stake, userId, clients, wss, broadcastToRoom)
          } catch (err) {
            console.error('[WS] Error handling disconnect:', err)
          }
        }
      }
      
      clients.delete(ws)
    })

    ws.on('error', (err) => {
      console.error(`[WS] Client error:`, err)
    })
  })

  console.log('[WS] WebSocket server initialized')
  
  // Start periodic countdown check to handle stuck timers
  startPeriodicCountdownCheck(clients, (roomId, evt, d) => broadcastToRoom(wss, clients, roomId, evt, d))
  
  return wss
}

/**
 * @param {WebSocketServer} wss - WebSocket server
 * @param {Map} clients - Client tracking map
 * @param {number} roomId - Room ID
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
export function broadcastToRoom(wss, clients, roomId, type, data) {
  wss.clients.forEach((client) => {
    const clientInfo = clients.get(client)
    if (clientInfo && clientInfo.roomId === roomId && client.readyState === 1) {
      // Send messages using { event, data } envelope to match client expectations
      client.send(JSON.stringify({ event: type, data }))
    }
  })
}