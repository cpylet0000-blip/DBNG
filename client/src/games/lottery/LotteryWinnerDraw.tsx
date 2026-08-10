import { useState, useEffect } from 'react';
import { Trophy, Users, Ticket, Clock, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

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
  _count?: {
    tickets: number;
  };
}

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

export const LotteryWinnerDraw = () => {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [selectedLottery, setSelectedLottery] = useState<Lottery | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchLotteries();
  }, []);

  const fetchLotteries = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE || window.location.origin;
      const response = await fetch(`${apiUrl}/api/admin/lottery-draw/all`);
      const data = await response.json();
      
      if (data.success) {
        setLotteries(data.data);
      } else {
        setError('Failed to fetch lotteries');
      }
    } catch (err) {
      setError('Error fetching lotteries');
    } finally {
      setLoading(false);
    }
  };

  const drawWinners = async (lotteryId: number) => {
    setDrawing(true);
    setError(null);
    setSuccess(null);

    try {
      const apiUrl = import.meta.env.VITE_API_BASE || window.location.origin;
      const response = await fetch(`${apiUrl}/api/admin/lottery-draw/${lotteryId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Winners drawn successfully!');
        // Update the lottery in the list
        setLotteries(prev => 
          prev.map(lottery => 
            lottery.id === lotteryId 
              ? { ...lottery, status: 'completed', winners: data.data }
              : lottery
          )
        );
        if (selectedLottery?.id === lotteryId) {
          setSelectedLottery(prev => prev ? { ...prev, status: 'completed', winners: data.data } : null);
        }
      } else {
        setError(data.error || 'Failed to draw winners');
      }
    } catch (err) {
      setError('Error drawing winners');
    } finally {
      setDrawing(false);
    }
  };

  const getPrizeIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Trophy className="w-4 h-4 text-amber-600" />;
      default:
        return <Trophy className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPrizeColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-400';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 border-amber-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading lotteries...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            Lottery Winner Drawing
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </h1>
          <p className="text-purple-200">Draw and manage lottery winners</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-200">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lottery List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Available Lotteries
            </h2>
            <div className="space-y-3">
              {lotteries.map((lottery) => (
                <button
                  key={lottery.id}
                  onClick={() => setSelectedLottery(lottery)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    selectedLottery?.id === lottery.id
                      ? 'border-purple-400 bg-purple-800/40'
                      : 'border-purple-500/30 bg-purple-800/20 hover:border-purple-400/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white">Draw #{lottery.id}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lottery.status === 'completed' 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {lottery.status}
                    </span>
                  </div>
                  <div className="text-sm text-purple-200 space-y-1">
                    <div>Date: {lottery.drawDate}</div>
                    <div>Stake: {lottery.stake} ETB</div>
                    <div>Tickets: {lottery._count?.tickets || 0}/{lottery.totalTickets}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Winner Drawing Interface */}
          <div className="lg:col-span-2">
            {selectedLottery ? (
              <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Draw #{selectedLottery.id} - {selectedLottery.drawDate}
                  </h2>
                  {selectedLottery.status !== 'completed' && (
                    <button
                      onClick={() => drawWinners(selectedLottery.id)}
                      disabled={drawing || (selectedLottery._count?.tickets || 0) === 0}
                      className="px-6 py-3 bg-linear-to-r from-purple-500 to-purple-600 text-white font-bold rounded-lg hover:from-purple-400 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {drawing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Drawing Winners...
                        </>
                      ) : (
                        <>
                          <Trophy className="w-5 h-5" />
                          Draw Winners
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Lottery Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-900/40 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Stake</div>
                    <div className="text-white font-bold">{selectedLottery.stake} ETB</div>
                  </div>
                  <div className="bg-purple-900/40 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Total Tickets</div>
                    <div className="text-white font-bold">{selectedLottery._count?.tickets || 0}</div>
                  </div>
                  <div className="bg-purple-900/40 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Jackpot</div>
                    <div className="text-white font-bold">{selectedLottery.jackpot.toLocaleString()} ETB</div>
                  </div>
                  <div className="bg-purple-900/40 rounded-lg p-3">
                    <div className="text-purple-300 text-sm">Status</div>
                    <div className="text-white font-bold capitalize">{selectedLottery.status}</div>
                  </div>
                </div>

                {/* Winners Display */}
                {selectedLottery.winners && selectedLottery.winners.length > 0 ? (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Winners
                    </h3>
                    <div className="space-y-4">
                      {selectedLottery.winners.map((winner, index) => (
                        <div
                          key={winner.id}
                          className={`p-4 rounded-xl border-2 ${getPrizeColor(winner.prizePosition)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {getPrizeIcon(winner.prizePosition)}
                                <span className="font-bold text-white">
                                  {winner.prizeName}
                                </span>
                              </div>
                              <div className="text-white/80">
                                <div className="font-semibold">{winner.user.username}</div>
                                <div className="text-sm opacity-75">Ticket #{winner.ticketNumber}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">
                                {winner.prizeAmount.toLocaleString()} ETB
                              </div>
                              <div className="text-sm opacity-75">
                                {new Date(winner.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                    <p className="text-purple-200">
                      {selectedLottery.status === 'completed' 
                        ? 'No winners found for this lottery'
                        : 'Winners have not been drawn yet'
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-12 text-center">
                <Ticket className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                <p className="text-purple-200 text-lg">
                  Select a lottery from the left to view details and draw winners
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
