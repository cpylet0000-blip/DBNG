import { Plus, Minus } from "lucide-react";
import type { BetSelectorProps } from "./types";

const betOptions = [3, 5, 10, 15, 20, 25];

export const BetSelector = ({ bet, setBet }: BetSelectorProps) => {
  const betIndex = betOptions.indexOf(bet);
  const handleMinus = () => {
    setBet(betOptions[betIndex === 0 ? betOptions.length - 1 : betIndex - 1]);
  };
  const handlePlus = () => {
    setBet(betOptions[betIndex === betOptions.length - 1 ? 0 : betIndex + 1]);
  };
  return (
    <div className="flex items-center gap-1">
      <button onClick={handleMinus} className="p-1 bg-sky-600 rounded-full">
        <Minus />
      </button>
      <span className="text-xs font-semibold text-green-400">{bet} birr</span>
      <button onClick={handlePlus} className="p-1  rounded-full bg-sky-600">
        <Plus />
      </button>
    </div>
  );
};