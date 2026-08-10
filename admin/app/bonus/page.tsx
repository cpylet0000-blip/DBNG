/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState } from 'react';
import { Target} from 'lucide-react';
import axios from 'axios';
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';
import StakeBonusesManager from './StakeBonusesManager';

const BingoBonus = () => {
  const [gamesToPlay, setGamesToPlay] = useState('');
  const [comboCode, setComboCode] = useState('');
  const [rewardAmount, setRewardAmount] = useState(0);
  const [rewardCount, setRewardCount] = useState(0);
  const [rewardMsg, setRewardMsg] = useState('');
  const [rewardLoading, setRewardLoading] = useState(false);
  
  // Reset reward challenges state
  const [userId, setUserId] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetAllLoading, setResetAllLoading] = useState(false);


  interface Reward {
    id: number;
    noplayForReward: number;
    comboCode?: string;
    amount: number;
    count: number;
    claimedCount: number;
    status: string;
  }

  interface RewardWinner {
    rewardId: number;
    userId: number;
    telegramId: string | null;
    name: string;
    phone?: string;
    amount: number;
    claimedAt: string;
  }

  // Helper to mask phone number (last 3 digits)
  function maskPhone(phone?: string) {
    if (!phone || phone.length < 4) return '';
    return phone.slice(0, -3) + '***';
  }
  // Declare rewards state before using it (declare only once!)
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [rewardActionLoading, setRewardActionLoading] = useState<number | 'inactive-all' | null>(null);
  const [rewardActionMsg, setRewardActionMsg] = useState('');
  // Winner state per reward
  const [winnerLists, setWinnerLists] = useState<Record<number, RewardWinner[]>>({});
  const [winnerLoading, setWinnerLoading] = useState<Record<number, boolean>>({});
  const [winnerError, setWinnerError] = useState<Record<number, string>>({});

  // For shamo: control visibility and loaded state per reward
  const [shamoVisible, setShamoVisible] = useState<Record<number, boolean>>({});
  const [shamoLoaded, setShamoLoaded] = useState<Record<number, boolean>>({});

  // Fetch winners for a reward rule
  const fetchRewardWinners = async (rewardId: number) => {
    setWinnerLoading(w => ({ ...w, [rewardId]: true }));
    setWinnerError(e => ({ ...e, [rewardId]: '' }));
    try {
      const res = await axios.get(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/admin/rewards/${rewardId}/claims`,
        { withCredentials: true }
      );
      if (res.data?.success && Array.isArray(res.data.claims)) {
        setWinnerLists(lists => ({ ...lists, [rewardId]: res.data.claims }));
      } else {
        setWinnerError(e => ({ ...e, [rewardId]: res.data?.error || 'Failed to fetch winners' }));
      }
    } catch (err: any) {
      setWinnerError(e => ({ ...e, [rewardId]: err?.response?.data?.error || 'Failed to fetch winners' }));
    } finally {
      setWinnerLoading(w => ({ ...w, [rewardId]: false }));
    }
  };



  // Handler for shamo toggle per reward
  const handleShamoToggle = (rewardId: number) => {
    if (!shamoLoaded[rewardId]) {
      fetchRewardWinners(rewardId);
      setShamoLoaded(prev => ({ ...prev, [rewardId]: true }));
    }
    setShamoVisible(prev => ({ ...prev, [rewardId]: !prev[rewardId] }));
  };



  // Post reward requirement (games to play for reward)
  const handleRewardPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setRewardLoading(true);
    setRewardMsg('');
    try {
      await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/admin/rewards`,
        {
          noplayForReward: Number(gamesToPlay),
          comboCode: comboCode.trim(),
          amount: Number(rewardAmount),
          count: Number(rewardCount),
        },
        { withCredentials: true }
      );
      setRewardMsg('🎯 Reward requirement set!');
      setGamesToPlay('');
      setComboCode('');
      setRewardAmount(0);
      setRewardCount(0);
      fetchRewards();
    } catch {
      setRewardMsg('❌ Failed to set reward requirement');
    } finally {
      setRewardLoading(false);
    }
  };

  // Fetch rewards list
  const fetchRewards = async () => {
    setLoadingRewards(true);
    try {
      const res = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/admin/rewards', { withCredentials: true });
      const normalizedRewards: Reward[] = Array.isArray(res.data?.rewards)
        ? res.data.rewards.map((r: any) => ({
            id: Number(r.id),
            noplayForReward: Number(r.noplayForReward ?? r.numberOfGamePlay ?? 0),
            comboCode: r.comboCode ?? '',
            amount: Number(r.amount ?? r.rewardAmount ?? 0),
            count: Number(r.count ?? r.totalPlayerForReward ?? 0),
            claimedCount: Number(r.claimedCount ?? 0),
            status: String(r.status ?? 'inactive'),
          }))
        : [];

      setRewards(normalizedRewards);
    } catch {}
    setLoadingRewards(false);
  };

  React.useEffect(() => {
    fetchRewards();
  }, []);

  // Stop reward
  const handleStopReward = async (id: number) => {
    if (window.confirm('Are you sure you want to stop this reward?')) {
      setRewardActionLoading(id);
      setRewardActionMsg('');
      try {
        await axios.patch(process.env.NEXT_PUBLIC_BACKEND_URL + `/admin/rewards/${id}/stop`, {}, { withCredentials: true });
        setRewardActionMsg('Reward stopped successfully.');
        await fetchRewards();
      } catch (err: any) {
        setRewardActionMsg(err?.response?.data?.error || 'Failed to stop reward rule');
      } finally {
        setRewardActionLoading(null);
      }
    }
  };

  const handleDeleteReward = async (id: number, status: string) => {
    if (!window.confirm(`Delete this ${status} reward rule permanently?`)) {
      return;
    }

    setRewardActionLoading(id);
    setRewardActionMsg('');
    try {
      await axios.delete(process.env.NEXT_PUBLIC_BACKEND_URL + `/admin/rewards/${id}`, { withCredentials: true });
      setRewardActionMsg(`Reward #${id} deleted successfully.`);
      await fetchRewards();
    } catch (err: any) {
      setRewardActionMsg(err?.response?.data?.error || 'Failed to delete reward rule');
    } finally {
      setRewardActionLoading(null);
    }
  };

  const handleDeleteInactiveRewards = async () => {
    if (!window.confirm('Delete all inactive reward rules? This cannot be undone.')) {
      return;
    }

    setRewardActionLoading('inactive-all');
    setRewardActionMsg('');
    try {
      const res = await axios.delete(process.env.NEXT_PUBLIC_BACKEND_URL + '/admin/rewards/inactive', { withCredentials: true });
      const deletedRules = Number(res?.data?.deletedRules ?? 0);
      const deletedClaims = Number(res?.data?.deletedClaims ?? 0);
      setRewardActionMsg(`Deleted ${deletedRules} inactive rules and ${deletedClaims} claim rows.`);
      await fetchRewards();
    } catch (err: unknown) {
      const errorMsg = (err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.error)
        ? (err as any).response.data.error
        : 'Failed to delete inactive reward rules';
      setRewardActionMsg(errorMsg);
    } finally {
      setRewardActionLoading(null);
    }
  };

  // Reset ALL users reward challenges
  const handleResetAllRewardChallenges = async () => {
    if (!window.confirm("Are you sure you want to reset ALL users' reward challenges to 0? This action cannot be undone.")) {
      return;
    }
    setResetAllLoading(true);
    setResetMsg('');
    try {
      const response = await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/admin/reset-reward-challenges`,
        { resetAll: true },
        { withCredentials: true }
      );
      setResetMsg(`🎯 ${response.data.message} All users' reward challenges reset to 0!`);
    } catch {
      setResetMsg('❌ Failed to reset all reward challenges');
    } finally {
      setResetAllLoading(false);
    }
  };

  // Reset user reward challenges
  const handleResetRewardChallenges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setResetMsg('❌ Please enter a user ID');
      return;
    }
    
    setResetAllLoading(true);
    setResetMsg('');
    try {
      await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_URL + `/admin/reset-reward-challenges`,
        { userId: Number(userId) },
        { withCredentials: true }
      );
      setResetMsg('🎯 User reward challenges reset successfully!');
      setUserId('');
    } catch {
      setResetMsg('❌ Failed to reset reward challenges');
    } finally {
      setResetAllLoading(false);
    }
  };

  // Calculate total reward for current form
  const totalReward = Number(rewardAmount) * Number(rewardCount);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <Navbar />
      {/* Main content container, keep restriction for most content */}
      <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
        {/* Header */}
       

        <div className=" gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <Target className="text-green-500" size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Reward Rule</h2>
                  <p className="text-sm text-gray-500">Set play requirements and rewards</p>
                </div>
              </div>
              <form onSubmit={handleRewardPost}>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Games to Play
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 5"
                        value={gamesToPlay}
                        onChange={e => setGamesToPlay(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        min={1}
                        required
                        disabled={rewardLoading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Combo Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., SHAMO-2026"
                        value={comboCode}
                        onChange={e => setComboCode(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        required
                        disabled={rewardLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reward Amount
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 100"
                        value={rewardAmount}
                        onChange={e => setRewardAmount(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        min={0}
                        required
                        disabled={rewardLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Persons Count
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 10"
                        value={rewardCount}
                        onChange={e => setRewardCount(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                        min={1}
                        required
                        disabled={rewardLoading}
                      />
                    </div>
                  </div>
                  
                  {/* Total Calculation */}
                  {rewardAmount && rewardCount && (
                    <div className="bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Distribution</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-700">
                            {totalReward.toLocaleString()} coins
                          </div>
                          <div className="text-xs text-gray-500">
                            {Number(rewardAmount).toLocaleString()} × {rewardCount} persons
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={rewardLoading}
                    className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {rewardLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Creating Rule...
                      </>
                    ) : (
                      'Create Reward Rule'
                    )}
                  </button>
                  
                  {rewardMsg && (
                    <div className={`p-3 rounded-lg text-sm ${rewardMsg.includes('🎯') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {rewardMsg}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
          {/* Winners section: override width restriction for full width on mobile */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 max-w-none w-full px-0 sm:px-6 mx-auto">
            <div className="flex items-center mb-6">
              
              <div>
                <h2 className="text-xl font-bold px-8 text-gray-900">List  of reward winners</h2>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center mx-5 mb-4">
                
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleDeleteInactiveRewards}
                    disabled={loadingRewards || rewardActionLoading === 'inactive-all'}
                    className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    {rewardActionLoading === 'inactive-all' ? 'Deleting...' : 'Delete Inactive'}
                  </button>
                  <button 
                    onClick={fetchRewards} 
                    disabled={loadingRewards}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center"
                  >
                    {loadingRewards ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      'Refresh'
                    )}
                  </button>
                </div>
              </div>

              {rewardActionMsg && (
                <div className={`mb-3 p-3 rounded-lg text-sm ${rewardActionMsg.toLowerCase().includes('failed') || rewardActionMsg.toLowerCase().includes('error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {rewardActionMsg}
                </div>
              )}
              
              {loadingRewards ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading rewards...</p>
                </div>
              ) : rewards.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-gray-500">No reward rules yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first reward rule</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rewards.map((r: Reward) => {
                    const showWinners = shamoVisible[r.id];
                    return (
                      <div
                        key={r.id}
                        className={` rounded-lg border ${r.status === 'active' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            
                            <div className="text-bold mx-4 text-black mt-1">
                              For {r.count} person{r.count !== 1 ? 's' : ''}
                            </div>
                            <div className="text-bold mx-4 text-black mt-1">
                              Combo: <span className="font-medium text-gray-700">{r.comboCode || 'N/A'}</span>
                            </div>
                            <div className="text-bold mx-4 text-black mt-1">
                              Claimed: {Number(r.claimedCount || 0)}/{Number(r.count || 0)}
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <span className={`inline-flex items-center px-5 py-0.5 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${r.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                              {r.status}
                            </span>
                            <div className="flex justify-end gap-2">
                              {r.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleStopReward(r.id)}
                                  disabled={rewardActionLoading === r.id}
                                  className="mt-2 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg shadow-sm transition-all disabled:opacity-60"
                                >
                                  {rewardActionLoading === r.id ? 'Working...' : 'Stop'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReward(r.id, r.status)}
                                disabled={rewardActionLoading === r.id}
                                className="mt-2 px-7 mx-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg shadow-sm transition-all disabled:opacity-60"
                              >
                                {rewardActionLoading === r.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Winner List Table, visible if toggled, for every reward */}
                        <div className="mt-2 -px-2">
                          <button
                            className="text-xl text-blue-600 hover:underline focus:outline-none mx-4"
                            onClick={() => handleShamoToggle(r.id)}
                          >
                            {shamoVisible[r.id] ? 'Hide Winners' : 'Show Winners'}
                          </button>
                          {showWinners && (
                            <div className="mt-2 border border-blue-200 rounded bg-white p-1 overflow-x-auto ">
                              {winnerLoading[r.id] ? (
                                <div className="text-xs text-gray-400">Loading winners...</div>
                              ) : winnerError[r.id] ? (
                                <div className="text-xs text-red-500">{winnerError[r.id]}</div>
                              ) : winnerLists[r.id] && winnerLists[r.id].length > 0 ? (
                                <table className="min-w-full text-xs rounded-lg overflow-hidden">
                                  <thead>
                                    <tr className="bg-linear-to-r from-blue-100 to-blue-50">
                                      <th className="px-2 py-2 text-left font-bold text-blue-800">Name</th>
                                      <th className="px-2 py-2 text-left font-bold text-blue-800">Phone</th>
                                      <th className="px-2 py-2 text-left font-bold text-blue-800">Date</th>
                                      <th className="px-2 py-2 text-left font-bold text-blue-800">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {winnerLists[r.id].map((winner, idx) => (
                                      <tr key={winner.rewardId} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                        <td className="px-2 py-1 rounded-l-lg">{winner.name}</td>
                                        <td className="px-2 py-1 font-mono">{winner.phone ? maskPhone(winner.phone) : '-'}</td>
                                        <td className="px-2 py-1 text-red-600">{new Date(winner.claimedAt).toLocaleString()}</td>
                                        <td className="px-2 py-1 text-green-600 font-bold rounded-r-lg">+{winner.amount}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-xs text-gray-400">No winners yet</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div> 
            {/* Stake Bonuses Manager */}
            <StakeBonusesManager />
          </div> {/* closes right column */}
        </div> {/* closes grid */}
      </div> {/* closes pt-24... container */}
      <Footer />
    </div>
  );
};
export default BingoBonus;