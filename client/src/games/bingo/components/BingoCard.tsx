import { div } from "framer-motion/client";
import { useState, useEffect } from "react";

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
  onClaimWin?: (cardId: number) => void;
}

const BINGO_LETTERS = ["B", "I", "N", "G", "O"];

const LETTER_COLORS = [
  "bg-blue-500",
  "bg-pink-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-red-500",
];

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
  onClaimWin,
}: BingoCardProps) => {
  // Sort cards by ID to ensure consistent positioning
  const sortedCards = [...cards].sort((a, b) => a.id - b.id);
  const cardCount = sortedCards.length;

  const rowMajorToColMajor = (rowIdx: number) => {
    const row = Math.floor(rowIdx / 5);
    const col = rowIdx % 5;
    return col * 5 + row;
  };

  const isCellCalled = (card: (typeof cards)[0], index: number) => {
    const num = card?.numbers[index];
    return calledNumbers.includes(num);
  };

  const isCellMarked = (card: (typeof cards)[0], index: number) => {
    return card?.markedCells.includes(index);
  };

  const isWinningCell = (index: number) => {
    return winningCells.includes(index);
  };

  const handleCellClick = (cardId: number, cellIndex: number) => {
    if (disabled || autoMark) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const num = card.numbers[cellIndex];
    if (!calledNumbers.includes(num)) return;
    if (cellIndex === 12) return; // Free space

    onMarkCell(cardId, cellIndex);
  };

  // ---------- No cards selected -----------
  if (!cards.length) {
    return (
      <div className="flex justify-center h-[50vh] mt-4">
        <div className="relative">
          {/* CARD (LESS BLUR + MORE VISIBLE) */}
          <div
            className="relative rounded-xl border border-yellow-400/40 
                        bg-slate-900 px-3 py-3 shadow-xl 
                        opacity-90 blur-[0.5px]"
          >
            {/* HEADER */}
            <div className="grid grid-cols-5 mb-2 gap-[5px] justify-center">
              {BINGO_LETTERS.map((letter, i) => (
                <div
                  key={letter}
                  className={`
                  flex items-center justify-center 
                  text-white font-extrabold rounded-md text-sm
                  bg-gradient-to-br ${LETTER_GRADIENTS[i]}
                  shadow-md
                `}
                  style={{ width: 36, height: 36 }}
                >
                  {letter}
                </div>
              ))}
            </div>

            {/* EMPTY GRID */}
            <div className="grid grid-cols-5 gap-[5px] justify-center">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-md 
                           bg-slate-800 border border-slate-700"
                  style={{ width: 34, height: 34 }}
                />
              ))}
            </div>
          </div>

          {/* OVERLAY TEXT */}
          <div className="absolute inset-0 flex items-center justify-center text-center px-4 -mt-14">
            <p
              className="text-orange-600 font-semibold text-xs 
                        bg-black/60 px-3 py-1.5 rounded-md backdrop-blur-sm"
            >
              ካርቴላ አልመረጡም! <br />
              ለቀጣይ ዙር ይምረጡ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- SINGLE CARD VIEW ----------
  if (cardCount === 1) {
    const card = sortedCards[0];
    return (
      <div className="w-full flex flex-col items-center justify-start h-full">
        {/* AUTO MARK TOGGLE */}
        {/* <div className="flex justify-center items-center mb-2">
          <span className="text-xs text-slate-300">
            Auto{autoMark ? "ON" : "OFF"}
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoMark}
              onChange={onToggleAutoMark}
              className="hidden"
            />
            <div
              className={`w-10 h-5 rounded-full pt-0.5 ${autoMark ? "bg-green-500" : "bg-slate-700"
                }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transform transition ${autoMark ? "translate-x-5" : "translate-x-1"
                  }`}
              />
            </div>

          </label>
        </div> */}
        {/* SINGLE LARGE CARD */}
        <div className=" ">
          <div className="relative rounded-xl border-2 border-blue-500 bg-slate-900 px-2.5 py-2.5 shadow-2xl ">
            {/* Card ID Badge */}

            {/* HEADER - Smaller */}
            <div className="grid grid-cols-5 mb-1.5 gap-[5px] justify-center ">
              {BINGO_LETTERS.map((letter, i) => (
                <div
                  key={letter}
                  className={`flex items-center justify-center text-white font-semibold ${LETTER_COLORS[i]} rounded-md text-base`}
                  style={{ width: 28, height: 28 }}
                >
                  {letter}
                </div>
              ))}
            </div>

            {/* GRID - Smaller cells */}
            <div className="grid grid-cols-5 gap-[3px] justify-center">
              {Array.from({ length: 25 }, (_, displayIndex) => {
                const colMajorIndex = rowMajorToColMajor(displayIndex);
                const number = card.numbers[colMajorIndex];

                const isFree = colMajorIndex === 12;
                const marked = isCellMarked(card, colMajorIndex);
                const called = isCellCalled(card, colMajorIndex);
                const winning = isWinningCell(colMajorIndex);

                let cellClass = "";
                let textColor = "";

                // if (winning) {
                //   cellClass =
                //     "bg-yellow-400 border-2 border-yellow-300 shadow-[0_0_10px_rgba(247,187,9,0.9)]";
                //   textColor = "text-black";
                // } else
                if (isFree) {
                  cellClass = "bg-yellow-300 border-[1px] border-yellow-400";
                  textColor = "text-black";
                } else if (marked || (autoMark && called)) {
                  cellClass =
                    "bg-emerald-500 border-[1px] border-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]";
                  textColor = "text-white";
                } else if (called) {
                  cellClass =
                    "bg-blue-500 border-[1px] border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.7)]";
                  textColor = "text-white";
                } else {
                  cellClass = "bg-slate-900 border-[1px] border-slate-700 ";
                  textColor = "text-slate-400";
                }

                return (
                  <button
                    key={displayIndex}
                    onClick={() => handleCellClick(card.id, colMajorIndex)}
                    disabled={disabled || autoMark || isFree || !called}
                    className={`flex items-center justify-center rounded-md ${cellClass} ${textColor} font-bold text-base transition-transform hover:scale-105`}
                    style={{ width: 28, height: 28 }}
                  >
                    {isFree ? "★" : number}
                  </button>
                );
              })}
            </div>

            {/* CLAIM BINGO BUTTON - Large for single card */}
            {!autoMark && onClaimWin && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => onClaimWin(card.id)}
                  className="px-6 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-md font-bold rounded-full shadow-lg hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105"
                >
                  🎉 BINGO! 🎉
                </button>
              </div>
            )}

            <div className="absolute -bottom-[26px] left-1/2 transform -translate-x-1/2  text-slate-400 text-sm font-bold shadow-lg">
              Cartela - <span className="text-green-500">{card.id}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- MULTIPLE CARDS VIEW ----------
  // ---------- MULTIPLE CARDS VIEW ----------
  const getCardProps = (index: number, count: number) => {
    if (count === 2) {
      return {
        letterSize: 28,
        letterText: "text-sm",
        cellSize: 26,
        cellText: "text-sm",
        gapClass: "gap-[4px]",
        headerGapClass: "gap-[4px]",
        colSpanClass: "col-span-1",
      };
    }
    if (count === 3) {
      return {
        letterSize: 18,
        letterText: "text-[10px]",
        cellSize: 16,
        cellText: "text-[10px]",
        gapClass: "gap-[2px]",
        headerGapClass: "gap-[2px]",
        colSpanClass: "col-span-1",
      };
    }
    if (count === 4) {
      if (index === 0 || index === 1) {
        return {
          letterSize: 14,
          letterText: "text-[8px]",
          cellSize: 12,
          cellText: "text-[8px]",
          gapClass: "gap-[1px]",
          headerGapClass: "gap-[1px]",
          colSpanClass: "col-span-1",
        };
      }
      return {
        letterSize: 18,
        letterText: "text-[10px]",
        cellSize: 16,
        cellText: "text-[10px]",
        gapClass: "gap-[2px]",
        headerGapClass: "gap-[2px]",
        colSpanClass: "col-span-2",
      };
    }
    if (count === 5) {
      if (index === 4) {
        return {
          letterSize: 16,
          letterText: "text-[9px]",
          cellSize: 14,
          cellText: "text-[9px]",
          gapClass: "gap-[2px]",
          headerGapClass: "gap-[2px]",
          colSpanClass: "col-span-2",
        };
      }
      return {
        letterSize: 14,
        letterText: "text-[8px]",
        cellSize: 12,
        cellText: "text-[8px]",
        gapClass: "gap-[1px]",
        headerGapClass: "gap-[1px]",
        colSpanClass: "col-span-1",
      };
    }
    return {
      letterSize: 14,
      letterText: "text-[8px]",
      cellSize: 12,
      cellText: "text-[8px]",
      gapClass: "gap-[1px]",
      headerGapClass: "gap-[1px]",
      colSpanClass: "col-span-1",
    };
  };

  const shouldRenderDivider = (index: number, count: number) => {
    if (index === 0) return false;
    if (count === 2 || count === 3) return true;
    if (count === 4) return index === 2 || index === 3;
    if (count === 5) return index === 2 || index === 4;
    return index % 2 === 0;
  };

  let gridColsClass = "grid-cols-2 gap-2";
  if (cardCount === 2) gridColsClass = "grid-cols-1 gap-4";
  else if (cardCount === 3) gridColsClass = "grid-cols-1 gap-2";

  return (
    <div className="w-full overflow-auto h-full ">
      {/* AUTO MARK TOGGLE */}
      {/* <div className="flex justify-center items-center mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoMark}
            onChange={onToggleAutoMark}
            className="hidden"
          />
          <div
            className={`w-10 h-5 rounded-full pt-0.5 ${autoMark ? "bg-green-500" : "bg-slate-700"
              }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transform transition ${autoMark ? "translate-x-5" : "translate-x-1"
                }`}
            />
          </div>
          <span className="text-xs text-slate-300">
            Auto Mark {autoMark ? "ON" : "OFF"}
          </span>
        </label>
      </div> */}

      {/* MULTIPLE CARDS GRID */}
      <div
        className={`grid ${gridColsClass} justify-items-center h-full content-between w-full`}
      >
        {sortedCards.map((card, index) => {
          const {
            letterSize,
            letterText,
            cellSize,
            cellText,
            gapClass,
            headerGapClass,
            colSpanClass,
          } = getCardProps(index, cardCount);
          return (
            <div key={card.id} className="contents">
              {shouldRenderDivider(index, cardCount) && (
                <div
                  className={`${cardCount > 3 ? "col-span-2" : ""} w-3/4 border-t-2 border-slate-700/60 rounded-full my-auto mx-auto`}
                />
              )}
              <div
                className={`w-full flex flex-col items-center ${colSpanClass}`}
              >
                <div className="relative rounded-xl border border-blue-500 bg-slate-900 p-1.5 shadow-2xl">
                  {/* HEADER */}
                  <div
                    className={`grid grid-cols-5 ${headerGapClass} mb-1 justify-center`}
                  >
                    {BINGO_LETTERS.map((letter, i) => (
                      <div
                        key={letter}
                        className={`flex items-center justify-center text-white font-bold ${LETTER_COLORS[i]} rounded-[4px] ${letterText}`}
                        style={{ width: letterSize, height: letterSize }}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>

                  {/* GRID CELLS */}
                  <div
                    className={`grid grid-cols-5 ${gapClass} justify-center`}
                  >
                    {Array.from({ length: 25 }, (_, displayIndex) => {
                      const colMajorIndex = rowMajorToColMajor(displayIndex);
                      const number = card.numbers[colMajorIndex];

                      const isFree = colMajorIndex === 12;
                      const marked = isCellMarked(card, colMajorIndex);
                      const called = isCellCalled(card, colMajorIndex);
                      const winning = isWinningCell(colMajorIndex);

                      let cellClass = "";
                      let textColor = "";

                      if (isFree) {
                        cellClass = "bg-yellow-300 border border-yellow-400";
                        textColor = "text-black";
                      } else if (marked || (autoMark && called)) {
                        cellClass =
                          "bg-emerald-500 border border-emerald-400 shadow-[0_0_4px_rgba(34,197,94,0.8)]";
                        textColor = "text-white";
                      } else if (called) {
                        cellClass =
                          "bg-blue-500 border border-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.7)]";
                        textColor = "text-white";
                      } else {
                        cellClass = "bg-slate-800 border border-slate-600";
                        textColor = "text-slate-300";
                      }

                      return (
                        <button
                          key={displayIndex}
                          onClick={() =>
                            handleCellClick(card.id, colMajorIndex)
                          }
                          disabled={disabled || autoMark || isFree || !called}
                          className={`flex items-center justify-center rounded-sm ${cellClass} ${textColor} font-bold ${cellText}`}
                          style={{ width: cellSize, height: cellSize }}
                        >
                          {isFree ? "★" : number}
                        </button>
                      );
                    })}
                  </div>

                  {/* CLAIM BINGO BUTTON */}
                  {!autoMark && onClaimWin && (
                    <button
                      onClick={() => onClaimWin(card.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg hover:bg-yellow-400"
                      title="Claim BINGO!"
                    >
                      🏆
                    </button>
                  )}
                </div>
                {/* CARD INFO */}
                <div className="flex relative justify-center items-center font-semibold -mt-2 text-[8px] text-slate-300 z-10 bg">
                  {/* <span>Cartela - </span> */}
                  <span className="text-[10px] text-black font-bold bg-amber-300/90 w-4 h-4 flex items-center justify-center rounded-full">
                    {" "}
                    {card.id}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
