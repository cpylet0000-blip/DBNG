import { useState, useEffect } from 'react';
import { Trophy, Users, Ticket, Clock, Play, CheckCircle, Circle, Sparkles, Zap } from 'lucide-react';
import { Dice5 } from 'lucide-react';
import './LotteryDrawingDisplay.css';

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
  winners: Winner[];
  isComplete: boolean;
}

export const LotteryDrawingDisplay = ({ lotteryId }: { lotteryId: string }) => {
  const [drawStatus, setDrawStatus] = useState<DrawStatus | null>(null);
  const [currentPrize, setCurrentPrize] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPhase, setDrawingPhase] = useState<'waiting' | 'drawing' | 'revealing'>('waiting');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const fetchDrawStatus = async () => {
      try {
        const response = await fetch(`/api/admin/step-by-step-draw/${lotteryId}/status`);
        const data = await response.json();
        
        if (data.success) {
          setDrawStatus(data.data);
          
          // Determine current prize being drawn
          const winners = data.data.winners || [];
          if (winners.length === 0) setCurrentPrize(1);
          else if (winners.length === 1) setCurrentPrize(2);
          else if (winners.length === 2) setCurrentPrize(3);
          else setCurrentPrize(4); // All done
        }
      } catch (error) {
        console.error('Error fetching draw status:', error);
      }
    };

    fetchDrawStatus();
    const interval = setInterval(fetchDrawStatus, 1000); // Update every second
    return () => clearInterval(interval);
  }, [lotteryId]);

  // Auto-draw when countdown reaches 0
  useEffect(() => {
    if (drawStatus && !drawStatus.isComplete && currentPrize <= 3) {
      const timer = setTimeout(() => {
        startAutoDraw();
      }, 2000); // Start drawing after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [drawStatus, currentPrize]);

  const startAutoDraw = async () => {
    if (isDrawing || currentPrize > 3) return;
    
    setIsDrawing(true);
    setDrawingPhase('drawing');
    
    // Countdown animation
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    setDrawingPhase('revealing');
    
    // Draw the prize
    try {
      const response = await fetch(`/api/admin/step-by-step-draw/${lotteryId}/draw/${currentPrize}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Wait for reveal animation
        await new Promise(resolve => setTimeout(resolve, 2000));
        setDrawingPhase('waiting');
        setCurrentPrize(currentPrize + 1);
      }
    } catch (error) {
      console.error('Error drawing prize:', error);
    } finally {
      setIsDrawing(false);
    }
  };

  const getPrizeIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Trophy className="w-6 h-6 text-orange-600" />;
      default:
        return <Circle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getPrizeName = (position: number) => {
    switch (position) {
      case 1:
        return 'First Prize';
      case 2:
        return 'Second Prize';
      case 3:
        return 'Third Prize';
      default:
        return '';
    }
  };

  if (!drawStatus) {
    return (
      <div className="mt-4 p-6 bg-linear-to-r from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-500/30">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-purple-300">Preparing drawing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-6 bg-linear-to-r from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-500/30">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-purple-300 mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          Automatic Lottery Drawing
          <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
        </h3>
        <p className="text-purple-200">Watch as winners are automatically selected!</p>
      </div>

      {/* Prize Progress */}
      <div className="flex justify-center gap-4 mb-6">
        {[1, 2, 3].map((prize) => {
          const isDrawn = drawStatus.winners.some(w => w.prizePosition === prize);
          const isCurrent = prize === currentPrize && !isDrawn;
          
          return (
            <div
              key={prize}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-300 ${
                isDrawn
                  ? 'bg-green-900/50 border-green-500/50'
                  : isCurrent
                  ? 'bg-yellow-900/50 border-yellow-500/50 animate-pulse'
                  : 'bg-gray-800/50 border-gray-600/50'
              }`}
            >
              {getPrizeIcon(prize)}
              <span className={`font-medium ${
                isDrawn ? 'text-green-300' : isCurrent ? 'text-yellow-300' : 'text-gray-400'
              }`}>
                {getPrizeName(prize)}
              </span>
              {isDrawn && <CheckCircle className="w-4 h-4 text-green-400" />}
              {isCurrent && drawingPhase === 'drawing' && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span className="ml-1 text-yellow-300 font-bold">{countdown}</span>
                </div>
              )}
              {isCurrent && drawingPhase === 'revealing' && (
                <Dice5 className="w-4 h-4 text-yellow-400 animate-bounce" />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Drawing Animation */}
      {drawingPhase === 'drawing' && (
        <div className="text-center mb-6 p-4 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
          <div className="flex items-center justify-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400 animate-pulse" />
            <div>
              <p className="text-yellow-300 font-bold text-lg">Drawing {getPrizeName(currentPrize)}!</p>
              <p className="text-yellow-200 text-sm">Randomly selecting winner from {drawStatus.totalTickets} tickets...</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <div className="mt-3 flex justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>
      )}

      {drawingPhase === 'revealing' && (
        <div className="text-center mb-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-green-400 animate-pulse" />
            <div>
              <p className="text-green-300 font-bold text-lg">Revealing {getPrizeName(currentPrize)} Winner!</p>
              <p className="text-green-200 text-sm">The lucky ticket is being selected...</p>
            </div>
            <Trophy className="w-8 h-8 text-green-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Winners Display */}
      <div className="space-y-4">
        {drawStatus.winners.length === 0 ? (
          <div className="text-center text-purple-300">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Drawing will begin automatically in a few seconds...</p>
            <div className="mt-2 flex justify-center gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                ></div>
              ))}
            </div>
          </div>
        ) : (
          drawStatus.winners.map((winner, index) => (
            <div
              key={winner.id}
              className="flex items-center justify-between p-4 bg-linear-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-500/30 animate-fadeIn"
              style={{ animationDelay: `${index * 0.5}s` }}
            >
              <div className="flex items-center gap-3">
                {getPrizeIcon(winner.prizePosition)}
                <div>
                  <p className="text-green-300 font-medium">{winner.prizeName}</p>
                  <p className="text-green-200 text-sm">
                    Ticket #{winner.ticketNumber} • {winner.user.username}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">{winner.prizeAmount.toLocaleString()} ETB</p>
                <p className="text-green-200 text-xs">
                  {new Date(winner.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Drawing Complete */}
      {drawStatus.isComplete && (
        <div className="mt-6 text-center p-4 bg-linear-to-r from-green-900/50 to-emerald-900/50 rounded-lg border border-green-500/50">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
          <h4 className="text-green-300 font-bold text-lg">🎉 All Winners Announced! 🎉</h4>
          <p className="text-green-200">Congratulations to all lucky winners!</p>
          <div className="mt-3 flex justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
