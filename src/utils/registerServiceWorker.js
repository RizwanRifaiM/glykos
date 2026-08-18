// Mendaftarkan public/sw.js. Alasan lengkap kenapa service worker-nya ada di
// komentar kepala berkas itu — ringkasnya: tanpa ini, notifikasi peringatan
// tidak muncul sama sekali di Chrome Android.
//
// HANYA DI BUILD PRODUKSI. Versi pertama mendaftarkannya di `npm run dev` juga,
// dengan alasan supaya notifikasi bisa diuji tanpa deploy. Itu keliru: service
// worker menaruh lapisan cache di antara pengembang dan hasil editnya sendiri,
// sehingga perubahan yang sudah benar bisa terlihat "tidak berubah" — persis
// jenis kebingungan yang paling mahal saat sedang meninjau tampilan.
//
// Untuk menguji notifikasi secara lokal, pakai `npm run preview`: itu menyajikan
// hasil build produksi di localhost, jadi service worker-nya aktif dan syarat
// secure context tetap terpenuhi.
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

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('Service worker gagal didaftarkan:', err)
    })
  })
}
