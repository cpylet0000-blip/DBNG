/**
 * Bingo Room Hook
 * Manages new bingo game state with fixed stake rooms and card selection
 * Handles card selection, auto-mark, and win claiming
 */

import { useState, useEffect, useCallback } from 'react'
import { useBingoGame } from '../BingoGameContext';
import { useBingoWebSocket } from './useBingoWebSocket'
import type { BingoGameState, BingoStake, BingoWSEvents } from '../types'
import { useProfile } from '../../../profileContext'


const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

// Derive WS_URL from API_BASE or environment
const getWSURL = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) return envUrl
  
  // Extract WebSocket URL from API_BASE
  const apiBase = API_BASE
  const wsProtocol = apiBase.startsWith('https:') ? 'wss:' : 'ws:'
  const wsUrl = apiBase.replace(/^https?:/, wsProtocol)
  
  console.log('Derived WS URL:', wsUrl, 'from API_BASE:', apiBase)
  return wsUrl
}
const WS_URL = getWSURL()

const STORAGE_KEY = 'bingo_game_state'

// Helper functions for localStorage persistence
const saveGameState = (state: BingoGameState) => {
  try {
    const stateToSave = {
      view: state.view,
      selectedStake: state.selectedStake,
      selectedRoom: state.selectedRoom,
      myCards: state.myCards,
      autoMark: state.autoMark,
      isInQueue: state.isInQueue,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    console.log('[useBingoRoom] State saved to localStorage:', stateToSave)
  } catch (error) {
    console.error('[useBingoRoom] Failed to save state:', error)
  }
}

const loadGameState = (): Partial<BingoGameState> | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      console.log('[useBingoRoom] State loaded from localStorage:', parsed)
      return parsed
    }
  } catch (error) {
    console.error('[useBingoRoom] Failed to load state:', error)
  }
  return null
}

const clearGameState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[useBingoRoom] State cleared from localStorage')
  } catch (error) {
    console.error('[useBingoRoom] Failed to clear state:', error)
  }
}


const initialState: BingoGameState = {
  selectedStake: null,
  selectedRoom: 1,
  availableCards: [],
  myCards: [],
  session: null,
  autoMark: true,
  isInQueue: false,
  view: 'stake-select',
}

// Map called number to BINGO letter
const getBingoLetter = (num: number): 'B' | 'I' | 'N' | 'G' | 'O' => {
  if (num >= 1 && num <= 15) return 'B'
  if (num >= 16 && num <= 30) return 'I'
  if (num >= 31 && num <= 45) return 'N'
  if (num >= 46 && num <= 60) return 'G'
  return 'O'
}

const getTelegramId = (): string | null => {
  if (typeof window !== 'undefined') {
    // Prefer actual Telegram context when running inside the mini app
    const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (tgUserId) return String(tgUserId)
    const stored = localStorage.getItem('devTelegramId')
    if (stored) return stored
  }

  const devId = (import.meta.env.VITE_DEV_TELEGRAM_ID || '').toString()
  return devId || null
}

// Build auth headers
export const buildHeaders = () => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  // Try dev override first (if in dev mode and set)
  if (import.meta.env.DEV) {
    const devId = getTelegramId() || ''
    if (devId) {
      headers['x-dev-telegram-id'] = devId
      headers['x-dev-telegram-username'] = 'devuser'
      headers['x-dev-telegram-name'] = 'Dev User'
      return headers
    }
  }
  
  // Fall back to Telegram initData (even in dev mode if no dev ID is set)
  if (window.Telegram?.WebApp?.initData) {
    headers['x-telegram-init-data'] = window.Telegram.WebApp.initData
    return headers
  }
  
  return headers
}

