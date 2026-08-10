import React from 'react'

const PayoutTable: React.FC = () => {
  const payoutData = [
    { betType: 'Exact Number', odds: '36:1' },
    { betType: 'Red/Black', odds: '2:1' },
    { betType: 'Green (0)', odds: '36:1' },
    { betType: 'Even/Odd', odds: '2:1' },
    { betType: 'Low/High', odds: '2:1' },
    { betType: 'Dozens', odds: '3:1' },
    { betType: 'Sectors', odds: '6:1' },
    { betType: 'Low/High + Color', odds: '4:1' }
  ]

  return (
    <div className="rounded-2xl border border-emerald-700/40 bg-linear-to-br from-slate-900 via-slate-950 to-emerald-950/30 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
      <h3 className="mb-4 text-lg font-bold tracking-wide text-emerald-100">Payout Table</h3>

      <div className="overflow-hidden rounded-xl border border-emerald-800/60 bg-slate-900/70">
        <table className="min-w-full">
          <thead className="border-b border-emerald-700/40 bg-emerald-950/40">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/90">Bet Type</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/90">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-900/60">
            {payoutData.map((bet, index) => (
              <tr key={index} className="transition-colors hover:bg-emerald-900/20">
                <td className="px-4 py-3 text-sm font-medium text-slate-100">{bet.betType}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex min-w-16 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
                    {bet.odds}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PayoutTable;