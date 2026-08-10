'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Navbar from '../component/Navbar'
import Footer from '../component/Footer'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ''

type RoundSummary = {
  roundId: number
  roundAt: string
  prevRoundAt: string | null
  winningNumber: number
  winningColor: string
  participants: number
  totalBets: number
  totalWagered: number
  totalPaid: number
  profit: number
}

type RoundBet = {
  id: number
  createdAt: string
  userId: number
  username: string
  betType: string
  betValue: string
  amount: number
  odds: number
  status: string
  winnings: number
}

type PeriodKey = 'daily' | 'weekly' | 'monthly'

type PeriodSummary = {
  totalBets: number
  totalWagered: number
  totalPaid: number
  netProfit: number
}

export default function SpinWinAdminPage() {
  const [rounds, setRounds] = useState<RoundSummary[]>([])
  const [selectedRound, setSelectedRound] = useState<RoundSummary | null>(null)
  const [roundBets, setRoundBets] = useState<RoundBet[]>([])
  const [summary, setSummary] = useState<Record<PeriodKey, PeriodSummary> | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('daily')
  const [roundSearch, setRoundSearch] = useState('')
  const [roundProfitFilter, setRoundProfitFilter] = useState<'all' | 'profit' | 'loss'>('all')
  const [roundDateFilter, setRoundDateFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all')
  const [betSearch, setBetSearch] = useState('')
  const [betStatusFilter, setBetStatusFilter] = useState<'all' | 'won' | 'lost'>('all')
  const [betTypeFilter, setBetTypeFilter] = useState<'all' | string>('all')
  const [loadingRounds, setLoadingRounds] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    return rounds.reduce(
      (acc, r) => {
        acc.totalBets += r.totalBets
        acc.totalWagered += r.totalWagered
        acc.totalPaid += r.totalPaid
        acc.totalProfit += r.profit
        return acc
      },
      { totalBets: 0, totalWagered: 0, totalPaid: 0, totalProfit: 0 }
    )
  }, [rounds])

  const selectedProfit = selectedRound ? selectedRound.profit : 0
  const selectedWinLabel = selectedRound
    ? `${selectedRound.winningColor.toUpperCase()} ${selectedRound.winningNumber}`
    : '--'

  const activeTotals = summary?.[selectedPeriod] ?? {
    totalBets: totals.totalBets,
    totalWagered: totals.totalWagered,
    totalPaid: totals.totalPaid,
    netProfit: totals.totalProfit,
  }

  const filteredRounds = useMemo(() => {
    const now = Date.now()
    const q = roundSearch.trim().toLowerCase()

    return rounds.filter((r) => {
      const roundTs = new Date(r.roundAt).getTime()

      if (roundDateFilter === 'daily' && now - roundTs > 24 * 60 * 60 * 1000) return false
      if (roundDateFilter === 'weekly' && now - roundTs > 7 * 24 * 60 * 60 * 1000) return false
      if (roundDateFilter === 'monthly' && now - roundTs > 30 * 24 * 60 * 60 * 1000) return false

      if (roundProfitFilter === 'profit' && r.profit < 0) return false
      if (roundProfitFilter === 'loss' && r.profit >= 0) return false

      if (!q) return true

      const text = [
        String(r.roundId),
        String(r.winningNumber),
        r.winningColor,
        new Date(r.roundAt).toLocaleString(),
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(q)
    })
  }, [rounds, roundSearch, roundProfitFilter, roundDateFilter])

  const filteredRoundBets = useMemo(() => {
    const q = betSearch.trim().toLowerCase()
    return roundBets.filter((b) => {
      if (betStatusFilter !== 'all' && b.status !== betStatusFilter) return false
      if (betTypeFilter !== 'all' && b.betType !== betTypeFilter) return false
      if (!q) return true

      const text = [b.username, b.betType, b.betValue, String(b.userId), String(b.id)].join(' ').toLowerCase()
      return text.includes(q)
    })
  }, [roundBets, betSearch, betStatusFilter, betTypeFilter])

  const betTypes = useMemo(() => {
    const types = Array.from(new Set(roundBets.map((b) => b.betType).filter(Boolean)))
    return types.sort((a, b) => a.localeCompare(b))
  }, [roundBets])

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingRounds(true)
      setLoadingSummary(true)
      setError(null)
      try {
        const [roundsRes, summaryRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/admin/spin-win/rounds?limit=100`, {
            withCredentials: true,
          }),
          axios.get(`${BACKEND_URL}/admin/spin-win/summary`, {
            withCredentials: true,
          }),
        ])

        const data = Array.isArray(roundsRes.data?.rounds) ? roundsRes.data.rounds : []
        setRounds(data)
        if (data.length > 0) {
          setSelectedRound(data[0])
        }

        const summaryData = summaryRes.data?.summary
        if (summaryData?.daily && summaryData?.weekly && summaryData?.monthly) {
          setSummary(summaryData)
        } else {
          setSummary(null)
        }
      } catch (e) {
        console.error('Failed to load spin-win rounds', e)
        setError('Failed to load spin win analytics')
        setRounds([])
        setSummary(null)
      } finally {
        setLoadingRounds(false)
        setLoadingSummary(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (!selectedRound?.roundAt) {
      setRoundBets([])
      return
    }

    const loadDetails = async () => {
      setLoadingDetails(true)
      setError(null)
      try {
        const res = await axios.get(`${BACKEND_URL}/admin/spin-win/round-details`, {
          params: { roundAt: selectedRound.roundAt },
          withCredentials: true,
        })
        setRoundBets(Array.isArray(res.data?.bets) ? res.data.bets : [])
      } catch (e) {
        console.error('Failed to load spin-win round details', e)
        setError('Failed to load round details')
        setRoundBets([])
      } finally {
        setLoadingDetails(false)
      }
    }

    loadDetails()
  }, [selectedRound?.roundAt])

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 px-4 bg-linear-to-br from-stone-100 via-white to-stone-200/70">
        <div className="max-w-7xl mx-auto space-y-6">
          

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPeriod('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedPeriod === 'daily' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedPeriod === 'weekly' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedPeriod === 'monthly' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}
              >
                Monthly
              </button>
            </div>
            <p className="text-xs text-stone-600 font-medium">
              {loadingSummary ? 'Loading period summary...' : `Showing ${selectedPeriod.toUpperCase()} metrics`}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">Total Bets</p>
              <p className="text-xl font-semibold text-stone-900 mt-1">{activeTotals.totalBets}</p>
            </div>
            <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">Total Wagered</p>
              <p className="text-xl font-semibold text-stone-900 mt-1">ETB {activeTotals.totalWagered.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">Total Paid</p>
              <p className="text-xl font-semibold text-stone-900 mt-1">ETB {activeTotals.totalPaid.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 font-semibold">Net Profit</p>
              <p className={`text-xl font-semibold mt-1 ${activeTotals.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                ETB {activeTotals.netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800 font-bold">Round ID</p>
              <p className="text-2xl font-mono font-bold text-amber-900 mt-1">#{selectedRound?.roundId ?? '--'}</p>
            </div>
            <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-800 font-bold">Drawn Number</p>
              <p className="text-2xl font-mono font-bold text-indigo-900 mt-1">{selectedWinLabel}</p>
            </div>
            <div className="rounded-xl border border-stone-300 bg-stone-50 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-700 font-bold">Round Profit</p>
              <p className={`text-2xl font-mono font-bold mt-1 ${selectedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                ETB {selectedRound ? selectedProfit.toFixed(2) : '--'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-white border border-stone-300 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-serif text-xl font-bold text-stone-900">Recent Rounds</h2>
                <span className="text-xs text-stone-600">Up to 100 rounds</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  type="text"
                  value={roundSearch}
                  onChange={(e) => setRoundSearch(e.target.value)}
                  placeholder="Search by round ID, color, number"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                />
                <select
                  value={roundProfitFilter}
                  onChange={(e) => setRoundProfitFilter(e.target.value as 'all' | 'profit' | 'loss')}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                >
                  <option value="all">All Profit Types</option>
                  <option value="profit">Profit Rounds</option>
                  <option value="loss">Loss Rounds</option>
                </select>
                <select
                  value={roundDateFilter}
                  onChange={(e) => setRoundDateFilter(e.target.value as 'all' | 'daily' | 'weekly' | 'monthly')}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                >
                  <option value="all">All Dates</option>
                  <option value="daily">Last 24 Hours</option>
                  <option value="weekly">Last 7 Days</option>
                  <option value="monthly">Last 30 Days</option>
                </select>
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide"> ID</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Round Time</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Drawn</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Bets</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRounds ? (
                      <tr><td className="py-3 text-stone-500" colSpan={5}>Loading rounds...</td></tr>
                    ) : filteredRounds.length === 0 ? (
                      <tr><td className="py-3 text-stone-500" colSpan={5}>No rounds found.</td></tr>
                    ) : filteredRounds.map((r) => (
                      <tr
                        key={`${r.roundId}-${r.roundAt}`}
                        className={`border-b border-stone-100 cursor-pointer hover:bg-stone-50 transition-colors ${selectedRound?.roundAt === r.roundAt ? 'bg-amber-50' : ''}`}
                        onClick={() => setSelectedRound(r)}
                      >
                        <td className="py-2 pr-3 font-mono font-semibold text-stone-800">#{r.roundId}</td>
                        <td className="py-2 pr-3 whitespace-nowrap text-stone-700">{new Date(r.roundAt).toLocaleString()}</td>
                        <td className="py-2 pr-3 font-semibold text-stone-800">{r.winningColor.toUpperCase()} {r.winningNumber}</td>
                        <td className="py-2 pr-3 text-stone-700">{r.totalBets}</td>
                        <td className={`py-2 pr-3 font-medium ${r.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {r.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white border border-stone-300 rounded-xl p-4 shadow-xs">
              <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Round Bet Details</h2>
              {selectedRound && (
                <div className=' flex justify-between items-center mb-3 border-b border-stone-900 pb-2'> 
                    <p className="text-xs text-stone-600 mb-3">
                  <span className="font-semibold text-stone-800 mr-5">Round #{selectedRound.roundId}</span>
                 
                  <span className="font-semibold text-indigo-800">Drawn Number: {selectedRound.winningColor.toUpperCase()} {selectedRound.winningNumber}</span>
                </p>
                </div>
               
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  type="text"
                  value={betSearch}
                  onChange={(e) => setBetSearch(e.target.value)}
                  placeholder="Search user, bet type, value"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                />
                <select
                  value={betStatusFilter}
                  onChange={(e) => setBetStatusFilter(e.target.value as 'all' | 'won' | 'lost')}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
                <select
                  value={betTypeFilter}
                  onChange={(e) => setBetTypeFilter(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500"
                >
                  <option value="all">All Bet Types</option>
                  {betTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">User</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Bet</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Stake</th>
                      <th className="py-2 pr-3 text-[11px] uppercase tracking-wide">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingDetails ? (
                      <tr><td className="py-3 text-stone-500" colSpan={4}>Loading details...</td></tr>
                    ) : filteredRoundBets.length === 0 ? (
                      <tr><td className="py-3 text-stone-500" colSpan={4}>No settled bets in this round.</td></tr>
                    ) : filteredRoundBets.map((b) => (
                      <tr key={b.id} className="border-b border-stone-100">
                        <td className="py-2 pr-3 text-stone-800 font-medium">{b.username}</td>
                        <td className="py-2 pr-3 text-stone-700">{b.betType}: {b.betValue}</td>
                        <td className="py-2 pr-3 text-stone-700 font-mono">ETB {Number(b.amount).toFixed(2)}</td>
                        <td className={`py-2 pr-3 font-medium ${Number(b.winnings) > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>
                          ETB {Number(b.winnings || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
