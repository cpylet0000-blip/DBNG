'use client';


import { useMemo, useState } from 'react';
import axios from 'axios';
import { RotateCcw, Trophy, AlertTriangle, Sparkles } from 'lucide-react';
type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TOTAL';
type LeaderboardType = 'PLAY' | 'INVITATION' | 'ALL';
type ResetScope = 'CURRENT' | 'ALL_HISTORY';

type ResetResult = {
  period: LeaderboardPeriod;
  type: LeaderboardType;
  scope: ResetScope;
  updatedRows: number;
};

type ResetResponse = {
  success: boolean;
  message: string;
  reset: ResetResult;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

const periodOptions: LeaderboardPeriod[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'TOTAL'];
const typeOptions: LeaderboardType[] = ['PLAY', 'INVITATION', 'ALL'];
const scopeOptions: ResetScope[] = ['CURRENT', 'ALL_HISTORY'];

const toLabel = (value: string) => {
  if (value === 'ALL_HISTORY') return 'All History';
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export default function LeaderboardAdminPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('DAILY');
  const [type, setType] = useState<LeaderboardType>('PLAY');
  const [scope, setScope] = useState<ResetScope>('CURRENT');
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState<ResetResult | null>(null);

  const quickActions = useMemo(
    () =>
      periodOptions.flatMap((p) =>
        (['PLAY', 'INVITATION'] as const).map((t) => ({
          period: p,
          type: t,
          label: `${toLabel(p)} ${toLabel(t)}`,
        })),
      ),
    [],
  );

  const executeReset = async (
    targetPeriod: LeaderboardPeriod,
    targetType: LeaderboardType,
    targetScope: ResetScope,
  ) => {
    const confirmation = window.confirm(
      `Reset ${toLabel(targetPeriod)} ${toLabel(targetType)} leaderboard values to 0?\n\nScope: ${toLabel(targetScope)}`,
    );

    if (!confirmation) return;

    setBusy(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await axios.post<ResetResponse>(
        `${BACKEND_URL}/admin/leaderboard/reset`,
        {
          period: targetPeriod,
          type: targetType,
          scope: targetScope,
        },
        { withCredentials: true },
      );

      const payload = res.data;
      setLastResult(payload.reset);
      setSuccessMsg(
        `${payload.reset.updatedRows} row(s) reset for ${toLabel(payload.reset.period)} ${toLabel(payload.reset.type)} (${toLabel(payload.reset.scope)}).`,
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.error || 'Failed to reset leaderboard data.');
      } else {
        setErrorMsg('Failed to reset leaderboard data.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <main className=" pt-20 pb-16 px-4 bg-linear-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100">
        <div className="max-w-6xl mx-auto space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 text-gray-900 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Leaderboard Reset</h1>
                <p className="text-sm text-gray-600">
                  Reset leaderboard values to zero by period and type from admin.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Period</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as LeaderboardPeriod)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                >
                  {periodOptions.map((item) => (
                    <option key={item} value={item}>
                      {toLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Type</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as LeaderboardType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                >
                  {typeOptions.map((item) => (
                    <option key={item} value={item}>
                      {toLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Scope</span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ResetScope)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                >
                  {scopeOptions.map((item) => (
                    <option key={item} value={item}>
                      {toLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => executeReset(period, type, scope)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                {busy ? 'Resetting...' : `Reset ${toLabel(period)} ${toLabel(type)}`}
              </button>

              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <AlertTriangle className="w-4 h-4" />
                This action sets selected leaderboard values to zero.
              </span>
            </div>

            {successMsg && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 text-green-700 p-3 text-sm">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
                {errorMsg}
              </div>
            )}

            {lastResult && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="font-medium mb-1">Last reset result</div>
                <div>
                  {toLabel(lastResult.period)} / {toLabel(lastResult.type)} / {toLabel(lastResult.scope)}
                </div>
                <div>{lastResult.updatedRows} row(s) updated</div>
              </div>
            )}
          </section>

        {/*
                  <section className="bg-white rounded-xl border border-gray-200 text-gray-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold">Quick reset actions</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <button
                  key={`${action.period}-${action.type}`}
                  type="button"
                  disabled={busy}
                  onClick={() => executeReset(action.period, action.type, 'CURRENT')}
                  className="text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 px-3 py-3 disabled:opacity-60"
                >
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500 mt-1">Current bucket only</div>
                </button>
              ))}
            </div>
          </section>
        */}
        </div>
      </main>
    </>
  );
}
