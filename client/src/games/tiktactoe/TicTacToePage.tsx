import { useState, useEffect } from 'react'
import { useTicTacToeRoom } from './hooks/useTicTacToeRoom'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Trophy, 
  Clock, 
  Sparkles, 
  Target,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

declare global {
  interface Window {
    _tictactoe_ws?: WebSocket
  }
}

export const TicTacToePage: React.FC = () => {
  const [stake, setStake] = useState<number | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Extract Telegram user info
  const getTelegramUser = () => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (tgUser) {
      return {
        userId: tgUser.id,
        username: tgUser.username || tgUser.first_name || 'Player',
        photoUrl: tgUser.photo_url || null
      }
    }
    return {
      userId: Math.floor(Math.random() * 1000000),
      username: 'Player' + Math.floor(Math.random() * 1000),
      photoUrl: null
    }
  }

  const [{ userId, username, photoUrl }] = useState(getTelegramUser)
  const [joined, setJoined] = useState(false)
  const allowedStakes = [5, 10, 15, 25]
  const [stakeCounts, setStakeCounts] = useState<{ [key: number]: number }>({})
  const [countdown, setCountdown] = useState<number | null>(null)

  // Use custom hook for game state
  const { state, makeMove, resetGame, joinGame } = useTicTacToeRoom(
    joined ? userId : null,
    joined ? username : '',
    stake ?? 5,
    setStakeCounts,
    setCountdown,
    setJoined
  )

  // Join game when user clicks join button
  useEffect(() => {
    if (joined && userId && username && stake && !isJoining) {
      setIsJoining(true)
      joinGame()
      setTimeout(() => setIsJoining(false), 2000)
    }
  }, [joined, userId, username, stake, joinGame])

  const board = state.game?.board ?? Array(9).fill(null)
  const winnerName = state.game?.winnerId
    ? state.players.find(p => String(p.userId) === String(state.game?.winnerId))?.username
    : null
  const outcome = state.game?.status === 'finished'
    ? state.game?.winnerId === null
      ? 'draw'
      : String(state.game?.winnerId) === String(userId)
        ? 'win'
        : 'lose'
    : null
  const currentTurn = state.game?.currentTurn
  const isMyTurn = state.isMyTurn
  const players = state.players
  const waiting = state.game?.status === 'waiting'
  const gameStatus = state.game?.status

  // Get current player info
  const currentPlayer = players.find(p => p.symbol === currentTurn)
  const myPlayer = players.find(p => p.userId === userId)
  const opponent = players.find(p => p.userId !== userId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
      {/* Header */}
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
          Tic Tac Toe
        </h1>
       
      </div>

      {/* Main Game Container */}
      <div className="max-w-md mx-auto space-y-4">
        {/* Stake Selection / Game Info */}
        <div className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4">
          {!joined ? (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-200 mb-1">Choose Your Stake</h2>
                <p className="text-slate-400 text-sm">Select amount to join a game</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {allowedStakes.map(s => (
                  <button
                    key={s}
                    onClick={() => setStake(s)}
                    className={`relative rounded-xl p-4 border-2 transition-all duration-200 active:scale-95 ${
                      stake === s
                        ? 'border-yellow-400 bg-gradient-to-br from-yellow-400/20 to-amber-500/20'
                        : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-2xl font-bold mb-1 ${
                        stake === s ? 'text-yellow-400' : 'text-slate-300'
                      }`}>
                        {s} ETB
                      </div>
                      <div className={`text-xs ${(stakeCounts[s] ?? 0) > 0 ? 'text-yellow-400 bg-gradient-to-r from-yellow-400/10 to-amber-500/10' : 'text-slate-500'}`}>
                        {(stakeCounts[s] ?? 0) > 0 ? '👥 Players waiting' : '🕐 Available'}
                      </div>
                    </div>
                    {stake === s && (
                      <div className="absolute -top-2 -right-2">
                        <Sparkles size={16} className="text-yellow-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                  !stake
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                }`}
                disabled={!stake || isJoining}
                onClick={() => setJoined(true)}
              >
                {isJoining ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Joining...
                  </>
                ) : stake ? (
                  `Join for ${stake} ETB`
                ) : (
                  'Select Stake First'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Game Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border border-yellow-400/20">
                    <span className="font-bold text-yellow-400">{stake} ETB</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700">
                    <Users size={16} className="text-slate-400 inline mr-2" />
                    <span className="text-sm font-medium text-slate-300">{players.length}/2</span>
                  </div>
                </div>
                
                {countdown !== null && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Clock size={16} className="text-blue-400" />
                    <span className="font-bold text-blue-400">{countdown}</span>
                  </div>
                )}
              </div>

              {/* Players Display */}
              <div className="grid grid-cols-2 gap-3">
                {players.map((player) => (
                  <div
                    key={player.userId}
                    className={`rounded-xl p-3 border transition-all ${
                      player.userId === userId
                        ? 'bg-gradient-to-br from-yellow-400/10 to-amber-500/10 border-yellow-400/30'
                        : 'bg-slate-900/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        player.symbol === 'X'
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
                      }`}>
                        {player.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200 truncate text-sm">{player.username}</p>
                        <p className="text-xs text-slate-500">You</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Game Status Messages */}
              <div className="rounded-xl p-4 bg-slate-900/50 border border-slate-700">
                {outcome ? (
                  <div className="text-center space-y-2">
                    <div className="inline-block p-2 rounded-full bg-gradient-to-r from-yellow-400/10 to-amber-500/10">
                      <Trophy className="w-8 h-8 text-yellow-400 mx-auto" />
                    </div>
                    <h3 className={`text-xl font-bold ${
                      outcome === 'draw'
                        ? 'text-orange-400'
                        : outcome === 'win'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                    }` }>
                      {outcome === 'draw'
                        ? '🤝 Draw!'
                        : outcome === 'win'
                          ? '🎉 Victory!'
                          : '😓 Defeat'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {outcome === 'draw'
                        ? `Each loses ${Math.floor((stake || 0) * 0.4)} ETB`
                        : outcome === 'win'
                          ? `You beat ${winnerName ?? 'opponent'} and win ${Math.floor((stake || 0) * 2 * 0.9)} ETB`
                          : `You lost to ${winnerName ?? 'opponent'}. Stake lost.`}
                    </p>
                  </div>
                ) : countdown !== null ? (
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-600/10">
                      <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
                      <span className="font-bold text-blue-400">Starting in {countdown}</span>
                    </div>
                    <p className="text-slate-400 text-sm">Get ready to play!</p>
                  </div>
                ) : waiting ? (
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-600/10 animate-pulse">
                      <AlertCircle className="w-5 h-5 text-blue-400" /> 
                      <span className="font-medium text-blue-400">Waiting for opponent</span>
                    </div>
                    <p className="text-slate-400 text-sm">Invite a friend to join!</p>
                  </div>
                ) : currentTurn && currentPlayer ? (
                  <div className="text-center space-y-3">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                      isMyTurn
                        ? 'bg-gradient-to-r from-emerald-500/10 to-green-600/10'
                        : 'bg-gray-300'
                    }`}>
                      {isMyTurn ? (
                        <Target className="w-5 h-5 text-emerald-400 animate-pulse" />
                      ) : null}
                      <span className={`font-bold ${isMyTurn ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {isMyTurn ? 'Your Turn!' : `${currentPlayer.username}'s Turn`}
                      </span>
                    </div>
                    {isMyTurn && (
                      <p className="text-slate-400 text-sm">Tap an empty cell to place your {myPlayer?.symbol}</p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Game Board */}
        {joined && board && (
          <div className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4">
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => makeMove(index)}
                  disabled={!!cell || !isMyTurn || !!outcome || waiting}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                    cell === 'X'
                      ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-400/25'
                      : cell === 'O'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25'
                      : isMyTurn && !cell && !outcome
                      ? 'bg-slate-900/50 border-2 border-blue-700 hover:border-yellow-400/50 hover:bg-slate-800/50 active:bg-slate-800'
                      : 'bg-slate-900/30 border-2 border-blue-800'
                  }`}
                >
                  {cell && (
                    <span className={`text-4xl font-bold ${
                      cell === 'X' ? 'text-slate-900' : 'text-white'
                    }`}>
                      {cell}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Game Controls */}
            <div className="mt-6 space-y-3">
              {outcome && (
                <button
                  onClick={resetGame}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                >
                  <RefreshCw size={20} />
                  Play Again
                </button>
              )}
              
              {/* Hint for new players */}
              {!outcome && players.length === 1 && (
                <div className="text-center p-3 rounded-lg bg-slate-900/30 border border-slate-700/50">
                  <p className="text-slate-400 text-sm">
                    ⏳ Waiting for opponent to join your {stake} ETB game...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}