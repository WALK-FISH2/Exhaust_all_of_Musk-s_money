/* eslint-env serviceworker */

const CACHE_PREFIX = 'spend-musk-money-app-shell-'
const CACHE_NAME = `${CACHE_PREFIX}m5-v1`
const PRECACHE_ENTRIES = globalThis.__WB_MANIFEST
const PRECACHE_URLS = PRECACHE_ENTRIES.map((entry) => entry.url)

globalThis.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  )
})

globalThis.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const shell = await caches.match('/index.html')
        return shell ?? Response.error()
      }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse ?? fetch(event.request)),
  )
})
