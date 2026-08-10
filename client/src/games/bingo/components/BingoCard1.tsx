import { useState, useEffect, useRef } from "react";

interface BingoCardProps {
  cards: Array<{
    id: number;
    numbers: number[];
    markedCells: number[];
  }>;
  calledNumbers: number[];
  onMarkCell: (cardId: number, cellIndex: number) => void;
  autoMark: boolean;
  onToggleAutoMark?: () => void;
  disabled?: boolean;
  winningCells?: number[];
  initialCardId?: number | null;
  onClaimWin?: (cardId: number) => void;
}

const BINGO_LETTERS = ["B", "I", "N", "G", "O"];

const LETTER_GRADIENTS = [
  "from-amber-400 via-yellow-500 to-amber-600",
  "from-blue-400 via-blue-500 to-blue-600",
  "from-pink-400 via-pink-500 to-pink-600",
  "from-emerald-400 via-green-500 to-emerald-600",
  "from-purple-400 via-purple-500 to-purple-600",
];

export const BingoCard = ({
  cards,
  calledNumbers,
  onMarkCell,
  autoMark,
  onToggleAutoMark,
  disabled,
  winningCells = [],
  initialCardId = null,
  onClaimWin,
}: BingoCardProps) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");
  const cardContentRef = useRef<HTMLDivElement | null>(null);

  const currentCard = cards[currentCardIndex];

  useEffect(() => {
    const element = cardContentRef.current;
    if (!element || cards.length <= 1) return;

    const offset = slideDirection === "next" ? 88 : -88;
    element.animate(
      [
        {
          opacity: 0,
          transform: `translateX(${offset}px) scale(0.92)`,
          filter: "blur(1.5px)",
        },
        {
          opacity: 1,
          transform: "translateX(0) scale(1)",
          filter: "blur(0px)",
        },
      ],
      {
        duration: 380,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    );
  }, [currentCardIndex, slideDirection, cards.length]);

  const rowMajorToColMajor = (rowIdx: number) => {
    const row = Math.floor(rowIdx / 5);
    const col = rowIdx % 5;
    return col * 5 + row;
  };

  const isCellCalled = (index: number) => {
    const num = currentCard?.numbers[index];
    return calledNumbers.includes(num);
  };

  const isCellMarked = (index: number) => {
    return currentCard?.markedCells.includes(index);
  };

  const isWinningCell = (index: number) => {
    return winningCells.includes(index);
  };

  const handleCellClick = (cellIndex: number) => {
    if (disabled || autoMark || cellIndex === 12) return;
    if (!isCellCalled(cellIndex)) return;
    onMarkCell(currentCard.id, cellIndex);
  };

  const nextCard = () => {
    setSlideDirection("next");
    setCurrentCardIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setSlideDirection("prev");
    setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  if (!cards.length || !currentCard) return null;

  return (
    <div className="w-full max-w-[220px] mx-auto h-120 mb-4">

      {/* CARD */}
      <div className="relative rounded-xl border border-cyan-400/40 bg-slate-900/90 p-2 shadow-xl">

        {/* LEFT ARROW */}
        {cards.length > 1 && (
          <button
            onClick={prevCard}
            className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black border border-cyan-400/40 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-cyan-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* RIGHT ARROW */}
        {cards.length > 1 && (
          <button
            onClick={nextCard}
            className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black border border-cyan-400/40 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-cyan-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}

        <div ref={cardContentRef} className="will-change-transform">
          {/* HEADER */}
          <div className="grid grid-cols-5 gap-[3px] mb-2 justify-center">
            {BINGO_LETTERS.map((letter, i) => (
              <div
                key={letter}
                className={`flex items-center justify-center text-white font-bold bg-linear-to-br ${LETTER_GRADIENTS[i]} rounded-md`}
                style={{ width: 37, height: 37 }}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* GRID */}
          <div className="grid grid-cols-5 gap-[5px] justify-center">
            {Array.from({ length: 25 }, (_, displayIndex) => {
              const colMajorIndex = rowMajorToColMajor(displayIndex);
              const number = currentCard.numbers[colMajorIndex];

              const isFree = colMajorIndex === 12;
              const marked = isCellMarked(colMajorIndex);
              const called = isCellCalled(colMajorIndex);
              const winning = isWinningCell(colMajorIndex);

              let cellClass = "";
              let textColor = "";

              if (winning) {
                cellClass =
                  "bg-yellow-400 border border-yellow-300 shadow-[0_0_8px_rgba(247,187,9,0.9)]";
                textColor = "text-black";
              } else if (isFree) {
                cellClass = "bg-yellow-300 border border-yellow-400";
                textColor = "text-black";
              } else if (marked || (autoMark && called)) {
                cellClass =
                  "bg-emerald-500 border border-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]";
                textColor = "text-white";
              } else if (called) {
                cellClass =
                  "bg-blue-500 border border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.7)]";
                textColor = "text-white";
              } else {
                cellClass = "bg-slate-800 border border-slate-600";
                textColor = "text-slate-300";
              }

              return (
                <button
                  key={displayIndex}
                  onClick={() => handleCellClick(colMajorIndex)}
                  disabled={disabled || autoMark || isFree || !called}
                  className={`flex items-center justify-center rounded-md ${cellClass} ${textColor} text-xs font-bold`}
                  style={{ width: 35, height: 35 }}
                >
                  {isFree ? "★" : number}
                </button>
              );
            })}
          </div>

          {/* CARD INFO */}
          <div className="flex justify-between items-center font-semibold mt-2 text-[10px] text-slate-400">
            <span>Cartela - {currentCard.id}</span>
            <span>
              {currentCardIndex + 1}/{cards.length}
            </span>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex justify-center items-center gap-3 mt-3">

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoMark}
            onChange={onToggleAutoMark}
            className="hidden"
          />

          <div
            className={`w-10 h-5 rounded-full pt-0.5 ${
              autoMark ? "bg-green-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transform transition ${
                autoMark ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </div>

          <span className="text-xs text-slate-300">
            Auto {autoMark ? "ON" : "OFF"}
          </span>
        </label>

        {!autoMark && onClaimWin && (
          <button
            onClick={() => onClaimWin(currentCard.id)}
            className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-md"
          >
            BINGO
          </button>
        )}
      </div>
    </div>
  );
};