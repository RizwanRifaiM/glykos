// Mendaftarkan public/sw.js dan menjadi satu-satunya pintu ke pendaftarannya.
//
// Alasan lengkap kenapa service worker-nya ada di komentar kepala berkas itu —
// ringkasnya: tanpa ini, notifikasi peringatan tidak muncul sama sekali di
// Chrome Android.
//
// HANYA DI BUILD PRODUKSI. Versi pertama mendaftarkannya di `npm run dev` juga,
// dengan alasan supaya notifikasi bisa diuji tanpa deploy. Itu keliru: service
// worker menaruh lapisan cache di antara pengembang dan hasil editnya sendiri,
// sehingga perubahan yang sudah benar bisa terlihat "tidak berubah" — persis
// jenis kebingungan yang paling mahal saat sedang meninjau tampilan.
//
// Untuk menguji notifikasi dan perilaku offline secara lokal, pakai
// `npm run preview`: itu menyajikan hasil build produksi di localhost, jadi
// service worker-nya aktif dan syarat secure context tetap terpenuhi.

// Berapa sering aplikasi yang TERUS TERBUKA memeriksa versi baru.
//
// Browser hanya memeriksa sw.js sendiri saat navigasi. Aplikasi ini dipasang ke
// layar utama dan dibiarkan terbuka berjam-jam selagi sepatu dipakai — tanpa
// pemeriksaan berkala, sesi seperti itu tidak akan pernah tahu ada rilis baru
// sampai pengguna menutup dan membukanya kembali.
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

let registrationPromise = null

// Pendengar untuk "ada versi baru yang menunggu". Set, bukan satu callback:
// spanduk pembaruan dan panel di halaman Profil sama-sama perlu tahu.
const waitingListeners = new Set()
let waitingWorker = null

// Penjaga muat-ulang. `controllerchange` bisa terpicu oleh sebab lain (service
// worker yang baru pertama kali mengambil alih halaman); memuat ulang pada
// kejadian itu akan me-refresh halaman orang tanpa mereka minta. Jadi reload
// HANYA dilakukan sebagai lanjutan dari applyUpdate() yang dipanggil pengguna.
let updateRequested = false
let reloading = false

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  // Web Bluetooth dan service worker sama-sama menuntut secure context, jadi
  // syaratnya persis sama dengan sisa aplikasi: localhost atau HTTPS.
  if (!window.isSecureContext) return

  // Di dev, BERSIHKAN pendaftaran yang mungkin tertinggal dari build produksi
  // (atau dari versi berkas ini yang dulu mendaftar di dev). Tanpa ini,
  // service worker lama tetap mengendalikan halaman dev di browser yang sama
  // dan terus menyajikan salinan cache-nya.
  if (import.meta.env.DEV) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => undefined)

    // Membatalkan pendaftaran tidak menghapus isi cache-nya. Dibersihkan juga
    // supaya tidak ada sisa yang bisa tersaji lagi.
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => keys.filter((key) => key.startsWith('glykos-')).map((key) => caches.delete(key)))
        .catch(() => undefined)
    }
    return
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) return
    reloading = true
    window.location.reload()
  })

  // Pendaftaran ditunda sampai `load`, dan itu BUKAN sekadar kebiasaan.
  // Instalasi service worker langsung mengunduh ~20 berkas shell untuk
  // precache-nya. Kalau itu dimulai selagi halaman pertama masih memuat,
  // unduhan tersebut berebut bandwidth dengan berkas yang sedang ditunggu
  // pengguna — jadi fitur yang dibuat untuk mempercepat kunjungan BERIKUTNYA
  // justru memperlambat yang SEKARANG, paling terasa di koneksi seluler lambat.
  //
  // Pendengar controllerchange di atas sengaja dipasang lebih dulu: ia tidak
  // mengunduh apa pun, dan melewatkan kejadiannya berarti muat-ulang setelah
  // pembaruan tidak pernah terjadi.
  const register = () => {
    registrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        watchForWaiting(registration)
        schedulePeriodicChecks(registration)
        return registration
      })
      .catch((err) => {
        console.warn('Service worker gagal didaftarkan:', err)
        return null
      })
  }

  if (document.readyState === 'complete') {
    // Sudah lewat: menunggu `load` yang tidak akan datang lagi berarti service
    // worker tidak pernah didaftarkan sama sekali.
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
}

function watchForWaiting(registration) {
  // Tiga jalur, karena worker baru bisa sudah menunggu SEBELUM halaman ini
  // dimuat, muncul saat halaman terbuka, atau baru selesai terpasang di tengah
  // sesi. Melewatkan salah satunya berarti spanduk pembaruan kadang tidak
  // pernah muncul — dan "kadang" adalah bug yang paling sulit dipercayai orang.
  if (registration.waiting && navigator.serviceWorker.controller) {
    setWaiting(registration.waiting)
  }

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) return

    installing.addEventListener('statechange', () => {
      // `controller` yang ada membedakan PEMBARUAN dari PEMASANGAN PERTAMA.
      // Pada pemasangan pertama tidak ada apa pun yang perlu diberitahukan:
      // yang sedang dilihat pengguna sudah versi terbaru.
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        setWaiting(installing)
      }
    })
  })
}

function setWaiting(worker) {
  waitingWorker = worker
  waitingListeners.forEach((listener) => listener(true))
}

function schedulePeriodicChecks(registration) {
  const check = () => registration.update().catch(() => undefined)

  window.setInterval(check, UPDATE_INTERVAL_MS)

  // Kembali ke aplikasi setelah lama ditinggalkan adalah saat paling wajar
  // untuk memeriksa: pengguna baru saja mengalihkan perhatiannya ke sini, jadi
  // pembaruan yang ditemukan sekarang tidak memotong apa pun.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}

// Dipakai hooks/usePwaUpdate.js. Mengembalikan fungsi berhenti-berlangganan,
// dan langsung melaporkan keadaan saat ini supaya pemanggil yang terpasang
// belakangan tidak melewatkan pemberitahuan yang sudah lewat.
export function subscribeToWaitingWorker(listener) {
  waitingListeners.add(listener)
  if (waitingWorker) listener(true)
  return () => waitingListeners.delete(listener)
}

export function hasWaitingWorker() {
  return waitingWorker !== null
}

// Menyuruh worker yang menunggu mengambil alih. Halaman TIDAK dimuat ulang di
// sini — reload menyusul lewat `controllerchange` di atas, setelah worker baru
// benar-benar memegang kendali. Memuat ulang lebih dulu akan mengambil HTML
// baru sambil masih dilayani worker lama, dan salah satu dari keduanya akan
// menyajikan versi yang tidak cocok.
export function applyUpdate() {
  if (!waitingWorker) return false
  updateRequested = true
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  return true
}

// Pemeriksaan atas permintaan pengguna (tombol di halaman Profil). Terpisah
// dari pemeriksaan berkala supaya orang yang mencurigai aplikasinya tertinggal
// versi punya cara memastikannya sendiri.
export async function checkForUpdate() {
  const registration = await registrationPromise
  if (!registration) return false

  await registration.update().catch(() => undefined)
  return hasWaitingWorker()
}
