'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, Users, Trophy, TrendingUp, Clock, Filter, ChevronDown, Eye, Download, RefreshCw, Home, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';

// Pagination Component - Restyled only
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems 
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
}) => {
  const itemsPerPage = 10;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100 sm:px-8">
      <div className="flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
            <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    currentPage === pageNum
                      ? 'z-10 bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } transition-colors`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

interface ArchivedSession {
  id: number | string;
  originalId: number;
  stake: number;
  roomNumber: number;
  status: string;
  calledNumbers: string;
  countdownEndsAt: string | null;
  winnerId: number | null;
  winnerCardId: number | null;
  winnerName: string | null;
  winPattern: string | null;
  winningCells: string | null;
  createdAt: string;
  finishedAt: string | null;
  archivedAt: string;
  players: ArchivedPlayer[];
}

interface ArchivedPlayer {
  id: number | string;
  originalId: number;
  sessionId: number;
  userId: number;
  name?: string | null;
  username?: string | null;
  cardId: number;
  cardNumbers: string;
  markedCells: string;
  autoMark: boolean;
  prize: number;
  joinedAt: string;
  archivedAt: string;
}

interface ArchiveStats {
  totalArchivedSessions: number;
  totalArchivedPlayers: number;
  recentArchivedSessions: number;
}

export default function GameHistoryPage() {
  // All useState hooks at the top
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ArchivedSession[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStake, setSelectedStake] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<{
    session: ArchivedSession;
    player: ArchivedPlayer;
    isWinner: boolean;
  } | null>(null);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState<ArchivedSession | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Constants
  const itemsPerPage = 10;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const cleanBackendUrl = backendUrl.replace(/\/api$/, '');

  // Calculate today's start (midnight)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Calculate total cartela taken today
  const totalCartelaToday = sessions.reduce((sum, session) => {
    if (new Date(session.createdAt) >= todayStart) {
      return sum + (session.players?.length || 0);
    }
    return sum;
  }, 0);

  // Calculate next reset time (next midnight)
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
const msUntilReset = nextMidnight.getTime() - now.getTime();
  const hoursUntilReset = Math.floor(msUntilReset / 3600000);
  const minutesUntilReset = Math.floor((msUntilReset % 3600000) / 60000);

  // All useEffect hooks in consistent order
  useEffect(() => {
    fetchArchiveData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, searchTerm, selectedStake, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStake, selectedStatus]);

  const fetchArchiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch archive sessions for valid stakes in parallel
      const stakes = [10, 20, 50, 100];
      const archiveSessionPromises = stakes.map(stake => 
        fetch(`${cleanBackendUrl}/api/bingo-archive/stake/${stake}?limit=100`)
      );
      const activeSessionPromises = stakes.flatMap((stake) =>
        [1, 2].map((room) => fetch(`${cleanBackendUrl}/api/bingo/session/${stake}?room=${room}`)),
      );
      const statsResponse = await fetch(`${cleanBackendUrl}/api/bingo-archive/stats`);

      const [archiveResponses, activeResponses] = await Promise.all([
        Promise.all(archiveSessionPromises),
        Promise.all(activeSessionPromises),
      ]);
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch archive statistics');
      }

      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Combine archive sessions from all valid stakes
      const allSessions = [];
      for (const response of archiveResponses) {
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            allSessions.push(...data.data);
          }
        }
      }

      // Add active/waiting/countdown sessions so active games are visible
      for (const response of activeResponses) {
        if (!response.ok) continue;
        const data = await response.json();
        const liveSession = data?.session;
        if (!liveSession) continue;
        if (liveSession.status === 'finished') continue;
        if (!Array.isArray(liveSession.players) || liveSession.players.length === 0) continue;

        allSessions.push({
          id: `live-${liveSession.id}`,
          originalId: liveSession.id,
          stake: liveSession.stake,
          roomNumber: liveSession.roomNumber,
          status: liveSession.status,
          calledNumbers: JSON.stringify(liveSession.calledNumbers || []),
          countdownEndsAt: liveSession.countdownEndsAt ? new Date(liveSession.countdownEndsAt).toISOString() : null,
          winnerId: liveSession.winner?.userId ?? null,
          winnerCardId: liveSession.winner?.cardId ?? null,
          winnerName: liveSession.winner?.name ?? null,
          winPattern: liveSession.winner?.pattern ?? null,
          winningCells: JSON.stringify(liveSession.winner?.winningCells || []),
          createdAt: new Date().toISOString(),
          finishedAt: null,
          archivedAt: new Date().toISOString(),
          players: (liveSession.players || []).map((player: any) => ({
            id: `live-${liveSession.id}-${player.userId}-${player.cardId}`,
            originalId: 0,
            sessionId: liveSession.id,
            userId: player.userId,
            name: player.name || null,
            username: null,
            cardId: player.cardId,
            cardNumbers: JSON.stringify(player.cardNumbers || []),
            markedCells: JSON.stringify(player.markedCells || []),
            autoMark: Boolean(player.autoMark),
            prize: 0,
            joinedAt: new Date().toISOString(),
            archivedAt: new Date().toISOString(),
          })),
        });
      }

      allSessions.sort((a, b) => {
        const aTime = new Date(a.finishedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.finishedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setSessions(allSessions);
    } catch (err) {
      console.error('Error fetching archive data:', err);
      setError('Failed to load game history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(session =>
        session.winnerName?.toLowerCase().includes(term) ||
        session.winnerId?.toString().includes(searchTerm) ||
        session.originalId.toString().includes(searchTerm) ||
        session.roomNumber.toString().includes(searchTerm) ||
        session.players.some((player) =>
          (player.name || '').toLowerCase().includes(term) ||
          (player.username || '').toLowerCase().includes(term) ||
          player.userId.toString().includes(searchTerm),
        )
      );
    }

    // Stake filter
    if (selectedStake !== 'all') {
      filtered = filtered.filter(session => session.stake === selectedStake);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(session => session.status === selectedStatus);
    }

    setFilteredSessions(filtered);
  };

  const isLiveSession = (session: ArchivedSession) =>
    typeof session.id === 'string' && session.id.startsWith('live-');

  const markSessionAsFinished = async (session: ArchivedSession) => {
    try {
      setError(null);
      const response = await fetch(
        `${cleanBackendUrl}/api/bingo/session/${session.stake}/finish?room=${session.roomNumber}`,
        { method: 'PATCH' }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to finish session');
      }

      await fetchArchiveData();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark session as finished.');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Active';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStakeColor = (stake: number) => {
    const colors = {
      5: 'bg-green-50 text-green-700 border border-green-200',
      10: 'bg-blue-50 text-blue-700 border border-blue-200',
      25: 'bg-purple-50 text-purple-700 border border-purple-200',
      50: 'bg-amber-50 text-amber-700 border border-amber-200',
      100: 'bg-rose-50 text-rose-700 border border-rose-200'
    };
    return colors[stake as keyof typeof colors] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      finished: 'bg-green-50 text-green-700 border border-green-200',
      active: 'bg-blue-50 text-blue-700 border border-blue-200',
      waiting: 'bg-amber-50 text-amber-700 border border-amber-200',
      countdown: 'bg-purple-50 text-purple-700 border border-purple-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const downloadCSV = () => {
    const csvData = filteredSessions.map(session => ({
      'Game ID': session.originalId,
      'Stake': session.stake,
      'Room': session.roomNumber,
      'Status': session.status,
      'Players': session.players.length,
      'Winner': session.winnerName || 'None',
      'Win Pattern': session.winPattern || 'N/A',
      'Total Prize': session.stake * session.players.length * 0.9,
      'Created At': formatDateTime(session.createdAt),
      'Finished At': session.finishedAt ? formatDateTime(session.finishedAt) : 'N/A',
      'Duration': formatDuration(session.createdAt, session.finishedAt),
      'Called Numbers': JSON.parse(session.calledNumbers || '[]').length
    }));

    const headers = Object.keys(csvData[0] || {}) as (keyof typeof csvData[0])[];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bingo-game-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };


  if (loading && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
        <Navbar />
        <div className="max-w-full mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading game history...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const getWinningPatternNumbers = (winPattern: string, winningCells: string, session: ArchivedSession) => {
    try {
      if (!winPattern) return 'N/A';
      return winPattern;
    } catch (error) {
      return 'N/A';
    }
  };

  const renderBingoCardFull = (cardNumbers: string, markedCells: string, isWinner: boolean = false) => {
    try {
      const numbers = JSON.parse(cardNumbers || '[]');
      const marked = JSON.parse(markedCells || '[]');
      
      if (!Array.isArray(numbers) || numbers.length !== 25) {
        return <span className="text-gray-500">Invalid card data</span>;
      }

      // Group numbers by B-I-N-G-O ranges
      const getBingoColumn = (letter: string) => {
        let range: [number, number];
        switch (letter) {
          case 'B': range = [1, 15]; break;
          case 'I': range = [16, 30]; break;
          case 'N': range = [31, 45]; break;
          case 'G': range = [46, 60]; break;
          case 'O': range = [61, 75]; break;
          default: range = [1, 75];
        }
        
        // Get numbers that fall within this column's range
        const columnNumbers = numbers.filter((num: number) => num >= range[0] && num <= range[1]);
        
        return {
          letter,
          numbers: columnNumbers,
          color: letter === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                letter === 'I' ? 'bg-red-100 text-red-800 border border-red-300' :
                letter === 'N' ? 'bg-gray-100 text-gray-800 border border-gray-300' :
                letter === 'G' ? 'bg-green-100 text-green-800 border border-green-300' :
                'bg-purple-100 text-purple-800 border border-purple-300'
        };
      };

      const columns = ['B', 'I', 'N', 'G', 'O'].map(letter => getBingoColumn(letter));
      
      return (
        <div className={`border-4 bg-gray-900 ${isWinner ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-400'} rounded-xl `}>
          <div className="flex justify-center">
            {columns.map((column) => (
              <div key={column.letter} className="flex flex-col">
                <div className={`text-center text-sm font-bold m-0.5 w-12 border-rose-400 border-4 h-12 ${column.color} rounded py-2 `}>
                  {column.letter}
                </div>
                {column.numbers.map((num: number, idx: number) => {
                  const originalIndex = numbers.indexOf(num);
                  const isMarked = marked.includes(originalIndex);
                  const isFree = originalIndex === 12;
                  
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-12 flex items-center justify-center m-0.5 rounded  text-sm font-bold border-2 border-sky-700/56
                        ${isFree ? 'bg-amber-300 text-amber-900 border-amber-400' : 
                          isMarked ? (isWinner ? 'bg-green-500 text-white border-green-600' : 'bg-blue-500 text-white border-blue-600') : 
                          'bg-white text-gray-800 border-gray-300'}
                      `}
                    >
                      {isFree ? 'FREE' : num}
                    </div>
                  );
                })}
                {/* Fill empty slots if less than 5 numbers */}
                {Array.from({ length: Math.max(0, 5 - column.numbers.length) }, (_, idx) => (
                  <div key={`empty-${idx}`} className={`w-12 h-12 border border-gray-300 bg-white`}></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    } catch (error) {
      return <span className="text-gray-500">Card parse error</span>;
    }
  };

  

  // Pagination calculations
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Navbar */}
      <Navbar />
       
      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-full mx-auto p-6">
          {/* Header */}
          <div className="mb-8 ">
<p className="text-gray-600 mt-14">Monitor and analyze all completed games sessions. Track player activity, winning patterns, and revenue metrics.</p>          </div>

          {/* Filters and Controls */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by player/winner name, user ID, game ID, room..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <select
                value={selectedStake}
                onChange={(e) => setSelectedStake(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Stakes</option>
                <option value="10">10 ETB</option>
                <option value="20">20 ETB</option>
                <option value="50">50 ETB</option>
                <option value="100">100 ETB</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="finished">Finished</option>
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="countdown">Countdown</option>
              </select>
              <button
                onClick={fetchArchiveData}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={downloadCSV}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              {/* Total Games */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Games</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalArchivedSessions}</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Trophy className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              {/* Total Cartela Taken */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total cartela taken</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalArchivedPlayers}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              {/* Total Cartela Taken Today */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cartela taken today</p>
                    <p className="text-2xl font-bold text-gray-900">{totalCartelaToday}</p>
                    <p className="text-xs text-gray-500 mt-1">Resets in {hoursUntilReset}h {minutesUntilReset}m</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              {/* Recent Games */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Recent Games</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.recentArchivedSessions}</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
              {/* Avg Players/Game */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Players/Game</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalArchivedSessions > 0 
                        ? (stats.totalArchivedPlayers / stats.totalArchivedSessions).toFixed(1)
                        : '0'}
                    </p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-semibold">Error:</span>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Comprehensive Data Table */}
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-450 divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Game ID</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Archive ID</th> */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stake</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Room</th> */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Players</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Winner ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Winner Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Winner Card ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Winner Card</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Win Pattern</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Prize</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Called Numbers</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Finished At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">All CARTELA</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedSessions.map((session) => {
                    const winnerPlayer = session.players.find(p => p.userId === session.winnerId && p.cardId === session.winnerCardId);
                    // Sum the prize field from all players for true total prize
                    const totalPrize = session.players.reduce((sum, p) => sum + (p.prize || 0), 0);
                    const calledNumbers = JSON.parse(session.calledNumbers || '[]');
                    
                    return (
                      <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {session.originalId}
                        </td>
                        {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {session.id}
                        </td> */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStakeColor(session.stake)}`}>
                            {session.stake} ETB
                          </span>
                        </td>
                        {/* <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.roomNumber}
                        </td> */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                            {isLiveSession(session) && session.status !== 'finished' && (
                              <button
                                onClick={() => markSessionAsFinished(session)}
                                className="px-2 py-1 text-[11px] font-medium rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                              >
                                Mark Finished
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {Array.from(new Set(session.players.map(p => p.userId))).length}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.winnerId || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.winnerName || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.winnerCardId || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {winnerPlayer ? (
                            <button
                              onClick={() => setSelectedPlayerForModal({ session, player: winnerPlayer, isWinner: true })}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              View Winner Card
                            </button>
                          ) : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className="text-xs font-medium text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg">
                            {getWinningPatternNumbers(session.winPattern || '', session.winningCells || '', session)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {totalPrize.toFixed(2)} ETB
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="max-w-40">
                            <div className="text-xs text-gray-500 mb-1">Called Numbers ({calledNumbers.length}):</div>
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                              <span className="text-xs font-mono text-gray-700 whitespace-nowrap">
                                {calledNumbers.join(', ')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDateTime(session.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {session.finishedAt ? formatDateTime(session.finishedAt) : 'Active'}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <button
                            onClick={() => setSelectedSessionForModal(session)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            <Users className="w-4 h-4" />
                            Cartela ({session.players.length})
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredSessions.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-gray-400 text-lg mb-2">No games found</div>
              <div className="text-gray-500">Try adjusting your filters or refresh the data</div>
            </div>
          )}

          {/* Loading State */}
          {loading && sessions.length === 0 && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading complete archive data...</p>
            </div>
          )}

          {/* Session Players Modal */}
         {selectedSessionForModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 md:p-6">
    <div className="bg-white rounded-2xl md:rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Session {selectedSessionForModal.originalId}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedSessionForModal.status)}`}>
                {selectedSessionForModal.status}
              </span>
              <span className="text-xs text-gray-600">Room #{selectedSessionForModal.roomNumber}</span>
              <span className="text-xs text-gray-600">{selectedSessionForModal.stake} ETB</span>
              <span className="text-xs text-gray-600">{selectedSessionForModal.players.length} players</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedSessionForModal(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Session Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Total Prize</div>
            <div className="font-bold text-gray-900">
              {(selectedSessionForModal.stake * selectedSessionForModal.players.length * 0.9).toFixed(0)} ETB
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Called Numbers</div>
            <div className="font-bold text-gray-900">
              {JSON.parse(selectedSessionForModal.calledNumbers || '[]').length}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Duration</div>
            <div className="font-bold text-gray-900">
              {formatDuration(selectedSessionForModal.createdAt, selectedSessionForModal.finishedAt)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Created</div>
            <div className="font-bold text-gray-900 text-sm">
              {new Date(selectedSessionForModal.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Winner Section */}
        {selectedSessionForModal.winnerId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    Winner: {selectedSessionForModal.winPattern || 'N/A'} Pattern
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {getWinningPatternNumbers(
                      selectedSessionForModal.winPattern || '',
                      selectedSessionForModal.winningCells || '',
                      selectedSessionForModal
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Players Grid Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Players ({selectedSessionForModal.players.length})</h3>
          <div className="text-xs text-gray-500">
            {selectedSessionForModal.players.filter(p => p.prize > 0).length} won prize
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-3">
          {selectedSessionForModal.players.map((player) => (
            <div
              key={player.id}
              className={`bg-white border rounded-xl p-4 transition-all ${
                player.userId === selectedSessionForModal.winnerId && player.cardId === selectedSessionForModal.winnerCardId
                  ? 'border-green-300 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Player Avatar */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    player.userId === selectedSessionForModal.winnerId
                      ? 'bg-green-100'
                      : 'bg-blue-100'
                  }`}>
                    <span className={`font-semibold ${
                      player.userId === selectedSessionForModal.winnerId
                        ? 'text-green-700'
                        : 'text-blue-700'
                    }`}>
                      {player.name ? player.name.charAt(0).toUpperCase() : 'P'}
                    </span>
                  </div>
                  {/* Player Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        Card #{player.cardId}
                        <span className="text-xs text-gray-500">
                          {player.name ? ` (${player.name}` : ''}
                          {player.username ? ` @${player.username}` : ''}
                          {!player.name && !player.username ? ` (User ${player.userId})` : ''}
                          {player.name ? ')' : ''}
                        </span>
                      </span>
                      {player.userId === selectedSessionForModal.winnerId && player.cardId === selectedSessionForModal.winnerCardId && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                          Winner
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span>{JSON.parse(player.markedCells || '[]').length} marked</span>
                      <span className={`${player.autoMark ? 'text-green-600' : 'text-gray-500'}`}> 
                        Auto: {player.autoMark ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Actions & Prize */}
                <div className="flex flex-col items-end gap-2">
                  {player.prize > 0 && (
                    <div className="font-bold text-green-600 text-sm">
                      {player.prize} ETB
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSessionForModal(null);
                      setSelectedPlayerForModal({
                        session: selectedSessionForModal,
                        player,
                        isWinner: player.userId === selectedSessionForModal.winnerId && player.cardId === selectedSessionForModal.winnerCardId
                      });
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      player.userId === selectedSessionForModal.winnerId && player.cardId === selectedSessionForModal.winnerCardId
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    View Card
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Session Details */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">Session Details</h4>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Called Numbers</div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                  <div className="text-xs font-mono text-gray-700 break-word">
                    {JSON.parse(selectedSessionForModal.calledNumbers || '[]').join(', ')}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Timeline</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Started</span>
                    <span className="text-xs font-medium">
                      {new Date(selectedSessionForModal.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {selectedSessionForModal.finishedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Finished</span>
                      <span className="text-xs font-medium">
                        {new Date(selectedSessionForModal.finishedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

          {/* Player Card Modal */}
         {selectedPlayerForModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 md:p-6">
    <div className="bg-white rounded-2xl md:rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
      {/* Header - Sticky on mobile */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900">
              Player {selectedPlayerForModal.player.userId}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs md:text-sm text-gray-600">
              <span className="bg-gray-100 px-2 py-0.5 rounded">Card #{selectedPlayerForModal.player.cardId}</span>
              <span className="hidden md:inline">•</span>
              <span>Game #{selectedPlayerForModal.session.originalId}</span>
              <span className="hidden md:inline">•</span>
              <span>{selectedPlayerForModal.session.stake} ETB</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedPlayerForModal(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Winner Banner - Prominent but clean */}
        {selectedPlayerForModal.isWinner && (
          <div className="mb-5 p-4 bg-linear-to-r from-green-500/10 to-emerald-500/5 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Winner</div>
                  <div className="text-sm text-gray-600">
                    {selectedPlayerForModal.session.winPattern || 'N/A'} Pattern
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-green-600">
                  {selectedPlayerForModal.player.prize} ETB
                </div>
                <div className="text-xs text-gray-500">Prize Won</div>
              </div>
            </div>
          </div>
        )}

        {/* Bingo Card Display */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-900">Bingo Card</h4>
            {selectedPlayerForModal.isWinner && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                Winner Card
              </span>
            )}
          </div>
          <div className="flex justify-center">
            {renderBingoCardFull(
              selectedPlayerForModal.player.cardNumbers,
              selectedPlayerForModal.player.markedCells,
              selectedPlayerForModal.isWinner
            )}
          </div>
        </div>

        {/* Stats Grid - Responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
          {/* Game Info Card */}
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h4 className="font-semibold text-gray-900">Game Info</h4>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPlayerForModal.session.status)}`}>
                  {selectedPlayerForModal.session.status}
                </span>
              </div>
             {/* <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Room</span>
                <span className="font-medium">#{selectedPlayerForModal.session.roomNumber}</span>
              </div>*/}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Cartela</span>
                <span className="font-medium">{selectedPlayerForModal.session.players.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Duration</span>
                <span className="font-medium">{formatDuration(selectedPlayerForModal.session.createdAt, selectedPlayerForModal.session.finishedAt)}</span>
              </div>
            </div>
          </div>

          {/* Player Stats Card */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <h4 className="font-semibold text-gray-900">Player Stats</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Marked Cells</span>
                <span className="font-medium">
                  {JSON.parse(selectedPlayerForModal.player.markedCells || '[]').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Auto Mark</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedPlayerForModal.player.autoMark 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedPlayerForModal.player.autoMark ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Joined</span>
                <span className="font-medium text-xs">
                  {new Date(selectedPlayerForModal.player.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Prize</span>
                <span className={`font-bold ${
                  selectedPlayerForModal.player.prize > 0 
                    ? 'text-green-600' 
                    : 'text-gray-500'
                }`}>
                  {selectedPlayerForModal.player.prize > 0 
                    ? `${selectedPlayerForModal.player.prize} ETB` 
                    : 'Lost'}
                </span>
              </div>
            </div>
          </div>

          {/* Game Progress Card - Full width on mobile */}
          <div className="md:col-span-2 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <h4 className="font-semibold text-gray-900">Game Progress</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Called Numbers</span>
                  <span className="text-xs text-gray-500">
                    {JSON.parse(selectedPlayerForModal.session.calledNumbers || '[]').length} total
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                  <div className="text-xs font-mono text-gray-700 wrap-break-words">
                    {JSON.parse(selectedPlayerForModal.session.calledNumbers || '[]').join(', ')}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Marked Positions</span>
                  <span className="text-xs text-gray-500">
                    {JSON.parse(selectedPlayerForModal.player.markedCells || '[]').length} cells
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                  <div className="text-xs font-mono text-gray-700 wrap-break-words">
                    {JSON.parse(selectedPlayerForModal.player.markedCells || '[]').join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Winning Details (if winner)
          {selectedPlayerForModal.isWinner && selectedPlayerForModal.session.winningCells && (
            <div className="md:col-span-2 bg-green-50/50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-gray-900">Winning Details</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pattern</span>
                  <span className="font-medium">{selectedPlayerForModal.session.winPattern}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Winning Cells</span>
                  <div className="mt-1 text-xs font-mono bg-white p-2 rounded border border-green-200">
                    {selectedPlayerForModal.session.winningCells 
                      ? JSON.parse(selectedPlayerForModal.session.winningCells).join(', ')
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
             */}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setSelectedPlayerForModal(null);
                setSelectedSessionForModal(selectedPlayerForModal.session);
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              View All
            </button>
            <button
              onClick={() => setSelectedPlayerForModal(null)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredSessions.length}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}