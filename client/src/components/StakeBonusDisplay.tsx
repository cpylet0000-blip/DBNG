import { Gift } from 'lucide-react';
import { useStakeBonus } from '../contexts/StakeBonusContext.tsx';

interface StakeBonusDisplayProps {
  stake: number;
  className?: string;
}

export const StakeBonusDisplay = ({ stake, className = "" }: StakeBonusDisplayProps) => {
  const { getBonusForStake, loading } = useStakeBonus();
  const bonus = getBonusForStake(stake);
  
  if (loading || bonus === 0) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Animated bonus badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-linear-to-r from-yellow-400 to-orange-500 rounded-full blur-md animate-pulse"></div>
          
          {/* Bonus content */}
          <div className="relative bg-linear-to-r from-yellow-400 to-orange-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-bounce shadow-lg">
            <Gift size={10} className="animate-spin-slow" />
            <span>+{bonus}</span>
          </div>
          
          {/* Sparkle effects */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
          <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-orange-300 rounded-full animate-ping animation-delay-200"></div>
        </div>
      </div>
      
      {/* CSS for custom animations */}
      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
};
