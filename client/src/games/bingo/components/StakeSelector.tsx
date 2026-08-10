import { useEffect, useState, useCallback, useMemo } from "react";
import type { BingoStake } from "../types";
import { useStakeBonus } from "../../../contexts/StakeBonusContext";
import {
  Coins,
  Trophy,
  Activity,
  Rocket,
  Star,
  Users,
} from "lucide-react";

interface StakeSelectorProps {
  onSelectStake: (stake: BingoStake, onFail?: () => void) => void;
  onLeaveActiveGame?: (newStake: BingoStake) => void;
  hasActiveGame?: boolean;
  activeStake?: number;
}

type SessionInfo = {
  players: number;
  prize: number;
  status?: string;
  countdownEndsAt?: number | null;
};

const STAKES: BingoStake[] = [10, 20, 50, 100];
const API_TIMEOUT = 2000;
const POLL_INTERVAL = 1000;

export const StakeSelector = ({
  onSelectStake,
  onLeaveActiveGame,
  hasActiveGame,
  activeStake,
  forceRefreshRef,
}: StakeSelectorProps & {
  forceRefreshRef?: React.MutableRefObject<() => void>;
}) => {
  const { getBonusForStake } = useStakeBonus();
  const [selectedStake, setSelectedStake] = useState<BingoStake | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveSessions, setLiveSessions] = useState<Record<number, SessionInfo>>({});
  const [now, setNow] = useState(Date.now());

  const API_BASE = useMemo(
    () => (import.meta as ImportMeta).env?.VITE_API_BASE || window.location.origin,
    []
  );

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled(
        STAKES.map(async (stake) => {
          const controller = new AbortController();
          try {
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
            const res = await fetch(`${API_BASE}/api/bingo/session/${stake}`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error("Fetch failed");
            const data = await res.json();
            const session = data?.session;
            const players = session?.players?.length || 0;
            const totalPot = stake * players;
            let prize = totalPot;
            if (players < 3) prize = Math.floor(totalPot * 1);
            else if (players < 5) prize = Math.floor(totalPot * 0.9);
            else prize = Math.floor(totalPot * 0.8);
            const bonus = getBonusForStake?.(stake) || 0;
            prize = session?.prize || prize + bonus;
            return {
              stake,
              players,
              prize,
              status: session?.status || "waiting",
              countdownEndsAt: session?.countdownEndsAt || null,
            };
          } catch {
            return { stake, players: 0, prize: 0, status: "waiting", countdownEndsAt: null };
          }
        })
      );
      const sessions: Record<number, SessionInfo> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const { stake, ...rest } = r.value;
          sessions[stake] = rest;
        }
      });
      setLiveSessions(sessions);
    } catch {
      // 
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    const i = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(i);
  }, [API_BASE, getBonusForStake]);

  if (forceRefreshRef) forceRefreshRef.current = fetchSessions;

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const handleStakeClick = useCallback(
    (stake: BingoStake) => {
      if (isLoading && selectedStake === stake) return;
      if (hasActiveGame && activeStake !== stake && onLeaveActiveGame) {
        if (confirm(`Switch from ${activeStake} to ${stake}?`)) {
          setSelectedStake(stake);
          onSelectStake(stake);
        }
        return;
      }
      setSelectedStake(stake);
      setIsLoading(true);
      onSelectStake(stake);
      setIsLoading(false);
    },
    [isLoading, selectedStake, hasActiveGame, activeStake, onLeaveActiveGame, onSelectStake]
  );

  return (
    <div className="w-full max-w-xl mx-auto my-6 px-4 py-6 bg-[#0f0f0f] rounded-lg ">
      <div className="grid grid-cols-2 gap-4">
        {STAKES.map((stake) => {
          const bonus = getBonusForStake?.(stake) || 0;
          const session = liveSessions[stake];
          const isActive = activeStake === stake && session?.status === "active";
          const countdown = session?.countdownEndsAt
            ? Math.max(0, Math.ceil((session.countdownEndsAt - now) / 1000))
            : 0;
          const isStarting = session?.status !== "active" && countdown > 0;

          return (
            <div
              key={stake}
              onClick={() => handleStakeClick(stake)}
              className={`relative overflow-hidden group rounded-lg border-2 p-4 transition-all duration-500 cursor-pointer 
                ${isActive
                  ? "bg-[#111] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                  : isStarting
                    ? "bg-[#111] border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                    : "bg-[#0a0a0a] border-[#016630] hover:border-[#016630]"
                }`}
            >
              {/* Header: Stake Amount */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Stake</span>
                  <div className="flex items-center gap-1 text-xl font-black text-blue-600">
                    <Coins size={18} className="text-rose-500" />
                    {stake}<span className="text-xs text-zinc-400 ml-1">ETB</span>
                  </div>
                </div>
                {bonus > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <Star size={10} fill="currentColor" />
                    BONUS
                  </div>
                )}
              </div>

              {/* Prize & Players */}
              <div className="space-y-2 mb-4 bg-zinc-900/50 rounded-md p-2 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Trophy size={14} />
                    <span className="text-sm font-bold">{session?.prize || 0} ETB</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Users size={12} />
                    <span className="text-xs">{session?.players || 0}</span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isStarting ? 'bg-amber-400 animate-ping' : isActive ? 'bg-rose-500 shadow-[0_0_8px_rose]' : 'bg-zinc-700'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${isStarting ? 'text-amber-400' : isActive ? 'text-rose-500' : 'text-zinc-500'}`}>
                    {isStarting ? `Starting ${countdown}s` : isActive ? 'Game Running' : 'Waiting'}
                  </span>
                </div>

                <button
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${isActive
                    ? "bg-rose-500 text-white shadow-lg"
                    : isStarting
                      ? "bg-amber-400 text-black"
                      : "bg-blue-800 text-white hover:bg-blue-600 "
                    }`}
                >
                  {isActive ? "VIEW" : isStarting ? "ENTER" : "JOIN"}
                </button>
              </div>

              {/* Decorative Background Elements */}
              {isActive && <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-2xl -z-0" />}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};