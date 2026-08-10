/**
 * TypeScript types for Poker game
 * Defines card types, hand rankings, player states, and game flow
 */

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: CardSuit
  rank: CardRank
}

export type HandRanking =
  | 'High Card'
  | 'Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush'

export interface PokerPlayer {
  id: number
  name: string
  avatar?: string
  chips: number
  hand: Card[]
  currentBet: number
  hasFolded: boolean
  isDealer: boolean
  isActive: boolean
}

export interface PokerRoom {
  id: string
  name: string
  minBuyIn: number
  maxPlayers: number
  currentPlayers: number
  smallBlind: number
  bigBlind: number
  status: 'waiting' | 'active' | 'finished'
}

export type PokerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in'

export interface PokerGameState {
  room: PokerRoom | null
  players: PokerPlayer[]
  communityCards: Card[]
  pot: number
  currentTurn: number | null
  dealer: number | null
  round: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown'
  myHand: Card[]
  myChips: number
}
