const VERSION = "tbs-yard-v2"
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const OFFLINE_URL = "/offline"
const SHELL_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("tbs-yard-") && ![SHELL_CACHE, ASSET_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
  if (event.data?.type === "CLEAR_ASSET_CACHES") {
    event.waitUntil(Promise.all([caches.delete(SHELL_CACHE), caches.delete(ASSET_CACHE)]))
  }
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()))
    return
  }

  const isNextStaticAsset = url.pathname.startsWith("/_next/static/")
  const isStaticAsset = isNextStaticAsset || url.pathname.startsWith("/images/") || url.pathname === "/icon.svg"
  if (!isStaticAsset) return

  if (isNextStaticAsset) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request)
          if (response.ok) await cache.put(request, response.clone())
          return response
        } catch {
          return (await cache.match(request)) || Response.error()
        }
      }),
    )
    return
  }

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    }),
  )
})

self.addEventListener("sync", (event) => {
  if (event.tag !== "tbs-operations-sync") return
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: "TBS_SYNC_REQUESTED" })
    }),
  )
})
