import { ArrowLeft, Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import { BetSelector } from "./BetSelector";
import { payoutTable } from "./payoutTable";
import { useProfile } from "../../profileContext";
import { playKeno } from "./api";
export const KenoPage: React.FC = () => {
const NUMBERS = 80;
const SLOT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];


  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [bet, setBet] = useState(3);
  const [slot, setSlot] = useState(5);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [animating, setAnimating] = useState(false);
  const drawnNumbersRef = useRef<HTMLDivElement>(null);

  const handleNumberClick = (num: number) => {
    if (animating) return;
    let newSelected;
    if (selectedNumbers.includes(num)) {
      newSelected = selectedNumbers.filter((n) => n !== num);
    } else if (selectedNumbers.length < slot) {
      newSelected = [...selectedNumbers, num];
    } else {
      newSelected = selectedNumbers;
    }
    setSelectedNumbers(newSelected);
    setDrawnNumbers([]);
    setShowResult(false);
  };

  const handleSlotMinus = () => {
    setSlot((prev) => (prev === 1 ? SLOT_OPTIONS[SLOT_OPTIONS.length - 1] : prev - 1));
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setShowResult(false);
  };
  const handleSlotPlus = () => {
    setSlot((prev) => (prev === SLOT_OPTIONS[SLOT_OPTIONS.length - 1] ? 1 : prev + 1));
    setSelectedNumbers([]);
    setDrawnNumbers([]);
    setShowResult(false);
  };

  const { profile, refresh } = useProfile();
  const userBalance = profile?.balance?.currentBalance ?? 0;

  // Sound effect functions
  const playDrawSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const playCompleteSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const canPlay = selectedNumbers.length === slot && !animating && userBalance >= bet;
  const handleStartGame = async () => {
    setShowResult(false);
    setAnimating(true);
    setDrawnNumbers([]);
    try {
      if (userBalance < bet) {
        setAnimating(false);
        alert('Insufficient balance');
        return;
      }
      // Use the API function
      const result = await playKeno(bet, slot, selectedNumbers);
      // Animate drawing numbers one by one from backend result
      result.drawnNumbers.forEach((num: number, idx: number) => {
        setTimeout(() => {
          setDrawnNumbers((prev) => [...prev, num]);
          playDrawSound(); // Play sound for each number
          if (idx === 19) {
            setTimeout(() => {
              setAnimating(false);
              setShowResult(true);
              playCompleteSound(); // Play completion sound
              refresh(); // Refresh user profile/balance
            }, 600);
          }
        }, idx * 120);
      });
    } catch (err: unknown) {
      setAnimating(false);
      if (err instanceof Error) {
        console.error('Failed to play Keno:', err.message);
        alert(`Error: ${err.message}`);
      } else {
        console.error('Failed to play Keno:', String(err));
        alert('Failed to play Keno. Please check your connection.');
      }
    }
  };

  // Scroll to drawn numbers when balls are drawn
  useEffect(() => {
    if (showResult && drawnNumbersRef.current) {
      drawnNumbersRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showResult]);

  // Get payout row for selected slot (spot)
  const payoutRow = payoutTable[slot - 1] || [];

  // Calculate matches and win/loss
  const matches = selectedNumbers.filter((n) => drawnNumbers.includes(n));
  const win = payoutRow[matches.length] ? payoutRow[matches.length] * bet : 0;
  const loss = win - bet;
  console.log({ matches, win, loss });

  return (
    <div className="text-white">
      <Link to='/'>
        <ArrowLeft className="text-sky-400 bg-gray-100 rounded-2xl mb-3" />
      </Link>
      <div className="flex flex-row w-full items-start border-gray-400 border p-1.5 rounded-lg mb-16">
        <div className="grid grid-cols-6 gap-1 mt-0 flex-1  bg-gray-900 rounded-2xl p-3 border border-gray-700 shadow-sm min-h-[510px] relative">
          {/* No overlay for drawn numbers, only border highlight on grid */}
          {/* Number grid */}
          {Array.from({ length: NUMBERS }, (_, i) => i + 1).map((num) => (
            <div
              key={num}
              onClick={() => !animating && handleNumberClick(num)}
              className={`flex items-center justify-center h-8 w-8 rounded-lg cursor-pointer transition-colors text-xs
                ${selectedNumbers.includes(num)
                  ? "bg-sky-600 text-white border-2 border-sky-300"
                  : "bg-gray-800 hover:bg-sky-600"}
                ${drawnNumbers.includes(num) ? (selectedNumbers.includes(num) ? "ring-2 ring-green-400" : "ring-2 ring-yellow-300") : ""}
                ${animating ? "pointer-events-none opacity-60" : ""}
              `}
            >
              {num}
            </div>
          ))}
        </div>
        <div className="border border-gray-300 p-3 rounded min-w-[70px] max-w-[120px] flex flex-col items-center bg-white shadow-sm min-h-[518px]">
  <div className="flex flex-col gap-3 w-full mb-3 ">
    <div className="flex items-center gap-1 w-full justify-center">
      <BetSelector
        bet={bet}
        setBet={(newBet: number) => {
          setBet(newBet);
          setDrawnNumbers([]);
          setShowResult(false);
        }}
      />
    </div>
    <div className="flex items-center justify-between w-full px-1">
      <button 
        onClick={handleSlotMinus} 
        className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs w-6 h-6 flex items-center justify-center border border-gray-300"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="text-xs font-medium text-gray-700">{slot} Slots</span>
      <button 
        onClick={handleSlotPlus} 
        className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs w-6 h-6 flex items-center justify-center border border-gray-300"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
  
  <div className="font-semibold mb-2 text-xs text-gray-800 tracking-wide uppercase">Payout Table</div>
  
  <table className="table-auto border-collapse w-full text-xs">
    <thead>
      <tr className="bg-gray-50">
        <th className="border border-gray-200 px-1 py-1.5 text-gray-600 font-medium">Match</th>
        <th className="border border-gray-200 px-1 py-1.5 text-gray-600 font-medium">Win</th>
      </tr>
    </thead>
    <tbody>
      {payoutRow.map((p, idx) => {
        // For slot > 6, hide non-winning matches (p === 0)
        if (slot > 6 && p === 0) return null;
        return (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="border border-gray-200 px-1 py-1.5 text-center text-gray-700">{idx}</td>
            <td className="border border-gray-200 px-1 py-1.5 text-center font-medium text-gray-800">
              {p > 0 ? `${p * bet}` : "-"}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
  <div className="mt-3 mb-2 text-xs text-gray-600 w-full">
    <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Selected</div>
    <div className="min-h-5 text-gray-800 font-medium wrap-break-words">
      {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "None"}
    </div>
  </div>

  <div className="w-full flex justify-center items-center py-4">
    <button
      className="w-full max-w-xs px-8 py-2 text-sm font-bold rounded-xl bg-linear-to-r from-pink-400 via-pink-500 to-red-500 text-white shadow-xl border-2 border-white animate-pulse hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={handleStartGame}
      disabled={!canPlay}
    >
      {animating ? "Drawing..." : "PLAY KENO"}
    </button>
    {!animating && selectedNumbers.length === slot && userBalance < bet && (
      <div className="text-red-600 text-xs mt-2 text-center">Insufficient balance</div>
    )}
  </div>
</div>
      </div>
      {/* Drawn numbers below all elements */}
      <div ref={drawnNumbersRef} className="w-full flex flex-col items-center mt-8">
        {drawnNumbers.length > 0 && (
          <>
            <div className="text-xs text-gray-400 mb-1">Drawn Numbers</div>
            <div className="flex flex-row flex-wrap justify-center gap-2 w-full">
              {drawnNumbers.map((num, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-base shadow transition-all duration-300
                    ${selectedNumbers.includes(num) ? "bg-green-500 text-white border-2 border-green-300 scale-110" : "bg-yellow-300 text-gray-900 border-2 border-yellow-400"}
                    animate-slide-in-left"
                  `}
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {num}
                </span>
              ))}
            </div>
            {showResult && (
              <div className="w-full flex flex-col mb-4 items-center animate-fade-in mt-4">
                <div className="text-lg font-bold mb-2">
                  You matched <span className="text-green-500">{matches.length}</span>!
                </div>
                <div className={`text-base font-bold px-4 py-2 rounded-lg shadow-lg ${win > 0 ? "bg-green-600 text-white animate-bounce" : "bg-red-600 text-white animate-shake"}`}>
                  {win > 0 ? (
                    <>
                      🎉 You win 
                    </>
                  ) : (
                    <>
                      😢 You lost 
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
