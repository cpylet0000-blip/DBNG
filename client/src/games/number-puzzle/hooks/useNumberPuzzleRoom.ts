// Add type for player counts event
type PlayerCounts = { [stake: string]: number };
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProfile } from '../../../profileContext'
import {
  type NumberPuzzleState,
  type NumberPuzzleSession,
  type NumberPuzzleToken,
  type NumberPuzzleWSEvents,
  type OpSymbol,
} from '../types'
import { useNumberPuzzleWebSocket } from './useNumberPuzzleWebSocket'

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const evaluateSequence = (numbers: number[], ops: OpSymbol[]) => {
  if (numbers.length === 0) return null
  let acc = numbers[0]
  for (let i = 0; i < ops.length; i++) {
    const next = numbers[i + 1]
    if (typeof next !== 'number') return null
    const op = ops[i]
    switch (op) {
      case '+':
        acc += next
        break
      case '-':
        acc -= next
        break
      case '×':
        acc *= next
        break
      default:
        return null
    }
  }
  return acc
}

const generateRound = () => {
  // Build a fully playable expression first, then expose its numbers and target so it is guaranteed solvable.
  const ops: OpSymbol[] = ['+', '-', '×']

  const makeAttempt = () => {
    const numbers = Array.from({ length: 5 }, () => randomInt(1, 15))
    const chosenOps: OpSymbol[] = Array.from({ length: 4 }, () => ops[randomInt(0, ops.length - 1)])
    const target = evaluateSequence(numbers, chosenOps)
    if (target === null) return null

    const expression = numbers
      .map((n, idx) => (idx < chosenOps.length ? `${n} ${chosenOps[idx]}` : `${n}`))
      .join(' ')
    const steps = numbers.slice(0, -1).map((n, idx) => `${idx === 0 ? n : numbers[idx]} ${chosenOps[idx]} ${numbers[idx + 1]}`)

    return { numbers, target, expression, steps, result: target }
  }

  // Retry a few times in the rare case of invalid generation (should not happen with current logic).
  for (let i = 0; i < 20; i++) {
    const attempt = makeAttempt()
    if (attempt) {
      return {
        numbers: attempt.numbers,
        target: attempt.target,
        solutionExpression: attempt.expression,
        solutionSteps: attempt.steps,
        solutionResult: attempt.result,
      }
    }
  }

  // Fallback: deterministic simple expression.
  const fallbackNumbers = [3, 4, 5, 6, 7]
  const fallbackOps: OpSymbol[] = ['+', '+', '+', '+']
  const fallbackTarget = evaluateSequence(fallbackNumbers, fallbackOps) ?? 25
  const fallbackExpression = fallbackNumbers
    .map((n, idx) => (idx < fallbackOps.length ? `${n} ${fallbackOps[idx]}` : `${n}`))
    .join(' ')
  const fallbackSteps = fallbackNumbers.slice(0, -1).map((n, idx) => `${idx === 0 ? n : fallbackNumbers[idx]} ${fallbackOps[idx]} ${fallbackNumbers[idx + 1]}`)

  return {
    numbers: fallbackNumbers,
    target: fallbackTarget,
    solutionExpression: fallbackExpression,
    solutionSteps: fallbackSteps,
    solutionResult: fallbackTarget,
  }
}

const buildInitialSession = (): NumberPuzzleSession => {
  const next = generateRound()
  return {
    stake: null,
    status: 'waiting',
    target: next.target,
    numbers: next.numbers,
    solutionExpression: next.solutionExpression || null,
    solutionSteps: next.solutionSteps,
    solutionResult: next.solutionResult,
    countdownEndsAt: null,
    players: [],
    winner: null,
  }
}

const getWSURL = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) return envUrl
  if (typeof window === 'undefined') return 'ws://localhost:3000'
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${proto}//${host}`
}

const evaluateTokens = (tokens: NumberPuzzleToken[]): number | null => {
  if (tokens.length < 3) return null
  if (tokens[0].type !== 'number') return null

  let acc = tokens[0].value
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i]
    const next = tokens[i + 1]
    if (!op || !next || op.type !== 'op' || next.type !== 'number') return null

    switch (op.value) {
      case '+':
        acc += next.value
        break
      case '-':
        acc -= next.value
        break
      case '×':
        acc *= next.value
        break
      default:
        break
    }
  }
  return acc
}

const tokensToExpression = (tokens: NumberPuzzleToken[]) => tokens.map((t) => (t.type === 'op' ? t.value : t.value)).join(' ')

