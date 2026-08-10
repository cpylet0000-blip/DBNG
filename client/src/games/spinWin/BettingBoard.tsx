import React from 'react'

interface BettingBoardProps {
  placeBet: (type: string, value: string | number, odds: number) => void
  currentBet: number
  bets: Array<{
    type: string
    value: string | number
    amount: number
  }>
}

const BettingBoard: React.FC<BettingBoardProps> = ({ placeBet, currentBet, bets }) => {
  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  const sectors = ['A', 'B', 'C', 'D', 'E', 'F']
  const exactNumbers = Array.from({ length: 6 }, (_, rowIndex) =>
    Array.from({ length: 6 }, (_, columnIndex) => rowIndex + 1 + columnIndex * 6)
  ).flat()
  const gameButtonClass =
    'h-10 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold transition-colors border border-white/80'

  const getBetAmount = (type: string, value: string | number) => {
    if (type === 'exact') {
      const exactBet = bets.find((bet) => bet.type === 'exact')
      if (!exactBet) return 0

      const selectedNumbers = String(exactBet.value)
        .split(',')
        .map((entry) => Number(entry.trim()))
        .filter((entry) => Number.isInteger(entry))

      return selectedNumbers.includes(Number(value)) ? exactBet.amount : 0
    }

    const activeBet = bets.find((bet) => bet.type === type && String(bet.value) === String(value))
    return activeBet?.amount ?? 0
  }

  const getButtonClass = (baseClass: string, isActive: boolean) => {
    if (!isActive) return baseClass
    return `${baseClass} relative ring-2 ring-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.6)] animate-pulse`
  }

  const renderBetOverlay = (amount: number) => {
    if (amount <= 0) return null

    return (
      <>
        <span className="absolute inset-0 bg-linear-to-tr from-amber-200/20 to-white/10 pointer-events-none" />
        <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center border border-amber-100 shadow-md">
          {amount}
        </span>
      </>
    )
  }

  return (
    <div className="bg-sky-950 pb-3">
      <div className="p-2 mb-2 ">
        <div className="mb-1">
          {(() => {
            const zeroAmount = getBetAmount('exact', 0)
            const zeroActive = zeroAmount > 0
            return (
              <button
                onClick={() => placeBet('exact', 0, 36)}
                className={getButtonClass(
                  'w-full h-10 rounded text-lg font-semibold transition-colors overflow-hidden bg-emerald-600 hover:bg-emerald-700 text-white',
                  zeroActive
                )}
              >
                {renderBetOverlay(zeroAmount)}
                <span className="relative z-10">0</span>
              </button>
            )
          })()}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {exactNumbers.map((num) => {
            const amount = getBetAmount('exact', num)
            const isActive = amount > 0

            return (
              <button
                key={num}
                onClick={() => placeBet('exact', num, 36)}
                className={getButtonClass(
                  `h-10 rounded text-lg font-semibold transition-colors overflow-hidden ${RED_NUMBERS.includes(num)
                    ? 'bg-red-800 hover:bg-red-800 text-white'
                    : 'bg-black hover:bg-slate-800 text-white'
                  }`,
                  isActive
                )}
              >
                {renderBetOverlay(amount)}
                <span className="relative z-10">{num}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="text-xs uppercase tracking-wide text-emerald-100 mb-2 px-4  text-center ">Sector</div>
      <div className="grid grid-cols-6 gap-1 mb-4 px-4">
        {sectors.map((sector) => {
          const amount = getBetAmount('sector', sector)
          return (
            <button
              key={sector}
              onClick={() => placeBet('sector', sector, 6)}
              className={getButtonClass(`${gameButtonClass} overflow-hidden`, amount > 0)}
            >
              {renderBetOverlay(amount)}
              <span className="relative z-10">{sector}</span>
            </button>
          )
        })}
      </div>
      <div className="text-xs uppercase tracking-wide text-emerald-100 mb-2 px-4 text-center">DOZENS</div>
      <div className="grid grid-cols-3 gap-2 mb-2 px-4 ">

        {[
          { type: 'dozen1', value: '1-12', label: '1~12' },
          { type: 'dozen2', value: '13-24', label: '13~24' },
          { type: 'dozen3', value: '25-36', label: '25~36' }
        ].map((item) => {
          const amount = getBetAmount(item.type, item.value)
          return (
            <button
              key={item.type}
              onClick={() => placeBet(item.type, item.value, 3)}
              className={getButtonClass(`${gameButtonClass} overflow-hidden`, amount > 0)}
            >
              {renderBetOverlay(amount)}
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>
      <div className="text-xs uppercase tracking-wide text-emerald-100 mb-2 px-4 text-center">EVEN/ODD</div>
      <div className="grid grid-cols-2 gap-2 mb-3 px-4">
        {[
          { type: 'even', value: 'EVEN', label: 'EVEN' },
          { type: 'odd', value: 'ODD', label: 'ODD' }
        ].map((item) => {
          const amount = getBetAmount(item.type, item.value)
          return (
            <button
              key={item.type}
              onClick={() => placeBet(item.type, item.value, 2)}
              className={getButtonClass(
                'h-10 rounded border border-white/80 text-emerald-100 font-semibold transition-colors hover:bg-emerald-800/40 overflow-hidden',
                amount > 0
              )}
            >
              {renderBetOverlay(amount)}
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="text-xs uppercase tracking-wide text-emerald-100 mb-2 px-4 text-center">COLORS</div>
      <div className="grid grid-cols-3 gap-2 mb-3 px-4">
        {[
          { type: 'red', value: 'RED', label: 'Red', className: 'h-10 rounded bg-red-700 hover:bg-red-800 text-white font-semibold transition-colors overflow-hidden' },
          { type: 'black', value: 'BLACK', label: 'Black', className: 'h-10 rounded bg-black hover:bg-slate-800 text-white font-semibold transition-colors overflow-hidden' },
          { type: 'green', value: 'GREEN', label: 'Green', className: 'h-10 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors overflow-hidden' }
        ].map((item) => {
          const amount = getBetAmount(item.type, item.value)
          return (
            <button
              key={item.type}
              onClick={() => placeBet(item.type, item.value, item.type === 'green' ? 36 : 2)}
              className={getButtonClass(item.className, amount > 0)}
            >
              {renderBetOverlay(amount)}
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>
      <div className="text-xs uppercase tracking-wide text-emerald-100 mb-2 px-4 text-center">LOW/HIGH</div>
      <div className="grid grid-cols-2 gap-2 mb-3 px-4">
        {[
          { type: 'low', value: '1-18', label: '1-18' },
          { type: 'high', value: '19-36', label: '19-36' }
        ].map((item) => {
          const amount = getBetAmount(item.type, item.value)
          return (
            <button
              key={item.type}
              onClick={() => placeBet(item.type, item.value, 2)}
              className={getButtonClass(`${gameButtonClass} overflow-hidden`, amount > 0)}
            >
              {renderBetOverlay(amount)}
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="text-xs uppercase tracking-wide text-emerald-100 mb-2 px-4 text-center">Extra Bet</div>
      <div className="grid grid-cols-4 gap-2 mb-3 px-4 max-w-4xl mx-auto ">
        {[
          { type: 'low-red', value: '1-18 (Red)', label: '1-18', className: 'h-10 rounded bg-red-700 hover:bg-red-800 text-white text-sm font-semibold transition-colors overflow-hidden' },
          { type: 'high-red', value: '19-36 (Red)', label: '19-36', className: 'h-10 rounded bg-red-700 hover:bg-red-800 text-white text-sm font-semibold transition-colors overflow-hidden' },
          { type: 'low-black', value: '1-18 (Black)', label: '1-18', className: 'h-10 rounded bg-black hover:bg-slate-800 text-white text-sm font-semibold transition-colors overflow-hidden' },
          { type: 'high-black', value: '19-36 (Black)', label: '19-36', className: 'h-10 rounded bg-black hover:bg-slate-800 text-white text-sm font-semibold transition-colors overflow-hidden' }
        ].map((item) => {
          const amount = getBetAmount(item.type, item.value)
          return (
            <button
              key={item.type}
              onClick={() => placeBet(item.type, item.value, 4)}
              className={getButtonClass(item.className, amount > 0)}
            >
              {renderBetOverlay(amount)}
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BettingBoard;
