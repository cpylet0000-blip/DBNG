/**
 * Main Avatar Room Component
 * Allows players to customize their game avatar
 */

import { useEffect, useRef, useState } from 'react'
import { useProfile } from '../../profileContext'

// Minimal visual assets / constants
const MIN_BET = 3
const MAX_BET = 15

type Player = { id: string; name: string; balance: number; isUser?: boolean }

export const AvatarRoomPage = () => {
  const { profile, userId } = useProfile()
  const userBalance = profile?.balance?.currentBalance ?? 0

  const [bet, setBet] = useState<number>(MIN_BET)
  const [reserved, setReserved] = useState<number>(0)
  const [countdown, setCountdown] = useState<number>(20)
  const countdownRef = useRef<number | null>(null)

  const [runRunning, setRunRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [stopTime, setStopTime] = useState<number | null>(null)
  const [crashed, setCrashed] = useState(false)

  const rafRef = useRef<number | null>(null)
  const startTsRef = useRef<number | null>(null)

  const [players, setPlayers] = useState<Player[]>(() => {
    // include current user if available
    const list: Player[] = []
    if (userId) list.push({ id: String(userId), name: profile?.name || 'You', balance: userBalance, isUser: true })
    return list
  })

  // Countdown when no user
  useEffect(() => {
    if (userId) return
    if (runRunning) return
    setCountdown(20)
    countdownRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) window.clearInterval(countdownRef.current)
          startAutoRun()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) window.clearInterval(countdownRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function startAutoRun() {
    // create fake players when no real user
    if (!userId) {
      const fake: Player[] = []
      for (let i = 0; i < 5; i++) {
        fake.push({ id: `bot-${i}`, name: `Player${i + 1}`, balance: Math.floor(Math.random() * 100) + 10 })
      }
      setPlayers(fake)
    }
    startRun()
  }

  function startRun() {
    setCrashed(false)
    setElapsed(0)
    setRunRunning(true)
    // sample stopTime between 3s and 12s
    const target = Math.random() * 9 + 3
    setStopTime(target)
    startTsRef.current = performance.now()

    // simulate bots cashouts randomly (only when no user)
    if (!userId) {
      players.forEach((p, idx) => {
        const cashAt = Math.random() * (target - 0.5)
        setTimeout(() => {
          // credit bot balance (simple)
          setPlayers((prev) => prev.map((pl) => pl.id === p.id ? { ...pl, balance: pl.balance + Math.floor( (1 + 0.5 * Math.random()) *  pl.balance * 0.02) } : pl))
        }, Math.max(200, Math.floor(cashAt * 1000)))
      })
    }

    // start RAF to update elapsed
    const tick = (ts: number) => {
      if (!startTsRef.current) startTsRef.current = ts
      const t = (ts - startTsRef.current) / 1000
      setElapsed(t)
      if (t >= target) {
        // crash
        setCrashed(true)
        setRunRunning(false)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        finalizeRun()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function finalizeRun() {
    // handle user loss if they had a reserved running bet
    if (reserved > 0) {
      // reserved amount is already deducted from displayed balance at placement
      setReserved(0)
    }
    // play crash sound
    try { playCrashSound() } catch {}
    // show crash animation briefly then reset
    setTimeout(() => {
      setCrashed(false)
      setStopTime(null)
      startTsRef.current = null
      setElapsed(0)
      // restart countdown if no user
      if (!userId) setCountdown(20)
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (countdownRef.current) window.clearInterval(countdownRef.current)
    }
  }, [])

  // Sound effects using WebAudio (works on Android when resumed by user interaction)
  const audioCtxRef = useRef<AudioContext | null>(null)
  function ensureAudio() {
    if (audioCtxRef.current) return audioCtxRef.current
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext)
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      return ctx
    } catch {
      return null
    }
  }

  function playBeep(frequency = 880, duration = 0.12) {
    const ctx = ensureAudio()
    if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = frequency
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.value = 0
    const now = ctx.currentTime
    g.gain.linearRampToValueAtTime(0.2, now + 0.01)
    o.start(now)
    g.gain.linearRampToValueAtTime(0.0, now + duration)
    o.stop(now + duration + 0.02)
  }

  function playCrashSound() {
    const ctx = ensureAudio()
    if (!ctx) return
    const now = ctx.currentTime
    const o1 = ctx.createOscillator()
    const o2 = ctx.createOscillator()
    const g = ctx.createGain()
    o1.type = 'sawtooth'
    o2.type = 'square'
    o1.frequency.value = 220
    o2.frequency.value = 110
    o1.connect(g)
    o2.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.4, now + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    o1.start(now)
    o2.start(now)
    o1.stop(now + 1.2)
    o2.stop(now + 1.2)
  }

  // Betting controls (client-side local simulation)
  const changeBet = (delta: number) => setBet((b) => Math.max(MIN_BET, Math.min(MAX_BET, b + delta)))

  const placeBet = () => {
    if (!userId) return
    // reserve locally
    if (reserved > 0) return // single active bet
    if (userBalance < bet) return
    setReserved(bet)
    // deduct from displayed balance for UI only
    setPlayers((prev) => prev.map(p => p.isUser ? { ...p, balance: p.balance - bet } : p))
    // ensure audio context is ready
    const ctx = ensureAudio()
    if (ctx && (ctx.state === 'suspended')) { ctx.resume().catch(() => {}) }
    // auto-start a run on first bet
    if (!runRunning) startRun()
  }

  const cashOut = () => {
    if (!userId || reserved <= 0) return
    // ensure audio is available
    const ctx = ensureAudio()
    if (ctx && (ctx.state === 'suspended')) { ctx.resume().catch(() => {}) }
    playBeep()
    const rate = 0.5 // example rate
    const multiplier = 1 + rate * elapsed
    const payout = Math.floor(reserved * multiplier)
    // credit user locally
    setPlayers((prev) => prev.map(p => p.isUser ? { ...p, balance: p.balance + payout } : p))
    setReserved(0)
  }

  const userPlayer = players.find((p) => p.isUser)
  const userDelta = userPlayer ? userPlayer.balance - userBalance : 0

  // refs to observe latest reserved/runRunning across event handlers
  const reservedRef = useRef(reserved)
  const runRunningRef = useRef(runRunning)
  useEffect(() => { reservedRef.current = reserved }, [reserved])
  useEffect(() => { runRunningRef.current = runRunning }, [runRunning])

  // If user leaves (unload or hides), they lose reserved bet if run is active
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (reservedRef.current > 0 && runRunningRef.current) {
        // mark as lost locally
        setReserved(0)
        try { playCrashSound() } catch {}
        // show message via console - server should enforce authoritative loss
        console.warn('User left during an active run — bet lost')
      }
    }

    const onVisibility = () => {
      if (document.hidden && reservedRef.current > 0 && runRunningRef.current) {
        setReserved(0)
        try { playCrashSound() } catch {}
        console.warn('User lost bet by leaving/hiding the tab')
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="rounded-xl overflow-hidden border border-slate-700 h-64 bg-linear-to-b from-sky-300 to-indigo-800 p-4 relative">

        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="flex flex-col lg:flex-row items-center gap-6">
  <div className="flex-1 relative min-h-[200px] lg:min-h-[250px]">
    {/* Plane positioned relative to height and x-axis */}
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                    w-20 h-12 text-white ${crashed ? 'bg-red-700/20' : ''} 
                    rounded-xl flex items-center justify-center text-4xl 
                    shadow-[0_0_15px_rgba(255,255,255,0.3)] backdrop-blur-sm
                    border border-white/20 transition-all duration-300
                    ${crashed ? 'scale-110 rotate-12' : 'hover:scale-105'}`}>
      ✈️
    </div>

    {/* Bottom linear overlay */}
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-indigo-900/30 via-indigo-900/10 to-transparent" />

    {/* Crash overlay */}
    {crashed && (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <div className="text-red-300 font-extrabold text-3xl animate-bounce drop-shadow-lg">CRASH</div>
        <div className="mt-2 text-white/90 text-sm bg-black/30 px-4 py-1 rounded-full">
          The craft has crashed — aboling down...
        </div>
      </div>
    )}

    {/* User balance change relative to their starting balance */}
    <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center px-4 text-sm text-white/90">
      <div className="bg-black/25 px-4 py-2 rounded-full backdrop-blur-sm font-semibold">
        {userDelta === 0 ? ' ' : userDelta > 0 ? `+${userDelta} ETB` : `${userDelta} ETB`}
      </div>
    </div>
  </div>
</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-200 mb-3">
            <div className="font-semibold">Balance: {userBalance} ETB</div>
            {!userId && (
              <div className="text-yellow-400 font-bold">Auto start in {countdown}s</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={placeBet} disabled={!userId || reserved > 0} className={`px-3 py-2 rounded ${(!userId || reserved > 0) ? 'bg-slate-700 text-slate-400' : 'bg-yellow-400 text-slate-900'}`}>Place Bet</button>
            <button onClick={cashOut} disabled={!userId || reserved <= 0 || !runRunning} className={`px-3 py-2 rounded ${(!userId || reserved <= 0 || !runRunning) ? 'bg-slate-700 text-slate-400' : 'bg-green-500 text-white'}`}>Cash Out</button>
            {/* Start Run removed */}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 lg:col-span-2">
          <div className="text-sm text-slate-300 font-semibold mb-2">Players</div>
          <div className="space-y-2">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800/50 rounded-md px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">{p.name.charAt(0)}</div>
                  <div>
                    <div className="text-sm font-semibold">{p.name}{p.isUser ? ' (you)' : ''}</div>
                    <div className="text-xs text-slate-400">{p.id}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-yellow-300">{p.balance} ETB</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
