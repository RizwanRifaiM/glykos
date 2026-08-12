// Mode demo mengisi dashboard dengan data contoh (src/constants/demoData.js)
// supaya tampilan grafik & kartu bisa ditinjau tanpa perangkat BLE.
//
// Ada TIGA keadaan, bukan dua:
//
//   'on'   — dipaksa menyala lewat ?demo=1
//   'off'  — dipaksa mati lewat ?demo=0 (untuk melihat keadaan kosong yang
//            sebenarnya: semua nol + ajakan menyambungkan perangkat)
//   'auto' — tidak ada parameter: data contoh tampil HANYA selama belum ada
//            data nyata sama sekali, dan mundur seketika begitu ada.
//
// 'auto' adalah default supaya dashboard tidak menyambut pengguna baru dengan
// layar berisi angka nol. Pengamannya ada di pemanggilnya
// (DashboardLayout.jsx), bukan di sini:
//   - data nyata SELALU menang; data contoh tidak pernah menimpa pembacaan
//     sensor, termasuk pembacaan lama yang sudah basi;
//   - tidak ada satu pun angka contoh yang ditulis ke Firestore.
//
// Catatan: mode 'auto' TIDAK menampilkan DemoModeBanner (dihapus atas
// permintaan). Jadi di keadaan default, satu-satunya petunjuk bahwa angkanya
// contoh adalah status Bluetooth di topbar yang terputus. Spanduk hanya muncul
// pada mode 'on'.
export function demoPreference() {
  if (typeof window === 'undefined') return 'auto'
  const value = new URLSearchParams(window.location.search).get('demo')
  if (value === '1') return 'on'
  if (value === '0') return 'off'
  return 'auto'
}

// Menentukan apakah data contoh dipakai untuk render kali ini.
//
// `hasRealData` mencakup data yang sudah basi: pembacaan lama tetap pembacaan
// sungguhan, dan menggantinya dengan angka contoh justru menyembunyikan
// kenyataan bahwa perangkat berhenti mengirim.
//
// `isLoaded` mencegah kedipan berbahaya: sebelum snapshot pertama dari
// Firestore tiba, kita belum tahu apakah pengguna punya data — jadi jangan
// tampilkan angka contoh dulu, karena arah kedipan contoh → nyata jauh lebih
// menyesatkan daripada kosong → contoh.
export function shouldUseDemoData(preference, { hasRealData, isLoaded }) {
  if (preference === 'on') return true
  if (preference === 'off') return false
  return Boolean(isLoaded) && !hasRealData
}

// URL untuk mematikan/menyalakan mode demo tanpa kehilangan halaman aktif.
export function demoToggleHref(enabled) {
  const path = typeof window === 'undefined' ? '/dashboard' : window.location.pathname
  return `${path}?demo=${enabled ? '1' : '0'}`
}
