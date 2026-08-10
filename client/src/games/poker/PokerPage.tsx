/**
 * Main Poker Component
 * Texas Hold'em poker table with betting rounds
 */

import { useState } from 'react'
import type { Card, PokerAction } from './types'

const sampleCards: Card[] = [
  { suit: 'hearts', rank: 'A' },
  { suit: 'spades', rank: 'K' },
]

export const PokerPage = () => {
  const [myChips] = useState(1000)
  const [pot] = useState(150)
  const [currentBet] = useState(50)

  const renderCard = (card: Card) => {
    const suitSymbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    }
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds'

    return (
      <div className="w-16 h-24 rounded-lg bg-white border-2 border-slate-300 flex flex-col items-center justify-between p-2">
        <div className={`text-xl font-bold ${isRed ? 'text-red-500' : 'text-slate-900'}`}>
          {card.rank}
        </div>
        <div className={`text-3xl ${isRed ? 'text-red-500' : 'text-slate-900'}`}>
          {suitSymbols[card.suit]}
        </div>
      </div>
    )
  }

  const handleAction = (action: PokerAction) => {
    console.log(`Action: ${action}`)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Texas Hold'em Poker</h2>
        <p className="text-slate-400">Multiplayer poker table</p>
      </div>

      {/* Poker Table */}
      <div className="rounded-xl border border-slate-700 bg-linear-to-br from-green-900 to-green-800 p-8">
        {/* Community Cards */}
        <div className="mb-8">
          <div className="text-center text-sm text-slate-300 mb-3">Community Cards</div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-16 h-24 rounded-lg bg-slate-700 border-2 border-slate-600 flex items-center justify-center"
              >
                <div className="text-slate-500 text-2xl">?</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pot */}
        <div className="text-center mb-8">
          <div className="inline-block px-6 py-3 rounded-full bg-slate-900/80 border border-yellow-400">
            <div className="text-yellow-400 font-bold text-lg">Pot: {pot} ETB</div>
          </div>
        </div>

        {/* Player Positions (simplified) */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg bg-slate-900/80 border border-slate-700 p-3 text-center"
            >
              <div className="text-sm font-semibold text-slate-300">Player {i}</div>
              <div className="text-xs text-slate-500 mt-1">1000 ETB</div>
            </div>
          ))}
        </div>

        {/* My Hand */}
        <div className="bg-slate-900/80 rounded-xl border border-yellow-400 p-4">
          <div className="text-center text-sm text-slate-300 mb-3">Your Hand</div>
          <div className="flex justify-center gap-2 mb-4">{sampleCards.map(renderCard)}</div>
          <div className="text-center text-sm text-slate-400 mb-4">
            Your Chips: {myChips} ETB | Current Bet: {currentBet} ETB
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleAction('fold')}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition"
            >
              Fold
            </button>
            <button
              onClick={() => handleAction('check')}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition"
            >
              Check
            </button>
            <button
              onClick={() => handleAction('call')}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition"
            >
              Call
            </button>
            <button
              onClick={() => handleAction('raise')}
              className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
            >
              Raise
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-500">
        Full multiplayer implementation coming soon
      </div>
    </div>
  )
}
