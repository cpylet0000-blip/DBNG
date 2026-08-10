import { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Ticket, Crown, Medal, Award } from 'lucide-react';

interface Winner {
  id: number;
  lotteryId: number;
  userId: number;
  ticketNumber: number;
  prizePosition: number;
  prizeAmount: number;
  prizeName: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

interface Lottery {
  id: number;
  drawDate: string;
  stake: number;
  jackpot: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  totalTickets: number;
  status: string;
  winners?: Winner[];
}

export const LotteryWinnersDisplay = () => {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLottery, setSelectedLottery] = useState<Lottery | null>(null);

  useEffect(() => {
    fetchLotteries();
  }, []);

  const fetchLotteries = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE || window.location.origin;
      const response = await fetch(`${apiUrl}/api/admin/lottery-draw/all`);
      const data = await response.json();
      
      if (data.success) {
        // Filter only completed lotteries with winners
        const completedLotteries = data.data.filter((lottery: Lottery) => 
          lottery.status === 'completed' && lottery.winners && lottery.winners.length > 0
        );
        setLotteries(completedLotteries);
        if (completedLotteries.length > 0) {
          setSelectedLottery(completedLotteries[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching lotteries:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWinnerIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <Trophy className="w-5 h-5 text-purple-400" />;
    }
  };

  const getWinnerBackground = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-300/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-500/50';
      default:
        return 'bg-gradient-to-r from-purple-400/20 to-purple-500/20 border-purple-300/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading winners...</div>
      </div>
    );
  }

  if (lotteries.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
          <p className="text-purple-200 text-xl">No lottery winners available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Lottery Winners
            <Trophy className="w-8 h-8 text-yellow-400" />
          </h1>
          <p className="text-purple-200">Congratulations to all our lucky winners!</p>
        </div>

        {/* Lottery Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-1 flex gap-1">
            {lotteries.map((lottery) => (
              <button
                key={lottery.id}
                onClick={() => setSelectedLottery(lottery)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedLottery?.id === lottery.id
                    ? 'bg-purple-500 text-white'
                    : 'text-purple-200 hover:bg-purple-700/50'
                }`}
              >
                Draw #{lottery.id}
              </button>
            ))}
          </div>
        </div>

        {selectedLottery && (
          <div className="space-y-6">
            {/* Lottery Info */}
            <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Draw #{selectedLottery.id} - {selectedLottery.drawDate}
                  </h2>
                  <div className="flex items-center gap-4 text-purple-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{selectedLottery.drawDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      <span>{selectedLottery.totalTickets} Tickets</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300">Stake:</span>
                      <span className="text-white font-semibold">{selectedLottery.stake} ETB</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <div className="text-purple-300 text-sm">Jackpot</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {selectedLottery.jackpot.toLocaleString()} ETB
                  </div>
                </div>
              </div>
            </div>

            {/* Winners */}
            <div className="grid gap-6">
              {selectedLottery.winners?.map((winner) => (
                <div
                  key={winner.id}
                  className={`rounded-xl border-2 p-6 ${getWinnerBackground(winner.prizePosition)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        {getWinnerIcon(winner.prizePosition)}
                        <span className="text-white font-bold mt-2">
                          {winner.prizePosition === 1 ? '1st' : winner.prizePosition === 2 ? '2nd' : '3rd'} Prize
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-white text-xl font-bold mb-1">
                          🎉 {winner.user.username} 🎉
                        </div>
                        <div className="text-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Ticket className="w-4 h-4" />
                            <span>Winning Ticket: #{winner.ticketNumber}</span>
                          </div>
                          <div className="text-sm opacity-75">
                            Drawn on {new Date(winner.createdAt).toLocaleDateString()} at {new Date(winner.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">
                        {winner.prizeAmount.toLocaleString()} ETB
                      </div>
                      <div className="text-purple-200 text-sm">
                        {winner.prizeName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics */}
            <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Draw Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {selectedLottery.totalTickets}
                  </div>
                  <div className="text-purple-200 text-sm">Total Tickets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {selectedLottery.winners?.length || 0}
                  </div>
                  <div className="text-purple-200 text-sm">Winners</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {selectedLottery.firstPrize.toLocaleString()}
                  </div>
                  <div className="text-purple-200 text-sm">1st Prize</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {((selectedLottery.winners?.length || 0) / selectedLottery.totalTickets * 100).toFixed(2)}%
                  </div>
                  <div className="text-purple-200 text-sm">Win Rate</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
