import { useEffect, useRef, useState } from 'react';
import type { TicTacToeGameState } from '../types';

export function useTicTacToeRoom(userId: number | null, username: string, stake: number, setStakeCounts?: (counts: { [key: number]: number }) => void, setCountdown?: (countdown: number | null) => void, setJoined?: (joined: boolean) => void) {
	const [state, setState] = useState<TicTacToeGameState>({
		game: null,
		players: [],
		mySymbol: null,
		isMyTurn: false,
	});
	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		// Always connect to receive stake counts, even before join
		// Reuse existing global connection if present
		if (window._tictactoe_ws && window._tictactoe_ws.readyState === 1) {
			console.log('[Frontend] WebSocket already connected, reusing existing connection');
			ws.current = window._tictactoe_ws;
		} else {
			// Build URL conditionally: omit userId if not available
			const base = import.meta.env.VITE_WS_URL as string;
			const url = new URL(base);
			if (userId !== null && userId !== undefined) {
				url.searchParams.set('userId', String(userId));
			}
			if (username) {
				url.searchParams.set('username', username);
			}
			console.log('[Frontend] Creating new WebSocket connection:', url.toString());
			ws.current = new WebSocket(url.toString());
			window._tictactoe_ws = ws.current; // Make ws globally accessible for stakeCounts
		}
		
		ws.current.onopen = () => {
			console.log('[Frontend] WebSocket connected for user:', userId, username);
		};
		
		ws.current.onmessage = (event) => {
			const msg = JSON.parse(event.data);
			console.log('[Frontend] Received event:', msg.event, msg.data);
			
			// Handle game state updates
			if (msg.event === 'tictactoe:joined' || msg.event === 'tictactoe:update' || msg.event === 'tictactoe:started' || msg.event === 'tictactoe:gameover') {
				const { players, currentTurn, status, board, stake } = msg.data;
				const me = players.find((p: { userId: number | string; symbol: string }) => String(p.userId) === String(userId));
				setState({
					game: { 
						id: msg.data.id,
						board: board || Array(9).fill(null),
						currentTurn: currentTurn || 'X',
						status: status || 'waiting',
						stake: stake || 5,
						winnerId: msg.data.winnerId ?? null
					},
					players,
					mySymbol: me?.symbol ?? null,
					isMyTurn: currentTurn === me?.symbol && status === 'active',
				});
			}
			
			// Handle stake counts
			if (msg.event === 'tictactoe:stake_counts' && setStakeCounts) {
				console.log('[Frontend] Updating stake counts:', msg.data.stakeCounts);
				setStakeCounts(msg.data.stakeCounts);
			}
			
			// Handle countdown
			if (msg.event === 'tictactoe:countdown' && setCountdown) {
				console.log('[Frontend] Countdown:', msg.data.countdown);
				setCountdown(msg.data.countdown);
			}
			
			// Handle game started
			if (msg.event === 'tictactoe:started' && setCountdown) {
				console.log('[Frontend] Game started');
				setCountdown(null);
			}
			
			// Handle errors - log but don't redirect
			if (msg.event === 'tictactoe:insufficient_balance') {
				console.error(`Insufficient balance! You need ${msg.data.required} ETB but only have ${msg.data.current} ETB.`);
				// Don't setJoined to false - let user stay in game
			}
			if (msg.event === 'tictactoe:full') {
				console.error('Room is full.');
				// Don't setJoined to false - let user stay in game
			}
			if (msg.event === 'tictactoe:invalid_stake') {
				console.error('Invalid stake.');
				// Don't setJoined to false - let user stay in game
			}
			if (msg.event === 'tictactoe:already_joined') {
				console.error('You already joined this game.');
				// Don't setJoined to false - let user stay in game
			}
		};
		
		ws.current.onclose = () => {
			console.log('[Frontend] WebSocket disconnected');
			if (window._tictactoe_ws === ws.current) {
				delete window._tictactoe_ws;
			}
		};
		
		ws.current.onerror = (error) => {
			console.error('[Frontend] WebSocket error:', error);
		};
		
		return () => {
			console.log('[Frontend] Cleaning up WebSocket connection');
			ws.current?.close();
			if (window._tictactoe_ws === ws.current) {
				delete window._tictactoe_ws;
			}
		};
	}, [userId, username, stake, setStakeCounts, setCountdown, setJoined]);

	const joinGame = () => {
		console.log('[Frontend] joinGame called:', { 
			wsState: ws.current?.readyState, 
			userId, 
			username, 
			stake,
			wsExists: !!ws.current
		});
		
		// If WebSocket doesn't exist or is not connected, create a new one
		if (!ws.current || ws.current.readyState !== 1) {
			console.log('[Frontend] WebSocket not ready, creating new connection');
			const base = import.meta.env.VITE_WS_URL as string;
			const url = new URL(base);
			if (userId !== null && userId !== undefined) {
				url.searchParams.set('userId', String(userId));
			}
			if (username) {
				url.searchParams.set('username', username);
			}
			ws.current = new WebSocket(url.toString());
			window._tictactoe_ws = ws.current;
			
			ws.current.onopen = () => {
				console.log('[Frontend] WebSocket connected, sending join message');
				if (userId && username && stake) {
					ws.current?.send(JSON.stringify({ event: 'tictactoe:join', payload: { userId, username, stake } }));
				}
			};
			
			// Set up other event handlers
			ws.current.onmessage = (event) => {
				const msg = JSON.parse(event.data);
				console.log('[Frontend] Received event:', msg.event, msg.data);
				
				// Handle game state updates
				if (msg.event === 'tictactoe:joined' || msg.event === 'tictactoe:update' || msg.event === 'tictactoe:started' || msg.event === 'tictactoe:gameover') {
					const { players, currentTurn, status, board, stake } = msg.data;
					const me = players.find((p: { userId: number | string; symbol: string }) => String(p.userId) === String(userId));
					setState({
						game: { 
							id: msg.data.id,
							board: board || Array(9).fill(null),
							currentTurn: currentTurn || 'X',
							status: status || 'waiting',
							stake: stake || 5,
							winnerId: msg.data.winnerId ?? null
						},
						players,
						mySymbol: me?.symbol ?? null,
						isMyTurn: currentTurn === me?.symbol && status === 'active',
					});
				}
				
				// Handle stake counts
				if (msg.event === 'tictactoe:stake_counts' && setStakeCounts) {
					console.log('[Frontend] Updating stake counts:', msg.data.stakeCounts);
					setStakeCounts(msg.data.stakeCounts);
				}
				
				// Handle countdown
				if (msg.event === 'tictactoe:countdown' && setCountdown) {
					console.log('[Frontend] Countdown:', msg.data.countdown);
					setCountdown(msg.data.countdown);
				}
				
				// Handle game started
				if (msg.event === 'tictactoe:started' && setCountdown) {
					console.log('[Frontend] Game started');
					setCountdown(null);
				}
				
				// Handle errors - log but don't redirect
				if (msg.event === 'tictactoe:insufficient_balance') {
					console.error(`Insufficient balance! You need ${msg.data.required} ETB but only have ${msg.data.current} ETB.`);
				}
				if (msg.event === 'tictactoe:full') {
					console.error('Room is full.');
				}
				if (msg.event === 'tictactoe:invalid_stake') {
					console.error('Invalid stake.');
				}
				if (msg.event === 'tictactoe:already_joined') {
					console.error('You already joined this game.');
				}
			};
			
			ws.current.onerror = (error) => {
				console.error('[Frontend] WebSocket error:', error);
			};
		} else {
			// WebSocket is ready, send join message immediately
			console.log('[Frontend] WebSocket ready, sending join message');
			if (userId && username && stake) {
				ws.current.send(JSON.stringify({ event: 'tictactoe:join', payload: { userId, username, stake } }));
			}
		}
	};

	const makeMove = (index: number) => {
		if (!state.isMyTurn || !state.game || state.game.board[index]) return;
		ws.current?.send(JSON.stringify({ event: 'tictactoe:move', payload: { index, stake } }));
	};

	const resetGame = () => {
		ws.current?.send(JSON.stringify({ event: 'tictactoe:reset' }));
	};

	return { state, makeMove, resetGame, joinGame };
}
