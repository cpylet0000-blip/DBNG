'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { DollarSign, TrendingUp, Calendar, Download, CreditCard, ArrowUpRight, ArrowDownRight, PiggyBank, Wallet, RefreshCw, BarChart3, TrendingDown, Percent, Repeat } from 'lucide-react'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

type FinancialSummary = {
  totalEarnings: {
    totalDeposits: number
    totalWithdraws: number
    netEarnings: number
    depositCount: number
    withdrawCount: number
  }
  todayEarnings: {
    totalDeposits: number
    totalWithdraws: number
    netEarnings: number
    depositCount: number
    withdrawCount: number
  }
  weekEarnings: {
    totalDeposits: number
    totalWithdraws: number
    netEarnings: number
    depositCount: number
    withdrawCount: number
  }
  monthEarnings: {
    totalDeposits: number
    totalWithdraws: number
    netEarnings: number
    depositCount: number
    withdrawCount: number
  }
  metrics: {
    totalTransactions: number
    averageDeposit: number
    profitMargin: number
  }
}

export default function FinancialAnalytics() {
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null
      
      const res = await axios.get(`${BACKEND_URL}/admin/financial/financial-summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true
      })

      if (res.data.success) {
        setFinancialData(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)} ETB`;
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getPeriodData = () => {
    if (!financialData) return null
    switch (period) {
      case 'daily': return financialData.todayEarnings
      case 'weekly': return financialData.weekEarnings
      case 'monthly': return financialData.monthEarnings
      default: return financialData.todayEarnings
    }
  }

  const periodData = getPeriodData()

  if (loading) {
    return (
      <>
        <Navbar/>
        <main className="min-h-screen pt-20 pb-16 px-4 bg-linear-to-br from-gray-50 to-gray-100/30 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading financial data...</p>
          </div>
        </main>
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
                <h1 className="text-2xl font-semibold text-gray-900">Financial Analytics</h1>
                <p className="text-sm text-gray-600 mt-1">Monitor revenue, deposits, and withdrawals</p>
              </div>
              <button
                onClick={fetchFinancialData}
                className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium rounded-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </button>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Earnings Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Total Earnings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(financialData?.totalEarnings.netEarnings || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-blue-50 to-blue-100/50 group-hover:from-blue-100 group-hover:to-blue-50">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">Lifetime net profit</span>
              </div>
            </div>
            
            {/* Total Deposits Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Total Deposits</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(financialData?.totalEarnings.totalDeposits || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-green-50 to-green-100/50 group-hover:from-green-100 group-hover:to-green-50">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Deposit count</span>
                  <span className="text-xs font-medium text-gray-700">
                    {formatNumber(financialData?.totalEarnings.depositCount || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Total Withdrawals Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Total Withdrawals</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(financialData?.totalEarnings.totalWithdraws || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-red-50 to-red-100/50 group-hover:from-red-100 group-hover:to-red-50">
                  <Wallet className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Withdrawal count</span>
                  <span className="text-xs font-medium text-gray-700">
                    {formatNumber(financialData?.totalEarnings.withdrawCount || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Profit Margin Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Profit Margin</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(financialData?.metrics.profitMargin || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-purple-50 to-purple-100/50 group-hover:from-purple-100 group-hover:to-purple-50">
                  <Percent className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-gray-500">Overall efficiency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Period Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">
                    {period.charAt(0).toUpperCase() + period.slice(1)} Performance
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">Detailed breakdown for selected period</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-600">Deposits</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-600">Withdrawals</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-5 bg-linear-to-br from-green-50 to-green-100/30 rounded-xl border border-green-200 hover:border-green-300 transition-colors">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-linear-to-br from-green-100 to-green-200/50 rounded-lg mb-3">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-green-700">Deposits</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2">
                    {formatCurrency(periodData?.totalDeposits || 0)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <span className="text-xs text-gray-500">
                      {formatNumber(periodData?.depositCount || 0)} transactions
                    </span>
                  </div>
                </div>
                
                <div className="text-center p-5 bg-linear-to-br from-red-50 to-red-100/30 rounded-xl border border-red-200 hover:border-red-300 transition-colors">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-linear-to-br from-red-100 to-red-200/50 rounded-lg mb-3">
                    <Wallet className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-red-700">Withdrawals</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2">
                    {formatCurrency(periodData?.totalWithdraws || 0)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <span className="text-xs text-gray-500">
                      {formatNumber(periodData?.withdrawCount || 0)} transactions
                    </span>
                  </div>
                </div>
                
                <div className="text-center p-5 bg-linear-to-br from-blue-50 to-blue-100/30 rounded-xl border border-blue-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-linear-to-br from-blue-100 to-blue-200/50 rounded-lg mb-3">
                    <PiggyBank className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-blue-700">Net Earnings</p>
                  <p className="text-xl font-semibold text-gray-900 mt-2">
                    {formatCurrency(periodData?.netEarnings || 0)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <span className="text-xs text-gray-500">Profit from operations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Total Transactions</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatNumber(financialData?.metrics.totalTransactions || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-gray-50 to-gray-100/50">
                  <Repeat className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">All-time transactions</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Average Deposit</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(financialData?.metrics.averageDeposit || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-orange-50 to-orange-100/50">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">Per transaction average</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-2">Today's Net</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(financialData?.todayEarnings.netEarnings || 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-linear-to-br from-green-50 to-green-100/50">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Daily performance</span>
                  {financialData?.todayEarnings.netEarnings && financialData.todayEarnings.netEarnings > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Positive</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <ArrowDownRight className="w-3 h-3" />
                      <span>Negative</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer/>
    </>
  )
}