'use client'
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { PauseCircle, PlayCircle, BarChart3, Activity, Gamepad2, Users, TrendingUp, UserPlus, Calendar, CreditCard, ArrowUpRight, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
type Game = {
  id: number;
  name: string;
  image: string;
  status: string;
  fullWidth?: boolean;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  type UserStats = {
    totalUsers: number;
    todayUsers: number;
    weekUsers: number;
    monthUsers: number;
  };
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userStatsLoading, setUserStatsLoading] = useState(true);
  type FinancialStats = {
    totalEarnings: { netEarnings: number };
    todayEarnings: { netEarnings: number };
    weekEarnings: { netEarnings: number };
    monthEarnings: { netEarnings: number };
  };
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [financialStatsLoading, setFinancialStatsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    async function fetchGames() {
      try {
        const res = await axios.get(`${BACKEND_URL}/admin/admin_games`, {
          withCredentials: true,
        });
        setGames(res.data.games || []);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setUnauthorized(true);
        } else {
          setGames([]);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    async function fetchUserStats() {
      try {
        const res = await axios.get(`${BACKEND_URL}/admin/analytics/registration-summary`, {
          withCredentials: true,
        });
        setUserStats(res.data.data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setUserStatsLoading(false);
      }
    }
    fetchUserStats();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    async function fetchFinancialStats() {
      try {
        const res = await axios.get(`${BACKEND_URL}/admin/financial/financial-summary`, {
          withCredentials: true,
        });
        setFinancialStats(res.data.data);
      } catch (error) {
        console.error('Error fetching financial stats:', error);
      } finally {
        setFinancialStatsLoading(false);
      }
    }
    fetchFinancialStats();
  }, [mounted]);

  const handleToggleGame = async (id: number, currentStatus: string) => {
    setUpdating(id);
    try {
      const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
      await axios.patch(
        `${BACKEND_URL}/admin/games/${id}/status`,
        { status: newStatus },
        {
          withCredentials: true,
        }
      );

      setGames((prev) =>
        prev.map((game) =>
          game.id === id ? { ...game, status: newStatus } : game
        )
      );
    } finally {
      setUpdating(null);
    }
  };

  const activeGamesCount = games.filter(game => game.status === "ACTIVE").length;

  useEffect(() => {
    if (unauthorized) {
      router.replace("/");
    }
  }, [unauthorized, router]);

  if (!mounted || unauthorized) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 text-center px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100 overflow-x-hidden">
         <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-yellow-300 py-4 drop-shadow">Dashboard Overview of Bingo games</h1>
          </div>
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          {/* Header with welcome */}
         

       

          {/* Main Content Grid */}
          <div className="md:flex-row">
            {/* Games Management Panel */}
           

            {/* Analytics Sidebar */}
            <div className="space-y-6 ">
              {/* User Analytics Card */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className=" text-gray-500 mt-0.5 text-center">Registration overview</p>
                    </div>
                    <Link 
                      href="/dashboard/user-analytics"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      View <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-blue-50 to-blue-100/50 rounded-lg mb-2">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {userStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          (userStats?.totalUsers || 0).toLocaleString()
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Total Users</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-green-50 to-green-100/50 rounded-lg mb-2">
                        <UserPlus className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {userStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          userStats?.todayUsers || '0'
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Today</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-purple-50 to-purple-100/50 rounded-lg mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {userStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          userStats?.weekUsers || '0'
                        )}
                      </p>
                      <p className="text-xs text-gray-500">This Week</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-orange-50 to-orange-100/50 rounded-lg mb-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {userStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          userStats?.monthUsers || '0'
                        )}
                      </p>
                      <p className="text-xs text-gray-500">This Month</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Overview Card */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mt-0.5">Earnings and revenue</p>
                    </div>
                    <Link 
                      href="/dashboard/financial-analytics"
                      className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
                    >
                      View <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-green-50 to-green-100/50 rounded-lg mb-2">
                        <CreditCard className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xl font-semibold font-mono text-gray-900">
                        {financialStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {(financialStats?.totalEarnings?.netEarnings || 0).toLocaleString()}
                            <span className="text-xs text-gray-500 ml-1">ETB</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Total Earnings</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-blue-50 to-blue-100/50 rounded-lg mb-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900 font-mono">
                        {financialStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {(financialStats?.todayEarnings?.netEarnings || 0).toLocaleString()}
                            <span className="text-xs text-gray-500 ml-1">ETB</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Today</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-purple-50 to-purple-100/50 rounded-lg mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {financialStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {(financialStats?.weekEarnings?.netEarnings || 0).toLocaleString()}
                            <span className="text-xs text-gray-500 ml-1">ETB</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">This Week</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 mx-auto bg-linear-to-br from-orange-50 to-orange-100/50 rounded-lg mb-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">
                        {financialStatsLoading ? (
                          <span className="inline-block w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {(financialStats?.monthEarnings?.netEarnings || 0).toLocaleString()}
                            <span className="text-xs text-gray-500 ml-1">ETB</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">This Month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
             {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Games Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Total Games</p>
                  <p className="text-2xl font-semibold text-gray-900">{games.length}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-blue-50 to-blue-100/50 group-hover:from-blue-100 group-hover:to-blue-50 transition-all duration-200">
                  <Gamepad2 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {activeGamesCount} active • {games.length - activeGamesCount} paused
                </span>
                <div className="flex items-center gap-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${activeGamesCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-gray-600">Live</span>
                </div>
              </div>
            </div>

            {/* Active Games Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Active Games</p>
                  <p className="text-2xl font-semibold text-gray-900">{activeGamesCount}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-green-50 to-green-100/50 group-hover:from-green-100 group-hover:to-green-50 transition-all duration-200">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Availability rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {games.length > 0 ? Math.round((activeGamesCount / games.length) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-linear-to-r from-green-500 to-green-400 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${games.length > 0 ? (activeGamesCount / games.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Availability Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">System Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activeGamesCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <p className="text-lg font-semibold text-gray-900">
                      {activeGamesCount > 0 ? 'Operational' : 'Maintenance'}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-gray-50 to-gray-100/50 group-hover:from-gray-100 group-hover:to-gray-50 transition-all duration-200">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Last updated</span>
                  <span className="text-gray-700 font-medium">Just now</span>
                </div>
              </div>
            </div>
          </div>
           <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mt-0.5">Control game status and availability</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="text-sm px-3 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium">
                        {activeGamesCount}/{games.length} active
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4" />
                      <p className="text-gray-600 font-medium">Loading games...</p>
                    </div>
                  ) : games.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-14 h-14 bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                        <Gamepad2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No games available</p>
                      <p className="text-sm text-gray-500 mt-1">Add games to get started</p>
                    </div>
                  ) : (
                    games.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group-hover:border-gray-300 transition-colors">
                            <Image
                              src={game.image}
                              alt={game.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            game.status === "ACTIVE" 
                              ? 'bg-green-700 shadow-sm' 
                              : 'bg-gray-400'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {game.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              game.status === "ACTIVE"
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-gray-50 text-gray-700 border border-gray-100"
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                game.status === "ACTIVE" ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              {game.status === "ACTIVE" ? "Active" : "Paused"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleGame(game.id, game.status)}
                          disabled={updating === game.id}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                            game.status === "ACTIVE"
                              ? "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                          } ${updating === game.id ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                        >
                          {updating === game.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-gray-600">Updating</span>
                            </>
                          ) : (
                            <>
                              {game.status === "ACTIVE" ? (
                                <>
                                  <PauseCircle className="w-4 h-4" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-4 h-4" />
                                  <span>Resume</span>
                                </>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        </div>
      </main>
      <Footer />
    </>
  );
}