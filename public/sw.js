/* Mwiki Main Altar CMS — service worker
 *
 * Strategy:
 *  - Static assets (Next.js _next/static, /icons, /favicon): cache-first.
 *  - Navigation requests (HTML): network-first with a fallback to the offline page.
 *  - API + server-action POSTs: never cache — always network.
 *  - Everything else: stale-while-revalidate.
 *
 * Bump the CACHE_VERSION whenever the strategy or precache list changes so old
 * caches get purged on the next activation.
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll(PRECACHE_URLS)
      self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico' ||
    /\.(?:png|jpg|jpeg|webp|svg|gif|css|woff2?|ttf)$/i.test(url.pathname)
  )
}

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return // never cache mutations

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // skip cross-origin

  // Never cache API/auth/server actions — they must always hit the network.
  if (url.pathname.startsWith('/api/')) return

  // Navigation: network-first with offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          return fresh
        } catch {
          const offline = await caches.match(OFFLINE_URL)
          return offline || new Response('Offline', { status: 503 })
        }
      })()
    )
    return
  }

  // Static assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        const fresh = await fetch(req)
        const cache = await caches.open(STATIC_CACHE)
        cache.put(req, fresh.clone())
        return fresh
      })()
    )
    return
  }

  // Default: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE)
      const cached = await cache.match(req)
      const networkPromise = fetch(req)
        .then(res => {
          if (res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || networkPromise
    })()
  )
})

// Allow the page to trigger an immediate update via postMessage.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
