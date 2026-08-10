import React from 'react'

const PayoutTable: React.FC = () => {
  const payoutData = [
    { betType: 'Exact Number', odds: '36:1', icon: '●' },
    { betType: 'Red / Black', odds: '2:1', icon: '◆' },
    { betType: 'Green (0)', odds: '36:1', icon: '0' },
    { betType: 'Even / Odd', odds: '2:1', icon: '±' },
    { betType: 'Low / High', odds: '2:1', icon: '↕' },
    { betType: 'Dozens', odds: '3:1', icon: '⅓' },
    { betType: 'Sectors', odds: '6:1', icon: '◈' },
    { betType: 'Low / High + Color', odds: '4:1', icon: '✦' },
  ]

  return (
    <div className="w-full overflow-hidden rounded-t-md bg-[#101318]">

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto] items-center border-b border-white/[0.06] bg-white/[0.015] px-4 py-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
          Bet Type
        </span>

        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
          Payout
        </span>
      </div>

      {/* Rows */}
      <div>
        {payoutData.map((bet, index) => (
          <div
            key={bet.betType}
            className="
              grid
              grid-cols-[1fr_auto]
              items-center
              border-b border-white/[0.045]
              px-4
              py-2
              last:border-0
              transition-colors
              hover:bg-white/[0.025]
            "
          >

            {/* Bet */}
            <div className="flex min-w-0 items-center gap-2.5">

              {/* Number */}
              <span className="w-4 shrink-0 text-[9px] font-medium text-white/20">
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Icon */}
              <div
                className="
                  flex h-7 w-7 shrink-0
                  items-center justify-center
                  rounded-lg
                  border border-white/[0.07]
                  bg-white/[0.025]
                  text-[10px]
                  text-white/50
                  transition-colors
                  group-hover:border-blue-500/20
                "
              >
                {bet.icon}
              </div>

              {/* Name */}
              <span className="truncate text-[12px] font-medium text-white/80">
                {bet.betType}
              </span>

            </div>

            {/* Payout */}
            <span
              className="
                ml-3
                inline-flex
                min-w-[42px]
                items-center
                justify-center
                rounded-lg
                border border-blue-500/25
                bg-blue-500/[0.07]
                px-2
                py-1
                text-[10px]
                font-bold
                tracking-wide
                text-[#e5c65c]
              "
            >
              {bet.odds}
            </span>

          </div>
        ))}
      </div>

    </div>
  )
}

export default PayoutTable