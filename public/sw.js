/* Service worker Glykos.
 *
 * ALASAN UTAMA FILE INI ADA: NOTIFIKASI.
 * utils/notifications.js dulu memanggil `new Notification(...)` langsung.
 * Chrome di Android menolak konstruktor itu dan melempar TypeError — jadi
 * peringatan status `danger` GAGAL DIAM-DIAM persis di perangkat yang paling
 * mungkin dipakai berdampingan dengan sepatu Glykos. Satu-satunya jalur yang
 * bekerja di sana adalah registration.showNotification(), dan itu menuntut
 * service worker terdaftar.
 *
 * TUGAS KEDUA: menjadikan aplikasinya PWA yang benar-benar bisa dipasang dan
 * dibuka tanpa jaringan — bukan sekadar punya berkas manifest.
 *
 * TIDAK ADA handler `push` di sini — dengan sengaja. Push menuntut layanan
 * sisi server yang mengirimnya, dan proyek ini belum punya (lihat catatan di
 * useAlerts.js). Menambahkan handler kosong hanya akan menyiratkan kemampuan
 * yang tidak ada: selama aplikasi tertutup, tidak ada yang memantau.
 */

// KEDUA BARIS DI BAWAH DIGANTI SAAT BUILD oleh plugin `glykos-pwa`
// (vite.config.js). Nilai di sini adalah nilai cadangan supaya berkasnya tetap
// JavaScript yang sah saat dibaca mentah — bukan nilai yang dipakai produksi.
//
// Kalau nama variabelnya diubah, build akan GAGAL dengan pesan eksplisit
// alih-alih diam-diam mengirim service worker yang cache-nya tidak pernah
// dibersihkan. Lihat plugin itu.
const BUILD_ID = 'dev'
const PRECACHE_URLS = ['/index.html']

// Nama cache ikut BUILD_ID, bukan konstanta 'v1' yang ditulis tangan.
//
// Versi sebelumnya memakai 'v1' dan tidak pernah menaikkannya. Akibatnya cache
// shell TIDAK PERNAH dibersihkan antar rilis: satu-satunya alasan pengguna
// tetap mendapat versi baru adalah karena navigasi memang jaringan-dulu. Aset
// lama menumpuk selamanya, dan HTML basi tetap tersimpan sebagai cadangan
// offline dari rilis entah kapan. Dengan BUILD_ID, tiap deploy punya ruang
// cache sendiri dan yang lama dihapus saat aktivasi.
const SHELL_CACHE = `glykos-shell-${BUILD_ID}`
const ASSET_CACHE = `glykos-assets-${BUILD_ID}`
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE]
const SHELL_URL = '/index.html'

// Aset statis di luar /assets/ yang layak disimpan setelah sekali diambil:
// model 3D, ikon, font, dan manifest. Semuanya jarang berubah dan mahal
// diunduh ulang pada koneksi seluler.
const RUNTIME_CACHEABLE = /\.(?:png|jpg|jpeg|svg|webp|ico|glb|woff2?)$|\.webmanifest$/

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
  // TIDAK ada skipWaiting() di sini — ini perubahan perilaku yang disengaja.
  //
  // Versi sebelumnya memanggilnya tanpa syarat, sehingga service worker baru
  // langsung mengambil alih halaman yang SEDANG TERBUKA. Untuk aplikasi yang
  // berkasnya dipecah dan dimuat malas, itu berbahaya: tab yang sudah berjalan
  // masih akan meminta chunk milik build lama, sementara cache dan server sudah
  // pindah ke build baru — hasilnya galat "failed to fetch dynamically imported
  // module" di tengah pemakaian, tepat saat pengguna menekan sebuah menu.
  //
  // Sekarang worker baru MENUNGGU. Aplikasi mendeteksinya (hooks/usePwaUpdate.js)
  // lalu menawarkan tombol muat ulang; skipWaiting baru dijalankan atas pilihan
  // pengguna lewat pesan SKIP_WAITING di bawah.
})

