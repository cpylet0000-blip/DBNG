import React from 'react';
import type { LotteryDraw } from './types';

interface LotteryListProps {
  draws: LotteryDraw[];
  selectedDrawId: number | null;
  onSelect: (drawId: number) => void;
}

const LotteryList: React.FC<LotteryListProps> = ({ draws, selectedDrawId, onSelect }) => {
  return (
    <div className="space-y-2">
      {draws.map((draw) => (
        <button
          key={draw.id}
          onClick={() => onSelect(draw.id)}
          className={`w-full text-left px-4 py-2 rounded-lg border transition font-semibold ${
            selectedDrawId === draw.id
              ? 'bg-yellow-400 text-slate-900 border-yellow-400'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>Draw #{draw.id} - {draw.drawDate}</span>
            <span className="text-sm font-normal">{draw.status === 'active' ? 'Active' : draw.status === 'completed' ? 'Completed' : 'Upcoming'}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default LotteryList;
