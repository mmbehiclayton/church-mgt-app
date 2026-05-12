'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker once on mount. Only runs in production so
 * dev HMR isn't intercepted by the SW.
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        // Optionally surface update available
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // A new SW is waiting. Trigger immediate activation.
              installing.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      } catch (err) {
        console.warn('SW registration failed', err)
      }
    }

    register()
  }, [])

  return null
}
