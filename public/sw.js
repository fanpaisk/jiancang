/* 减仓计算器 Service Worker
 * 策略：
 * - 导航请求：network-first，断网回退缓存的 index.html
 * - 静态资源：stale-while-revalidate
 * - OCR 引擎/模型：首次用到才下载并缓存（13MB，不在安装时预取）
 * 版本号变了就清旧缓存；部署后用户刷新一次即可拿到新版。
 */
const VERSION = 'jiancang-v1'
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || caches.match('/'))),
    )
    return
  }

  // OCR 资源体积大，首次下载后再缓存
  if (url.pathname.startsWith('/tesseract/') || url.pathname.startsWith('/tessdata/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(VERSION).then((cache) => cache.put(req, copy))
            return res
          }),
      ),
    )
    return
  }

  if (/\.(?:js|css|png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone()
            caches.open(VERSION).then((cache) => cache.put(req, copy))
            return res
          })
          .catch(() => hit)
        return hit || network
      }),
    )
  }
})
