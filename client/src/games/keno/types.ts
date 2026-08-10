// Types for Keno game

// For API request to play Keno
export interface PlayKenoRequest {
	bet: number;
	slot: number;
	selectedNumbers: number[];
}

// For API response from backend
export interface PlayKenoResponse {
	drawnNumbers: number[];
	matches: number[];
	win: number;
	newBalance: number;
}

// For BetSelector component
export interface BetSelectorProps {
	bet: number;
	setBet: (b: number) => void;
}

// For KenoPage state
export interface KenoPageState {
	selectedNumbers: number[];
	bet: number;
	slot: number;
	drawnNumbers: number[];
	showResult: boolean;
	animating: boolean;
}

// For payoutTable
export type PayoutTable = number[][];
