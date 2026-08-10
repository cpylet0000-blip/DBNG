'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Ticket, Clock, Play, CheckCircle, Circle } from 'lucide-react';

interface Ticket {
  id: number;
  ticketNumber: number;
  userId: number;
  user: {
    id: number;
    username: string;
    telegramId: string;
    name: string;
  };
}

interface Winner {
  id: number;
  lotteryId: string;
  userId: number;
  ticketNumber: number;
  prizePosition: number;
  prizeAmount: number;
  prizeName: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    telegramId: string;
    name: string;
  };
}

interface DrawStatus {
  totalTickets: number;
  availableTickets: Ticket[];
  winners: Winner[];
  isComplete: boolean;
}

export const StepByStepDraw = ({ lotteryId }: { lotteryId: string }) => {
  const [drawStatus, setDrawStatus] = useState<DrawStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawingPrize, setDrawingPrize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || '';

  useEffect(() => {
    fetchDrawStatus();
    const interval = setInterval(fetchDrawStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [lotteryId]);

  const fetchDrawStatus = async () => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') : null;
      const response = await fetch(`${BACKEND_URL}/api/admin/step-by-step-draw/${lotteryId}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      
      if (data.success) {
        setDrawStatus(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch draw status');
      }
    } catch (err) {
      setError('Error fetching draw status');
    } finally {
      setLoading(false);
    }
  };

  const drawPrize = async (prizePosition: number) => {
    setDrawingPrize(prizePosition);
    setError(null);
    setMessage(null);
    
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') : null;
      const response = await fetch(`${BACKEND_URL}/api/admin/step-by-step-draw/${lotteryId}/draw/${prizePosition}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        fetchDrawStatus();
      } else {
        setError(data.error || 'Failed to draw prize');
      }
    } catch (err) {
      setError('Error drawing prize');
    } finally {
      setDrawingPrize(null);
    }
  };

  const completeDraw = async () => {
    setError(null);
    setMessage(null);
    
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') : null;
      const response = await fetch(`${BACKEND_URL}/api/admin/step-by-step-draw/${lotteryId}/complete`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        fetchDrawStatus();
      } else {
        setError(data.error || 'Failed to complete draw');
      }
    } catch (err) {
      setError('Error completing draw');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading draw status...</div>
      </div>
    );
  }

  if (!drawStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-400">Failed to load draw status</div>
      </div>
    );
  }

  const getPrizeIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Trophy className="w-4 h-4 text-amber-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const isPrizeDrawn = (position: number) => {
    return drawStatus.winners.some(w => w.prizePosition === position);
  };

  return (
    <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5" />
        Step-by-Step Draw
      </h3>

      {/* Messages */}
      {message && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Draw Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{drawStatus.totalTickets}</div>
          <div className="text-purple-200 text-sm">Total Tickets</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{drawStatus.availableTickets.length}</div>
          <div className="text-purple-200 text-sm">Available</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{drawStatus.winners.length}</div>
          <div className="text-purple-200 text-sm">Winners</div>
        </div>
      </div>

      {/* Prize Draw Buttons */}
      <div className="space-y-3 mb-6">
        {[1, 2, 3].map((position) => {
          const winner = drawStatus.winners.find(w => w.prizePosition === position);
          const isDrawn = isPrizeDrawn(position);
          
          return (
            <div key={position} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getPrizeIcon(position)}
                <div>
                  <div className="text-white font-semibold">
                    {position === 1 ? 'First' : position === 2 ? 'Second' : 'Third'} Prize
                  </div>
                  {winner && (
                    <div className="text-purple-200 text-sm">
                      Winner: {winner.user.username} (Ticket #{winner.ticketNumber})
                    </div>
                  )}
                </div>
              </div>
              
              {!isDrawn && (
                <button
                  onClick={() => drawPrize(position)}
                  disabled={drawingPrize === position}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    drawingPrize === position
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {drawingPrize === position ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      Drawing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Draw {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Prize
                    </span>
                  )}
                </button>
              )}
              
              {isDrawn && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Drawn</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete Draw Button */}
      {drawStatus.winners.length >= 3 && !drawStatus.isComplete && (
        <button
          onClick={completeDraw}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
        >
          Complete Draw
        </button>
      )}

      {drawStatus.isComplete && (
        <div className="text-center p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-green-300 font-semibold">Draw Completed Successfully!</div>
        </div>
      )}

      {/* Available Tickets Preview */}
      {drawStatus.availableTickets.length > 0 && (
        <div className="mt-6">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Available Tickets ({drawStatus.availableTickets.length})
          </h4>
          <div className="max-h-40 overflow-y-auto bg-slate-900/50 rounded-lg p-3">
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {drawStatus.availableTickets.slice(0, 100).map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-purple-600/20 border border-purple-500/30 rounded px-2 py-1 text-center text-xs text-purple-200 hover:bg-purple-600/30 transition-colors"
                  title={`Ticket #${ticket.ticketNumber} - ${ticket.user.username}`}
                >
                  #{ticket.ticketNumber}
                </div>
              ))}
            </div>
            {drawStatus.availableTickets.length > 100 && (
              <div className="text-purple-300 text-sm mt-2 text-center">
                ... and {drawStatus.availableTickets.length - 100} more tickets
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