async function precache() {
  const cache = await caches.open(SHELL_CACHE)

  // cache.add() SATU PER SATU, bukan cache.addAll().
  //
  // addAll() bersifat semua-atau-tidak-sama-sekali: satu URL yang gagal (aset
  // yang tertinggal saat deploy, jaringan yang putus di tengah) membatalkan
  // seluruh precache, dan service worker-nya gagal terpasang — sehingga
  // NOTIFIKASI ikut mati. Notifikasi adalah tugas utama berkas ini dan tidak
  // butuh cache sama sekali, jadi kegagalan cache tidak boleh menjatuhkannya.
  //
  // `cache: 'reload'` melewati cache HTTP browser: tanpa itu, precache bisa
  // mengisi dirinya dari salinan basi yang justru sedang ingin ditinggalkan.
  await Promise.allSettled(
    PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
  )
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload: browser mulai mengambil dokumen BERBARENGAN dengan
      // membangunkan service worker, alih-alih menunggu worker hidup lebih
      // dulu. Tanpa ini, setiap navigasi pada worker yang sedang tidur membayar
      // ongkos startup worker sebelum permintaan jaringannya berangkat.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined)
      }

      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('glykos-') && !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      )

      await self.clients.claim()
    })(),
  )
})

// Jalur pengambilalihan atas PERMINTAAN pengguna. Dipasangkan dengan
// hooks/usePwaUpdate.js di sisi aplikasi: tombol "Muat Ulang" mengirim pesan
// ini, worker yang menunggu mengaktifkan dirinya, lalu `controllerchange` di
// sisi aplikasi memicu satu kali reload.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Hanya GET same-origin. Permintaan ke Firestore dan Gemini sengaja
  // dilewatkan apa adanya — data medis tidak boleh mengendap di cache HTTP,
  // dan Firestore punya lapisan offline-nya sendiri.
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(event))
    return
  }

  // Berkas build Vite memakai hash pada namanya, jadi isinya tidak pernah
  // berubah untuk URL yang sama — aman disajikan dari cache lebih dulu.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Ikon, model sepatu, dan manifest: SAJIKAN DARI CACHE, PERBARUI DI LATAR.
  // Namanya TIDAK ber-hash, jadi cache-first murni akan mengunci pengguna pada
  // ikon atau model lama sampai cache-nya kedaluwarsa sendiri. Pola ini
  // memberi tampilan seketika sekaligus tetap menyusul versi terbaru untuk
  // kunjungan berikutnya.
  if (RUNTIME_CACHEABLE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

// Navigasi: JARINGAN DULU. Aplikasinya SPA yang sering berubah, jadi
// menyajikan HTML dari cache lebih dulu berisiko mengunci pengguna pada versi
// lama. Cache di sini murni jaring pengaman saat offline.
async function handleNavigate(event) {
  // Hanya rute SPA yang menghasilkan index.html. Halaman HTML statis lain di
  // public/ (mis. /ambang-batas.html) TIDAK boleh ikut disimpan sebagai shell:
  // tanpa penjaga ini, sekali membuka halaman itu membuat aplikasi yang
  // dibuka offline berikutnya menampilkan halaman tersebut, bukan aplikasinya.
  const { pathname } = new URL(event.request.url)
  const isShellRoute = pathname === SHELL_URL || !/\.[a-z0-9]+$/i.test(pathname)

  try {
    const preloaded = await event.preloadResponse
    if (preloaded) {
      if (isShellRoute) void putShell(preloaded.clone())
      return preloaded
    }

    const response = await fetch(event.request)
    if (isShellRoute) void putShell(response.clone())
    return response
  } catch {
    // Offline. Shell hasil precache sudah cukup: router ada di sisi klien,
    // jadi satu index.html melayani SEMUA rute — termasuk /dashboard/history
    // yang belum pernah dibuka sekali pun.
    const cached = await caches.match(SHELL_URL)
    return cached ?? Response.error()
  }
}

async function putShell(response) {
  if (!response.ok) return
  const cache = await caches.open(SHELL_CACHE)
  await cache.put(SHELL_URL, response).catch(() => undefined)
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone()
        void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
      }
      return response
    })
    // Saat offline, kegagalan jaringan tidak boleh muncul sebagai unhandled
    // rejection selama salinan cache-nya sudah ada.
    .catch(() => cached)

  return cached ?? network
}

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
