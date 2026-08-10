// Broadcast player counts for all stakes
function broadcastPlayerCounts(wss, clients) {
  const stakeCounts = {};
  for (const [stake, session] of sessions.entries()) {
    stakeCounts[stake] = session.players.length;
  }
  for (const [ws] of clients.entries()) {
    ws.send(JSON.stringify({ event: 'numberpuzzle:player_counts', data: { stakeCounts } }));
  }
}

// Periodically broadcast player counts every 5 seconds
setInterval(() => {
  if (typeof globalThis._numberPuzzlePlayerCountsClients !== 'undefined') {
    broadcastPlayerCounts(globalThis._numberPuzzlePlayerCountsClients.wss, globalThis._numberPuzzlePlayerCountsClients.clients);
  }
}, 5000);
// Remove non-serializable fields before sending session to client
function sanitizeSession(session) {
  const { _playTimer, _countdownTimer, _lockedPlayerCount, ...safe } = session;
  return safe;
}
// Number Puzzle WebSocket Handlers
// Handles real-time number puzzle game events

// In-memory sessions for demo (replace with DB or service in production)
const sessions = new Map();
const COUNTDOWN_MS = 30000;
// Play time: 3 min if >1 player, 1 min if only 1 player
function getPlayMs(playerCount) {
  return playerCount > 1 ? 3 * 60 * 1000 : 60 * 1000;
}

import { updateNumberPuzzleBalance } from '../../../service/numberPuzzleService.js';
// Deduct stake for a player immediately on join
async function deductStakeOnJoin(userId, stake) {
  try {
    // Only deduct stake, do not credit anyone
    await updateNumberPuzzleBalance({ winnerId: undefined, stake, players: [{ userId }] });
  } catch (e) {
    console.error('Error deducting stake on join:', e);
  }
}
// Helper to generate a new round (same as frontend logic)
function generateRound() {
  const ops = ['+', '-', '×'];
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function evaluateSequence(numbers, opsArr) {
    if (!numbers.length) return null;
    let acc = numbers[0];
    for (let i = 0; i < opsArr.length; i++) {
      const next = numbers[i + 1];
      if (typeof next !== 'number') return null;
      const op = opsArr[i];
      switch (op) {
        case '+': acc += next; break;
        case '-': acc -= next; break;
        case '×': acc *= next; break;
        default: return null;
      }
    }
    return acc;
  }
  for (let i = 0; i < 20; i++) {
    const numbers = Array.from({ length: 5 }, () => randomInt(1, 15));
    const chosenOps = Array.from({ length: 4 }, () => ops[randomInt(0, ops.length - 1)]);
    const target = evaluateSequence(numbers, chosenOps);
    if (target !== null) {
      const expression = numbers.map((n, idx) => (idx < chosenOps.length ? `${n} ${chosenOps[idx]}` : `${n}`)).join(' ');
      return {
        numbers,
        target,
        solutionExpression: expression,
        solutionResult: target
      };
    }
  }
  // fallback
  const fallbackNumbers = [3, 4, 5, 6, 7];
  const fallbackOps = ['+', '+', '+', '+'];
  const fallbackTarget = evaluateSequence(fallbackNumbers, fallbackOps) || 25;
  const fallbackExpression = fallbackNumbers.map((n, idx) => (idx < fallbackOps.length ? `${n} ${fallbackOps[idx]}` : `${n}`)).join(' ');
  return {
    numbers: fallbackNumbers,
    target: fallbackTarget,
    solutionExpression: fallbackExpression,
    solutionResult: fallbackTarget
  };
}

function getSession(stake) {
  if (!sessions.has(stake)) {
    sessions.set(stake, {
      stake,
      status: 'waiting',
      players: [],
      countdownEndsAt: null,
      numbers: [],
      target: null,
      winner: null,
      solutionExpression: null,
      solutionResult: null,
    });
  }
  return sessions.get(stake);
}

function broadcastToRoom(wss, clients, stake, event, data) {
  for (const [ws, info] of clients.entries()) {
    if (info.roomId === `numberpuzzle-${stake}`) {
      // If data.session exists, sanitize it
      const payload = data && data.session
        ? { ...data, session: sanitizeSession(data.session) }
        : data;
      ws.send(JSON.stringify({ event, data: payload }));
    }
  }
}