const tokensToSteps = (tokens: NumberPuzzleToken[]) => {
  const steps: string[] = []
  for (let i = 0; i < tokens.length; i += 2) {
    const n1 = tokens[i]
    const op = tokens[i + 1]
    const n2 = tokens[i + 2]
    if (!n1 || n1.type !== 'number' || !op || op.type !== 'op' || !n2 || n2.type !== 'number') break
    steps.push(`${n1.value} ${op.value} ${n2.value}`)
  }
  return steps
}

const shouldResetTokens = (next: NumberPuzzleSession, prev: NumberPuzzleSession) => {
  const targetChanged = next.target !== prev.target
  const numbersChanged = next.numbers.join(',') !== prev.numbers.join(',')
  const statusReset = next.status === 'waiting' || next.status === 'countdown'
  return targetChanged || numbersChanged || statusReset
}

const stakes = [5, 10, 25, 50, 100]

export const useNumberPuzzleRoom = () => {
  const [state, setState] = useState<NumberPuzzleState>(() => ({
    session: buildInitialSession(),
    tokens: [],
    usedIndexes: [],
    result: null,
    error: null,
    submitted: false,
  }))
  const [playerCounts, setPlayerCounts] = useState<PlayerCounts>({});

  const { connected, on, off, emit } = useNumberPuzzleWebSocket(getWSURL())

  // Listen for player counts from backend
  useEffect(() => {
    if (!connected) return;
    const handlePlayerCounts = (data: { stakeCounts: PlayerCounts }) => {
      setPlayerCounts(data.stakeCounts || {});
    };
    on('numberpuzzle:player_counts', handlePlayerCounts);
    // Request player counts on mount
    emit('numberpuzzle:request_player_counts', {});
    // Optionally, poll every 10s for robustness
    const interval = setInterval(() => emit('numberpuzzle:request_player_counts', {}), 10000);
    return () => {
      off('numberpuzzle:player_counts', handlePlayerCounts);
      clearInterval(interval);
    };
  }, [connected, on, off, emit]);

  const { userId, userLabel, profile, refresh } = useProfile()
  const [selfId] = useState(
    () => userId ? String(userId) : `guest-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 8)}`
  )
  const displayName = userLabel || `Player ${selfId}`

  const [selectedStake, setSelectedStake] = useState<number | null>(null)
  const [deductedStake, setDeductedStake] = useState<number>(0)
  const [stakeError, setStakeError] = useState<string | null>(null)

  const [now, setNow] = useState(() => Date.now())

  const baseBalance = profile?.balance?.currentBalance ?? 0
  const availableBalance = baseBalance - deductedStake

  const expectedNext: 'number' | 'op' | null = useMemo(() => {
    if (state.tokens.length === 0) return 'number'
    const last = state.tokens[state.tokens.length - 1]
    if (last.type === 'number') {
      const required = state.session.numbers.length * 2 - 1
      return state.tokens.length >= required ? null : 'op'
    }
    return 'number'
  }, [state.tokens, state.session.numbers.length])

  const countdown = useMemo(() => {
    if (state.session.status === 'countdown' && state.session.countdownEndsAt) {
      return Math.max(0, Math.ceil((state.session.countdownEndsAt - now) / 1000));
    }
    if (state.session.status === 'active' && state.session.playEndsAt) {
      return Math.max(0, Math.ceil((state.session.playEndsAt - now) / 1000));
    }
    return null;
  }, [state.session.status, state.session.countdownEndsAt, state.session.playEndsAt, now]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  const canSubmit = useMemo(() => {
    const required = state.session.numbers.length * 2 - 1
    return state.tokens.length === required && expectedNext === null
  }, [state.tokens.length, state.session.numbers.length, expectedNext])

  const applySession = useCallback((nextSession: NumberPuzzleSession) => {
    setState((prev) => {
      const normalizedSession: NumberPuzzleSession = {
        ...nextSession,
        numbers: nextSession.numbers && nextSession.numbers.length > 0 ? nextSession.numbers : prev.session.numbers,
        target: nextSession.target ?? prev.session.target,
        stake: nextSession.stake ?? prev.session.stake ?? selectedStake ?? null,
        solutionExpression: nextSession.solutionExpression ?? prev.session.solutionExpression ?? null,
        solutionSteps: nextSession.solutionSteps ?? prev.session.solutionSteps,
        solutionResult: nextSession.solutionResult ?? prev.session.solutionResult,
      }

      const reset = shouldResetTokens(normalizedSession, prev.session)

      return {
        session: normalizedSession,
        tokens: reset ? [] : prev.tokens,
        usedIndexes: reset ? [] : prev.usedIndexes,
        result: reset ? null : prev.result,
        error: null,
        submitted: reset ? false : prev.submitted,
      }
    })
  }, [selectedStake])

  const handleJoinAndStateRequest = useCallback(() => {
    if (!selectedStake) return
    emit('numberpuzzle:join', { userId: selfId, name: displayName, stake: selectedStake })
    emit('numberpuzzle:request_state', { stake: selectedStake })
  }, [emit, selfId, displayName, selectedStake])

  useEffect(() => {
    if (connected && selectedStake) {
      handleJoinAndStateRequest()
    }
  }, [connected, selectedStake, handleJoinAndStateRequest])

  useEffect(() => {
    if (!connected) return

    const handleState = (data: NumberPuzzleWSEvents['numberpuzzle:state']) => {
      applySession(data.session)
    }

    const handlePlayerJoined = (data: NumberPuzzleWSEvents['numberpuzzle:player_joined']) => {
      applySession(data.session)
    }

    const handleCountdown = (data: NumberPuzzleWSEvents['numberpuzzle:countdown_started']) => {
      applySession({
        ...(data.session || state.session),
        status: 'countdown',
        countdownEndsAt: data.countdownEndsAt,
      })
    }

    const handleGameStarted = (data: NumberPuzzleWSEvents['numberpuzzle:game_started']) => {
      applySession({ ...data.session, status: 'active' })
    }


    const handleWinner = (data: NumberPuzzleWSEvents['numberpuzzle:winner']) => {
      applySession({ ...data.session, status: 'finished', winner: data.winner })
    }

    const handleGameOver = (data: NumberPuzzleWSEvents['numberpuzzle:game_over']) => {
      // Game over due to timeout or winner
      applySession({ ...data.session, status: 'finished' })
    }

    const handleRoundReset = (data: NumberPuzzleWSEvents['numberpuzzle:round_reset']) => {
      applySession({ ...data.session, status: 'waiting' })
    }


    on('numberpuzzle:state', handleState)
    on('numberpuzzle:player_joined', handlePlayerJoined)
    on('numberpuzzle:countdown_started', handleCountdown)
    on('numberpuzzle:game_started', handleGameStarted)
    on('numberpuzzle:winner', handleWinner)
    on('numberpuzzle:game_over', handleGameOver)
    on('numberpuzzle:round_reset', handleRoundReset)

    return () => {
      off('numberpuzzle:state', handleState)
      off('numberpuzzle:player_joined', handlePlayerJoined)
      off('numberpuzzle:countdown_started', handleCountdown)
      off('numberpuzzle:game_started', handleGameStarted)
      off('numberpuzzle:winner', handleWinner)
      off('numberpuzzle:game_over', handleGameOver)
      off('numberpuzzle:round_reset', handleRoundReset)
    }
  }, [connected, on, off, applySession, state.session])

  useEffect(() => {
    // Only emit countdown_started if not already started and this client is the first player
    if (state.session.status !== 'waiting') return;
    if (state.session.countdownEndsAt) return;
    if (!selectedStake) return;

    const playerCount = state.session.players.length;
    if (playerCount === 1) { // Only first player triggers countdown
      const lobbyDurationMs = 30_000;
      const endsAt = Date.now() + lobbyDurationMs;
      emit('numberpuzzle:countdown_started', { countdownEndsAt: endsAt, stake: selectedStake });
      // The server should broadcast the updated state to all clients
    }
    // All players (including late joiners) always request the latest state
    emit('numberpuzzle:request_state', { stake: selectedStake });
  }, [state.session.status, state.session.players.length, state.session.countdownEndsAt, selectedStake, emit, applySession, state.session])

  // Removed frontend countdown-to-active logic. Only backend controls state transitions.

  const selectNumber = useCallback(
    (index: number) => {
      if (state.session.status !== 'active') {
        setState((prev) => ({ ...prev, error: 'Round not active yet' }))
        return
      }
      if (!selectedStake) {
        setState((prev) => ({ ...prev, error: 'Select a stake to join first' }))
        return
      }
      if (expectedNext !== 'number') {
        setState((prev) => ({ ...prev, error: 'Choose an operator next' }))
        return
      }
      if (state.usedIndexes.includes(index)) {
        setState((prev) => ({ ...prev, error: 'Number already used' }))
        return
      }

      setState((prev) => {
        const nextTokens: NumberPuzzleToken[] = [...prev.tokens, { type: 'number', value: prev.session.numbers[index], index }]
        return {
          ...prev,
          tokens: nextTokens,
          usedIndexes: [...prev.usedIndexes, index],
          result: evaluateTokens(nextTokens),
          error: null,
        }
      })
    },
    [expectedNext, selectedStake, state.session.status, state.usedIndexes]
  )

  const selectOperator = useCallback(
    (op: OpSymbol) => {
      if (state.session.status !== 'active') {
        setState((prev) => ({ ...prev, error: 'Round not active yet' }))
        return
      }
      if (!selectedStake) {
        setState((prev) => ({ ...prev, error: 'Select a stake to join first' }))
        return
      }
      if (expectedNext !== 'op') {
        setState((prev) => ({ ...prev, error: 'Select a number first' }))
        return
      }
      setState((prev) => {
        const nextTokens: NumberPuzzleToken[] = [...prev.tokens, { type: 'op', value: op }]
        return {
          ...prev,
          tokens: nextTokens,
          result: evaluateTokens(nextTokens),
          error: null,
        }
      })
    },
    [expectedNext, selectedStake, state.session.status]
  )

  const undoLast = useCallback(() => {
    setState((prev) => {
      if (prev.tokens.length === 0) return prev
      const nextTokens = [...prev.tokens]
      const removed = nextTokens.pop()!
      const nextUsed = removed.type === 'number' ? prev.usedIndexes.filter((i) => i !== removed.index) : prev.usedIndexes
      return {
        ...prev,
        tokens: nextTokens,
        usedIndexes: nextUsed,
        result: evaluateTokens(nextTokens),
        error: null,
      }
    })
  }, [])

  const resetExpression = useCallback(() => {
    setState((prev) => ({ ...prev, tokens: [], usedIndexes: [], result: null, error: null, submitted: false }))
  }, [])

  const submitExpression = useCallback(() => {
    const required = state.session.numbers.length * 2 - 1
    if (state.tokens.length !== required) {
      setState((prev) => ({ ...prev, error: 'Use all numbers before submitting' }))
      return
    }
    if (!selectedStake) {
      setState((prev) => ({ ...prev, error: 'Select a stake to join first' }))
      return
    }

    const expression = tokensToExpression(state.tokens)
    const steps = tokensToSteps(state.tokens)
    const result = evaluateTokens(state.tokens)

    setState((prev) => ({ ...prev, submitted: true, result, error: null }))

    emit('numberpuzzle:submit', {
      userId: selfId,
      name: displayName,
      expression,
      steps,
      result,
      numbers: state.session.numbers,
      target: state.session.target,
      stake: selectedStake,
    })

    if (result === state.session.target) {
      applySession({
        ...state.session,
        status: 'finished',
        stake: state.session.stake ?? selectedStake,
        winner: {
          userId: selfId,
          name: displayName,
          expression,
          result: result ?? 0,
          steps,
          computation: expression,
        },
      })
      emit('numberpuzzle:settle', {
        outcome: 'win',
        userId: selfId,
        stake: selectedStake,
        result,
        target: state.session.target,
        expression,
      })
    } else {
      emit('numberpuzzle:settle', {
        outcome: 'loss',
        userId: selfId,
        stake: selectedStake,
        result,
        target: state.session.target,
        expression,
      })
    }
  }, [state.tokens, state.session, emit, selfId, displayName, applySession, selectedStake])

  return {
    state,
    connected,
    stakes,
    selectedStake,
    localBalance: availableBalance,
    stakeError,
    expectedNext,
    countdown,
    playerCounts,
    expression: tokensToExpression(state.tokens),
    selectStake: (stake: number) => {
      const balance = profile ? (profile.balance?.currentBalance ?? 0) : 0;
      if (!profile) {
        setStakeError('Load profile to check balance');
        return false;
      }
      if (balance < stake) {
        setStakeError('Insufficient balance for this stake');
        return false;
      }
      setStakeError(null);
      setSelectedStake(stake);
      setDeductedStake(0); // Reset deducted stake on new selection
      refresh().catch(() => {});
      if (connected) {
        emit('numberpuzzle:join', { userId: selfId, name: displayName, stake });
        emit('numberpuzzle:request_state', { stake });
      }
      setState((prev) => {
        // If changing stake, reset tokens and usedIndexes
        return {
          ...prev,
          tokens: [],
          usedIndexes: [],
          result: null,
          error: null,
          submitted: false,
        };
      });
      return true;
    },
    selectNumber,
    selectOperator,
    undoLast,
    resetExpression,
    submitExpression,
    canSubmit,
  }
}
