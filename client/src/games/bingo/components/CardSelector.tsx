import { useCallback, useEffect, useState, useRef } from "react";
import type { BingoCard, BingoStake } from "../types";
import { CardConfirmation } from "./CardConfirmation";
import { useProfile } from "../../../profileContext";
import { ArrowLeft, Gift, ChevronDown, Play, Star } from "lucide-react";
import { useStakeBonus } from "../../../contexts/StakeBonusContext";

const SquareBox = ({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`aspect-square max-h-6 w-full flex items-center justify-center rounded-md border border-slate-600 bg-[#0f0f0f] text-[11px] ${className}`}
  >
    {children}
  </button>
);

interface CardSelectorProps {
  stake: BingoStake;
  cards: BingoCard[];
  joinedPlayers: number;
  countdownEndsAt?: number | null;
  onSelectCard: (cardIds: number[]) => void;
  roomNumber?: number;
  onChangeRoom?: (room: number) => void;
  onChangeStake?: (stake: BingoStake) => void;
  hasActiveGame?: boolean;
  onBackToStakeSelector?: () => void;
  onGoToGame?: () => void;
  triggerStakeRefresh?: () => void;
}

export const CardSelector = ({
  stake,
  cards,
  joinedPlayers,
  countdownEndsAt,
  onSelectCard,
  roomNumber = 1,
  onChangeStake,
  hasActiveGame = false,
  onBackToStakeSelector,
  onGoToGame,
  triggerStakeRefresh,
}: CardSelectorProps) => {
  const { profile, refresh: refreshProfile, buildHeaders } = useProfile();
  const { getBonusForStake } = useStakeBonus();

  const [now, setNow] = useState(Date.now());
  const [localCards, setLocalCards] = useState<BingoCard[]>(cards);
  const [confirmedCards, setConfirmedCards] = useState<number[]>([]);
  // Ref to keep latest confirmed cards for merge logic during polling
  const confirmedCardsRef = useRef<number[]>([]);
  // Track how many cards the user has in the session (from backend)
  const [sessionCardCount, setSessionCardCount] = useState<number>(0);
  const [selectedCard, setSelectedCard] = useState<BingoCard | null>(null);
  const [localJoined, setLocalJoined] = useState(joinedPlayers);
  const [localEndsAt, setLocalEndsAt] = useState<number | null>(
    countdownEndsAt ?? null,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [bingoSessionId, setBingoSessionId] = useState<number | string | null>(
    null,
  );

  // Determine if user is using reward balance only
  const userBalance =
    typeof profile?.balance?.currentBalance === "number"
      ? profile.balance.currentBalance
      : 0;
  const rewardBalance =
    typeof profile?.rewardBalance === "number" ? profile.rewardBalance : 0;
  const totalAvailable = userBalance + rewardBalance;
  // If only reward balance is available and enough for stake, allow only one card
  const isRewardOnly = userBalance < stake && rewardBalance >= stake;
  const MAX_SELECTION = isRewardOnly ? 1 : 5;
  const bonus = getBonusForStake(stake);
  const STAKES: BingoStake[] = [10, 20, 50, 100];

  const totalPot = stake * localJoined;
  let winnerPrize =
    localJoined < 3
      ? totalPot
      : localJoined < 5
        ? totalPot * 0.9
        : totalPot * 0.8;
  winnerPrize = Math.floor(winnerPrize + bonus);

  const countdown =
    localEndsAt != null
      ? Math.max(0, Math.ceil((localEndsAt - now) / 1000))
      : null;
  const API_BASE =
    (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env
      ?.VITE_API_BASE || window.location.origin;

  // Timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Reset selection on stake change
  useEffect(() => {
    setConfirmedCards(() => {
      confirmedCardsRef.current = [];
      return [];
    });
    setSelectedCard(null);
    setLocalJoined(0);
    setLocalEndsAt(null);
  }, [stake]);

  // Fetch fresh cards and session info
  useEffect(() => {
    const fetchFresh = async () => {
      try {
        const [sessionRes, cardsRes] = await Promise.all([
          fetch(`${API_BASE}/api/bingo/session/${stake}?room=${roomNumber}`),
          fetch(`${API_BASE}/api/bingo/cards/${stake}?room=${roomNumber}`, {
            headers: buildHeaders(),
          }),
        ]);
        const s = sessionRes.ok ? await sessionRes.json() : null;
        const c = cardsRes.ok ? await cardsRes.json() : null;
        const activeSession = s?.session ?? c?.session ?? null;
        if (activeSession) {
          setLocalJoined(activeSession.players?.length || 0);
          setLocalEndsAt(activeSession.countdownEndsAt ?? null);
          setBingoSessionId(activeSession.id ?? null);
          // Find how many cards the current user has in this session
          const myUserId = profile?.id;
          if (myUserId && Array.isArray(activeSession.players)) {
            const myCards = activeSession.players
              .filter(
                (p: { userId: number; cardId: number }) =>
                  p.userId === myUserId,
              )
              .map((p: { cardId: unknown }) => p.cardId);
            setSessionCardCount(myCards.length);
            // Merge server cards with any optimistic local confirmed cards
            setConfirmedCards((prev) => {
              const merged = Array.from(new Set([...prev, ...myCards]));
              confirmedCardsRef.current = merged;
              return merged;
            });
          }
        }
        if (c?.cards) {
          // Respect local confirmed cards so we don't flicker availability
          const merged = c.cards.map((card: BingoCard) => ({
            ...card,
            isAvailable:
              !confirmedCardsRef.current.includes(card.cardId) &&
              card.isAvailable,
          }));
          setLocalCards(merged);
        }
      } catch {
        // Ignore errors, will retry on next poll
      }
    };
    fetchFresh();
  }, [stake, roomNumber, API_BASE, buildHeaders, profile?.id]);

  // Polling
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const [sessionRes, cardsRes] = await Promise.all([
          fetch(`${API_BASE}/api/bingo/session/${stake}?room=${roomNumber}`),
          fetch(`${API_BASE}/api/bingo/cards/${stake}?room=${roomNumber}`, {
            headers: buildHeaders(),
          }),
        ]);
        if (cancelled) return;
        const s = sessionRes.ok ? await sessionRes.json() : null;
        const c = cardsRes.ok ? await cardsRes.json() : null;
        const activeSession = s?.session ?? c?.session ?? null;
        if (activeSession) {
          setLocalJoined(activeSession.players?.length || 0);
          setLocalEndsAt(activeSession.countdownEndsAt ?? null);
          setBingoSessionId(activeSession.id ?? null);
          // Find how many cards the current user has in this session
          const myUserId = profile?.id;
          if (myUserId && Array.isArray(activeSession.players)) {
            const myCards = activeSession.players
              .filter((p: { userId: number }) => p.userId === myUserId)
              .map((p: { cardId: unknown }) => p.cardId);
            setSessionCardCount(myCards.length);
            // Merge server state with optimistic local confirmed cards
            setConfirmedCards((prev) => {
              const merged = Array.from(new Set([...prev, ...myCards]));
              confirmedCardsRef.current = merged;
              return merged;
            });
          }
        }
        if (c?.cards) {
          const merged = c.cards.map((card: BingoCard) => ({
            ...card,
            isAvailable:
              !confirmedCardsRef.current.includes(card.cardId) &&
              card.isAvailable,
          }));
          setLocalCards(merged);
        }
      } catch {
        //
      }
    };
    poll();
    const i = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [API_BASE, stake, roomNumber, buildHeaders, profile?.id]);

  const handleConfirm = async () => {
    if (!selectedCard || isConfirming) return;
    setIsConfirming(true);

    try {
      const res = await fetch(`${API_BASE}/api/bingo/select-multiple-cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildHeaders(),
        },
        body: JSON.stringify({ stake, cardIds: [selectedCard.cardId] }),
      });
      const data = await res.json();
      if (data.success) {
        const confirmedCardId = selectedCard.cardId;
        setConfirmedCards((p) => {
          const next = Array.from(new Set([...p, confirmedCardId]));
          confirmedCardsRef.current = next;
          return next;
        });
        setLocalCards((p) =>
          p.map((c) =>
            c.cardId === confirmedCardId ? { ...c, isAvailable: false } : c,
          ),
        );
        setSelectedCard(null);
        void refreshProfile();
        if (triggerStakeRefresh) void triggerStakeRefresh();
      } else {
        alert("Selected by another player, choose a different card");
      }
    } catch {
      alert("Error selecting card");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGoToGame = useCallback(() => {
    if (confirmedCards.length === 0 || isJoiningGame) return;
    setIsJoiningGame(true);
    if (onGoToGame) onGoToGame();
    else onSelectCard(confirmedCards);
  }, [confirmedCards, isJoiningGame, onGoToGame, onSelectCard]);

  // Auto go to game
  useEffect(() => {
    if (confirmedCards.length > 0 && countdown === 0) handleGoToGame();
  }, [countdown, confirmedCards.length, handleGoToGame]);

  return (
    <div className=" mt-4">
      {/* Top Row */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <SquareBox onClick={onBackToStakeSelector} className="text-yellow-400 ">
          <span className="text-yellow-400 text-[10px] font-semibold">←</span>
        </SquareBox>

        <SquareBox className="flex flex-row items-center leading-tight">
          <span className="text-slate-400 text-[10px] font-semibold">
            Stake -&nbsp;
          </span>
          <span className="text-yellow-400 text-[10px] font-semibold">
            {stake} ETB
          </span>
        </SquareBox>
        <SquareBox className="flex flex-row items-center leading-tight">
          <span className="text-slate-400 text-[10px] font-semibold">
            Derash -&nbsp;
          </span>
          <span className="text-yellow-400 text-[10px] font-semibold">
            {winnerPrize} ETB{" "}
            {bonus > 0 && (
              <Star size={12} className="text-yellow-400 animate-spin-slow" />
            )}
          </span>
        </SquareBox>

        {/* Game ID */}
        <SquareBox className="flex flex-row items-center leading-tight">
          <span className="text-slate-400 text-[10px] font-semibold">
            Game ID -&nbsp;
          </span>{" "}
          <span className="text-yellow-400 text-[10px] font-bold">
            {bingoSessionId ?? "---"}
          </span>
        </SquareBox>
      </div>
      <div className="flex justify-center ">
        <div className="flex flex-row items-center leading-tight px-2 py-1.5 max-w-[7rem] bg-slate-900 rounded-sm ">
          <span className="text-slate-400 text-[12px] font-semibold">
            Status -&nbsp;
          </span>
          <span className="text-yellow-400 text-[10px] font-semibold">
            {hasActiveGame ? (
              <span className="text-red-500 text-[10.5px]">Active</span>
            ) : countdown !== null && countdown > 0 ? (
              <span className="text-blue-500 text-[13px]">{countdown}s</span>
            ) : (
              <span className="text-pink-500 text-[10.5px] font-semibold">
                Waiting
              </span>
            )}
          </span>
        </div>
      </div>
      {/* Stats */}
      {/* Confirmed Cards Panel */}
      {confirmedCards.length > 0 && (
        <div className="mb-2 flex items-center justify-between border-b-2 border-slate-800/60 pb-1 rounded-b-md">
          {/* Bingo Balls */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {confirmedCards.map((cardId) => {
              const colors = [
                "from-red-400 to-red-700",
                "from-blue-400 to-blue-700",
                "from-green-400 to-green-700",
                "from-yellow-400 to-yellow-700",
                "from-purple-400 to-purple-700",
                "from-pink-400 to-pink-700",
                "from-cyan-400 to-cyan-700",
                "from-orange-400 to-orange-700",
              ];

              return (
                <div
                  key={cardId}
                  className={`relative flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                    colors[cardId % colors.length]
                  } shadow-lg`}
                >
                  {/* Shine */}
                  <div className="absolute left-1 top-1 h-2 w-2 rounded-full bg-white/80 blur-[1px]" />

                  {/* White center */}
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-inner">
                    <span className="text-[8.8px] font-extrabold text-slate-900">
                      {cardId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleGoToGame}
            disabled={
              isJoiningGame || (hasActiveGame && confirmedCards.length === 0)
            }
            className={`ml-3  rounded-md px-4 py-1.5 text-xs font-semibold transition-all ${
              isJoiningGame
                ? "cursor-not-allowed bg-slate-700 text-slate-400"
                : hasActiveGame
                  ? "cursor-not-allowed bg-slate-600 text-slate-300"
                  : "bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30"
            }`}
          >
            {isJoiningGame
              ? "..."
              : hasActiveGame
                ? "Join"
                : countdown === 0
                  ? "Join"
                  : "Play"}
          </button>
        </div>
      )}

      {/* Card Grid */}
      <div className="relative">
        <div
          className={`bg-[#0f0f0f] rounded-md  p-[2px] grid grid-cols-10 gap-[4px] max-h-[70.5vh] my-2 overflow-y-auto transition-opacity duration-500 ${localCards.length === 0 ? "opacity-100" : "opacity-100"} ${hasActiveGame ? "pointer-events-none" : ""}`}
          style={hasActiveGame ? { filter: "blur(0.5px)" } : {}}
        >
          {localCards.length === 0
            ? Array.from({ length: 200 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="aspect-square rounded-[7.5px] bg-blue-700  text-sm font-bold flex items-center justify-center text-gray-300 transition-all duration-300"
                >
                  {i + 1}
                </div>
              ))
            : localCards.map((card) => {
                const taken = !card.isAvailable;
                const confirmed = confirmedCards.includes(card.cardId);
                const limitReached =
                  confirmedCards.length >= MAX_SELECTION && !confirmed;
                // Enforce max 1 card for reward balance, even after refresh
                const rewardLimitReached =
                  isRewardOnly && sessionCardCount >= 1 && !confirmed;
                return (
                  <button
                    key={card.cardId}
                    disabled={
                      taken ||
                      confirmed ||
                      hasActiveGame ||
                      limitReached ||
                      rewardLimitReached
                    }
                    onClick={() => {
                      // Already calculated userBalance, rewardBalance, totalAvailable above
                      if (totalAvailable < stake) {
                        alert("Insufficient balance");
                        return;
                      }
                      // If only reward balance is available, allow only one card
                      // Enforce max 1 card for reward balance, even after refresh
                      if (isRewardOnly && sessionCardCount >= 1) {
                        alert(
                          "You can only select one card with reward balance.",
                        );
                        return;
                      }
                      setSelectedCard(card);
                    }}
                    className={`aspect-square rounded-[7.5px] text-sm font-bold flex items-center justify-center transition-all ${
                      taken
                        ? "bg-[#3d3d3d] text-slate-200 "
                        : confirmed
                          ? "bg-green-800 text-slate-400 cursor-not-allowed"
                          : limitReached
                            ? "bg-blue-700 text-slate-300 cursor-not-allowed"
                            : "relative overflow-hidden text-gray-200 hover:scale-105  active:translate-y-1  bg-blue-700"
                    }`}
                  >
                    {card.cardId}
                  </button>
                );
              })}
        </div>

        {hasActiveGame && confirmedCards.length === 0 && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center rounded-lg pointer-events-auto"
            style={{
              background: "rgba(0,0,0,0.15)",
              backdropFilter: "blur(2px)",
            }}
          >
            <span className="inline-flex flex-col items-center px-8 py-5 rounded-2xl bg-gradient-to-br from-[#18181b]/95 via-[#111827]/90 to-[#09090b]/95 border border-amber-400/30 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-in fade-in zoom-in duration-300">
              {/* Status Header */}
              <span className="flex items-center gap-2 text-amber-300 font-extrabold text-2xl tracking-wide mb-2">
                🟡 ጨዋታው በሂደት ላይ ነው
              </span>

              {/* Divider */}
              <div className="w-16 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-3" />

              {/* Description */}
              <span className="text-center text-gray-300 text-[15px] leading-7 font-medium">
                ይህን ዙር መቀላቀል አይቻልም።
                <br />
                <span className="text-gray-400">
                  ቀጣዩን ዙር ይጠብቁ ወይም ሌላ መደብ ይምረጡ።
                </span>
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Max Selection Warning */}
      {!hasActiveGame && confirmedCards.length >= MAX_SELECTION && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none px-4">
          {MAX_SELECTION == 1 ? (
            <div className="max-w-sm w-full rounded-2xl border border-amber-400/25 bg-gradient-to-br from-[#1a1a1a]/95 via-[#202020]/95 to-[#111111]/95 backdrop-blur-xl shadow-[0_15px_45px_rgba(0,0,0,0.5)] px-6 py-5 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 border border-amber-400/30">
                  <span className="text-2xl">🎁</span>
                </div>

                <div>
                  <h3 className="text-amber-300 font-bold text-base">
                    የቦነስ ምርጫ
                  </h3>

                  <p className="mt-1 text-sm text-gray-300 leading-6">
                    በቦነሱ {MAX_SELECTION} ካርቴላ ብቻ መምረጥ ይችላሉ።
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-sm w-full rounded-2xl border border-amber-400/25 bg-gradient-to-br from-[#1a1a1a]/95 via-[#202020]/95 to-[#111111]/95 backdrop-blur-xl shadow-[0_15px_45px_rgba(0,0,0,0.5)] px-6 py-5 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 border border-amber-400/30">
                  <span className="text-2xl">⚠️</span>
                </div>

                <div>
                  <h3 className="text-amber-300 font-bold text-base">
                    የምርጫ ገደብ
                  </h3>

                  <p className="mt-1 text-sm text-gray-300 leading-6">
                    እስከ {MAX_SELECTION} ካርቴላ ብቻ መምረጥ ይችላሉ።
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedCard && (
        <CardConfirmation
          cardId={selectedCard.cardId}
          numbers={selectedCard.numbers}
          userName={profile?.username ?? "You"}
          onConfirm={handleConfirm}
          onCancel={() => setSelectedCard(null)}
          isConfirming={isConfirming}
        />
      )}

      {/* Animations */}
      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
