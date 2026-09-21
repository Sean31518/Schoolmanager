import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, setAccessToken } from '../../lib/apiClient'
import type { SettingsDto, UserDto } from './types'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: UserDto | null
  settings: SettingsDto | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [settings, setSettings] = useState<SettingsDto | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const loadMe = useCallback(async () => {
    const data = await apiFetch<{ user: UserDto; settings: SettingsDto }>('/auth/me')
    setUser(data.user)
    setSettings(data.settings)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const data = await apiFetch<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
          skipAuthRetry: true,
        })
        setAccessToken(data.accessToken)
      } catch {
        // Refresh fails both when the session is genuinely invalid and when
        // we're offline and never reached the server at all — those cases
        // need different outcomes, so don't give up yet. /auth/me is a GET
        // the service worker caches; try it regardless of whether refresh
        // just gave us a fresh token. Offline, it resolves from cache and
        // keeps a previously logged-in user logged in (with stale data)
        // instead of bouncing them to the login screen for lack of network.
        setAccessToken(null)
      }
      try {
        await loadMe()
      } catch {
        setStatus('unauthenticated')
      }
    })()
  }, [loadMe])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: UserDto; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRetry: true,
      })
      setAccessToken(data.accessToken)
      await loadMe()
    },
    [loadMe],
  )

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const data = await apiFetch<{ user: UserDto; accessToken: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, displayName }),
          skipAuthRetry: true,
        },
      )
      setAccessToken(data.accessToken)
      await loadMe()
    },
    [loadMe],
  )

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST', skipAuthRetry: true }).catch(
      () => undefined,
    )
    setAccessToken(null)
    setUser(null)
    setSettings(null)
    setStatus('unauthenticated')
  }, [])

  const deleteAccount = useCallback(async () => {
    await apiFetch('/auth/me', { method: 'DELETE' })
    setAccessToken(null)
    setUser(null)
    setSettings(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, settings, status, login, register, logout, deleteAccount, refreshMe: loadMe }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
