export type OpSymbol = '+' | '-' | '×'

export type NumberPuzzleStatus = 'waiting' | 'countdown' | 'active' | 'finished'

export type NumberPuzzleToken =
  | { type: 'number'; value: number; index: number }
  | { type: 'op'; value: OpSymbol }

export interface NumberPuzzlePlayer {
  userId: string | number
  name: string
  submitted: boolean
  expression?: string
  result?: number
  steps?: string[]
  joinedAt?: number
}

export interface NumberPuzzleWinner {
  userId: string | number
  name: string
  expression: string
  result: number
  steps: string[]
  computation?: string
}

export interface NumberPuzzleSession {
  id?: string
  stake: number | null
  status: NumberPuzzleStatus
  target: number
  numbers: number[]
  countdownEndsAt: number | null
  playEndsAt?: number | null
  players: NumberPuzzlePlayer[]
  winner: NumberPuzzleWinner | null
  solutionExpression: string | null
  solutionSteps?: string[]
  solutionResult?: number | null
  previousSolution?: {
    expression?: string | null;
    result?: number | null;
  }
}

export interface NumberPuzzleState {
  session: NumberPuzzleSession
  tokens: NumberPuzzleToken[]
  usedIndexes: number[]
  result: number | null
  error: string | null
  submitted: boolean
}

export interface NumberPuzzleWSEvents {
  'numberpuzzle:state': { session: NumberPuzzleSession }
  'numberpuzzle:player_joined': { session: NumberPuzzleSession }
  'numberpuzzle:game_over': { session: NumberPuzzleSession }
  'numberpuzzle:countdown_started': { countdownEndsAt: number; session?: NumberPuzzleSession }
  'numberpuzzle:game_started': { session: NumberPuzzleSession }
  'numberpuzzle:winner': { session: NumberPuzzleSession; winner: NumberPuzzleWinner }
  'numberpuzzle:round_reset': { session: NumberPuzzleSession }
  'numberpuzzle:player_counts': { stakeCounts: { [stake: string]: number } }
  'numberpuzzle:request_player_counts': Record<string, never>
}
