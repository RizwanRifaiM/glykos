// Deteksi keadaan pemasangan aplikasi.
//
// Berkas ini sengaja BEBAS REACT: keadaan yang dijawabnya (sedang berjalan
// sebagai aplikasi terpasang? platformnya bisa dipasang otomatis?) dibutuhkan
// juga di luar siklus render — main.jsx memakainya sebelum React hidup untuk
// menandai <html>, dan hook memakainya di dalam komponen.

const DISMISS_KEY = 'glykos:install-dismissed-until'

// Ditawarkan lagi setelah dua minggu, bukan tidak pernah lagi.
//
// "Jangan tampilkan lagi" selamanya salah untuk aplikasi ini: orang menolak
// memasang saat masih mencoba-coba, lalu benar-benar mulai memakainya sehari-
// hari beberapa minggu kemudian — dan pada titik itu memasang justru berguna,
// karena notifikasi peringatan dan mode offline baru terasa gunanya di sana.
// Dua minggu cukup lama untuk tidak terasa memaksa.
const DISMISS_DAYS = 14

// Media query display-mode adalah sumber kebenaran di Android/desktop;
// navigator.standalone adalah satu-satunya jalan di iOS, yang tidak pernah
// mengimplementasikan media query itu.
//
// `minimal-ui` dan `fullscreen` ikut dihitung: ketiganya berarti aplikasinya
// dibuka DARI IKON yang terpasang, dan itu yang menentukan apakah ajakan
// memasang masih relevan.
export function isStandalone() {
  if (typeof window === 'undefined') return false

  const byDisplayMode = ['standalone', 'minimal-ui', 'fullscreen'].some(
    (mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches,
  )

  return byDisplayMode || window.navigator.standalone === true
}

// iOS TIDAK PERNAH memicu `beforeinstallprompt` — di sana memasang aplikasi
// hanya bisa lewat menu Bagikan, dan tidak ada API apa pun yang bisa membukanya
// dari halaman. Jadi platform ini butuh perlakuan terpisah: bukan tombol
// "Pasang", melainkan petunjuk langkahnya.
//
// Semua browser di iOS memakai mesin WebKit yang sama, jadi ini berlaku untuk
// Chrome dan Firefox di iPhone juga — bukan hanya Safari.
export function isIos() {
  if (typeof navigator === 'undefined') return false

  // iPadOS 13+ menyamar sebagai macOS di userAgent. Yang membedakannya dari Mac
  // sungguhan: layar sentuh.
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return /iPad|iPhone|iPod/.test(navigator.userAgent) || iPadOs
}

export function isInstallDismissed() {
  try {
    const until = Number(window.localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(until) && until > Date.now()
  } catch {
    // Mode privat / storage diblokir. Menganggapnya "belum pernah ditolak"
    // memang berarti ajakannya bisa muncul lagi di sesi berikutnya, tapi itu
    // jauh lebih baik daripada menyembunyikannya selamanya karena satu galat
    // baca.
    return false
  }
}

export function dismissInstall() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000))
  } catch {
    // Lihat catatan di isInstallDismissed: penolakan tetap berlaku untuk sesi
    // ini lewat state React, hanya tidak bertahan setelah tab ditutup.
  }
}

// Menandai <html> supaya CSS bisa membedakan jendela browser dari aplikasi
// terpasang. Dipakai untuk hal-hal yang hanya benar di salah satunya: padding
// safe-area di bawah notch, dan menyembunyikan ajakan memasang.
//
// Dipanggil dari main.jsx SEBELUM render pertama — kalau menunggu effect React,
// tampilannya sempat melompat satu frame saat padding-nya menyusul.
export function markDisplayMode() {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.displayMode = isStandalone() ? 'standalone' : 'browser'
}
