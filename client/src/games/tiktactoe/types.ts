/**
 * TypeScript types for Tic Tac Toe game
 * Defines interfaces for game state, moves, and players
 */

export type CellValue = 'X' | 'O' | null
export type GameStatus = 'waiting' | 'active' | 'finished'
export type Player = 'X' | 'O'

export interface TicTacToeGame {
  id: number
  board: CellValue[]
  currentTurn: Player
  status: GameStatus
  winnerId?: number | null
  stake: number
}

export interface TicTacToePlayer {
  userId: number
  username: string
  symbol: Player
}

export interface TicTacToeGameState {
  game: TicTacToeGame | null
  players: TicTacToePlayer[]
  mySymbol: Player | null
  isMyTurn: boolean
}
