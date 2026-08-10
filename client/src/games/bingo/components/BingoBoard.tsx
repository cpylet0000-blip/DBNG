interface BingoBoardProps {
  calledNumbers: number[]
}

export const BingoBoard = ({ calledNumbers }: BingoBoardProps) => {
  const columns = [
    { letter: 'B', numbers: Array.from({ length: 15 }, (_, i) => i + 1) },
    { letter: 'I', numbers: Array.from({ length: 15 }, (_, i) => i + 16) },
    { letter: 'N', numbers: Array.from({ length: 15 }, (_, i) => i + 31) },
    { letter: 'G', numbers: Array.from({ length: 15 }, (_, i) => i + 46) },
    { letter: 'O', numbers: Array.from({ length: 15 }, (_, i) => i + 61) },
  ]

  const lastCalled = calledNumbers[calledNumbers.length - 1]

  return (
    <div className="bg-slate-800 rounded-lg p-4 ">
      <div className="text-center mb-4">
        <div className="text-sm text-slate-400 mb-2">Last Called</div>
        <div className="text-5xl font-bold text-yellow-400">
          {lastCalled || '-'}
        </div>
        <div className="text-sm text-slate-400 mt-2">
          {calledNumbers.length} / 75 balls called
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {columns.map((col) => (
          <div key={col.letter}>
            {/* Column Header */}
            <div className="text-center font-bold text-yellow-400 text-xl mb-2">
              {col.letter}
            </div>
            
            {/* Column Numbers */}
            <div className="space-y-1">
              {col.numbers.map((num) => {
                const isCalled = calledNumbers.includes(num)
                const isLast = num === lastCalled

                return (
                  <div
                    key={num}
                    className={`
                      text-center py-1 rounded text-sm font-semibold transition-all
                      ${
                        isLast
                          ? 'bg-yellow-400 text-slate-900 ring-2 ring-yellow-300 scale-110'
                          : isCalled
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }
                    `}
                  >
                    {num}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
