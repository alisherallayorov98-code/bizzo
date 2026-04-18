const CACHE_VERSION = 'bizzo-v2'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/offline.html']

// INSTALL — pre-cache statics
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ACTIVATE — remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter(n => n !== CACHE_VERSION)
          .map(n => caches.delete(n))
      )
    )
  )
  self.clients.claim()
})

// FETCH — strategy router
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  // API calls — network first, fallback to cached if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Static assets (JS/CSS/fonts/images) — cache first
  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // HTML documents — network first, offline page fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithOffline(request))
    return
  }

  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Not available offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response(
      JSON.stringify({ error: 'Offline', message: "Internet aloqasi yo'q" }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function networkFirstWithOffline(request) {
  try {
    return await fetch(request)
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match('/offline.html')
    return offline || new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

// PUSH notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || 'BIZZO', {
        body:    data.body   || '',
        icon:    '/favicon.svg',
        badge:   '/favicon.svg',
        tag:     data.tag    || 'bizzo-notification',
        data:    data.url ? { url: data.url } : undefined,
        vibrate: [100, 50, 100],
        actions: data.actions || [],
      })
    )
  } catch {}
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url
  if (url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        const existing = list.find(c => c.url.includes(url))
        if (existing) return existing.focus()
        return clients.openWindow(url)
      })
    )
  }
})

// BACKGROUND SYNC — retry failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(Promise.resolve())
  }
})

// MESSAGE — skip waiting on demand (for update prompts)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
