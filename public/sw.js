/* Service worker Glykos.
 *
 * ALASAN UTAMA FILE INI ADA: NOTIFIKASI.
 * utils/notifications.js dulu memanggil `new Notification(...)` langsung.
 * Chrome di Android menolak konstruktor itu dan melempar TypeError — jadi
 * peringatan status `danger` GAGAL DIAM-DIAM persis di perangkat yang paling
 * mungkin dipakai berdampingan dengan insole. Satu-satunya jalur yang bekerja
 * di sana adalah registration.showNotification(), dan itu menuntut service
 * worker terdaftar.
 *
 * Manfaat ikutan: dengan manifest + handler fetch di bawah, aplikasinya bisa
 * dipasang ke home screen dan tetap terbuka saat jaringan mati.
 *
 * TIDAK ADA handler `push` di sini — dengan sengaja. Push menuntut layanan
 * sisi server yang mengirimnya, dan proyek ini belum punya (lihat catatan di
 * useAlerts.js). Menambahkan handler kosong hanya akan menyiratkan kemampuan
 * yang tidak ada: selama aplikasi tertutup, tidak ada yang memantau.
 */

const VERSION = 'v1'
const SHELL_CACHE = `glykos-shell-${VERSION}`
const ASSET_CACHE = `glykos-assets-${VERSION}`
const SHELL_URL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(SHELL_URL))
      // Gagal mengisi cache awal tidak boleh membatalkan instalasi: notifikasi
      // adalah tugas utamanya, dan itu tidak butuh cache sama sekali.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('glykos-') && key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Hanya GET same-origin. Permintaan ke Firestore dan Gemini sengaja
  // dilewatkan apa adanya — data medis tidak boleh mengendap di cache HTTP,
  // dan Firestore punya lapisan offline-nya sendiri.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigasi: JARINGAN DULU. Aplikasinya SPA yang sering berubah, jadi
  // menyajikan HTML dari cache lebih dulu berisiko mengunci pengguna pada
  // versi lama. Cache di sini murni jaring pengaman saat offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy))
          return response
        })
        .catch(() => caches.match(SHELL_URL).then((cached) => cached ?? Response.error())),
    )
    return
  }

  // Berkas build Vite memakai hash pada namanya, jadi isinya tidak pernah
  // berubah untuk URL yang sama — aman disajikan dari cache lebih dulu.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
      }),
    )
  }
})

// Mengetuk notifikasi harus membawa pengguna ke halaman Peringatan, bukan
// sekadar membuka tab baru di halaman depan.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/dashboard/alerts'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(target).catch(() => undefined)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
