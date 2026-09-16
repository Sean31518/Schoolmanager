import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'schulmanager-theme'

type Theme = 'light' | 'dark'

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Private browsing / storage disabled — fall through to the DOM state
    // the no-FOUC init script in index.html already applied.
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Persisted light/dark theme toggle. Applies the `dark` class to <html>,
 * which every color token in index.css (`.dark { --color-bg-0: ...; }`)
 * overrides — components never need their own dark: variants.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // See readTheme — toggling still works for this session.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
