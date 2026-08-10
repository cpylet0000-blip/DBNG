import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
interface VoiceControllerProps {
  calledNumbers: number[]
}

export const VoiceController = ({ calledNumbers }: VoiceControllerProps) => {
  const prevNumber = useRef<number | null>(null)
  const [enabled, setEnabled] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voiceEnabled')
      return saved !== null ? JSON.parse(saved) : false
    }
    return false
  })
  // To prevent double audio in React.StrictMode, track last played number and skip duplicate effect
  const lastPlayed = useRef<number | null>(null)

  // Listen for localStorage changes from NavBar
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'voiceEnabled' && e.newValue !== null) {
        setEnabled(JSON.parse(e.newValue))
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    if (!enabled) return;
    const latest = calledNumbers.at(-1)
    if (typeof latest === 'number' && latest !== prevNumber.current) {
      // Only play if not already played (prevents double in StrictMode)
      if (lastPlayed.current !== latest) {
        lastPlayed.current = latest;
        const audio = new window.Audio(`/audio/${latest}.mp3`)
        audio.play().catch(() => {})
      }
      prevNumber.current = latest
    }
  }, [calledNumbers, enabled])

  return (
    <button
      className="text-white hover:text-gray-200 focus:outline-none transition-colors"
      title={enabled ? 'Voice ON (click to mute)' : 'Voice OFF (click to unmute)'}
      aria-pressed={enabled}
      onClick={() => setEnabled((v: boolean) => !v)}
      type="button"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {enabled ? (
        <Volume2 size={20} className="drop-shadow-sm" />
      ) : (
        <VolumeX size={20} className="text-gray-400 drop-shadow-sm" />
      )}
    </button>
  )
}
