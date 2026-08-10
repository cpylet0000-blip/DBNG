/**
 * TypeScript types for Lottery game
 * Defines interfaces for lottery draws, tickets, and prizes
 */

export interface LotteryDraw {
  id: number
  drawDate: string
  winningNumbers: number[]
  jackpot: number
  status: 'upcoming' | 'active' | 'completed'
}

export interface LotteryTicket {
  id: number
  userId: number
  drawId: number
  numbers: number[]
  cost: number
  purchaseDate: string
  matched?: number
  prize?: number
}

export interface LotteryGameState {
  currentDraw: LotteryDraw | null
  myTickets: LotteryTicket[]
  pastDraws: LotteryDraw[]
}

export interface LotteryWinner {
  id: number
  lotteryId: number
  userId: number
  ticketNumber: number
  prizePosition: number // 1 for first prize, 2 for second, 3 for third
  prizeAmount: number
  prizeName: string
  createdAt: string
  user: {
    id: number
    username: string
    email: string
  }
}

export interface LotteryWithWinners {
  id: number
  drawDate: string
  stake: number
  jackpot: number
  firstPrize: number
  secondPrize: number
  thirdPrize: number
  totalTickets: number
  status: string // 'active', 'completed', 'cancelled'
  createdAt: string
  updatedAt: string
  winners?: LotteryWinner[]
  _count?: {
    tickets: number
  }
}