export function useBingoRoom() {
  // Load persisted state on mount
  const getInitialState = (): BingoGameState => {
    const saved = loadGameState()
    if (saved) {
      return {
        ...initialState,
        ...saved,
        // Reset session and availableCards as they should be fetched fresh
        session: null,
        availableCards: [],
      }
    }
    return initialState
  }

  const [gameState, setGameState] = useState<BingoGameState>(getInitialState)
  const { bonus, setWin } = useBingoGame();
  const { connected, on, off, emit } = useBingoWebSocket(WS_URL)
  const { userId } = useProfile()

  console.log('=== useBingoRoom Hook ===')
  console.log('API_BASE:', API_BASE)
  console.log('WS_URL:', WS_URL)
  console.log('userId:', userId)
  console.log('Current gameState:', gameState)
  console.log('Connected:', connected)

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveGameState(gameState)
  }, [gameState.view, gameState.selectedStake, gameState.selectedRoom, gameState.myCards, gameState.autoMark, gameState.isInQueue])

  // Removed auto-reset on game finish to allow WinnerDisplay to show

  // Auto-emit join_room when game view is requested
  useEffect(() => {
    const restoreSession = async () => {
      if (gameState.selectedStake && gameState.view !== 'stake-select' && !gameState.session) {
        console.log('[useBingoRoom] Restoring session after page reload')
        try {
          const roomNumber = gameState.selectedRoom ?? 1
          const response = await fetch(`${API_BASE}/api/bingo/session/?room=${roomNumber}`, {
            headers: buildHeaders()
          })
          const data = await response.json()
          if (data.success && data.session) {
            interface SessionPlayer {
              userId: number | string;
              cardId: number;
              cardNumbers?: number[];
              numbers?: number[];
              markedCells?: number[];
            }
            const myPlayerCards = (data.session.players || [])
              .filter((p: SessionPlayer) => p.userId === userId)
              .map((p: SessionPlayer) => ({
                id: p.cardId,
                numbers: p.cardNumbers || p.numbers || [],
                markedCells: p.markedCells || [],
              }))
            
            setGameState(prev => ({
              ...prev,
              session: data.session,
              myCards: myPlayerCards.length > 0 ? myPlayerCards : prev.myCards,
              availableCards: data.cards || prev.availableCards,
            }))
            
            // Rejoin WebSocket room
            if (connected && userId) {
              const tgId = getTelegramId()
              emit('bingo:join_room', { 
                stake: gameState.selectedStake, 
                roomNumber, 
                userId: tgId ?? userId 
              })
            }
            
            console.log('[useBingoRoom] Session restored successfully')
          }
        } catch (error) {
          console.error('[useBingoRoom] Failed to restore session:', error)
        }
      }
    }
    
    restoreSession()
  }, []) // Run only once on mount

  // Select stake and fetch available cards
  const selectStake = useCallback(async (stake: BingoStake, roomNumber: number = gameState.selectedRoom ?? 1) => {
    console.log('=== selectStake called ===');
    console.log('stake:', stake);
    console.log('roomNumber:', roomNumber);
    console.log('userId:', userId);
    console.log('Current gameState.myCards length:', gameState.myCards.length);
    
    try {
      // Always fetch the session for the selected stake and room
      const sessionUrl = `${API_BASE}/api/bingo/session/${stake}?room=${roomNumber}`;
      const cardsUrl = `${API_BASE}/api/bingo/cards/${stake}?room=${roomNumber}`;

      // Fetch both session and cards in parallel
      const [sessionRes, cardsRes] = await Promise.all([
        fetch(sessionUrl, { headers: buildHeaders() }),
        fetch(cardsUrl, { headers: buildHeaders() })
      ]);

      if (!sessionRes.ok || !cardsRes.ok) {
        console.error('HTTP Error:', sessionRes.status, sessionRes.statusText, cardsRes.status, cardsRes.statusText);
        return;
      }

      const sessionData = await sessionRes.json();
      const cardsData = await cardsRes.json();

      if (sessionData.success && cardsData.success) {
        // Always use the session for the selected stake/room
        interface SessionPlayer {
          userId: number | string;
          cardId: number;
          cardNumbers?: number[];
          numbers?: number[];
          markedCells?: number[];
        }
        interface PlayerCard {
          id: number;
          numbers: number[];
          markedCells: number[];
        }
        let myPlayerCards: PlayerCard[] = [];
        if (sessionData.session && sessionData.session.players && userId) {
          const userPlayers = sessionData.session.players.filter((p: SessionPlayer) => p.userId === userId);
          myPlayerCards = userPlayers.map((p: SessionPlayer) => ({
            id: p.cardId,
            numbers: p.cardNumbers || p.numbers || [],
            markedCells: p.markedCells || [],
          }));
        }
        setGameState((prev) => ({
          ...prev,
          selectedStake: stake,
          selectedRoom: sessionData.session?.roomNumber ?? roomNumber,
          availableCards: cardsData.cards,
          myCards: myPlayerCards,
          view: myPlayerCards.length > 0 && sessionData.session?.status === 'active' ? 'game' : 'card-select',
          session: sessionData.session || prev.session,
        }));
        // If websocket connected, join the room via WS so we receive live updates
        if (connected && userId) {
          const tgId = getTelegramId();
          emit('bingo:join_room', {
            stake,
            roomNumber: sessionData.session?.roomNumber ?? 1,
            userId: tgId ?? userId
          });
        }
      } else {
        console.error('API returned success: false', sessionData.error || cardsData.error);
      }
    } catch (error) {
      console.error('Error fetching session/cards:', error);
    }
  }, [connected, emit, userId]);

  // Select multiple cards (up to 10)
  const selectMultipleCards = useCallback(
    async (cardIds: number[]) => {
      console.log('selectMultipleCards called with cardIds:', cardIds);
      console.log('Current gameState.selectedStake:', gameState.selectedStake);
      console.log('Current userId:', userId);
      
      if (!gameState.selectedStake || !userId || cardIds.length === 0 || cardIds.length > 10) {
        console.log('selectMultipleCards early return - missing required data');
        return;
      }

      try {
        // Guard: ensure we have auth headers (dev ID or Telegram init data)
        const headers = buildHeaders()
        const devId = (headers as Record<string, string>)['x-dev-telegram-id']
        const tgData = (headers as Record<string, string>)['x-telegram-init-data']
        const hasAuth = Boolean(devId || tgData)
        if (!hasAuth) {
          alert('Unauthorized: missing Telegram context or dev ID. Please start via Telegram or set VITE_DEV_TELEGRAM_ID.')
          return
        }

        const response = await fetch(`${API_BASE}/api/bingo/select-multiple-cards`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            stake: gameState.selectedStake,
            cardIds,
          }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          console.log('Card selection response:', data);
          console.log('Players data from selection:', data.players);
          
          setGameState((prev) => {
            interface PlayerResponse {
              id?: number;
              cardId: number;
              cardNumbers: number[];
              markedCells?: number[];
            }
            // Get new cards from API response
            const newCards = data.players.map((player: PlayerResponse) => {
              console.log('Processing player card:', {
                cardId: player.cardId,
                cardNumbers: player.cardNumbers,
                cardNumbersLength: player.cardNumbers?.length
              });
              
              return {
                id: player.cardId,
                numbers: player.cardNumbers,
                markedCells: [],
              }
            })

            // Merge with existing cards - preserve existing cards and their marked cells
            const existingCardIds = new Set(prev.myCards.map(card => card.id))
            const newCardIds = new Set(newCards.map((card: PlayerResponse) => card.id))
            
            // Keep existing cards that weren't just selected (preserve their marked cells)
            const existingCardsToKeep = prev.myCards.filter(card => !newCardIds.has(card.id))
            
            // For cards that already exist, preserve their marked cells
            const mergedCards = newCards.map((newCard: { id: number; numbers: number[]; markedCells: number[] }) => {
              const existingCard = prev.myCards.find(c => c.id === newCard.id)
              if (existingCard) {
                // Card already exists - preserve marked cells
                return {
                  ...newCard,
                  markedCells: existingCard.markedCells,
                }
              }
              return newCard
            })

            // Combine: existing cards + newly selected cards (with preserved marked cells)
            const allCards = [...existingCardsToKeep, ...mergedCards]

            return {
              ...prev,
              myCards: allCards,
              session: data.session,
              selectedRoom: data.session?.roomNumber ?? prev.selectedRoom,
              view: 'game', // Always go to game view after card selection
              isInQueue: false, // User is in game, not in queue
            }
          })

          // Ensure WebSocket room is joined before emitting card selection events
          const tgId = getTelegramId()
          const roomNumber = gameState.selectedRoom ?? 1
          
          // First join the room to ensure proper WebSocket connection
          if (connected && userId) {
            emit('bingo:join_room', { 
              stake: gameState.selectedStake, 
              roomNumber, 
              userId: tgId ?? userId 
            })
          }
          
          // Then emit card selection events
          cardIds.forEach(cardId => {
            emit('bingo:select_card', {
              stake: gameState.selectedStake,
              userId: tgId ?? userId,
              cardId,
            })
          })
        } else {
          // Check if error is because cards are already selected
          // If so, fetch session and update game state with existing cards
          const isAlreadySelectedError = data.error?.includes('already selected') || 
                                        data.error?.includes('Card already selected')
          
          if (isAlreadySelectedError) {
            // Cards are already selected, just fetch session and update state
            try {
              const roomNumber = gameState.selectedRoom ?? 1
              const sessionRes = await fetch(`${API_BASE}/api/bingo/session/${gameState.selectedStake}?room=${roomNumber}`, {
                headers: buildHeaders(),
              })
              const sessionData = await sessionRes.json()
              
              if (sessionData.success && sessionData.session) {
                // Find ALL player's cards in the session (not just the ones being selected)
                // userId from useProfile is the database ID (number)
                interface SessionPlayer {
                  userId: number | string;
                  cardId: number;
                  cardNumbers?: number[];
                  numbers?: number[];
                  markedCells?: number[];
                }
                const myPlayerCards = sessionData.session.players
                  .filter((p: SessionPlayer) => p.userId === userId)
                  .map((p: SessionPlayer) => ({
                    id: p.cardId,
                    numbers: p.cardNumbers || p.numbers || [], // Try cardNumbers first, then numbers
                    markedCells: p.markedCells || [], // Already parsed by backend
                  }))
                
                if (myPlayerCards.length > 0) {
                  setGameState((prev) => {
                    // Merge with existing cards - preserve all existing cards
                    const existingCardIds = new Set(prev.myCards.map(card => card.id))
                    const newCardIds = new Set(myPlayerCards.map((card: { id: number }) => card.id))
                    
                    // Keep existing cards that weren't in this selection
                    const existingCardsToKeep = prev.myCards.filter(card => !newCardIds.has(card.id))
                    
                    // For cards that already exist, preserve their marked cells
                    const mergedCards = myPlayerCards.map((newCard: { id: number; numbers: number[]; markedCells: number[] }) => {
                      const existingCard = prev.myCards.find(c => c.id === newCard.id)
                      if (existingCard) {
                        // Card already exists - preserve marked cells
                        return {
                          ...newCard,
                          markedCells: existingCard.markedCells,
                        }
                      }
                      return newCard
                    })

                    // Combine: existing cards + newly fetched cards
                    const allCards = [...existingCardsToKeep, ...mergedCards]

                    return {
                      ...prev,
                      myCards: allCards,
                      session: sessionData.session,
                      selectedRoom: sessionData.session?.roomNumber ?? prev.selectedRoom,
                      view: sessionData.session.status === 'active' ? 'game' : 'game',
                      isInQueue: false,
                    }
                  })
                  return // Successfully updated state with existing cards
                }
              }
            } catch (fetchError) {
              console.error('Error fetching session for already-selected cards:', fetchError)
            }
          }
          
          // Only show error if it's not an "already selected" case that we handled
          if (!isAlreadySelectedError) {
            alert(data.error || 'Failed to select cards')
          }
        }
      } catch (error) {
        console.error('Error selecting multiple cards:', error)
        alert('Failed to select cards')
      }
    },
    [gameState.selectedStake, userId, emit]
  )

  // Select a card (single card selection - for backward compatibility)
  const selectCard = useCallback(
    async (cardId: number) => {
      return selectMultipleCards([cardId])
    },
    [selectMultipleCards]
  )

  // Toggle auto-mark
  const toggleAutoMark = useCallback(() => {
    if (!gameState.selectedStake || !userId) return

    const newAutoMark = !gameState.autoMark
    setGameState((prev) => ({ ...prev, autoMark: newAutoMark }))

    emit('bingo:toggle_automark', {
      stake: gameState.selectedStake,
      userId,
      autoMark: newAutoMark,
    })
  }, [gameState.selectedStake, gameState.autoMark, userId, emit])

  // Lightweight polling to keep session/player counts in sync while in lobby/game
  useEffect(() => {
    if (!gameState.selectedStake) return
    let cancelled = false

    const pollSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bingo/session/${gameState.selectedStake}?room=${gameState.selectedRoom}`, {
          headers: buildHeaders(),
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && data.success && data.session) {
          setGameState(prev => {
            // Don't overwrite countdown state from WebSocket events
            if (prev.session?.status === 'countdown' && data.session.status === 'waiting') {
              return prev // Keep countdown state
            }
            
            // Don't overwrite winner info from WebSocket with polling data
            if (prev.session?.status === 'finished' && prev.session?.winner && data.session.status === 'finished') {
              return {
                ...prev,
                session: {
                  ...data.session,
                  winner: prev.session.winner // Keep WebSocket winner data
                }
              }
            }
            
            // Check if this is a different session/room - if so, clear cards
            const isDifferentSession = prev.session?.id !== data.session.id || 
                                     prev.selectedRoom !== data.session.roomNumber;
            
            return {
              ...prev,
              session: data.session,
              myCards: isDifferentSession ? [] : prev.myCards, // Clear cards if different session
            }
          })
        }
      } catch (e) {
        console.debug('Session poll error', e)
      }
    }

    pollSession()
    const interval = setInterval(pollSession, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [gameState.selectedStake, gameState.selectedRoom])

  // Claim win
  const claimWin = useCallback(() => {
    if (!gameState.selectedStake || !userId) return

    emit('bingo:claim', {
      stake: gameState.selectedStake,
      userId,
    })
  }, [gameState.selectedStake, userId, emit])

  // Listen to WebSocket events
  // Memoize all event handlers so their references are stable
  const handlePlayerJoined = useCallback((data: BingoWSEvents['bingo:player_joined']) => {
    console.log('[useBingoRoom] Player joined event received:', data)
    setGameState((prev) => ({ 
      ...prev, 
      session: data.session,
      // Don't explicitly preserve cards here - let the polling handle it
    }))
  }, [])

  const handleCountdownStarted = useCallback((data: BingoWSEvents['bingo:countdown_started']) => {
    console.log('[useBingoRoom] Countdown started event received:', data)
    setGameState((prev) => {
      console.log('[useBingoRoom] Countdown started - current myCards:', prev.myCards)
      return {
        ...prev,
        session: prev.session
          ? { ...prev.session, status: 'countdown', countdownEndsAt: data.countdownEndsAt }
          : null,
        view: 'game',
        isInQueue: false,
      }
    })
  }, [])

  const handleGameStarted = useCallback((_data: BingoWSEvents['bingo:game_started']) => {
    console.log('[useBingoRoom] Game started event received:', _data)
    setGameState((prev) => {
      console.log('[useBingoRoom] Game started - current myCards:', prev.myCards)
      return {
        ...prev,
        session: prev.session ? { ...prev.session, status: 'active' } : null,
        isInQueue: false,
        view: 'game',
      }
    })
  }, [])

  const handleBallDrawn = useCallback((data: BingoWSEvents['bingo:ball_drawn']) => {
    setGameState((prev) => {
      if (!prev.session) return prev
      // Only update if the new calledNumbers is different
      if (
        prev.session.calledNumbers &&
        prev.session.calledNumbers.length === data.calledNumbers.length &&
        prev.session.calledNumbers.every((n, i) => n === data.calledNumbers[i])
      ) {
        return prev
      }
      // Auto-mark if enabled - update all cards
      const updatedCards = prev.myCards.map(card => {
        let newMarkedCells = card.markedCells
        if (prev.autoMark && card.numbers.includes(data.number)) {
          const cellIndex = card.numbers.indexOf(data.number)
          if (!newMarkedCells.includes(cellIndex)) {
            newMarkedCells = [...newMarkedCells, cellIndex]
          }
        }
        return { ...card, markedCells: newMarkedCells }
      })
      return {
        ...prev,
        myCards: updatedCards,
        session: { ...prev.session, calledNumbers: data.calledNumbers },
      }
    })
  }, [])

  const handleAutoMarkUpdated = useCallback((data: BingoWSEvents['bingo:automark_updated']) => {
    setGameState((prev) => ({
      ...prev,
      autoMark: data.autoMark,
      myCards: prev.myCards.map(card => ({ ...card, markedCells: data.markedCells || [] })),
    }))
  }, [])

  const handleGameWon = useCallback((data: BingoWSEvents['bingo:game_won']) => {
    // Show the last number for 2 seconds before showing the winner modal
    setTimeout(() => {
      setGameState((prev) => {
        const isWinner = data.multipleWinners 
          ? prev.myCards.some(card => data.winners?.some(w => w.cardId === card.id))
          : prev.myCards.some(card => card.id === data.cardId);

        if (isWinner) {
          // Handle multiple winners
          if (data.multipleWinners && data.winners) {
            const myWin = data.winners.find(w => w.cardId === prev.myCards.find(c => c.id === w.cardId)?.id);
            if (myWin) {
              setWin((myWin.totalAwarded ?? 0) + bonus);
            }
          } else if (data.prize !== undefined) {
            // Handle single winner (backward compatibility)
            setWin((data.prize ?? 0) + bonus);
          }
        }

        // Always update session with winner info and set status to finished
        // Do NOT reset to stake-select here; let WinnerDisplay handle redirect after showing
        return {
          ...prev,
          session: prev.session
            ? {
                ...prev.session,
                status: 'finished',
                winner: data.multipleWinners ? {
                  userId: data.winners?.[0]?.winnerId || undefined,
                  name: data.winners?.[0]?.winnerName || undefined,
                  cardId: data.winners?.[0]?.cardId || undefined,
                  cardNumbers: data.winners?.[0]?.cardNumbers || undefined,
                  pattern: data.winners?.[0]?.pattern || undefined,
                  winningCells: data.winners?.[0]?.winningCells || undefined,
                  multipleWinners: true,
                  winners: data.winners?.map(w => ({
                    userId: w.winnerId,
                    name: w.winnerName,
                    cardId: w.cardId,
                    cardNumbers: w.cardNumbers,
                    prize: w.prize,
                    bonus: w.bonus,
                    totalAwarded: w.totalAwarded,
                    pattern: w.pattern,
                    winningCells: w.winningCells,
                  })),
                  totalPrize: data.totalPrize,
                  individualPrize: data.individualPrize,
                  winnersCount: data.winnersCount,
                } : {
                  userId: data.winnerId,
                  name: data.winnerName,
                  cardId: data.cardId,
                  cardNumbers: data.cardNumbers,
                  pattern: data.pattern,
                  winningCells: data.winningCells,
                },
              }
            : null,
        };
      });
    }, 1500); // 1.5 second delay
  }, [bonus, setWin])

  const handleGameReset = useCallback((data: BingoWSEvents['bingo:game_reset']) => {
    setGameState((prev) => ({
      ...initialState,
      selectedStake: data.stake as BingoStake,
      view: prev.view === 'card-select' ? 'card-select' : 'stake-select',
    }))
  }, [])

  useEffect(() => {
    if (!connected) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:player_joined', handlePlayerJoined as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:countdown_started', handleCountdownStarted as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:game_started', handleGameStarted as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:ball_drawn', handleBallDrawn as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:automark_updated', handleAutoMarkUpdated as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:game_won', handleGameWon as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('bingo:game_reset', handleGameReset as any)
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:player_joined', handlePlayerJoined as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:countdown_started', handleCountdownStarted as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:game_started', handleGameStarted as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:ball_drawn', handleBallDrawn as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:automark_updated', handleAutoMarkUpdated as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:game_won', handleGameWon as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('bingo:game_reset', handleGameReset as any)
    }
  }, [connected, on, off, handlePlayerJoined, handleCountdownStarted, handleGameStarted, handleBallDrawn, handleAutoMarkUpdated, handleGameWon, handleGameReset])

  const markCell = useCallback((cardId: number, cellIndex: number) => {
    if (!gameState.selectedStake || !userId || gameState.myCards.length === 0) return

    setGameState((prev) => {
      const cardIndex = prev.myCards.findIndex(card => card.id === cardId)
      if (cardIndex === -1) return prev
      
      const card = prev.myCards[cardIndex]
      const already = card.markedCells.includes(cellIndex)
      const newMarked = already
        ? card.markedCells.filter((i: number) => i !== cellIndex)
        : [...card.markedCells, cellIndex]
      
      return {
        ...prev,
        myCards: prev.myCards.map((c, idx) => 
          idx === cardIndex ? { ...c, markedCells: newMarked } : c
        )
      }
    })

    // Notify server of the manual mark/unmark action
    emit('bingo:mark_cell', {
      stake: gameState.selectedStake,
      userId,
      cardId,
      cellIndex,
      marked: !gameState.myCards.find(c => c.id === cardId)?.markedCells.includes(cellIndex),
    })
  }, [gameState.selectedStake, gameState.myCards, userId, emit])

  // Function to leave active game and join different stake
  const leaveActiveGameAndSwitch = useCallback(async (newStake: BingoStake) => {
    if (!userId) return

    try {
      const response = await fetch(`${API_BASE}/api/bingo/leave-active-game`, {
        method: 'POST',
        headers: buildHeaders(),
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('Left active game successfully, switching to new stake')
        // Reset game state and select new stake
        setGameState(initialState)
        await selectStake(newStake)
      } else {
        console.error('Failed to leave active game:', data.error)
        alert(data.error || 'Failed to leave active game')
      }
    } catch (error) {
      console.error('Error leaving active game:', error)
      alert('Failed to leave active game')
    }
  }, [userId, selectStake])

  // Function to navigate back to card selector
  const goToCardSelector = useCallback(() => {
    if (gameState.selectedStake) {
      // First set the view to card-select immediately
      setGameState((prev) => ({
        ...prev,
        view: 'card-select',
        myCards: [],
      }))
      
      // Then refresh available cards and ensure WebSocket room is joined
      const roomNum = gameState.selectedRoom ?? 1
      selectStake(gameState.selectedStake, roomNum).then(() => {
        // Ensure view stays card-select after selectStake completes
        setGameState((prev) => ({
          ...prev,
          view: 'card-select',
        }))
        
        // Ensure WebSocket room is joined for real-time updates
        if (connected && userId) {
          const tgId = getTelegramId()
          emit('bingo:join_room', { 
            stake: gameState.selectedStake, 
            roomNumber: roomNum, 
            userId: tgId ?? userId 
          })
          // Also trigger a session check to potentially start countdown
          setTimeout(async () => {
            try {
              const sessionRes = await fetch(`${API_BASE}/api/bingo/session/${gameState.selectedStake}?room=${roomNum}`, {
                headers: buildHeaders(),
              })
              const sessionData = await sessionRes.json()
              if (sessionData.success && sessionData.session) {
                // If session has 2+ players and is waiting, trigger countdown check
                if (sessionData.session.players.length >= 2 && sessionData.session.status === 'waiting') {
                  console.log('[goToCardSelector] Triggering countdown check for session with', sessionData.session.players.length, 'players')
                  emit('bingo:join_room', { 
                    stake: gameState.selectedStake, 
                    roomNumber: roomNum, 
                    userId: tgId ?? userId 
                  })
                }
              }
            } catch (err) {
              console.error('Error checking session after card selector navigation:', err)
            }
          }, 500)
        }
      })
    }
  }, [gameState.selectedStake, gameState.selectedRoom, selectStake, connected, userId, emit])
  // Function to navigate back to stake selector (for back arrow)
  const goToStakeSelection = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      view: 'stake-select',
    }))
  }, [])

  // Function to navigate back to card selector (for game end)
  const goToStakeSelector = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      view: 'card-select',
    }))
  }, [])

  // Function to navigate to game view (without re-selecting cards)
  const goToGameView = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      view: 'game',
    }))
  }, [])

  return {
    connected,
    gameState,
    setGameState,
    selectStake,
    selectCard,
    selectMultipleCards,
    toggleAutoMark,
    markCell,
    claimWin,
    goToCardSelector,
    goToStakeSelector,
    goToStakeSelection,
    goToGameView,
    leaveActiveGameAndSwitch,
  }
}
