import * as React from "react";

const createParticles = (count: number) =>
  Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
  }));

const CONFETTI = createParticles(60);

interface SingleWinnerProps {
  winnerName: string;
  cardId: number;
  cardNumbers: number[];
  prize: number;
  pattern: string;
  winningCells: number[];
  calledNumbers?: number[];
  onClose: () => void;
}

interface MultipleWinnersProps {
  multipleWinners: true;
  winners: Array<{
    winnerId: number;
    winnerName: string;
    cardId: number;
    prize: number;
    bonus: number;
    totalAwarded: number;
    pattern: string;
    winningCells: number[];
  }>;
  totalPrize: number;
  individualPrize: number;
  winnersCount: number;
  calledNumbers?: number[];
  onClose: () => void;
}

type WinnerDisplayProps = SingleWinnerProps | MultipleWinnersProps;

export const WinnerDisplay = (props: WinnerDisplayProps) => {
  const [countdown, setCountdown] = React.useState(6);

  React.useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const redirectTimer = setTimeout(() => {
      props.onClose();
    }, 6000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [props.onClose]);

  const isMultipleWinners = "multipleWinners" in props && props.multipleWinners;

  const getCellClass = (
    colMajorIndex: number,
    cellNumber: number,
    winningCells: number[] = [],
  ) => {
    const isFree = colMajorIndex === 12;
    const isWinning = winningCells.includes(colMajorIndex);
    const isCalled = props.calledNumbers?.includes(cellNumber) && !isFree;

    if (isFree)
      return "bg-gradient-to-br from-amber-300 to-yellow-400 text-black ring-2 ring-amber-400";
    if (isWinning)
      return "bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-300 shadow-lg shadow-amber-500/50";
    if (isCalled)
      return "bg-gradient-to-br from-purple-500 to-indigo-600 text-white";
    return "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200";
  };

  if (!isMultipleWinners) {
    const singleProps = props as SingleWinnerProps;
    const {
      winnerName,
      cardId,
      cardNumbers,
      prize,
      winningCells,
      calledNumbers = [],
    } = singleProps;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-pink-900/90 backdrop-blur-md overflow-hidden">
        {/* CONFETTI - Gold themed */}
        <div className="absolute inset-0 pointer-events-none">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: c.left,
                animationDelay: c.delay,
                animationDuration: c.duration,
                background:
                  i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fcd34d",
              }}
            />
          ))}
        </div>

        {/* SPARKLE RING */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-400/10 blur-3xl animate-spin-slow"></div>
        <div className="absolute w-[350px] h-[350px] rounded-full bg-yellow-300/5 blur-2xl animate-spin-slow-reverse"></div>

        {/* MAIN CARD - Gold/Royal Theme */}
        <div className="relative w-[85vw] max-w-sm h-[83vh] rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 border-2 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.3)] p-5 flex flex-col justify-between transform hover:scale-[1.02] transition-transform duration-300">
          {/* GLOW EFFECTS */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl"></div>

          {/* HEADER */}
          <div className="text-center relative">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/50 animate-float">
              👑
            </div>

            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 mt-2 tracking-wider">
              BINGO ROYALE
            </h2>

            <p className="text-amber-200/90 text-sm font-semibold tracking-wide animate-pulse">
              ✨ Grand Winner ✨
            </p>
          </div>

          {/* PLAYER INFO */}
          <div className="relative bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border border-amber-400/30 rounded-xl px-4 py-3 mt-3 mb-2 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-amber-300">
                  {winnerName}
                </div>
                <div className="text-xs text-purple-300">🎯 Card #{cardId}</div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                  +{prize.toFixed(2)} ETB
                </div>
              </div>
            </div>
          </div>

          {/* BINGO GRID */}
          <div className="mx-auto w-[260px] rounded-xl p-3 bg-gradient-to-b from-indigo-900/50 to-purple-900/50 border-2 border-amber-400/50 shadow-inner shadow-amber-400/10">
            {/* HEADER */}
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {["B", "I", "N", "G", "O"].map((l) => (
                <div
                  key={l}
                  className="aspect-square flex items-center border-2 border-amber-400 justify-center text-sm font-black rounded-lg 
                             bg-gradient-to-b from-amber-400 to-yellow-500 text-indigo-950 shadow-lg"
                >
                  {l}
                </div>
              ))}
            </div>

            {/* GRID */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 25 }, (_, rowMajorIndex) => {
                const row = Math.floor(rowMajorIndex / 5);
                const col = rowMajorIndex % 5;
                const colMajorIndex = col * 5 + row;
                const cellNumber = cardNumbers[colMajorIndex];
                const isFree = colMajorIndex === 12;

                return (
                  <div
                    key={rowMajorIndex}
                    className={`
                      aspect-square rounded-lg flex items-center justify-center 
                      text-[17px] font-bold transition-all duration-300
                      ${getCellClass(colMajorIndex, cellNumber, winningCells)}
                      ${isFree ? "shadow-lg shadow-amber-400/30" : ""}
                      ${winningCells.includes(colMajorIndex) ? "scale-105" : ""}
                    `}
                  >
                    {isFree ? "⭐" : cellNumber}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONTINUE BUTTON */}
          <button
            onClick={props.onClose}
            className="relative w-full py-3 rounded-xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-indigo-950 shadow-lg shadow-amber-500/50 active:scale-95 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/70 mt-2 overflow-hidden group"
          >
            <span className="relative z-10">✨ Continue to Next Game ✨</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          {/* COUNTDOWN */}
          <div className="text-center mt-1">
            <div className="text-amber-300 font-mono font-bold text-lg">
              ⏳ {countdown}s
            </div>

            <div className="h-2 bg-indigo-900/80 rounded-full overflow-hidden mt-1 border border-amber-400/20">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-1000 shadow-lg shadow-amber-500/50"
                style={{ width: `${(countdown / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ANIMATIONS */}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(-10px) rotate(0deg) scale(1); opacity:1 }
            100% { transform: translateY(100vh) rotate(720deg) scale(0); opacity:0 }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes spin-slow-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }

          .animate-confetti {
            animation: confetti linear infinite;
          }

          .animate-float {
            animation: float 3s ease-in-out infinite;
          }

          .animate-spin-slow {
            animation: spin-slow 20s linear infinite;
          }

          .animate-spin-slow-reverse {
            animation: spin-slow-reverse 25s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  const multiProps = props as MultipleWinnersProps;
  const {
    winners,
    totalPrize,
    individualPrize,
    winnersCount,
    calledNumbers = [],
  } = multiProps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-pink-900/90 backdrop-blur-md overflow-hidden">
      {/* CONFETTI - Gold themed */}
      <div className="absolute inset-0 pointer-events-none">
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="absolute w-3 h-3 rounded-full animate-confetti"
            style={{
              left: c.left,
              animationDelay: c.delay,
              animationDuration: c.duration,
              background:
                i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fcd34d",
            }}
          />
        ))}
      </div>

      {/* SPARKLE RINGS */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-400/10 blur-3xl animate-spin-slow"></div>
      <div className="absolute w-[350px] h-[350px] rounded-full bg-yellow-300/5 blur-2xl animate-spin-slow-reverse"></div>

      {/* MAIN CONTENT */}
      <div className="relative w-[90vw] max-w-md h-[83vh] rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 border-2 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.3)] p-5 flex flex-col justify-between transform hover:scale-[1.02] transition-transform duration-300">
        {/* GLOW EFFECTS */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl"></div>

        {/* HEADER */}
        <div className="text-center relative">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/50 animate-float">
            👑
          </div>

          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 mt-2 tracking-wider">
            BINGO ROYALE
          </h2>

          <p className="text-amber-200/90 text-sm font-semibold tracking-wide">
            🎉 {winnersCount} Champions - {totalPrize.toFixed(2)} ETB Split! 🎉
          </p>
        </div>

        {/* WINNERS LIST */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-900/30 to-purple-900/30 rounded-xl p-4 my-3 border border-amber-400/20 backdrop-blur-sm">
          <h3 className="text-lg font-black text-amber-300 mb-4 text-center tracking-wider">
            🏆 Winners Circle 🏆
          </h3>
          <div className="space-y-3">
            {winners.map((winner, index) => (
              <div
                key={winner.winnerId}
                className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border-2 border-amber-400/30 rounded-xl p-4 hover:border-amber-400/60 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏅</span>
                    <div>
                      <div className="font-bold text-amber-300">
                        {winner.winnerName}
                      </div>
                      <div className="text-xs text-purple-300">
                        🎯 Card #{winner.cardId}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                      +{winner.totalAwarded.toFixed(2)} ETB
                    </div>
                    {winner.bonus > 0 && (
                      <div className="text-xs text-yellow-300 font-semibold">
                        ✨ +{winner.bonus.toFixed(2)} Bonus
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTINUE BUTTON */}
        <button
          onClick={props.onClose}
          className="relative w-full py-3 rounded-xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-indigo-950 shadow-lg shadow-amber-500/50 active:scale-95 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/70 mt-2 overflow-hidden group"
        >
          <span className="relative z-10">✨ Continue to Next Game ✨</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        </button>

        {/* COUNTDOWN */}
        <div className="text-center mt-1">
          <div className="text-amber-300 font-mono font-bold text-lg">
            ⏳ {countdown}s
          </div>

          <div className="h-2 bg-indigo-900/80 rounded-full overflow-hidden mt-1 border border-amber-400/20">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-1000 shadow-lg shadow-amber-500/50"
              style={{ width: `${(countdown / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-10px) rotate(0deg) scale(1); opacity:1 }
          100% { transform: translateY(100vh) rotate(720deg) scale(0); opacity:0 }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-confetti {
          animation: confetti linear infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 25s linear infinite;
        }
      `}</style>
    </div>
  );
};
