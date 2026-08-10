import { Ticket, Sparkles, X } from "lucide-react";

interface CardConfirmationProps {
  cardId: number;
  numbers: number[];
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export const CardConfirmation = ({
  cardId,
  numbers,
  onConfirm,
  onCancel,
  isConfirming = false,
}: CardConfirmationProps) => {
  const BINGO = ["B", "I", "N", "G", "O"];

  const headerColors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-violet-500",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-blue/10 bg-[#0f0f0f] shadow-[0_25px_60px_rgba(0,0,0,.55)]"
      >
        {/* Top Glow */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-blue-800 to-blue-900" />

        {/* Header */}
        <div className="px-5 pt-5 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
            <Ticket className="h-5 w-5 text-white" />
          </div>

          <h2 className="text-lg font-black tracking-wide text-white/80">
            Ticket #{cardId}
          </h2>


        </div>

        {/* Board */}
        <div className="mx-4 rounded-md border border-green-800 bg-[#111] p-3">

          {/* Letters */}
          <div className="mb-3 grid grid-cols-5 gap-2">
            {BINGO.map((letter, index) => (
              <div
                key={letter}
                className={`${headerColors[index]} flex h-10 items-center justify-center rounded-lg font-black text-white shadow-md`}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }, (_, index) => {
              const row = Math.floor(index / 5);
              const col = index % 5;
              const colMajor = col * 5 + row;

              const isFree = index === 12;

              return (
                <div
                  key={index}
                  className={`relative flex aspect-square items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5
                    ${isFree
                      ? "border-orange-400 bg-gradient-to-br from-orange-500 to-red-500"
                      : "border-neutral-300 bg-white"
                    }`}
                >
                  {/* Shine */}
                  <div className="absolute left-2 top-1 h-2 w-2 rounded-full bg-white/80 blur-[1px]" />

                  {isFree ? (
                    <Sparkles
                      size={18}
                      className="text-white drop-shadow"
                    />
                  ) : (
                    <span className="text-[13px] font-extrabold text-neutral-900">
                      {numbers[colMajor]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5">

          {/* Cancel */}
          <button
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 py-3 text-sm font-semibold text-gray-300 transition hover:bg-neutral-700"
          >
            <X size={16} />
            Cancel
          </button>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all ${isConfirming
              ? "cursor-wait bg-neutral-600"
              : "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:scale-[1.03] hover:shadow-lg hover:shadow-red-500/30 active:scale-95"
              }`}
          >
            {isConfirming ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="opacity-25"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
                  />
                </svg>
                Joining...
              </>
            ) : (
              <>
                <Ticket size={16} />
                Confirm Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};