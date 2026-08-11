'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';
import { Search, Filter, ArrowUpDown, Circle, Users, Ban, CheckCircle, XCircle, RefreshCw, Download, Eye, Phone, Calendar, Hash, TrendingUp, TrendingDown, MoreVertical, Edit2, Shield, AlertCircle, Wallet, Activity, Gift, Clock, Smartphone, UserCheck } from 'lucide-react';
import axios from 'axios';

interface ActiveGameSummary {
  sessionId: number;
  stake: number;
  roomNumber: number;
  status: string;
  joinedAt: string;
  cardId: number;
}

interface UserWithBalance {
  id: number;
  name: string | null;
  username: string | null;
  telegramId: string;
  banned: boolean;
  userNumber?: string;
  createdAt: string;
  numberOfTotalPlay?: number;
  totalInvitation?: number;
  rewardPlay?: number;
  rewardChallenge?: number;
  rewardBalance?: number;
  balance: {
    currentBalance: number;
    totalDeposits: number;
    totalLosses: number;
  } | null;
  activeGame?: ActiveGameSummary | null;
}

type DerivedStatus = 'active' | 'blocked' | 'pending';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
const ADMIN_BALANCE_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_BALANCE_PASSWORD || 'pass_word';
const ADMIN_DELETE_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_DELETE_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_BALANCE_PASSWORD || '1992';

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [resettingPlayId, setResettingPlayId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithBalance | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DerivedStatus>('all');
  const [sortByBalanceAsc, setSortByBalanceAsc] = useState(true);
  const [sortBy, setSortBy] = useState<'balance' | 'name' | 'date' | 'deposits'>('balance');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const deriveStatus = (u: UserWithBalance): DerivedStatus => {
    if (u.banned) return 'blocked';
    const bal = u.balance?.currentBalance ?? 0;
    if (bal < 0) return 'blocked';
    if (bal < 50) return 'pending';
    return 'active';
  };

  const getStatusColor = (status: DerivedStatus) => {
    switch (status) {
      case 'active': return 'bg-linear-to-r from-green-50 to-green-100 text-green-700 border border-green-200';
      case 'pending': return 'bg-linear-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200';
      case 'blocked': return 'bg-linear-to-r from-red-50 to-red-100 text-red-700 border border-red-200';
      default: return 'bg-linear-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusIcon = (status: DerivedStatus) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'pending': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'blocked': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Circle className="w-3.5 h-3.5" />;
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;
      const res = await axios.get(`${BACKEND_URL}/admin/users`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.data?.success && Array.isArray(res.data.users)) {
        setUsers(res.data.users);
      } else {
        setError(res.data?.error || 'Failed to load users');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to load users');
      } else {
        setError('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const min = minBalance ? parseFloat(minBalance) : undefined;
    const max = maxBalance ? parseFloat(maxBalance) : undefined;

    let result = [...users];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((u) => {
        const name = u.name || '';
        const username = u.username || '';
        const phone = u.userNumber || '';
        return (
          name.toLowerCase().includes(q) ||
          username.toLowerCase().includes(q) ||
          u.telegramId.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q)
        );
      });
    }

    if (min !== undefined && !Number.isNaN(min)) {
      result = result.filter((u) => (u.balance?.currentBalance ?? 0) >= min);
    }
    if (max !== undefined && !Number.isNaN(max)) {
      result = result.filter((u) => (u.balance?.currentBalance ?? 0) <= max);
    }

    if (statusFilter !== 'all') {
      result = result.filter((u) => deriveStatus(u) === statusFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'balance':
          const aBal = a.balance?.currentBalance ?? 0;
          const bBal = b.balance?.currentBalance ?? 0;
          return sortByBalanceAsc ? aBal - bBal : bBal - aBal;
        case 'name':
          const aName = (a.name || a.username || '').toLowerCase();
          const bName = (b.name || b.username || '').toLowerCase();
          return sortByBalanceAsc ? aName.localeCompare(bName) : bName.localeCompare(aName);
        case 'date':
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return sortByBalanceAsc ? aDate - bDate : bDate - aDate;
        case 'deposits':
          const aDep = a.balance?.totalDeposits ?? 0;
          const bDep = b.balance?.totalDeposits ?? 0;
          return sortByBalanceAsc ? aDep - bDep : bDep - aDep;
        default:
          return 0;
      }
    });

    return result;
  }, [users, search, minBalance, maxBalance, statusFilter, sortByBalanceAsc, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = useMemo(
    () => {
      const start = (currentPage - 1) * pageSize;
      return filteredUsers.slice(start, start + pageSize);
    },
    [filteredUsers, currentPage]
  );

  const stats = useMemo(() => ({
    totalUsers: users.length,
    activeUsers: users.filter(u => !u.banned && deriveStatus(u) === 'active').length,
    totalBalance: users.reduce((sum, u) => sum + (u.balance?.currentBalance ?? 0), 0),
    totalDeposits: users.reduce((sum, u) => sum + (u.balance?.totalDeposits ?? 0), 0),
    bannedUsers: users.filter(u => u.banned).length,
    pendingUsers: users.filter(u => deriveStatus(u) === 'pending').length,
  }), [users]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatActiveGame = (activeGame?: ActiveGameSummary | null) => {
    if (!activeGame) return 'No active game';
    const status = activeGame.status.charAt(0).toUpperCase() + activeGame.status.slice(1);
    return `Stake ${activeGame.stake} ETB, Room ${activeGame.roomNumber}, ${status}`;
  };

  const handleUpdateBalance = async (userId: number, newBalance: number) => {
    if (!Number.isFinite(newBalance) || newBalance < 0) return;
    // Ask for password before updating
    const password = window.prompt('Enter admin password to update balance:');
    if (!password || password !== ADMIN_BALANCE_PASSWORD) {
      alert('Incorrect password. Balance update cancelled.');
      return;
    }
    setUpdatingId(userId);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;
      const res = await axios.patch(
        `${BACKEND_URL}/admin/users/${userId}/balance`,
        { currentBalance: newBalance },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (res.data?.success) {
        const updated = res.data.balance;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { 
                  ...u, 
                  balance: { 
                    ...(u.balance || { currentBalance: 0, totalDeposits: 0, totalLosses: 0 }), 
                    currentBalance: updated.currentBalance 
                  } 
                }
              : u
          )
        );
      } else {
        setError(res.data?.error || 'Failed to update balance');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to update balance');
      } else {
        setError('Failed to update balance');
      }
    } finally {
      setUpdatingId(null);
    }
  };

    const handleUpdateRewardBalance = async (userId: number, newRewardBalance: number) => {
      if (!Number.isFinite(newRewardBalance) || newRewardBalance < 0) return;
      const password = window.prompt('Enter admin password to update reward balance:');
      if (!password || password !== ADMIN_BALANCE_PASSWORD) {
        alert('Incorrect password. Reward balance update cancelled.');
        return;
      }
      setUpdatingId(userId);
      setError(null);
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') : null;
        const res = await axios.patch(
          `${BACKEND_URL}/admin/users/${userId}/reward-balance`,
          { rewardBalance: newRewardBalance },
          {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (res.data?.success) {
          const updated = res.data.user;
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? { ...u, rewardBalance: updated.rewardBalance }
                : u
            )
          );
        } else {
          setError(res.data?.error || 'Failed to update reward balance');
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || 'Failed to update reward balance');
        } else {
          setError('Failed to update reward balance');
        }
      } finally {
        setUpdatingId(null);
      }
    };

  const handleBanUser = async (userId: number, currentBanned: boolean) => {
    const action = currentBanned ? 'unban' : 'ban';
    const confirmed = window.confirm(`Are you sure you want to ${action} this user?`);
    if (!confirmed) return;

    setUpdatingId(userId);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;
      const res = await axios.patch(
        `${BACKEND_URL}/admin/users/${userId}/ban`,
        { banned: !currentBanned },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (res.data?.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, banned: !currentBanned } : u
          )
        );
      } else {
        setError(res.data?.error || 'Failed to update user status');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to update user status');
      } else {
        setError('Failed to update user status');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const password = window.prompt("Enter admin password to delete user:");
    if (!password || password !== ADMIN_DELETE_PASSWORD) {
      alert("Incorrect password. User deletion cancelled.");
      return;
    }

    const doubleConfirmed = window.confirm(`🚨 FINAL WARNING: This will permanently delete all user data including balance, game history, and rewards. Are you absolutely sure?`);
    if (!doubleConfirmed) return;

    setUpdatingId(userId);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;
      const res = await axios.delete(
        `${BACKEND_URL}/admin/users/${userId}`,
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (res.data?.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setError(`User "${userName}" has been permanently deleted.`);
      } else {
        setError(res.data?.error || 'Failed to delete user');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to delete user');
      } else {
        setError('Failed to delete user');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetTotalPlay = async (user: UserWithBalance) => {
    const userLabel = user.name || user.username || user.telegramId;
    const confirmed = window.confirm(
      `Reset numberOfTotalPlay to 0 for ${userLabel}?\nChoose OK for Yes or Cancel for No.`
    );
    if (!confirmed) return;

    setResettingPlayId(user.id);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;

      const res = await axios.post(
        `${BACKEND_URL}/admin/users/${user.id}/reset-total-play`,
        {},
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (res.data?.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  numberOfTotalPlay: 0,
                }
              : u
          )
        );

        setSelectedUser((prev) =>
          prev && prev.id === user.id
            ? {
                ...prev,
                numberOfTotalPlay: 0,
              }
            : prev
        );
      } else {
        setError(res.data?.error || 'Failed to reset number of total play');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to reset number of total play');
      } else {
        setError('Failed to reset number of total play');
      }
    } finally {
      setResettingPlayId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 px-2 bg-linear-to-br from-gray-50 to-gray-100/30">
        <div className="max-w-9xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-linear-to-br from-gray-900 to-gray-800">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
              </div>
              <p className="text-sm text-gray-600">Monitor and manage platform users efficiently</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="p-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  const csv = [
                    ['Name', 'Username', 'Phone', 'Telegram ID', 'Balance', 'Total Deposits', 'Status', 'Games', 'Invites', 'Joined'],
                    ...users.map(u => [
                      u.name || 'N/A',
                      u.username || 'N/A',
                      u.userNumber || 'N/A',
                      u.telegramId,
                      (u.balance?.currentBalance || 0).toFixed(2),
                      (u.balance?.totalDeposits || 0).toFixed(2),
                      u.banned ? 'Banned' : deriveStatus(u),
                      u.numberOfTotalPlay || 0,
                      u.totalInvitation || 0,
                      formatDate(u.createdAt)
                    ])
                  ].map(row => row.join(',')).join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                label: 'Total Users', 
                value: stats.totalUsers, 
                icon: Users, 
                color: 'from-blue-50 to-blue-100/50 text-blue-600',
                change: '+12%'
              },
              { 
                label: 'Active Users', 
                value: stats.activeUsers, 
                icon: UserCheck, 
                color: 'from-green-50 to-green-100/50 text-green-600',
                change: '+8%'
              },
              { 
                label: 'Total Balance', 
                value: `${stats.totalBalance.toFixed(0)} ETB`, 
                icon: Wallet, 
                color: 'from-purple-50 to-purple-100/50 text-purple-600',
                change: stats.totalBalance > 0 ? '+5%' : '-2%'
              },
              { 
                label: 'Banned Users', 
                value: stats.bannedUsers, 
                icon: Ban, 
                color: 'from-red-50 to-red-100/50 text-red-600',
                change: '-3%'
              }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-300 hover:shadow-sm group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-400">from last week</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header Bar */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900">All Users</h2>
                  <p className="text-sm text-gray-600 mt-0.5">{filteredUsers.length} users found</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Mobile Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden p-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4 text-gray-700" />
                  </button>

                  {/* Desktop Search */}
                  <div className="hidden lg:block relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 appearance-none bg-white text-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                    >
                      <option value="balance">Balance</option>
                      <option value="name">Name</option>
                      <option value="date">Date Joined</option>
                      <option value="deposits">Total Deposits</option>
                    </select>
                    <ArrowUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>

                  {/* Sort Direction */}
                  <button
                    onClick={() => setSortByBalanceAsc(!sortByBalanceAsc)}
                    className="p-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200"
                  >
                    {sortByBalanceAsc ? 
                      <TrendingUp className="w-4 h-4 text-gray-700" /> : 
                      <TrendingDown className="w-4 h-4 text-gray-700" />
                    }
                  </button>
                </div>
              </div>

              {/* Mobile Search */}
              <div className="mt-4 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Mobile Filters */}
              {showFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Min Balance</label>
                      <input
                        type="number"
                        placeholder="Min"
                        value={minBalance}
                        onChange={(e) => setMinBalance(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Max Balance</label>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxBalance}
                        onChange={(e) => setMaxBalance(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-600 mb-1 block">Status</label>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                    className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxBalance}
                    onChange={(e) => setMaxBalance(e.target.value)}
                    className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <select
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3" />
                  <p className="text-sm text-gray-600">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">No users found</p>
                  <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                pagedUsers.map((user) => {
                  const status = deriveStatus(user);
                  const currentBalance = user.balance?.currentBalance ?? 0;
                  
                  return (
                    <div key={user.id} className="p-4 sm:p-6 hover:bg-gray-50/30 transition-all duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* User Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-300">
                              <span className="text-sm font-semibold text-gray-700">
                                {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                              </span>
                            </div>
                            {user.banned && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {user.name || 'Unknown User'}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {getStatusIcon(status)}
                                {user.banned ? 'Banned' : status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <span className="text-gray-400">@</span>
                                {user.username || 'no-username'}
                              </span>
                              {user.userNumber && (
                                <span className="flex items-center gap-1">
                                  <Smartphone className="w-3 h-3" />
                                  {user.userNumber}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {user.numberOfTotalPlay || 0} games
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {user.totalInvitation || 0} invites
                              </span>
                              <span className="flex items-center gap-1">
                                <Gift className="w-3 h-3" />
                                {user.rewardBalance || 0} ETB
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(user.createdAt)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                Reward Plays: {user.rewardPlay || 0}
                              </span>
                              {(user.rewardChallenge || 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                  Challenges: {user.rewardChallenge}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                                <Activity className="w-3 h-3" />
                                Active Game: {formatActiveGame(user.activeGame)}
                              </span>
                              <button
                                onClick={() => handleResetTotalPlay(user)}
                                disabled={resettingPlayId === user.id || (user.numberOfTotalPlay || 0) === 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 text-white text-xs font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {resettingPlayId === user.id && (
                                  <span className="w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                                )}
                                Reset Plays to 0
                              </button>
                            </div>

                            {/* Mobile Balance Editor */}
                            <div className="mt-3 lg:hidden">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm text-gray-500">Balance:</span>
                                  <div className="font-semibold text-gray-900">{currentBalance.toFixed(2)} ETB</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    defaultValue={currentBalance}
                                    disabled={updatingId === user.id}
                                    className="w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                                    onBlur={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!Number.isNaN(val) && val >= 0 && val !== currentBalance) {
                                        if (window.confirm(`Update balance to ${val.toFixed(2)} ETB?`)) {
                                          handleUpdateBalance(user.id, val);
                                        } else {
                                          e.target.value = currentBalance.toString();
                                        }
                                      }
                                    }}
                                  />
                                  {updatingId === user.id && (
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  )}
                                    {/* Reward Balance Update */}
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      defaultValue={user.rewardBalance || 0}
                                      disabled={updatingId === user.id}
                                      className="w-16 px-3 py-1.5 text-sm border border-yellow-400 rounded-lg"
                                      style={{ marginLeft: '8px' }}
                                      onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!Number.isNaN(val) && val >= 0 && val !== (user.rewardBalance || 0)) {
                                          if (window.confirm(`Update reward balance to ${val.toFixed(2)} ETB?`)) {
                                            handleUpdateRewardBalance(user.id, val);
                                          } else {
                                            e.target.value = (user.rewardBalance || 0).toString();
                                          }
                                        }
                                      }}
                                    />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Info & Actions */}
                        <div className="hidden lg:flex items-center gap-8">
                          {/* Balance */}
                          <div className="text-right">
                            <div className="text-xl font-semibold text-gray-900">{currentBalance.toFixed(2)} ETB</div>
                            <div className="text-sm text-gray-500">
                              Deposited: {(user.balance?.totalDeposits || 0).toFixed(2)} ETB
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                defaultValue={currentBalance}
                                disabled={updatingId === user.id}
                                className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/30"
                                placeholder="Update balance"
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!Number.isNaN(val) && val >= 0 && val !== currentBalance) {
                                    if (window.confirm(`Update balance to ${val.toFixed(2)} ETB?`)) {
                                      handleUpdateBalance(user.id, val);
                                    } else {
                                      e.target.value = currentBalance.toString();
                                    }
                                  }
                                }}
                              />
                              {updatingId === user.id && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              )}
                                {/* Reward Balance Update */}
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  defaultValue={user.rewardBalance || 0}
                                  disabled={updatingId === user.id}
                                  className="w-32 px-3 py-2 text-sm border border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500/30"
                                  placeholder="Update reward balance"
                                  style={{ marginLeft: '8px' }}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!Number.isNaN(val) && val >= 0 && val !== (user.rewardBalance || 0)) {
                                      if (window.confirm(`Update reward balance to ${val.toFixed(2)} ETB?`)) {
                                        handleUpdateRewardBalance(user.id, val);
                                      } else {
                                        e.target.value = (user.rewardBalance || 0).toString();
                                      }
                                    }
                                  }}
                                />
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleBanUser(user.id, user.banned)}
                                disabled={updatingId === user.id}
                                className={`p-2 rounded-lg transition-colors ${
                                  user.banned
                                    ? 'hover:bg-green-50 text-green-600'
                                    : 'hover:bg-red-50 text-red-600'
                                }`}
                              >
                                {user.banned ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name || 'Unknown')}
                                disabled={updatingId === user.id}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                title="Delete user permanently"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center justify-between lg:hidden">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{user.numberOfTotalPlay || 0}</div>
                              <div className="text-xs text-gray-500">Games</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{user.totalInvitation || 0}</div>
                              <div className="text-xs text-gray-500">Invites</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="p-2 rounded-lg hover:bg-gray-100"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleBanUser(user.id, user.banned)}
                              disabled={updatingId === user.id}
                              className={`p-2 rounded-lg ${user.banned ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {user.banned ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name || 'Unknown')}
                              disabled={updatingId === user.id}
                              className="p-2 rounded-lg text-red-600"
                              title="Delete user permanently"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {filteredUsers.length > 0 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pageSize, filteredUsers.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredUsers.length}</span> users
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-8 h-8 rounded-xl font-medium transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-linear-to-r from-gray-900 to-gray-800 text-white'
                                : 'border border-gray-300 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 3 && (
                        <>
                          <span className="px-2 text-gray-400">...</span>
                          <button
                            onClick={() => setPage(totalPages)}
                            className={`w-8 h-8 rounded-xl font-medium transition-all duration-200 ${
                              currentPage === totalPages
                                ? 'bg-linear-to-r from-gray-900 to-gray-800 text-white'
                                : 'border border-gray-300 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-300">
                    <span className="text-lg font-semibold text-gray-700">
                      {selectedUser.name?.charAt(0) || selectedUser.username?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedUser.name || 'Unknown User'}</h3>
                    <p className="text-sm text-gray-500">@{selectedUser.username || 'no-username'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${getStatusColor(deriveStatus(selectedUser))}`}>
                  {getStatusIcon(deriveStatus(selectedUser))}
                  {selectedUser.banned ? 'Banned' : deriveStatus(selectedUser).toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleBanUser(selectedUser.id, selectedUser.banned);
                      setSelectedUser(null);
                    }}
                    disabled={updatingId === selectedUser.id}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      selectedUser.banned
                        ? 'bg-linear-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                        : 'bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                    }`}
                  >
                    {selectedUser.banned ? 'Unban User' : 'Ban User'}
                  </button>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Info</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUser.userNumber || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Telegram ID:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedUser.telegramId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Joined:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Financial Info</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Current Balance</div>
                      <div className="text-xl font-semibold text-gray-900">
                        {(selectedUser.balance?.currentBalance || 0).toFixed(2)} ETB
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500">Total Deposits</div>
                        <div className="text-sm font-medium text-gray-900">
                          {(selectedUser.balance?.totalDeposits || 0).toFixed(2)} ETB
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Total Losses</div>
                        <div className="text-sm font-medium text-gray-900">
                          {(selectedUser.balance?.totalLosses || 0).toFixed(2)} ETB
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Activity Stats</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Games Played', value: selectedUser.numberOfTotalPlay || 0, icon: Activity, color: 'text-blue-600' },
                    { label: 'Invites Sent', value: selectedUser.totalInvitation || 0, icon: Gift, color: 'text-green-600' },
                    { label: 'Days Active', value: Math.floor((Date.now() - new Date(selectedUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)), icon: Clock, color: 'text-purple-600' },
                    { label: 'Deposit Ratio', value: `${selectedUser.balance?.totalDeposits ? Math.round((selectedUser.balance.totalDeposits / (selectedUser.balance.totalDeposits + (selectedUser.balance.currentBalance || 0)) * 100)) : 0}%`, icon: Wallet, color: 'text-orange-600' }
                  ].map((stat, idx) => (
                    <div key={idx} className="text-center">
                      <div className="flex justify-center mb-2">
                        <div className={`p-2 rounded-lg bg-white ${stat.color.replace('text', 'bg')}/10`}>
                          <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200">
                    <Activity className="w-4 h-4" />
                    Active Game: {formatActiveGame(selectedUser.activeGame)}
                  </span>
                  <button
                    onClick={() => handleResetTotalPlay(selectedUser)}
                    disabled={resettingPlayId === selectedUser.id || (selectedUser.numberOfTotalPlay || 0) === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resettingPlayId === selectedUser.id && (
                      <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    )}
                    Reset Plays to 0
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
