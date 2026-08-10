import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import TicketList from './TicketList';
import { LotteryWinnersDisplay } from './LotteryWinnersDisplay';
import { LotteryDrawingDisplay } from './LotteryDrawingDisplay';
import { useProfile } from '../../profileContext';
import { Link } from 'react-router-dom';

declare global {
  interface Window {
    profileContext?: {
      profile?: { id?: string | number };
      refresh?: () => void;
    };
  }
}

type Lottery = {
  id: number;
  drawDate: string;
  stake: number;
  jackpot: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  totalTickets: number;
  availableTickets?: number;
  status?: string;
  drawTime?: string;
};

type CountdownLottery = Lottery & {
  timeRemaining: number;
};

export const LotteryPage = () => {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLottery, setSelectedLottery] = useState<Lottery | null>(null);
  const [countdowns, setCountdowns] = useState<{ [key: number]: number }>({});
  const { userId, refresh } = useProfile();

  // Format countdown time
  const formatCountdown = (milliseconds: number) => {
    if (milliseconds <= 0) return 'Withdrawal Ready';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const apiUrl =
      import.meta.env.VITE_API_BASE ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    fetch(`${apiUrl}/api/lottery`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch lotteries');
        return res.json();
      })
      .then((data) => {
        setLotteries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching lotteries');
        setLoading(false);
      });
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const newCountdowns: { [key: number]: number } = {};
      
      lotteries.forEach(lottery => {
        if (lottery.status === 'PAID' && lottery.drawTime) {
          const drawTime = new Date(lottery.drawTime).getTime();
          const remaining = drawTime - now;
          newCountdowns[lottery.id] = remaining;
        }
      });
      
      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [lotteries]);

  // Sort lotteries from higher stake to lower
  const sortedLotteries = [...lotteries].sort((a, b) => b.stake - a.stake);

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      {!selectedLottery ? (
        <>
         <div className="relative overflow-hidden rounded-2xl">
  <div className="absolute -top-4  w-20 h-20  rounded-full" 
       style={{filter: 'blur(20px)'}}></div>
  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-linear-to-tr from-indigo-400/10 to-purple-500/10 rounded-full"
       style={{filter: 'blur(20px)'}}></div>
  
  <div className="relative flex justify-between items-center">
    {/* Back Button - Enhanced */}
    <Link to='/'>
      <div className="group relative">
        <div className="relative flex items-center justify-center w-12 h-12  rounded-2xl border border-blue-200 shadow-sm group-hover:shadow-md group-hover:border-sky-300 transition-all duration-300">
          <ArrowLeft 
            size={24} 
            className="text-white group-hover:text-blue-600 transition-colors duration-300"
          />
        </div>
      </div>
    </Link>

    {/* Title with linear */}
    <div className="text-center flex-1 px-4">
      <div className="relative inline-block">
        <h2 className="text-3xl font-bold bg-linear-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Lottery List
        </h2>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-linear-to-r from-sky-400 to-blue-500 rounded-full"></div>
      </div>
     
    </div>

    {/* Right side decorative element */}
    <div className="w-12 opacity-0">
      {/* Invisible spacer for balance */}
    </div>
  </div>

  {/* Animated dots indicator */}
  <div className="mt-6 flex justify-center items-center space-x-2">
    <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
  </div>
</div>
          {loading ? (
            <div className="text-slate-300">Loading lotteries...</div>
          ) : error ? (
            <div className="text-red-400">{error} .</div>
          ) : (
            <div className="grid gap-6 mx-3">
              {sortedLotteries.map((lottery) => (
                <button
                  key={lottery.id}
                  className="rounded-xl border-2 border-purple-500/30 bg-linear-to-br from-slate-900/90 via-gray-900/80 to-black-900/90 backdrop-blur-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-xl hover:shadow-purple-500/20 hover:border-purple-400/50 transition-all duration-300 text-left w-full"
                  onClick={() => setSelectedLottery(lottery)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-400 pb-3">
                      <h3 className="text-gray-200">
                        መውጫ ቀን: <span >{lottery.drawDate}</span>
                      </h3>
                      <div className="text-sm font-medium text-slate-400">
                        <span className="text-green-400">{lottery.availableTickets}</span>/<span className="text-white">{lottery.totalTickets}</span> tickets
                        {lottery.status === 'PAID' && countdowns[lottery.id] > 0 && (
                          <span className="ml-2 text-yellow-400">
                            ⏰ {formatCountdown(countdowns[lottery.id])}
                          </span>
                        )}
                        {lottery.status === 'PAID' && countdowns[lottery.id] <= 0 && (
                          <span className="ml-2 text-orange-400">
                            ⏰ Awaiting Draw
                          </span>
                        )}
                        {lottery.status === 'completed' && (
                          <span className="ml-2 text-green-400">
                            ✅ Drawing Completed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">1</span>
                          </div>
                          <span className="text-slate-300">አንደኛ እጣ</span>
                        </div>
                        <span className="text-lg font-bold text-emerald-400">
                          {lottery.firstPrize.toLocaleString()} ETB
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">2</span>
                          </div>
                          <span className="text-slate-300">ሁለተኛ እጣ</span>
                        </div>
                        <span className="text-lg font-bold text-blue-400">
                          {lottery.secondPrize.toLocaleString()} ETB
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">3</span>
                          </div>
                          <span className="text-slate-300">ሶስተኛ እጣ</span>
                        </div>
                        <span className="text-lg font-bold text-amber-400">
                          {lottery.thirdPrize.toLocaleString()} ETB
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full mt-4 sm:mt-0">
                    <div className="text-lg font-bold text-yellow-400 bg-linear-to-r from-yellow-400/20 to-yellow-600/10 px-3 py-2 rounded-lg border border-yellow-500/30">
                      መደብ: <span className="text-white ml-1">{lottery.stake} ETB</span>
                    </div>
                    
                    <button 
                      className={`px-2 py-3 font-bold rounded-lg transition-all duration-200 shadow-lg active:scale-95 ${
                        lottery.status === 'PAID' && countdowns[lottery.id] <= 0
                          ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                          : lottery.status === 'completed'
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-linear-to-r from-yellow-500 to-yellow-600 text-slate-900 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-yellow-500/25'
                      }`}
                      disabled={lottery.status === 'PAID' && countdowns[lottery.id] <= 0 || lottery.status === 'completed'}
                    >
                      {lottery.status === 'PAID' && countdowns[lottery.id] <= 0
                        ? 'Drawing in Progress'
                        : lottery.status === 'completed'
                        ? 'መውጫ ተጠናቋል'
                        : 'ይቁረጡ'
                      }
                    </button>
                  </div>
                  
                  {/* Show live drawing for PAID lotteries when countdown ends */}
                  {lottery.status === 'PAID' && countdowns[lottery.id] <= 0 && (
                    <LotteryDrawingDisplay lotteryId={String(lottery.id)} />
                  )}
                  
                  {/* Show winners for completed lotteries */}
                  {lottery.status === 'completed' && (
                    <div className="mt-4 p-4 bg-linear-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-500/30">
                      <h4 className="text-green-400 font-bold mb-2">🎉 አሸናፊዎች ተነግረዋል!</h4>
                      <LotteryWinnersDisplay />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <TicketList
          lotteryId={String(selectedLottery.id)}
          onBack={() => setSelectedLottery(null)}
          stake={selectedLottery.stake}
          onBuy={async (selected, refreshTickets) => {
            if (!selectedLottery) return;
            if (!userId) {
              alert('User ID not found. Please log in.');
              return;
            }
            const apiUrl =
              import.meta.env.VITE_API_BASE ||
              (typeof window !== 'undefined' ? window.location.origin : '');
            try {
              const res = await fetch(`${apiUrl}/api/lottery/${selectedLottery.id}/buy-tickets`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId,
                  ticketNumbers: selected,
                }),
              });
              let data: unknown = null;
              try {
                data = await res.json();
              } catch {
                data = null;
              }

              const payload = data as { success?: boolean; error?: string } | null;
              if (res.ok && payload?.success) {
                alert('Tickets purchased successfully!');
                refreshTickets();
                refresh();
              } else {
                const msg = payload?.error
                  ? `${payload.error} (HTTP ${res.status})`
                  : `Failed to purchase tickets (HTTP ${res.status})`;
                alert(msg);
              }
             } catch (err: unknown) {
               const errorMessage =
                 err && typeof err === 'object' && 'message' in err
                   ? String((err as { message?: string }).message)
                   : String(err);
               alert('Error buying tickets: ' + errorMessage);
             }
           }}
         />
      )}
    </div>
  );
};