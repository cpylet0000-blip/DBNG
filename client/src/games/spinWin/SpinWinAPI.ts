import axios from 'axios'
import { io, type Socket } from 'socket.io-client'

type HeadersBuilder = () => Record<string, string>

type UserContext = {
  userId?: number | null
  username?: string | null
}

type AuthPayload = {
  token: string | null
  userId: number | null
  username: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE.replace(/\/$/, '')}/api`
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')

class SpinWinAPI {
  token: string | null
  gameId: string | null
  socket: Socket | null
  headersBuilder: HeadersBuilder
  userContext: UserContext | null

  constructor() {
    this.token = localStorage.getItem('token') || null
    this.gameId = null
    this.socket = null
    this.headersBuilder = () => ({})
    this.userContext = null
  }

  setToken(token: string) {
    this.token = token || null
    if (token) {
      localStorage.setItem('token', token)
    }
  }

  setHeadersBuilder(builder: HeadersBuilder) {
    this.headersBuilder = typeof builder === 'function' ? builder : (() => ({}))
  }

  setUserContext(userContext: UserContext | null) {
    this.userContext = userContext || null
  }

  async getGame() {
    const response = await axios.get(`${API_BASE_URL}/spin-win/game`, {
      headers: this.getAuthHeaders()
    })
    return response.data
  }

  async placeBet(betType: string, betValue: string | number, amount: number, odds: number) {
    const response = await axios.post(`${API_BASE_URL}/spin-win/bet`, {
      gameId: this.gameId,
      betType,
      betValue,
      amount: Number(amount),
      odds: Number(odds)
    }, {
      headers: this.getAuthHeaders()
    })
    return response.data
  }

  async spin() {
    const response = await axios.post(`${API_BASE_URL}/spin-win/spin`, {
      gameId: this.gameId
    }, {
      headers: this.getAuthHeaders()
    })
    return response.data
  }

  async clearBets() {
    const response = await axios.post(`${API_BASE_URL}/spin-win/clear-bets`, {
      gameId: this.gameId
    }, {
      headers: this.getAuthHeaders()
    })
    return response.data
  }

  async getHistory(limit = 50, offset = 0) {
    const response = await axios.get(`${API_BASE_URL}/spin-win/history`, {
      params: { limit, offset },
      headers: this.getAuthHeaders()
    })
    return response.data
  }

  connectSocket() {
    if (this.socket) {
      this.socket.disconnect()
    }

    const wsBaseUrl = import.meta.env.VITE_WS_URL 
      ? import.meta.env.VITE_WS_URL.replace('/ws', '') 
      : import.meta.env.VITE_API_BASE || 'http://localhost:5000'

    const authPayload: AuthPayload = {
      token: this.token,
      userId: this.userContext?.userId ?? null,
      username: this.userContext?.username ?? null
    }

    this.socket = io(wsBaseUrl, {
      path: '/socket.io',
      auth: authPayload
    })

    this.socket.on('connect', () => {
      if (!this.socket) return
      this.socket.emit('authenticate', authPayload)
    })

    this.socket.on('authenticated', (data: { success?: boolean; error?: string }) => {
      if (!data?.success) {
        console.error('Socket authentication failed:', data?.error)
        return
      }

      if (this.gameId) {
        this.joinGame(this.gameId)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from SpinWin socket')
    })

    return this.socket
  }

  joinGame(gameId: string) {
    if (this.socket && gameId) {
      this.gameId = gameId
      this.socket.emit('join-game', gameId)
    }
  }

  leaveGame() {
    if (this.socket && this.gameId) {
      this.socket.emit('leave-game', this.gameId)
      this.gameId = null
    }
  }

  getAuthHeaders() {
    const headers = { ...this.headersBuilder() }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }
    return headers
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

export default SpinWinAPI
