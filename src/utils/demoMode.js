// Mode demo mengisi dashboard dengan data contoh (src/constants/demoData.js)
// supaya tampilan grafik & kartu bisa ditinjau tanpa perangkat BLE.
//
// HANYA MENYALA BILA DIMINTA EKSPLISIT lewat `?demo=1`.
//
// Sebelumnya ada mode 'auto': data contoh tampil sendiri selama pengguna belum
// punya data, TANPA spanduk penanda. Niatnya baik — dashboard pengguna baru
// tidak menyambut dengan layar berisi angka nol. Hasilnya justru berbahaya di
// aplikasi seperti ini: angka karangan yang tidak bisa dibedakan dari pembacaan
// sensor, pada layar yang seluruh gunanya adalah membaca kondisi kaki. Satu-
// satunya petunjuk adalah status Bluetooth di topbar, dan itu terlalu halus
// untuk menanggung beban sebesar itu.
//
// Yang menggantikannya adalah keadaan kosong yang jujur: kartu bertanda "—"
// beserta ajakan menyambungkan perangkat. Tidak menyenangkan dilihat, tapi
// tidak pernah salah.
//
// Dua keadaan yang tersisa:
//   'on'  — diminta lewat ?demo=1, SELALU disertai DemoModeBanner
//   'off' — segala keadaan lain, termasuk tanpa parameter sama sekali
//
// Sengaja hanya lewat query string: selalu terlihat di URL, tidak lengket antar
// sesi, dan tidak pernah menulis apa pun ke Firestore.
export function demoPreference() {
  if (typeof window === 'undefined') return 'off'
  return new URLSearchParams(window.location.search).get('demo') === '1' ? 'on' : 'off'
}

// Menentukan apakah data contoh dipakai untuk render kali ini.
//
// Tidak lagi bergantung pada ada tidaknya data pengguna: keputusan itu kini
// murni milik pengguna lewat URL. Keadaan "belum ada data" ditangani dengan
// menampilkan keadaan kosong, bukan dengan menyulapnya jadi angka contoh.
export function shouldUseDemoData(preference) {
  return preference === 'on'
}

// URL untuk mematikan/menyalakan mode demo tanpa kehilangan halaman aktif.
export function demoToggleHref(enabled) {
  const path = typeof window === 'undefined' ? '/dashboard' : window.location.pathname
  return `${path}?demo=${enabled ? '1' : '0'}`
}
