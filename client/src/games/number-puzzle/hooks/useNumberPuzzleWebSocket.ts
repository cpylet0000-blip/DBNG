import { useEffect, useRef, useState } from 'react'
import type { NumberPuzzleWSEvents } from '../types'

type HandlerMap = {
  [K in keyof NumberPuzzleWSEvents]: (data: NumberPuzzleWSEvents[K]) => void
}

export const useNumberPuzzleWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const listeners = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map())

  useEffect(() => {
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      console.log('[NumberPuzzle WS] Connected')
      setConnected(true)
    }

    ws.current.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data)
        const handlers = listeners.current.get(eventType)
        if (handlers) {
          handlers.forEach((handler) => {
            if (typeof handler === 'function') handler(data)
          })
        }
      } catch (err) {
        console.error('[NumberPuzzle WS] Parse error:', err)
      }
    }

    ws.current.onclose = () => {
      console.log('[NumberPuzzle WS] Disconnected')
      setConnected(false)
    }

    ws.current.onerror = (error) => {
      console.error('[NumberPuzzle WS] Error:', error)
    }

    return () => {
      ws.current?.close()
    }
  }, [url])

  const on = <K extends keyof NumberPuzzleWSEvents>(event: K, handler: HandlerMap[K]) => {
    if (!listeners.current.has(event)) {
      listeners.current.set(event, new Set())
    }
    listeners.current.get(event)!.add(handler as (...args: unknown[]) => void)
  }

  const off = <K extends keyof NumberPuzzleWSEvents>(event: K, handler: HandlerMap[K]) => {
    listeners.current.get(event)?.delete(handler as (...args: unknown[]) => void)
  }

  const emit = (event: string, data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event, data }))
    }
  }

  return { connected, on, off, emit }
}
