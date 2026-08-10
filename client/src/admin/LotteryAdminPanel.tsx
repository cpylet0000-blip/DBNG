import { useState } from 'react';
import { LotteryWinnerDraw } from '../games/lottery/LotteryWinnerDraw';
import { LotteryWinnersDisplay } from '../games/lottery/LotteryWinnersDisplay';
import { Settings, Trophy, Eye, BarChart3 } from 'lucide-react';

export const LotteryAdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'draw' | 'winners' | 'stats'>('draw');

  const tabs = [
    {
      id: 'draw' as const,
      label: 'Draw Winners',
      icon: Trophy,
      component: LotteryWinnerDraw,
    },
    {
      id: 'winners' as const,
      label: 'View Winners',
      icon: Eye,
      component: LotteryWinnersDisplay,
    },
    {
      id: 'stats' as const,
      label: 'Statistics',
      icon: BarChart3,
      component: () => (
        <div className="bg-purple-800/20 rounded-xl border-2 border-purple-500/30 p-8 text-center">
          <BarChart3 className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
          <p className="text-purple-200 text-lg">Statistics dashboard coming soon...</p>
        </div>
      ),
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || LotteryWinnerDraw;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Admin Header */}
      <div className="bg-purple-800/40 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-purple-300" />
              <h1 className="text-2xl font-bold text-white">Lottery Admin Panel</h1>
            </div>
            <div className="text-purple-200 text-sm">
              Admin Dashboard
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-purple-800/20 text-purple-200 hover:bg-purple-700/30 border border-purple-500/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Component */}
        <div className="bg-purple-800/10 rounded-xl border border-purple-500/20 p-1">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};
