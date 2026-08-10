import { useMemo, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Timer } from 'lucide-react'
import { useNumberPuzzleRoom } from './hooks/useNumberPuzzleRoom'
import type { OpSymbol } from './types'

const operators: OpSymbol[] = ['+', '-', '×']

export const NumberPuzzlePage = () => {
  const [pendingStake, setPendingStake] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastRound, setLastRound] = useState<{
    multiplayer: boolean;
    winner?: { name: string; expression: string; result: number };
    solutionExpression?: string | null;
    solutionResult?: number | null;
  } | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const {
    state,
    stakes,
    selectedStake,
    localBalance,
    stakeError,
    expectedNext,
    countdown,
    playerCounts,
    selectStake,
    selectNumber,
    selectOperator,
    undoLast,
    resetExpression,
    submitExpression,
    canSubmit,
  } = useNumberPuzzleRoom();

  const { session } = state;
  const usedSet = useMemo(() => new Set(state.usedIndexes), [state.usedIndexes]);

  // Capture previous round snapshot and show for 7s, even if server resets session immediately
  useEffect(() => {
    const finishedNow = session.status === 'finished';
    const finishedBefore = prevStatusRef.current === 'finished';

    if (finishedNow && !finishedBefore) {
      const multiplayer = (session.players?.length || 0) > 1;
      const winner = session.winner
        ? { name: session.winner.name, expression: session.winner.expression, result: session.winner.result }
        : undefined;
      const solutionExpression = session.solutionExpression ?? session.previousSolution?.expression ?? null;
      const solutionResult = (session.solutionResult ?? session.previousSolution?.result) ?? null;

      setLastRound({ multiplayer, winner, solutionExpression, solutionResult });
      setShowResult(true);
      const timer = setTimeout(() => setShowResult(false), 7000);
      return () => clearTimeout(timer);
    }

    prevStatusRef.current = session.status;
  }, [session.status, session.players, session.winner, session.solutionExpression, session.solutionResult, session.previousSolution]);

  // Remove previous solution UI, show winner instead

  const statusText = useMemo(() => {
    if (session.winner) return `Winner: ${session.winner.name}`;
    if (session.status === 'finished') return 'finished';
    if (session.status === 'active') return 'active';
    if (session.status === 'countdown') return countdown ? `${countdown}s` : 'Countdown';
    return 'Waiting...';
  }, [session.status, session.winner, countdown]);

  // Remove previous solution (from last round)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-2 py-2">
      <div className="max-w-4xl mx-auto space-y-4">
        <Link to="/" className="text-sm text-yellow-300 p-1 rounded-md border border-yellow-300 inline-block">
          <ArrowLeft className="inline-block mr-1" size={20} />
        </Link>
        {/* Winner info or possible answer, visible for 5 seconds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-800/70 p-4 min-h-[120px] flex flex-col justify-center items-center">
            {showResult && lastRound ? (
              lastRound.multiplayer && lastRound.winner ? (
                <>
                  <div className="text-sm font-semibold text-emerald-300 mb-1">Winner</div>
                  <div className="text-lg font-bold text-white mb-1">{lastRound.winner.name}</div>
                  <div className="text-sm text-emerald-100">Expression: {lastRound.winner.expression}</div>
                  <div className="text-sm text-emerald-100">Result: {lastRound.winner.result}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-yellow-300 mb-1">No winner this round</div>
                  <div className="text-sm text-slate-200">Possible answer: {lastRound.solutionExpression ?? 'N/A'}</div>
                  {lastRound.solutionResult !== undefined && lastRound.solutionResult !== null && (
                    <div className="text-xs text-slate-400">Result: {lastRound.solutionResult}</div>
                  )}
                </>
              )
            ) : (
              <div className="text-xs text-slate-500">No previous round</div>
            )}
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-yellow-600">{selectedStake ? `${selectedStake} ETB` : 'Choose a stake'}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
                {stakes.map((stake) => {
                  // Allow stake selection if not in an active game
                  const canSelect = session.status === 'waiting' || session.status === 'finished' || session.status === 'countdown';
                  const insufficient = (localBalance ?? 0) < stake;
                  const count = playerCounts && playerCounts[String(stake)] ? playerCounts[String(stake)] : 0;
                  return (
                    <button
                      key={stake}
                      onClick={() => {
                        if (canSelect && !insufficient) setPendingStake(stake);
                      }}
                      disabled={!canSelect || insufficient}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold transition-all ${
                        pendingStake === stake
                          ? 'bg-yellow-400 text-slate-900 border-yellow-300'
                          : insufficient
                            ? 'bg-slate-800 text-slate-500 border-slate-700'
                            : !canSelect
                              ? 'bg-slate-800 text-slate-500 border-slate-700'
                              : 'bg-slate-800 text-white border-slate-700 hover:border-yellow-400'
                      }`}
                    >
                      <p>{stake} ETB</p>
                      <span className="ml-1 text-xs text-green-600">{count} <span className='text-cyan-600'>players</span></span>
                    </button>
                  );
                })}
              </div>
              {stakeError && <div className="text-xs text-red-400">{stakeError}</div>}
              {pendingStake && (
                <div className="flex items-center mt-2 space-x-2">
                  <button
                    className="px-3 py-1 rounded bg-yellow-400 text-slate-900 font-semibold border border-yellow-300"
                    onClick={() => {
                      selectStake(pendingStake);
                      setPendingStake(null);
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    className="ml-2 px-2 py-1 rounded bg-slate-700 text-white border border-slate-600"
                    onClick={() => {
                      setPendingStake(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-800/70 px-4 py-1.5">
              <div className="grid grid-cols-4 gap-6 items-center">
                {/* Target */}
                <div>
                  <div className="text-xs text-green-400">Target</div>
                  <div className="text-xl text-red-400">
                    {(session.status === 'active' || session.status === 'finished') ? session.target : <span className="text-slate-600">—</span>}
                  </div>
                </div>

                {/* Players */}
                <div>
                  <div className="text-xs text-green-400">Players</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {session.players.length}
                  </div>
                </div>

                {/* Countdown */}
                <div>
                  <div className="text-xs text-green-400"><Timer /></div>
                  <div className="text-lg font-semibold text-slate-200">
                    {countdown ?? "—"}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="text-xs text-green-400">Status</div>
                  <div className="text-xs text-slate-200 font-mono">
                    {statusText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-0">
          {session.status !== 'active' ? (
            <div className="rounded-md border border-slate-800 bg-slate-800/60 p-3 text-sm text-slate-400 text-center">
              Numbers will reveal when the round starts.
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
              {session.numbers.map((n, idx) => {
                const disabled = session.status !== 'active' || usedSet.has(idx) || expectedNext !== 'number' || !selectedStake;
                return (
                  <button
                    key={`${n}-${idx}`}
                    onClick={() => selectNumber(idx)}
                    disabled={disabled}
                    className={`rounded-lg py-3 text-lg font-bold border transition-all ${
                      disabled
                        ? 'bg-slate-800 text-slate-500 border-slate-700'
                        : 'bg-slate-800 text-white border-slate-700 hover:border-yellow-400 hover:-translate-y-px'
                    } ${usedSet.has(idx) ? 'opacity-60' : ''}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {operators.map((op) => {
            const disabled = session.status !== 'active' || expectedNext !== 'op' || !selectedStake
            return (
              <button
                key={op}
                onClick={() => selectOperator(op)}
                disabled={disabled}
                className={`py-1 rounded font-semibold border border-slate-700 transition-all ${
                  disabled ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
              >
                {op}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">Your progress</span>
              <span className="text-xs text-slate-500">Result: {state.result ?? '—'}</span>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-800/60 min-h-[60px] text-sm text-slate-200 p-2">
              {state.tokens.length === 0 ? 'No input yet' : state.tokens.map((t, i) => (
                <span key={`${t.type}-${i}`} className="inline-block mr-1">
                  {t.type === 'number' ? t.value : t.value}
                </span>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-800/70 p-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={undoLast}
                  className="flex-1 py-2 rounded-md bg-slate-700 text-sm font-semibold hover:bg-slate-600 disabled:opacity-50"
                  disabled={state.tokens.length === 0}
                >
                  Undo
                </button>
                <button
                  onClick={resetExpression}
                  className="flex-1 py-2 rounded-md bg-slate-700 text-sm font-semibold hover:bg-slate-600 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={submitExpression}
                className="w-full py-2 rounded-md bg-yellow-400 text-slate-900 text-sm font-semibold hover:bg-yellow-300 disabled:opacity-50"
                disabled={!canSubmit || session.status !== 'active'}
              >
                Submit
              </button>
            </div>
            
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-200">Players</span>
                <span className="text-xs text-slate-500">{session.players.length} joined</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.players.length === 0 ? (
                  <div className="text-xs text-slate-500">Waiting for players...</div>
                ) : (
                  session.players.map((player) => (
                    <div key={player.userId} className="flex items-center justify-between text-sm bg-slate-800/60 rounded-md px-3 py-2">
                      <span className="text-white truncate">{player.name}</span>
                      <span className="text-xs text-slate-400">{player.submitted ? 'Submitted' : 'Playing'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {session.winner && (
          <div className="rounded-lg border border-emerald-500/70 bg-emerald-900/30 p-3 space-y-1">
            <div className="text-sm font-semibold text-emerald-300">Winner</div>
            <div className="text-lg font-bold text-white">{session.winner.name}</div>
            <div className="text-sm text-emerald-100">Expression: {session.winner.expression}</div>
            <div className="text-sm text-emerald-100">Result: {session.winner.result}</div>
          </div>
        )}

        {!session.winner && session.status === 'finished' && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 space-y-2">
            <div className="text-sm font-semibold text-yellow-300">No winner this round</div>
            <div className="text-sm text-slate-200">
              Possible answer: {session.solutionExpression ?? 'N/A'}
            </div>
            {session.solutionResult !== undefined && session.solutionResult !== null && (
              <div className="text-xs text-slate-400">Result: {session.solutionResult}</div>
            )}
          </div>
        )}

        {/* Solution popup removed */}
      </div>
    </div>
  );
}

export default NumberPuzzlePage;