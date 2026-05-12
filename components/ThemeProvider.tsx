'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'church-cms-theme'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Initial read + apply on mount. Intentional client-only hydration: the
  // persisted theme can only be read after the browser is available, and we
  // mirror it back into React state so the toggle UI stays in sync.
  useEffect(() => {
    const stored = readStoredTheme()
    /* eslint-disable react-hooks/set-state-in-effect */
    setThemeState(stored)
    applyTheme(stored)
    setResolvedTheme(
      stored === 'dark' || (stored === 'system' && systemPrefersDark()) ? 'dark' : 'light'
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Listen to system pref changes when in `system` mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      applyTheme('system')
      setResolvedTheme(systemPrefersDark() ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
    applyTheme(t)
    setResolvedTheme(t === 'dark' || (t === 'system' && systemPrefersDark()) ? 'dark' : 'light')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback that no-ops so children outside provider don't crash during SSR.
    return { theme: 'system' as Theme, resolvedTheme: 'light' as const, setTheme: () => {} }
  }
  return ctx
}
