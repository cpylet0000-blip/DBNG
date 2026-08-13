import { useEffect, useState, useCallback, useRef } from "react";
import { VoiceController } from "./components/VoiceController";
import { useBingoRoom } from "./hooks/useBingoRoom";
import { CardSelector } from "./components/CardSelector";
import { BingoCard } from "./components/BingoCard";
import { WinnerDisplay } from "./components/WinnerDisplay";
import { StakeSelector } from "./components/StakeSelector";
import { BingoGameProvider } from "./BingoGameContext";
import { useStakeBonus } from "../../contexts/StakeBonusContext";
import { useProfile } from "../../profileContext";
import type { BingoStake, BingoPlayer, BingoGameState } from "./types";
import { Trophy, Users, Clock } from "lucide-react";
import { buildHeaders } from "./hooks/useBingoRoom";

const BingoPageContent = () => {
  // Clear localStorage on landing to avoid stale state issues
  useEffect(() => {
    localStorage.removeItem("bingo_game_state");
  }, []);

  const {
    connected,
    gameState,
    setGameState,
    selectStake,
    selectMultipleCards,
    toggleAutoMark,
    markCell,
    claimWin,
    goToCardSelector,
    goToStakeSelector,
    goToStakeSelection,
    goToGameView,
    leaveActiveGameAndSwitch,
  } = useBingoRoom();

  const { getBonusForStake } = useStakeBonus();
  const { profile } = useProfile();

  // Calculate combined balance (real + reward)
  const realBalance = gameState.balance || 0;
  const rewardBalance = profile?.rewardBalance || 0;
  const combinedBalance = realBalance + rewardBalance;

  // Ref to allow CardSelector to trigger StakeSelector refresh
  const forceRefreshRef = useRef<() => void>(() => {});

  // Calculate prize based on player count (matching backend logic)
  const calculatePrize = (stake: number, playerCount: number) => {
    const totalPot = stake * playerCount;
    if (playerCount < 3) {
      return Math.floor(totalPot * 1);
    } else if (playerCount < 5) {
      return Math.floor(totalPot * 0.9);
    } else {
      return Math.floor(totalPot * 0.8);
    }
  };

  // Function to handle page refresh
  const handleRefresh = useCallback(async () => {
    if (!gameState.selectedStake) return;
    try {
      // Refetch session data using the correct endpoint
      const API_BASE = import.meta.env.VITE_API_BASE || "";
      const roomNumber =
        gameState.session?.roomNumber ?? gameState.selectedRoom ?? 1;
      const response = await fetch(
        `${API_BASE}/api/bingo/session/${gameState.selectedStake}?room=${roomNumber}`,
        {
          headers: buildHeaders(),
        },
      );
      const data = await response.json();
      if (data.success && data.session) {
        // Update session and cards from backend
        const userId = profile?.id;

        // Convert userId to string for comparison
        const userIdStr = userId?.toString();

        interface PlayerData {
          userId: string | number;
          cardId: number;
          cardNumbers?: number[];
          markedCells?: number[];
        }

        const myPlayerCards =
          data.session.players && Array.isArray(data.session.players)
            ? data.session.players
                .filter(
                  (p: PlayerData) =>
                    userIdStr && p.userId?.toString() === userIdStr,
                )
                .map((p: PlayerData) => ({
                  id: p.cardId,
                  numbers: p.cardNumbers || [],
                  markedCells: p.markedCells || [],
                }))
            : [];

        // Update gameState using setGameState
        setGameState((prev: BingoGameState) => ({
          ...prev,
          session: data.session,
          myCards: myPlayerCards,
        }));
        console.log(
          "[BingoPage] Refresh completed, cards found:",
          myPlayerCards.length,
        );
      } else {
        console.warn("[BingoPage] Refresh failed:", data.error);
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    }
  }, [
    gameState.selectedStake,
    gameState.session?.roomNumber,
    gameState.selectedRoom,
    profile?.id,
    setGameState,
  ]);

  // Auto-refresh session data when in game view
  useEffect(() => {
    if (gameState.view === "game" && gameState.selectedStake) {
      console.log("[BingoPage] Auto-refreshing session data");
      handleRefresh();

      // Set up periodic refresh every 5 seconds
      const interval = setInterval(() => {
        if (gameState.view === "game" && gameState.selectedStake) {
          handleRefresh();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [gameState.view, gameState.selectedStake, handleRefresh]);

  // Auto-emit join_room when game view is requested
  useEffect(() => {
    if (gameState.view === "game" && gameState.selectedStake && connected) {
      console.log("[BingoPage] Game view active, connected to WS");
    }
  }, [gameState.view, gameState.selectedStake, connected]);

  // Calculate countdown
  const getCountdown = () => {
    if (!gameState.session?.countdownEndsAt) return null;
    const remaining = Math.max(
      0,
      gameState.session.countdownEndsAt - Date.now(),
    );
    return Math.ceil(remaining / 1000);
  };

  // Helper to get BINGO letter for a number
  const getBingoLetter = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    return "O";
  };

  // Check if player has winning pattern (COLUMN-MAJOR to match backend)
  const checkForWin = () => {
    // Check if any card has a winning pattern
    return gameState.myCards?.some((card) => {
      const marked = card.markedCells;
      if (marked.length < 4) return false;

      // Check rows (in column-major: row r = indices [0*5+r, 1*5+r, 2*5+r, 3*5+r, 4*5+r])
      for (let row = 0; row < 5; row++) {
        const rowCells = Array.from({ length: 5 }, (_, col) => col * 5 + row);
        if (rowCells.every((cell) => cell === 12 || marked.includes(cell)))
          return true;
      }
      // Check columns (in column-major: col c = indices [c*5+0, c*5+1, c*5+2, c*5+3, c*5+4])
      for (let col = 0; col < 5; col++) {
        const colCells = Array.from({ length: 5 }, (_, row) => col * 5 + row);
        if (colCells.every((cell) => cell === 12 || marked.includes(cell)))
          return true;
      }
      // Check diagonals (column-major)
      const diag1 = [0, 6, 12, 18, 24]; // top-left to bottom-right
      const diag2 = [20, 16, 12, 8, 4]; // top-right to bottom-left
      if (diag1.every((cell) => cell === 12 || marked.includes(cell)))
        return true;
      if (diag2.every((cell) => cell === 12 || marked.includes(cell)))
        return true;
      // Check four corners (column-major: TL=0, BL=4, TR=20, BR=24)
      const corners = [0, 4, 20, 24];
      if (corners.every((cell) => marked.includes(cell))) return true;
      return false;
    });
  };

  const hasWin = checkForWin();

  // Timeout message state for connection delay
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);
  useEffect(() => {
    if (gameState.view === "game" && !connected) {
      const timeout = setTimeout(() => setShowTimeoutMessage(true), 8000);
      return () => clearTimeout(timeout);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [gameState.view, connected]);

  // Stake selection view
  if (gameState.view === "stake-select") {
    return (
      <StakeSelector
        onSelectStake={(stake: BingoStake, onFail?: () => void) => {
          selectStake(stake).catch((err: unknown) => {
            console.error("Failed to select stake:", err);
            onFail?.();
          });
        }}
        onLeaveActiveGame={leaveActiveGameAndSwitch}
        hasActiveGame={false}
        activeStake={gameState.selectedStake || undefined}
        forceRefreshRef={forceRefreshRef}
      />
    );
  }

  // Card selection view
  if (gameState.view === "card-select" && gameState.selectedStake) {
    const roomNumber =
      gameState.session?.roomNumber ?? gameState.selectedRoom ?? 1;
    const triggerStakeRefresh = () => {
      if (forceRefreshRef.current) {
        forceRefreshRef.current();
      }
    };
    return (
      <CardSelector
        stake={gameState.selectedStake}
        cards={gameState.availableCards}
        joinedPlayers={gameState.session?.players?.length || 0}
        countdownEndsAt={gameState.session?.countdownEndsAt}
        onSelectCard={selectMultipleCards}
        roomNumber={roomNumber}
        onChangeRoom={(room: number) =>
          selectStake(gameState.selectedStake!, room)
        }
        onChangeStake={(newStake: BingoStake) =>
          selectStake(newStake, roomNumber)
        }
        hasActiveGame={
          gameState.session?.status === "active" &&
          gameState.session?.stake === gameState.selectedStake
        }
        onBackToStakeSelector={goToStakeSelection}
        onGoToGame={goToGameView}
        triggerStakeRefresh={triggerStakeRefresh}
      />
    );
  }

  // Queue view
  if (gameState.view === "queue" && gameState.session) {
    const countdown = getCountdown();
    return (
      <div className="h-[80vh] border-4 border-transparent rounded bg-linear-to-br from-slate-900 via-sky-900 to-slate-800 relative overflow-scroll scroll-auto ">
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-yellow-400 text-4xl font-bold mb-4">
              Game Starting Soon!
            </div>
            <div className="text-slate-300 text-xl mb-8">
              {countdown !== null && countdown > 0 ? (
                <span>Starting in {countdown}s...</span>
              ) : (
                <span>Get ready!</span>
              )}
            </div>
            <div className="text-slate-400">
              You have selected {gameState.myCards?.length ?? 0} card
              {gameState.myCards?.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (gameState.view === "game" && gameState.session && !connected) {
    return (
      <div className="h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          {/* Loading Indicator */}
          <div className="mb-6 flex justify-center">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60">
              <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />

              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
          </div>

          {/* Main Message */}
          <h2 className="text-[17px] font-semibold tracking-wide text-slate-100">
            Connecting to Game
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Please wait while we connect you to the game.
          </p>

          {/* Timeout Message */}
          {showTimeoutMessage && (
            <div className="mt-7 border-t border-slate-800 pt-5">
              <div className="flex items-start gap-3 rounded-lg border border-slate-700/80 bg-slate-800/40 px-4 py-3 text-left">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  !
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">
                    Connection is taking longer than expected
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Please refresh the page and try again.
                  </p>

                  <button
                    onClick={() => window.location.reload()}
                    className="
                mt-3
                inline-flex
                items-center
                justify-center
                rounded-md
                border border-blue-500/40
                bg-blue-500/10
                px-4
                py-2
                text-xs
                font-medium
                text-blue-400
                transition-all
                duration-200
                hover:border-blue-500/60
                hover:bg-blue-500/15
                hover:text-blue-300
                active:scale-[0.98]
              "
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main game view
  if (gameState.view === "game" && gameState.session) {
    const cards = gameState.myCards || [];
    const calledNumbers = gameState.session.calledNumbers || [];
    const lastCalled = calledNumbers[calledNumbers.length - 1];
    const recentCalls = [...calledNumbers].reverse().slice(1, 4);
    const countdown = getCountdown();

    const BINGO_COLS = [
      {
        letter: "B",
        start: 1,
        headerBg: "bg-blue-500",
        highlight: "bg-blue-500",
      },
      {
        letter: "I",
        start: 16,
        headerBg: "bg-pink-500",
        highlight: "bg-pink-500",
      },
      {
        letter: "N",
        start: 31,
        headerBg: "bg-green-500",
        highlight: "bg-green-500",
      },
      {
        letter: "G",
        start: 46,
        headerBg: "bg-amber-500",
        highlight: "bg-amber-500",
      },
      {
        letter: "O",
        start: 61,
        headerBg: "bg-red-500",
        highlight: "bg-red-500",
      },
    ];

    const getColBg = (letter: string) => {
      const map: Record<string, string> = {
        B: "bg-blue-500",
        I: "bg-pink-500",
        N: "bg-green-500",
        G: "bg-amber-500",
        O: "bg-red-500",
      };
      return map[letter] ?? "bg-gray-700";
    };

    return (
      <div className="h-[82vh] relative flex flex-col bg-[#11131a] overflow-hidden rounded-md text-white font-sans">
        {/* ── TOP STATS ROW (4 Boxes) ── */}
        <div className="flex items-center gap-[3px] shrink-0 mt-2 mb-1 w-full">
          {/* Back Button */}
          <button
            onClick={goToStakeSelector}
            className="flex items-center justify-center text-white flex-shrink-0 w-7 h-8"
          >
            <svg
              className="w-3.5 h-3.5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* BET */}
          <div className="flex-1 flex items-center justify-center gap-[3px] px-[1.5px] py-1 bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-md border border-amber-500/30 h-8 min-w-0">
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
              Bet
            </span>
            <span className="text-amber-400 font-bold text-xs whitespace-nowrap">
              {gameState.selectedStake}
            </span>
            <span className="text-[7px] text-gray-600 whitespace-nowrap">
              Birr
            </span>
          </div>

          {/* DERASH */}
          <div className="flex-1 flex items-center justify-center gap-[3px] px-[1.5px] py-1 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-md border border-blue-500/30 h-8 min-w-0">
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
              Derash
            </span>
            <span className="text-white font-bold text-xs whitespace-nowrap">
              {(
                calculatePrize(
                  gameState.selectedStake ?? 0,
                  gameState.session?.players?.length || 1,
                ) + getBonusForStake(gameState.selectedStake ?? 0)
              ).toFixed(0)}
            </span>
            <span className="text-[7px] text-gray-600 whitespace-nowrap">
              Birr
            </span>
          </div>

          {/* PLAYERS */}
          <div className="flex-1 flex items-center justify-center gap-[3px] px-[1.5px] py-1 bg-gradient-to-r from-purple-500/10 to-purple-500/5 rounded-md border border-purple-500/30 h-8 min-w-0">
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
              Players
            </span>
            <span className="text-purple-400 font-bold text-xs whitespace-nowrap">
              {gameState.session?.players?.length ?? 0}
            </span>
          </div>

          {/* CALLED */}
          <div className="flex-1 flex items-center justify-center gap-[3px] px-[1.5px] py-1 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-md border border-green-500/30 h-8 min-w-0">
            <span className="text-[8px] text-sky-400 font-bold whitespace-nowrap animate-pulse">
              {countdown !== null ? `${countdown}s` : "--"}
            </span>
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
              Called
            </span>
            <span className="text-green-400 font-bold text-xs whitespace-nowrap">
              {calledNumbers.length}
            </span>
          </div>

          {/* VOICE CONTROLLER */}
          <div className="flex items-center justify-center flex-shrink-0 w-7 h-8 ">
            <VoiceController calledNumbers={calledNumbers} />
          </div>
        </div>

        {/* ── MAIN TWO-COLUMN AREA ── */}
        <div className="flex-1 flex gap-2  pb-3 overflow-hidden">
          {/* LEFT: BINGO BOARD */}
          <div className="flex flex-col w-[45%] shrink-0 overflow-y-auto pr-1">
            <div className="bg-[#181a25] rounded-lg  p-1.5 h-full flex flex-col">
              {/* Board Header */}
              <div className="grid grid-cols-5 gap-[2.5px] mb-[2.5px] shrink-0">
                {BINGO_COLS.map(({ letter, headerBg }) => (
                  <div
                    key={letter}
                    className={`${headerBg} flex items-center justify-center font-bold text-white text-[12px] rounded-md py-1`}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              {/* Board Grid */}
              <div className="flex-1 grid grid-rows-15 gap-[2.5px]">
                {Array.from({ length: 15 }, (_, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-5 gap-[2.5px]">
                    {BINGO_COLS.map(({ start, highlight }, colIdx) => {
                      const num = start + rowIdx;
                      const isCalled = calledNumbers.includes(num);
                      return (
                        <div
                          key={colIdx}
                          className={`flex items-center justify-center text-[10px] font-semibold rounded-md transition-all duration-300 ${
                            isCalled
                              ? `${highlight} text-white`
                              : "bg-[#222532] text-gray-400"
                          }`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: CONTROLS & CARD */}
          <div className="flex flex-col w-[55%] gap-3 min-h-0">
            {/* Main call circle & Recent Calls */}
            <div className="flex items-center justify-center gap-1 shrink-0">
              {/* Main Call */}
              {lastCalled != null ? (
                <div
                  className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)] shrink-0 animate-pulse ${getColBg(getBingoLetter(lastCalled))}`}
                >
                  <span className="text-sm font-bold text-white leading-none mb-[-2px]">
                    {getBingoLetter(lastCalled)}
                  </span>
                  <span className="text-2xl font-extrabold text-white leading-none">
                    {lastCalled}
                  </span>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-[1.5px] border-blue-800 shrink-0"></div>
              )}

              {/* Recent calls (smaller circles) - ONE ROW with placeholders */}
              <div className="flex items-center justify-start gap-1 flex-nowrap shrink-0">
                {Array.from({ length: 3 }).map((_, idx) => {
                  const num = recentCalls[idx];
                  if (num != null) {
                    return (
                      <div
                        key={num}
                        className={`w-7 h-7 rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)] ${getColBg(getBingoLetter(num))}`}
                      >
                        <span className="text-[8px] font-bold text-white leading-none mb-[-2px]">
                          {getBingoLetter(num)}
                        </span>
                        <span className="text-[12px] font-extrabold text-white leading-none">
                          {num}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="w-7 h-7 rounded-full border-[1.5px] border-blue-800 shrink-0"
                      ></div>
                    );
                  }
                })}
              </div>
            </div>

            {/* Card / Watching Panel */}
            <div className="flex-1 min-h-0 ">
              {cards.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-start h-full">
                  <div className="relative rounded-xl border-2 border-blue-900  px-2.5 py-2.5 shadow-2xl overflow-hidden">
                    <div className="grid grid-cols-5 mb-1.5 gap-[5px] justify-center opacity-70 blur-[0.75px]">
                      {BINGO_COLS.map(({ letter, headerBg }) => (
                        <div
                          key={`empty-header-${letter}`}
                          className={`${headerBg} flex items-center justify-center rounded-md text-base font-semibold text-white`}
                          style={{ width: 28, height: 28 }}
                        >
                          {letter}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-5 gap-[3px] justify-center opacity-55 blur-[0.9px]">
                      {Array.from({ length: 25 }, (_, displayIndex) => (
                        <div
                          key={`empty-cell-${displayIndex}`}
                          className="flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-500 font-bold text-base"
                          style={{ width: 28, height: 28 }}
                        >
                          &nbsp;
                        </div>
                      ))}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center px-4">
                      <div className="max-w-[185px] rounded-lg border border-orange-500/30 bg-black/70 px-3 py-2 text-center backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.35)]">
                        <div className="mb-1.5 text-[11px] font-semibold leading-tight text-orange-500">
                          watching only
                        </div>
                        <div className="text-[8.5px] leading-snug text-slate-300/70">
                          በዚህ ዙር ካርቴላ አልመርጡም።
                          <br />
                          ለቀጣይ ዙር ይምርጡ።
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <BingoCard
                    cards={cards}
                    calledNumbers={calledNumbers}
                    onMarkCell={markCell}
                    autoMark={gameState.autoMark || false}
                    onToggleAutoMark={toggleAutoMark}
                    disabled={gameState.session.status !== "active"}
                    winningCells={
                      gameState.session.winner
                        ? gameState.session.winner.winningCells
                        : []
                    }
                    onClaimWin={() => claimWin()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Winner Modal ── */}
        {gameState.session.winner &&
          (gameState.session.winner.multipleWinners ? (
            <WinnerDisplay
              multipleWinners={true}
              winners={(gameState.session.winner.winners || []).map((w) => ({
                winnerId: w.userId,
                winnerName: w.name,
                cardId: w.cardId,
                cardNumbers: w.cardNumbers || [],
                prize: w.prize,
                bonus: w.bonus,
                totalAwarded: w.totalAwarded,
                pattern: w.pattern,
                winningCells: w.winningCells,
              }))}
              totalPrize={gameState.session.winner.totalPrize || 0}
              individualPrize={gameState.session.winner.individualPrize || 0}
              winnersCount={gameState.session.winner.winnersCount || 0}
              calledNumbers={gameState.session.calledNumbers || []}
              onClose={goToStakeSelector}
            />
          ) : (
            <WinnerDisplay
              winnerName={gameState.session.winner.name || ""}
              cardId={gameState.session.winner.cardId || 0}
              cardNumbers={
                gameState.session.winner.cardNumbers &&
                Array.isArray(gameState.session.winner.cardNumbers) &&
                gameState.session.winner.cardNumbers.length === 25
                  ? gameState.session.winner.cardNumbers
                  : Array(25).fill(0)
              }
              prize={(() => {
                const stake = gameState.selectedStake ?? 0;
                const playerCount = gameState.session.players?.length || 1;
                let multiplier = 1;
                if (playerCount < 2) {
                  multiplier = 1;
                } else if (playerCount >= 3 && playerCount <= 4) {
                  multiplier = 0.9;
                } else if (playerCount > 4) {
                  multiplier = 0.8;
                }
                return (
                  stake * playerCount * multiplier + getBonusForStake(stake)
                );
              })()}
              pattern={gameState.session.winner.pattern || ""}
              winningCells={gameState.session.winner.winningCells || []}
              calledNumbers={gameState.session.calledNumbers || []}
              onClose={goToStakeSelector}
            />
          ))}
      </div>
    );
  }
  {
    /* ... */
  }
  // Default fallback
  return (
    <div className="h-[80vh] flex items-center justify-center">
      <div
        className="
      h-9 w-9
      rounded-full
      border-2
      border-slate-700
      border-t-blue-500
      animate-spin
    "
      />
    </div>
  );
};

const BingoPage = () => {
  return (
    <BingoGameProvider>
      <BingoPageContent />
    </BingoGameProvider>
  );
};

export default BingoPage;
