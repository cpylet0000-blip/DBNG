/**
 * Card List Modal Component
 * Shows all player cards in a scrollable list for selection
 */

import { X } from 'lucide-react'

interface Card {
  id: number
  numbers: number[]
  markedCells: number[]
}

interface CardListModalProps {
  cards: Card[]
  calledNumbers: number[]
  currentCardId: number
  onSelectCard: (cardId: number) => void
  onClose: () => void
}

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O']

export const CardListModal = ({
  cards,
  calledNumbers,
  currentCardId,
  onSelectCard,
  onClose,
}: CardListModalProps) => {
  const isCellCalled = (card: Card, cellIndex: number) => {
    const number = card.numbers[cellIndex]
    return calledNumbers.includes(number)
  }

  const isCellMarked = (card: Card, cellIndex: number) => {
    return card.markedCells.includes(cellIndex)
  }

  // Convert row-major array to column-major for proper BINGO display
  const getColumnMajorIndex = (rowIndex: number): number => {
    const row = Math.floor(rowIndex / 5)
    const col = rowIndex % 5
    return col * 5 + row
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border-2 border-yellow-400 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-yellow-400/30">
          <h2 className="text-2xl font-bold text-yellow-400">My Cards ({cards.length})</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Card List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const isCurrentCard = card.id === currentCardId
              
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    onSelectCard(card.id)
                    onClose()
                  }}
                  className={`
                    rounded-xl border-2 p-3 cursor-pointer transition-all
                    ${isCurrentCard 
                      ? 'border-yellow-400 bg-yellow-400/10 shadow-lg scale-105' 
                      : 'border-slate-600 bg-slate-900 hover:border-yellow-500/50 hover:bg-slate-800'
                    }
                  `}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-yellow-400 font-bold text-lg">
                      Card #{card.id}
                    </div>
                    {isCurrentCard && (
                      <span className="text-xs bg-yellow-400 text-slate-900 px-2 py-1 rounded font-bold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {BINGO_LETTERS.map((letter, i) => {
                      const colorStyles = [
                        'from-yellow-400 to-yellow-600',
                        'from-blue-400 to-blue-600',
                        'from-pink-400 to-pink-600',
                        'from-green-400 to-green-600',
                        'from-purple-400 to-purple-600',
                      ]
                      return (
                        <div
                          key={letter}
                          className={`flex items-center justify-center text-sm font-extrabold bg-linear-to-br ${colorStyles[i]} text-white rounded border border-white/30`}
                          style={{ height: 24, fontSize: '12px' }}
                        >
                          {letter}
                        </div>
                      )
                    })}
                  </div>

                  {/* Card Numbers Grid */}
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 25 }, (_, index) => {
                      const colMajorIndex = getColumnMajorIndex(index)
                      const number = card.numbers[colMajorIndex]
                      const isFree = colMajorIndex === 12
                      const marked = isCellMarked(card, colMajorIndex)
                      const called = isCellCalled(card, colMajorIndex)

                      return (
                        <div
                          key={index}
                          className={`
                            aspect-square rounded flex items-center justify-center text-xs font-bold
                            ${
                              isFree
                                ? 'bg-yellow-400 text-slate-900'
                                : marked
                                ? 'bg-green-500 text-white'
                                : called
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-700 text-white'
                            }
                          `}
                          style={{ minWidth: 0, fontSize: '10px' }}
                        >
                          {isFree ? '★' : number}
                        </div>
                      )
                    })}
                  </div>

                  {/* Marked Count */}
                  <div className="mt-2 text-center text-xs text-slate-400">
                    {card.markedCells.length} marked
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-yellow-400/30">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-700 rounded" />
              <span>Not Called</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Called</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Marked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
