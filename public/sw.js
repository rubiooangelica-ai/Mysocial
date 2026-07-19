// Service worker: deixa o app abrir e funcionar offline (os dados já ficam
// no IndexedDB do dispositivo; aqui cacheamos o "casco" do app).
const CACHE = 'mysocial-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return

  // navegação: rede primeiro, cache como fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // assets: cache primeiro (são versionados por hash), rede como fallback
  event.respondWith(
    caches.match(request).then(
      cached =>
        cached ||
        fetch(request).then(res => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then(c => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})
