/**
 * WebSocket hook for Bingo game
 * Manages real-time connection to backend bingo server
 * Handles new fixed-room system with card selection
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { BingoWSEvents } from '../types'

type EventHandler = BingoWSEvents[keyof BingoWSEvents]

export const useBingoWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const listeners = useRef<Map<string, Set<EventHandler>>>(new Map())
  const reconnectTimeout = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    console.log('[Bingo WS] Connecting to:', url)
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      console.log('[Bingo WS] Connected')
      setConnected(true)
      // Clear any pending reconnect timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
    }

    ws.current.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data)
        const handlers = listeners.current.get(eventType)
        if (handlers) {
          handlers.forEach((handler: EventHandler) => {
            if (typeof handler === 'function') {
              (handler as any)(data)
            }
          })
        }
      } catch (err) {
        console.error('[Bingo WS] Parse error:', err)
      }
    }

    ws.current.onclose = (event) => {
      console.log('[Bingo WS] Disconnected, code:', event.code, 'reason:', event.reason)
      setConnected(false)
      
      // Don't reconnect if it was a clean close (1000) or if we're intentionally closing
      if (event.code !== 1000 && ws.current?.readyState !== WebSocket.CLOSING) {
        // Schedule reconnection with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectTimeout.current ? 1 : 0), 5000)
        console.log(`[Bingo WS] Reconnecting in ${delay}ms...`)
        reconnectTimeout.current = setTimeout(connect, delay)
      }
    }

    ws.current.onerror = (error) => {
      console.error('[Bingo WS] Error:', error)
      setConnected(false)
    }
  }, [url])

  useEffect(() => {
    connect()

    return () => {
      // Clear reconnect timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      // Close WebSocket connection
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting')
        ws.current = null
      }
    }
  }, [connect])

  const on = <K extends keyof BingoWSEvents>(event: K, handler: BingoWSEvents[K]) => {
    if (!listeners.current.has(event)) {
      listeners.current.set(event, new Set())
    }
    listeners.current.get(event)!.add(handler as EventHandler)
  }

  const off = <K extends keyof BingoWSEvents>(event: K, handler: BingoWSEvents[K]) => {
    listeners.current.get(event)?.delete(handler as EventHandler)
  }

  const emit = (event: string, data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event, data }))
    }
  }

  return { connected, on, off, emit }
}
