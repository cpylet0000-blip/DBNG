'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Filter, Users, UserPlus, TrendingUp, Calendar, Download, ChevronLeft, ChevronRight, Eye, Ban, CheckCircle, Hash, Phone, Clock, Gamepad2, TrendingDown, CalendarDays } from 'lucide-react'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

type User = {
  id: number
  telegramId: string
  username?: string
  name?: string
  userNumber?: string
  createdAt: string
  banned: boolean
  activeInvitation: number
  totalInvitation: number
  numberOfTotalPlay: number
  balance?: {
    currentBalance: number
    totalDeposits: number
  }
}

type UserAnalyticsData = {
  users: User[]
  totalCount: number
  currentPage: number
  totalPages: number
  registrationCounts: Record<string, number>
  period: string
  dateRange: any
}

type RegistrationSummary = {
  totalUsers: number
  todayUsers: number
  weekUsers: number
  monthUsers: number
  bannedUsers: number
  activeUsers: number
}

export default function UserAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<UserAnalyticsData | null>(null)
  const [summary, setSummary] = useState<RegistrationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('daily')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const fetchData = async () => {
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null
      
      // Fetch user analytics
      const analyticsRes = await axios.get(`${BACKEND_URL}/admin/analytics/registrations`, {
        params: {
          period,
          startDate,
          endDate,
          search,
          page,
          limit
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true
      })

      // Fetch summary
      const summaryRes = await axios.get(`${BACKEND_URL}/admin/analytics/registration-summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true
      })

      setAnalyticsData(analyticsRes.data.data)
      setSummary(summaryRes.data.data)
    } catch (error) {
      console.error('Error fetching user analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period, search, page, limit, startDate, endDate])

  const handleExport = () => {
    if (!analyticsData?.users) return
    
    const csv = [
      ['ID', 'Telegram ID', 'Username', 'Name', 'Phone', 'Balance', 'Total Deposits', 'Games Played', 'Invitations', 'Status', 'Registered Date'],
      ...analyticsData.users.map(user => [
        user.id,
        user.telegramId,
        user.username || '',
        user.name || '',
        user.userNumber || '',
        user.balance?.currentBalance || 0,
        user.balance?.totalDeposits || 0,
        user.numberOfTotalPlay,
        user.totalInvitation,
        user.banned ? 'Banned' : 'Active',
        new Date(user.createdAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user-registrations-${period}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <>
        <Navbar/>
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 bg-linear-to-br from-gray-50 to-gray-100/30">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading user analytics...</p>
          </div>
        </div>
        <Footer/>
      </>
    )
  }

  return (
    <>
      <Navbar/>
      <main className="min-h-screen pt-20 pb-16 px-4 bg-linear-to-br from-gray-50 to-gray-100/30">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">User Analytics</h1>
                <p className="text-sm text-gray-600 mt-1">Monitor user registrations and activity</p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium rounded-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-linear-to-br from-blue-50 to-blue-100/50 group-hover:from-blue-100 group-hover:to-blue-50">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">All registered users</span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Today</p>
                    <p className="text-2xl font-semibold text-green-600">{summary.todayUsers}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-linear-to-br from-green-50 to-green-100/50 group-hover:from-green-100 group-hover:to-green-50">
                    <UserPlus className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">New registrations</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">This Week</p>
                    <p className="text-2xl font-semibold text-blue-600">{summary.weekUsers}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-linear-to-br from-purple-50 to-purple-100/50 group-hover:from-purple-100 group-hover:to-purple-50">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Weekly growth</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">This Month</p>
                    <p className="text-2xl font-semibold text-purple-600">{summary.monthUsers}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-linear-to-br from-orange-50 to-orange-100/50 group-hover:from-orange-100 group-hover:to-orange-50">
                    <CalendarDays className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Monthly growth</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Active</p>
                    <p className="text-2xl font-semibold text-green-600">{summary.activeUsers.toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-linear-to-br from-green-50 to-green-100/50 group-hover:from-green-100 group-hover:to-green-50">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Currently active</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-2">Banned</p>
                    <p className="text-2xl font-semibold text-red-600">{summary.bannedUsers}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-linear-to-br from-red-50 to-red-100/50 group-hover:from-red-100 group-hover:to-red-50">
                    <Ban className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Suspended accounts</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              {/* Period */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 appearance-none bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {period === 'custom' && (
                <>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                  />
                </>
              )}

              {/* Limit */}
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 appearance-none bg-white"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={200}>200 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          {analyticsData && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">User List</h2>
                    <p className="text-sm text-gray-600 mt-0.5">Showing {analyticsData.users.length} users</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    Page {page} of {analyticsData.totalPages}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analyticsData.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-300">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{user.username || 'no-username'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{user.userNumber || 'N/A'}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">ID: {user.telegramId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {(user.balance?.currentBalance || 0).toFixed(2)} ETB
                          </div>
                          <div className="text-xs text-gray-500">
                            Deposited: {(user.balance?.totalDeposits || 0).toFixed(2)} ETB
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="flex items-center justify-center w-8 h-8 mx-auto bg-linear-to-br from-blue-50 to-blue-100/50 rounded-lg mb-1">
                                <Gamepad2 className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{user.numberOfTotalPlay}</span>
                              <div className="text-xs text-gray-500">Games</div>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center w-8 h-8 mx-auto bg-linear-to-br from-green-50 to-green-100/50 rounded-lg mb-1">
                                <Users className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{user.totalInvitation}</span>
                              <div className="text-xs text-gray-500">Invites</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                            user.banned 
                              ? 'bg-red-50 text-red-700 border border-red-100' 
                              : 'bg-green-50 text-green-700 border border-green-100'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${user.banned ? 'bg-red-500' : 'bg-green-500'}`} />
                            {user.banned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * limit, analyticsData.totalCount)}
                    </span>{' '}
                    of <span className="font-medium">{analyticsData.totalCount}</span> users
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                        page === 1
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-4 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                      {page} / {analyticsData.totalPages}
                    </div>
                    <button
                      onClick={() => setPage(Math.min(analyticsData.totalPages, page + 1))}
                      disabled={page === analyticsData.totalPages}
                      className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                        page === analyticsData.totalPages
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer/>
    </>
  )
}