export async function registerNumberPuzzleHandlers(ws, type, payload, clients, wss, broadcast) {
  // Save wss/clients globally for periodic broadcast
  globalThis._numberPuzzlePlayerCountsClients = { wss, clients };
  const getClientInfo = () => clients.get(ws);

  const handlers = {
    // New: allow frontend to request player counts
    'numberpuzzle:request_player_counts': () => {
      broadcastPlayerCounts(wss, clients);
    },
    'numberpuzzle:join': async (data) => {
      const { stake, userId, name } = data;
      const session = getSession(stake);
      // Log player count for this stake
      console.log(`[NumberPuzzle] Players in stake ${stake}: ${session.players.length}`);
      
      // Check if user is banned
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });
        if (user && user.banned) {
          broadcastToRoom(wss, clients, stake, 'numberpuzzle:banned', { message: 'You have been banned and cannot play games' });
          return;
        }
      } catch (err) {
        console.error('[NumberPuzzle] Error checking if user is banned:', err);
      }
      
      let player = session.players.find(p => p.userId === userId);
      if (!player) {
        player = { userId, name, submitted: false };
        session.players.push(player);
        // Deduct stake immediately on join
        await deductStakeOnJoin(userId, stake);
      }
      // Ensure numbers/target are generated only once per session (per stake)
      if (!session.numbers || !Array.isArray(session.numbers) || session.numbers.length === 0 || session.target === null) {
        const round = generateRound();
        session.numbers = round.numbers;
        session.target = round.target;
        session.solutionExpression = round.solutionExpression;
        session.solutionResult = round.solutionResult;
      }
      const clientInfo = getClientInfo();
      if (clientInfo) {
        clientInfo.roomId = `numberpuzzle-${stake}`;
        clientInfo.userId = userId;
      }
      // Always broadcast updated player list to all clients
      broadcastToRoom(wss, clients, stake, 'numberpuzzle:state', { session });
      // If first player, start countdown
      if (session.status === 'waiting' && session.players.length === 1) {
        // Log target for debugging
        console.log(`[NumberPuzzle] Target for stake ${stake}: ${session.target}`);
        session.status = 'countdown';
        session.countdownEndsAt = Date.now() + COUNTDOWN_MS;
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:countdown_started', { countdownEndsAt: session.countdownEndsAt, session });
        // Lock in the player count at the end of countdown
        session._countdownTimer = setTimeout(() => {
          // Only start if still in countdown (not cancelled)
          if (session.status !== 'countdown') return;
          session.status = 'active';
          // Lock in player count for this round
          session._lockedPlayerCount = session.players.length;
          const playMs = getPlayMs(session._lockedPlayerCount);
          session.playEndsAt = Date.now() + playMs;
          broadcastToRoom(wss, clients, stake, 'numberpuzzle:game_started', { session });
          // Start play timer (do not allow reset except by winner or timeout)
          session._playTimer = setTimeout(async () => {
            if (!session.winner && session.status === 'active') {
              // Store previous solution for next round
              session.previousSolution = {
                expression: session.solutionExpression,
                result: session.solutionResult
              };
              session.status = 'finished';
              // No need to deduct stake again here
              broadcastToRoom(wss, clients, stake, 'numberpuzzle:game_over', { session, reason: 'timeout' });
              // After game over, reset for new round after short delay
              setTimeout(() => {
                // Fully reset session for new round
                const round = generateRound();
                session.status = 'waiting';
                session.players = [];
                session.countdownEndsAt = null;
                session.numbers = [];
                session.target = null;
                session.winner = null;
                session.solutionExpression = null;
                session.solutionResult = null;
                session.previousSolution = session.previousSolution;
                // New round: numbers/target will be generated on next join
                broadcastToRoom(wss, clients, stake, 'numberpuzzle:state', { session });
              }, 3000);
            }
          }, playMs);
        }, COUNTDOWN_MS);
      }
      // If already in countdown, allow new players to join and update everyone
      if (session.status === 'countdown') {
        // No need to restart countdown, just broadcast updated player list
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:state', { session });
      }
    // removed extra closing brace
    },
    'numberpuzzle:request_state': (data) => {
      const { stake } = data;
      const session = getSession(stake);
      ws.send(JSON.stringify({ event: 'numberpuzzle:state', data: { session: sanitizeSession(session) } }));
    },
    // Player submits solution
    'numberpuzzle:submit': async (data) => {
      const { stake, userId, expression, result } = data;
      const session = getSession(stake);
      const player = session.players.find(p => p.userId === userId);
      if (!player || session.status !== 'active') return;
      player.submitted = true;
      player.expression = expression;
      player.result = result;

      // Evaluate the submitted expression safely
      let computedResult = null;
      try {
        // Only allow numbers, +, -, *, x, ×, spaces
        const safeExpr = expression.replace(/[^0-9+\-x×* ]/g, '');
        // Replace x or × with *
        const jsExpr = safeExpr.replace(/[x×]/g, '*');
        // eslint-disable-next-line no-eval
        computedResult = Function(`"use strict";return (${jsExpr})`)();
      } catch (e) {
        computedResult = null;
      }

      // Accept if computed result matches the target
      if (computedResult === session.target && !session.winner && session.status === 'active') {
        session.winner = { userId, name: player.name, expression, result: computedResult };
        session.status = 'finished';
        if (session._playTimer) clearTimeout(session._playTimer);
        // Announce winner and update balance immediately
        try {
          await updateNumberPuzzleBalance({ winnerId: userId, stake: session.stake, players: session.players });
        } catch (e) {
          console.error('Error updating winner balance:', e);
        }
        // Show possible answer to all players
        session.possibleAnswer = {
          expression: session.solutionExpression,
          result: session.solutionResult
        };
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:winner', { session, winner: session.winner });
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:game_over', { session, reason: 'winner', possibleAnswer: session.possibleAnswer });
        // Immediately reset session (do not auto-restart)
        session.status = 'waiting';
        session.players = [];
        session.countdownEndsAt = null;
        session.numbers = [];
        session.target = null;
        session.winner = null;
        session.solutionExpression = null;
        session.solutionResult = null;
        session.possibleAnswer = undefined;
        // Players must select stake and join again
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:state', { session });
      } else if (!session.winner && session.status === 'active' && session.players.every(p => p.submitted)) {
        // No winner: all players submitted but no correct answer
        session.status = 'finished';
        if (session._playTimer) clearTimeout(session._playTimer);
        // Show possible answer to all players
        session.possibleAnswer = {
          expression: session.solutionExpression,
          result: session.solutionResult
        };
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:game_over', { session, reason: 'no_winner', possibleAnswer: session.possibleAnswer });
        // Immediately reset session (do not auto-restart)
        session.status = 'waiting';
        session.players = [];
        session.countdownEndsAt = null;
        session.numbers = [];
        session.target = null;
        session.winner = null;
        session.solutionExpression = null;
        session.solutionResult = null;
        session.possibleAnswer = undefined;
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:state', { session });
      } else {
        broadcastToRoom(wss, clients, stake, 'numberpuzzle:state', { session });
      }
    },
  };

  if (handlers[type]) {
    handlers[type](payload);
  }
}
