'use client';
import LeaderboardAdminPage from '../leaderboard/page';
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Gift, RefreshCw, Trophy, Users } from 'lucide-react';
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';

type BalanceTarget = 'CURRENT' | 'REWARD';
type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TOTAL';
type LeaderboardType = 'PLAY' | 'INVITATION';

type TopContributor = {
  rank: number;
  userId: number;
  telegramId: string;
  name: string;
  playCount: number;
  inviteCount: number;
  selectedScore: number;
  contribution: number;
  currentBalance: number;
  rewardBalance: number;
};

type RewardResponse = {
  success: boolean;
  reward: {
    userId: number;
    target: BalanceTarget;
    amount: number;
    beforeCurrentBalance: number;
    afterCurrentBalance: number;
    beforeRewardBalance: number;
    afterRewardBalance: number;
  };
  notification: {
    sent: boolean;
    error: string | null;
  };
  error?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
const MAX_REWARD_AMOUNT = 500;
const PERIOD_OPTIONS: LeaderboardPeriod[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'TOTAL'];
const TYPE_OPTIONS: LeaderboardType[] = ['PLAY', 'INVITATION'];

export default function RewardPlayersPage() {
  const [users, setUsers] = useState<TopContributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rewardAmount, setRewardAmount] = useState('100');
  const [target, setTarget] = useState<BalanceTarget>('REWARD');
  const [period, setPeriod] = useState<LeaderboardPeriod>('WEEKLY');
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('PLAY');
  const [message, setMessage] = useState('');
  const [rewardingUserId, setRewardingUserId] = useState<number | null>(null);

  const stats = useMemo(() => {
    const totalContribution = users.reduce((sum, item) => sum + item.selectedScore, 0);
    return {
      count: users.length,
      totalContribution,
      topContribution: users[0]?.selectedScore ?? 0,
    };
  }, [users]);

  const fetchTopUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    const limit = period === 'DAILY' ? 10 : 25;

    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;

      const res = await axios.get<{ success: boolean; users: TopContributor[]; error?: string }>(
        `${BACKEND_URL}/admin/reward-players/top?limit=${limit}&period=${period}&type=${leaderboardType}`,
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (!res.data?.success || !Array.isArray(res.data.users)) {
        setError(res.data?.error || 'Failed to load top contributors.');
        return;
      }

      setUsers(res.data.users);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to load top contributors.');
      } else {
        setError('Failed to load top contributors.');
      }
    } finally {
      setLoading(false);
    }
  }, [period, leaderboardType]);

  useEffect(() => {
    fetchTopUsers();
  }, [fetchTopUsers]);

  const rewardUser = async (user: TopContributor) => {
    const amount = Number(rewardAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_REWARD_AMOUNT) {
      setError(`Reward amount must be between 1 and ${MAX_REWARD_AMOUNT}.`);
      return;
    }

    const confirmed = window.confirm(
      `Reward ${user.name} with ${amount} ETB in ${target === 'CURRENT' ? 'current balance' : 'reward balance'}?`,
    );

    if (!confirmed) return;

    setRewardingUserId(user.userId);
    setError('');
    setSuccessMsg('');

    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;

      const res = await axios.post<RewardResponse>(
        `${BACKEND_URL}/admin/reward-players/reward`,
        {
          userId: user.userId,
          amount,
          target,
          message: message.trim() || undefined,
        },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (!res.data?.success) {
        setError(res.data?.error || 'Failed to reward player.');
        return;
      }

      const reward = res.data.reward;
      setUsers((prev) =>
        prev.map((item) =>
          item.userId === reward.userId
            ? {
                ...item,
                currentBalance: reward.afterCurrentBalance,
                rewardBalance: reward.afterRewardBalance,
              }
            : item,
        ),
      );

      const notifyText = res.data.notification.sent
        ? 'Notification sent.'
        : `Notification not sent (${res.data.notification.error || 'unknown reason'}).`;

      setSuccessMsg(`Reward added for ${user.name}. ${notifyText}`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to reward player.');
      } else {
        setError('Failed to reward player.');
      }
    } finally {
      setRewardingUserId(null);
    }
  };

  return (
    <>
      <Navbar />
      <LeaderboardAdminPage/>
      <main className="min-h-screen pt-20 pb-16 px-4 bg-linear-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 text-gray-900 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Reward Players</h1>
                  <p className="text-sm text-gray-600">Top 25 users by {leaderboardType === 'PLAY' ? 'play' : 'invitation'} leaderboard.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={leaderboardType}
                  onChange={(e) => setLeaderboardType(e.target.value as LeaderboardType)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {TYPE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as LeaderboardPeriod)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  {PERIOD_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchTopUsers}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Contributors loaded</div>
                <div className="text-lg font-semibold">{stats.count}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total {leaderboardType === 'PLAY' ? 'plays' : 'invites'}</div>
                <div className="text-lg font-semibold">{stats.totalContribution}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Top {leaderboardType === 'PLAY' ? 'plays' : 'invites'}</div>
                <div className="text-lg font-semibold">{stats.topContribution}</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 space-y-4 mb-5">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Gift className="w-4 h-4" /> Reward settings
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-600">Amount (ETB)</span>
                  <input
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    type="number"
                    min="1"
                    max={MAX_REWARD_AMOUNT}
                    step={target === 'CURRENT' ? '0.01' : '1'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-gray-600">Balance target</span>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as BalanceTarget)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="REWARD">Reward Balance</option>
                    <option value="CURRENT">Current Balance</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-gray-600">Notification message (optional)</span>
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave blank to use automatic message"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {successMsg}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-right">Plays</th>
                    <th className="px-3 py-2 text-right">Invites</th>
                    <th className="px-3 py-2 text-right">{leaderboardType === 'PLAY' ? 'Play Score' : 'Invite Score'}</th>
                    <th className="px-3 py-2 text-right">Current Bal</th>
                    <th className="px-3 py-2 text-right">Reward Bal</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                        Loading top contributors...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((item, index) => (
                      <tr key={item.userId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-semibold">#{item.rank}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">Telegram ID: {item.telegramId}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{item.playCount}</td>
                        <td className="px-3 py-2 text-right">{item.inviteCount}</td>
                        <td className="px-3 py-2 text-right font-semibold">{item.selectedScore}</td>
                        <td className="px-3 py-2 text-right">{item.currentBalance.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{item.rewardBalance}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={rewardingUserId === item.userId}
                            onClick={() => rewardUser(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {rewardingUserId === item.userId ? 'Rewarding...' : 'Reward'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
