import * as React from "react";

type BubbleShape = "star" | "circle" | "diamond";

type CelebrationParticle = {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: string;
  color: string;
  shape: BubbleShape;
};

const createParticles = (count: number): CelebrationParticle[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${Math.random() * 100}%`,
    top: `${-15 - Math.random() * 20}%`,
    delay: `${Math.random() * 2.2}s`,
    duration: `${2.4 + Math.random() * 2.6}s`,
    size: `${8 + Math.random() * 16}px`,
    color: ["#22d3ee", "#f472b6", "#facc15", "#a78bfa", "#fb923c"][index % 5],
    shape: [
      "star" as BubbleShape,
      "circle" as BubbleShape,
      "diamond" as BubbleShape,
    ][index % 3],
  }));

const CELEBRATION_PARTICLES = createParticles(84);

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
  const { onClose } = props;

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
      onClose();
    }, 6000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [onClose]);

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
      return "bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 text-slate-950 ring-2 ring-cyan-300 shadow-lg shadow-amber-400/40";
    if (isWinning)
      return "bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white ring-2 ring-cyan-300 shadow-lg shadow-cyan-400/50 animate-pulse";
    if (isCalled)
      return "bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-white shadow-md shadow-fuchsia-400/30";
    return "bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200";
  };

  const getParticleStyle = (particle: CelebrationParticle) => {
    if (particle.shape === "diamond") {
      return {
        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
        borderRadius: "0px",
      };
    }

    if (particle.shape === "star") {
      return {
        clipPath:
          "polygon(50% 0%, 61% 35%, 100% 35%, 68% 57%, 79% 100%, 50% 78%, 21% 100%, 32% 57%, 0% 35%, 39% 35%)",
        borderRadius: "0px",
      };
    }

    return {
      borderRadius: "9999px",
      clipPath: "none",
    };
  };

  const renderBackground = () => (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.22), transparent 28%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.18), transparent 28%), radial-gradient(circle at 50% 100%, rgba(250,204,21,0.16), transparent 40%), linear-gradient(135deg, #040816 0%, #111827 45%, #1f1d4d 100%)",
        }}
      />
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-fuchsia-400/15 blur-3xl" />
      <div className="absolute left-6 top-10 text-3xl animate-bounce-slow">
        💥
      </div>
      <div className="absolute right-6 top-10 text-3xl animate-spin-slow">
        🌙
      </div>
    </div>
  );

  if (!isMultipleWinners) {
    const singleProps = props as SingleWinnerProps;
    const { winnerName, cardId, cardNumbers, prize, winningCells } =
      singleProps;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md overflow-hidden">
        {renderBackground()}

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {CELEBRATION_PARTICLES.map((particle) => (
            <span
              key={particle.id}
              className="absolute block animate-celebration-bubble"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                background: particle.color,
                opacity: 0.95,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                ...getParticleStyle(particle),
              }}
            />
          ))}
        </div>

        <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-400/10 blur-3xl animate-spin-slow" />
        <div className="absolute w-[320px] h-[320px] rounded-full bg-fuchsia-400/10 blur-3xl animate-spin-slow-reverse" />

        <div className="relative w-[85vw] max-w-sm h-[83vh] rounded-[28px] border-2 border-cyan-300/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 shadow-[0_0_60px_rgba(34,211,238,0.35)] p-4 flex flex-col justify-between">
          <div className="text-center relative">
            <div className="mx-auto w-14 h-14 rounded-full border-2 border-cyan-300 bg-gradient-to-br from-cyan-300 via-sky-400 to-fuchsia-400 flex items-center justify-center text-3xl shadow-xl shadow-cyan-400/40 animate-float">
              ✨
            </div>

            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-green-500 to-green-600 mt-2 tracking-[0.25em]">
              BOOM BINGO
            </h2>

            <p className="text-red-500 text-sm font-semibold tracking-wide">
              🌙 Congratulation 🌙
            </p>
          </div>

          <div className="flex justify-between items-center bg-slate-900/70 border border-cyan-400/30 rounded-2xl px-3 py-2 mt-2 mb-1 backdrop-blur-sm">
            <div>
              <div className="font-semibold text-sm text-white">
                {winnerName}
              </div>
              <div className="text-xs text-pink-400">Cartela - {cardId}</div>
            </div>

            <div className="text-lg font-black text-transparent text-green-700 bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
              +{prize.toFixed(2)} ETB
            </div>
          </div>

          <div className="mx-auto w-[260px] rounded-2xl p-2.5 bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-cyan-400/40 shadow-inner">
            <div className="grid grid-cols-5 gap-1 mb-1.5">
              {["B", "I", "N", "G", "O"].map((l) => (
                <div
                  key={l}
                  className="aspect-square flex items-center border border-amber-300 justify-center text-xs font-black rounded-lg bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 text-slate-950"
                >
                  {l}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 25 }, (_, rowMajorIndex) => {
                const row = Math.floor(rowMajorIndex / 5);
                const col = rowMajorIndex % 5;
                const colMajorIndex = col * 5 + row;
                const cellNumber = cardNumbers[colMajorIndex];
                const isFree = colMajorIndex === 12;

                return (
                  <div
                    key={rowMajorIndex}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[16px] font-bold ${getCellClass(colMajorIndex, cellNumber, winningCells)}`}
                  >
                    {isFree ? "★" : cellNumber}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={props.onClose}
            className="w-full py-2.5 rounded-2xl text-sm font-black bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 text-slate-900 shadow-lg shadow-cyan-400/40 active:scale-95 transition mt-2"
          >
            ✨ Continue to Next Game ✨
          </button>

          <div className="text-center">
            <div className="text-red-500 font-mono font-bold">{countdown}s</div>

            <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden mt-3 border border-cyan-400/20">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 transition-all duration-1000"
                style={{ width: `${(countdown / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes celebration-bubble {
            0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 0.9 }
            100% { transform: translateY(115vh) scale(1.15) rotate(720deg); opacity: 0 }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) }
            50% { transform: translateY(-10px) }
          }

          @keyframes spin-slow {
            from { transform: rotate(0deg) }
            to { transform: rotate(360deg) }
          }

          @keyframes spin-slow-reverse {
            from { transform: rotate(360deg) }
            to { transform: rotate(0deg) }
          }

          .animate-celebration-bubble {
            animation: celebration-bubble linear infinite;
          }

          .animate-float {
            animation: float 2.8s ease-in-out infinite;
          }

          .animate-spin-slow {
            animation: spin-slow 22s linear infinite;
          }

          .animate-spin-slow-reverse {
            animation: spin-slow-reverse 26s linear infinite;
          }

          .animate-bounce-slow {
            animation: bounce 2.8s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  const multiProps = props as MultipleWinnersProps;
  const { winners, totalPrize, winnersCount } = multiProps;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md overflow-hidden">
      {renderBackground()}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CELEBRATION_PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="absolute block animate-celebration-bubble"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              background: particle.color,
              opacity: 0.95,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              ...getParticleStyle(particle),
            }}
          />
        ))}
      </div>

      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-400/10 blur-3xl animate-spin-slow" />
      <div className="absolute w-[320px] h-[320px] rounded-full bg-fuchsia-400/10 blur-3xl animate-spin-slow-reverse" />

      <div className="relative w-[90vw] max-w-md h-[83vh] rounded-[28px] border-2 border-cyan-300/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 shadow-[0_0_60px_rgba(34,211,238,0.35)] p-4 flex flex-col justify-between">
        <div className="text-center relative">
          <div className="mx-auto w-14 h-14 rounded-full border-2 border-cyan-300 bg-gradient-to-br from-cyan-300 via-sky-400 to-fuchsia-400 flex items-center justify-center text-3xl shadow-xl shadow-cyan-400/40 animate-float">
            🏆
          </div>

          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-fuchsia-300 mt-2 tracking-[0.25em]">
            BINGO BOOM
          </h2>

          <p className="text-cyan-100/90 text-sm font-semibold tracking-wide">
            🌙 {winnersCount} Champions - {totalPrize.toFixed(2)} ETB Split 🌙
          </p>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-900/45 rounded-2xl p-3 my-3 border border-cyan-400/20 backdrop-blur-sm">
          <h3 className="text-lg font-black text-cyan-200 mb-3 text-center tracking-[0.2em]">
            ✨ Winners Circle ✨
          </h3>
          <div className="space-y-2">
            {winners.map((winner, index) => (
              <div
                key={winner.winnerId}
                className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-cyan-400/25 rounded-2xl p-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {index === 0 ? "⭐" : index === 1 ? "💫" : "🌙"}
                    </span>
                    <div>
                      <div className="font-semibold text-cyan-100">
                        {winner.winnerName}
                      </div>
                      <div className="text-xs text-fuchsia-300">
                        Cartela - {winner.cardId}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-300">
                      +{winner.totalAwarded.toFixed(2)} ETB
                    </div>
                    {winner.bonus > 0 && (
                      <div className="text-xs text-amber-300 font-semibold">
                        +{winner.bonus.toFixed(2)} Bonus
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={props.onClose}
          className="w-full py-2.5 rounded-2xl text-sm font-black bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 text-slate-900 shadow-lg shadow-cyan-400/40 active:scale-95 transition"
        >
          ✨ Continue to Next Game ✨
        </button>

        <div className="text-center">
          <div className="text-cyan-200 font-mono font-bold">{countdown}s</div>

          <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden mt-1 border border-cyan-400/20">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-500 transition-all duration-1000"
              style={{ width: `${(countdown / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes celebration-bubble {
          0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 0.9 }
          100% { transform: translateY(115vh) scale(1.15) rotate(720deg); opacity: 0 }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) }
          50% { transform: translateY(-10px) }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg) }
          to { transform: rotate(360deg) }
        }

        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg) }
          to { transform: rotate(0deg) }
        }

        .animate-celebration-bubble {
          animation: celebration-bubble linear infinite;
        }

        .animate-float {
          animation: float 2.8s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 22s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 26s linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce 2.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
