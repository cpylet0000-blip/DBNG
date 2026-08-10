import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import './index.css';
export type ProfileData = {
  id?: number
  name?: string | null
  username?: string | null
  userNumber?: string | null
  createdAt?: string | null
  balance?: { currentBalance?: number; totalDeposits?: number } | null
  telegramId?: string | null
  rewardBalance?: number | null
  totalInvitation?: number | null
  activeInvitation?: number | null
  numberOfTotalPlay?: number | null
  rewardPlay?: number | null
  rewardChallenge?: number | null
}

export type ProfileContextValue = {
  profile: ProfileData | null
  userId: number | null
  status: string
  userLabel: string | null
  avatarUrl: string | null
  isTelegram: boolean
  loading: boolean
  refresh: () => Promise<void>
  updatePhone: (phone: string) => Promise<void>
  buildHeaders: () => Record<string, string>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

const apiUrl = (path: string) => {
  const rawBase = (import.meta.env.VITE_API_BASE?.toString().trim() || '')
  const base = rawBase.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (base) return `${base}${cleanPath}`

  if (typeof window !== 'undefined') {
    const fallback = window.location.origin.replace(/\/$/, '')
    console.warn('VITE_API_BASE is not set — using window.location.origin as fallback for API calls:', fallback)
    return `${fallback}${cleanPath}`
  }

  console.warn('VITE_API_BASE is not set and window is not available — using relative path', path)
  return cleanPath
}

// Dev identity helper: allow setting a per-browser Telegram ID via query param or localStorage.
// Usage: open app with ?devId=123&devUsername=foo or set in localStorage manually for multi-user dev testing.
const getDevIdentity = () => {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('devId')
  if (fromQuery) {
    localStorage.setItem('devTelegramId', fromQuery)
    if (params.get('devUsername')) localStorage.setItem('devUsername', params.get('devUsername') || '')
    if (params.get('devFirst')) localStorage.setItem('devFirst', params.get('devFirst') || '')
    if (params.get('devLast')) localStorage.setItem('devLast', params.get('devLast') || '')
  }

  const id = localStorage.getItem('devTelegramId')
  if (!id) return null
  return {
    id,
    username: localStorage.getItem('devUsername') || undefined,
    first: localStorage.getItem('devFirst') || undefined,
    last: localStorage.getItem('devLast') || undefined,
  }
}

const useProvideProfile = (): ProfileContextValue => {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
  const isTelegram = Boolean(tg)
  const tgUser = tg?.initDataUnsafe?.user
  const avatarUrl = tgUser?.photo_url || null

  const initialStatus = useMemo(() => {
    if (!isTelegram) return 'Browser'
    if (!tg?.initData) return 'Telegram context found, loading profile…'
    return 'Loading...'
  }, [isTelegram, tg?.initData])

  const initialUser = useMemo(() => {
    if (!tgUser) return tg ? 'Unknown' : 'TestUser'
    return `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || tgUser.username || `User ${tgUser.id}`
  }, [tgUser, tg])

  const [status, setStatus] = useState(initialStatus)
  const [userLabel] = useState<string | null>(initialUser)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)

  const buildHeaders = useCallback((): Record<string, string> => {
    // Prefer Telegram initData when inside the mini app
    if (isTelegram && tg?.initData) {
      return { 'x-telegram-init-data': tg.initData }
    }

    // Development override per browser: query/localStorage > .env
    const devIdentity = getDevIdentity()
    const envDevId = (import.meta.env.VITE_DEV_TELEGRAM_ID || '').toString()
    const devId = devIdentity?.id || envDevId
    if (devId) {
      const headers: Record<string, string> = { 'x-dev-telegram-id': devId }
      const devFirst = devIdentity?.first || import.meta.env.VITE_DEV_FIRST_NAME
      const devLast = devIdentity?.last || import.meta.env.VITE_DEV_LAST_NAME
      const devUsername = devIdentity?.username || import.meta.env.VITE_DEV_USERNAME
      if (devFirst) headers['x-dev-first_name'] = devFirst
      if (devLast) headers['x-dev-last_name'] = devLast
      if (devUsername) headers['x-dev-username'] = devUsername
      return headers
    }

    return {}
  }, [isTelegram, tg?.initData])

  type ApiUser = {
    id?: number
    name?: string | null
    username?: string | null
    userNumber?: string | null
    createdAt?: string | null
    balance?: { currentBalance?: number; totalDeposits?: number } | null
    telegramId?: string | null
    rewardBalance?: number | null
    totalInvitation?: number | null
    activeInvitation?: number | null
    numberOfTotalPlay?: number | null
    rewardPlay?: number | null
    rewardChallenge?: number | null
  }

  const mapUser = useCallback((user: Partial<ApiUser> = {}): ProfileData => ({
    id: user.id,
    name: user.name ?? null,
    username: user.username ?? null,
    userNumber: user.userNumber ?? null,
    createdAt: user.createdAt ?? null,
    balance: user.balance
      ? {
          currentBalance: user.balance.currentBalance ?? 0,
          totalDeposits: user.balance.totalDeposits ?? 0,
        }
      : null,
    telegramId: user.telegramId ?? null,
    rewardBalance: user.rewardBalance ?? null,
    totalInvitation: user.totalInvitation ?? null,
    activeInvitation: user.activeInvitation ?? null,
    numberOfTotalPlay: user.numberOfTotalPlay ?? null,
    rewardPlay: user.rewardPlay ?? null,
    rewardChallenge: user.rewardChallenge ?? null,
  }), [])

  const refresh = useCallback(async () => {
    const headers = buildHeaders()
    if (!headers['x-telegram-init-data'] && !headers['x-dev-telegram-id']) {
      setStatus('Browser mode')
      return
    }

    setLoading(true)
    try {
      if (isTelegram) {
        tg?.ready?.()
        tg?.expand?.()
      }

      const healthRes = await fetch(apiUrl('/api/health'), { headers })
      if (!healthRes.ok) {
        throw new Error(`Health check failed (${healthRes.status})`)
      }

      const res = await fetch(apiUrl('/api/profile'), { headers })
      if (!res.ok) throw new Error(`Profile load failed (${res.status})`)
      const data = await res.json()
      setProfile(mapUser(data.user))
      setStatus(isTelegram ? ' ' : 'Browser mode | Profile loaded (dev)')
    } catch (err: unknown) {
      console.error('Profile load error:', err)
      setStatus(isTelegram ? 'connection problem' : ' error')
    } finally {
      setLoading(false)
    }
  }, [buildHeaders, isTelegram, mapUser, tg])

  const updatePhone = useCallback(
    async (phone: string) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...buildHeaders() }
      if (!headers['x-telegram-init-data'] && !headers['x-dev-telegram-id']) {
        throw new Error('Missing Telegram context')
      }

      const body = { userNumber: phone }
      const res = await fetch(apiUrl('/api/profile/phone'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'Failed to update number')
      }

      const data = await res.json()
      setProfile(mapUser(data.user))
    },
    [buildHeaders, mapUser]
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  // Refresh profile when window regains focus or tab becomes visible
  useEffect(() => {
    const onFocus = () => {
      refresh()
    }
    const onVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refresh()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [refresh])

  // Optional: periodic refresh to catch background updates
  useEffect(() => {
    const id = typeof window !== 'undefined' ? window.setInterval(() => {
      refresh()
    }, 10000) : undefined
    return () => {
      if (id) window.clearInterval(id)
    }
  }, [refresh])

  return {
    profile,
    userId: profile?.id ?? null,
    status,
    userLabel,
    avatarUrl,
    isTelegram,
    loading,
    refresh,
    updatePhone,
    buildHeaders,
  }
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const value = useProvideProfile()
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProfile = () => {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
