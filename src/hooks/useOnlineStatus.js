import { useSyncExternalStore } from 'react'

// Status jaringan perangkat.
//
// BATAS YANG PERLU DIINGAT: `navigator.onLine` hanya tahu ada-tidaknya SAMBUNGAN
// ke jaringan, bukan ada-tidaknya akses internet. Wi-Fi hotel yang meminta login
// tetap terbaca `true`. Jadi nilai ini dipakai hanya untuk menjelaskan keadaan
// kepada pengguna — bukan sebagai syarat sebelum mencoba mengambil data. Yang
// menentukan data benar-benar sampai tetap Firestore dan service worker.
//
// Ini juga BUKAN status koneksi sepatu: Bluetooth berjalan lokal antara ponsel
// dan perangkat, dan tetap bekerja tanpa internet sama sekali. Keduanya sengaja
// tidak digabung supaya "offline" tidak terbaca sebagai "sepatu terputus".
//
// useSyncExternalStore, bukan useState + useEffect: `navigator.onLine` adalah
// keadaan milik browser, bukan milik React. Versi useState-nya harus menyetel
// ulang state di dalam effect untuk menutup celah antara render pertama dan
// pemasangan pendengar — yaitu persis pola render bertingkat yang dilarang
// react-hooks. Hook ini memang dibuat untuk kasus ini dan tidak punya celah itu.
function subscribe(onChange) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function getSnapshot() {
  return navigator.onLine !== false
}

// Snapshot untuk render di server. Aplikasi ini tidak dirender di server, tapi
// useSyncExternalStore memerlukannya agar tidak melempar galat kalau suatu saat
// dijalankan di lingkungan tanpa `navigator` — termasuk uji unit.
function getServerSnapshot() {
  return true
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
