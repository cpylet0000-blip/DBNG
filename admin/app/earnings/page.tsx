'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';
import { RefreshCcw } from 'lucide-react';

type FinancialTotals = {
  totalCurrentBalance: number;
  totalApprovedDeposits: number;
  totalApprovedWithdrawals: number;
  totalEarning: number;
};

type ApiError = {
  error?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

export default function EarningsPage() {
  const [totals, setTotals] = useState<FinancialTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTotals = async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;

      const res = await axios.get(`${BACKEND_URL}/admin/earnings/financial`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.data?.success) {
        setTotals(res.data.totals);
      } else {
        setError(res.data?.error || 'Failed to load earnings');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined;
        setError(data?.error || 'Failed to load earnings');
      } else {
        setError('Failed to load earnings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotals();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 mt-2 pb-16 px-4 bg-neutral-50 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <header className="flex items-end justify-between mt-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Earnings</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Approved deposits / withdrawals and current user balances.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTotals}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
          </header>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <section className="grid grid-cols-1 bg-gray-100 border border-neutral-200 sm:grid-cols-2 gap-1">
            <div className="bg-white rounded p-4">
              <div className="text-[11px] text-neutral-500">Total current balance (all users)</div>
              <div className="text-2xl font-mono text-neutral-900 mt-1">
                {Number(totals?.totalCurrentBalance ?? 0).toFixed(2)}  ETB
              </div>
            </div>
            <div className="bg-white rounded p-4">
              <div className="text-[11px] text-neutral-500">Total approved deposits</div>
              <div className="text-2xl font-mono text-emerald-700 mt-1">
                {Number(totals?.totalApprovedDeposits ?? 0).toFixed(2)} ETB
              </div>
            </div>
            <div className="bg-white rounded p-4">
              <div className="text-[11px] text-neutral-500">Total approved withdrawals</div>
              <div className="text-2xl font-mono text-amber-700 mt-1">
                -{Number(totals?.totalApprovedWithdrawals ?? 0).toFixed(2)} ETB
              </div>
            </div>
            <div className="bg-white rounded p-4">
              <div className="text-[12px] text-red-500">Total earning</div>
              <div className={`text-2xl font-mono mt-1 ${
                (totals?.totalEarning ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {(totals?.totalEarning ?? 0) >= 0 ? '+' : '-'}
                {Math.abs(Number(totals?.totalEarning ?? 0)).toFixed(2)} ETB
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Formula: deposits - withdrawals - outstanding balances
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
