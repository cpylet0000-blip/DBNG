/**
 * New Bingo Types for Fixed Stake Rooms
 */

// Valid stake levels
export type BingoStake = 10 | 20 | 50  | 100

// Bingo card (200 per stake)
export interface BingoCard {
  cardId: number // 1-200
  numbers: number[] // 25 numbers
  isAvailable: boolean
  playerName?: string // If card is taken
}

// Player in session
export interface BingoPlayer {
  userId: number
  name: string
  cardId: number
  cardNumbers: number[]
  markedCells: number[]
  autoMark: boolean
}

// Game session (per stake per room)
export interface BingoSession {
  id: number
  stake: BingoStake
  roomNumber?: number
  status: 'waiting' | 'countdown' | 'active' | 'finished'
  calledNumbers: number[]
  countdownEndsAt: number | null // Timestamp
  players: BingoPlayer[]
  winner: {
    // Single winner (backward compatibility)
    userId?: number
    name?: string
    cardId?: number
    cardNumbers?: number[]
    pattern?: string
    winningCells?: number[]
    // Multiple winners
    multipleWinners?: true
    winners?: Array<{
      userId: number
      name: string
      cardId: number
      cardNumbers?: number[]
      prize: number
      bonus: number
      totalAwarded: number
      pattern: string
      winningCells: number[]
    }>
    totalPrize?: number
    individualPrize?: number
    winnersCount?: number
  } | null
}

// Client game state
export interface BingoGameState {
  selectedStake: BingoStake | null
  selectedRoom?: number
  availableCards: BingoCard[]
  myCards: Array<{
    id: number
    numbers: number[]
    markedCells: number[]
  }>
  session: BingoSession | null
  autoMark: boolean
  isInQueue: boolean // Game active, waiting for next round
  view: 'stake-select' | 'card-select' | 'game' | 'queue'
  balance?: number
}

// WebSocket events
export interface BingoWSEvents {
  // Outgoing
  'bingo:select_card': { stake: BingoStake; userId: number; cardId: number }
  'bingo:toggle_automark': { stake: BingoStake; userId: number; autoMark: boolean }
  'bingo:mark': { stake: BingoStake; userId: number; cellIndex: number; mark: boolean }
  'bingo:claim': { stake: BingoStake; userId: number }

  // Incoming
  'bingo:player_joined': { player: BingoPlayer; session: BingoSession }
  'bingo:countdown_started': { countdownEndsAt: number }
  'bingo:game_started': { stake: BingoStake }
  'bingo:ball_drawn': { number: number; calledNumbers: number[] }
  'bingo:cell_marked': { userId: number; cellIndex: number; mark: boolean; markedCells: number[] }
  'bingo:automark_updated': { autoMark: boolean; markedCells?: number[] }
  'bingo:game_won': {
    // Single winner (backward compatibility)
    winnerId?: number
    winnerName?: string
    cardId?: number
    cardNumbers?: number[]
    prize?: number
    pattern?: string
    winningCells?: number[]
    // Multiple winners
    multipleWinners?: true
    winners?: Array<{
      winnerId: number
      winnerName: string
      cardId: number
      cardNumbers?: number[]
      prize: number
      bonus: number
      totalAwarded: number
      pattern: string
      winningCells: number[]
    }>
    totalPrize?: number
    individualPrize?: number
    winnersCount?: number
    calledNumbers?: number[]
  }
  'bingo:game_over': { stake: BingoStake; reason: string }
  'bingo:game_reset': { stake: BingoStake; session: BingoSession }
}
