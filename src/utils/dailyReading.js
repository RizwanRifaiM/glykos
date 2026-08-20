// src/utils/dailyReading.js
// Dua aturan yang menentukan ISI kartu dashboard — logika murni, tanpa React
// maupun Firestore, supaya bisa diuji langsung (dailyReading.test.js).
//
// Keduanya menjawab satu pertanyaan yang sama: apa yang layak disebut
// "pembacaan hari ini"?
//
// LATAR BELAKANG
// Sebelumnya kartu memakai pembacaan BLE selama tersambung, lalu jatuh ke
// dokumen live Firestore begitu putus. Dua akibatnya salah:
//
//   1. Kartu Aktivitas jatuh ke NOL saat perangkat dilepas. Langkah yang sudah
//      terjadi hari itu memang tidak ikut terbaca kembali — `steps` tersimpan di
//      Firestore tapi tidak pernah dibaca. Bagi pengguna, langkahnya hilang.
//   2. Tidak ada yang pernah kedaluwarsa. Pembacaan kemarin terus tampil
//      keesokan harinya sebagai kondisi kaki hari ini — pada aplikasi
//      pemantauan, itu bukan sekadar angka basi melainkan angka yang salah.
//
// Aturannya sekarang: pembacaan terakhir berlaku SEPANJANG HARI ITU, dan hanya
// pergantian hari yang mengakhirinya. Terputusnya koneksi tidak menghapus
// apa pun — kaki yang menerima tekanan tinggi pagi tadi tetap menerimanya.

// Sumber mana yang dipakai untuk mengisi kartu.
//
//   'ble'       — pembacaan BLE di memori (paling baru; bertahan setelah putus)
//   'firestore' — dokumen live, dipakai setelah halaman dimuat ulang
//   'none'      — belum ada pembacaan HARI INI; kartu diisi nol
//
// `bleActive` menang tanpa syarat tanggal: perangkat yang sedang mengirim
// adalah kebenaran paling mutakhir yang kita punya, dan pembacaan yang baru
// masuk memang bertanggal hari ini menurut jam perangkat pengguna sendiri.
export function resolveReadingSource({
  todayKey,
  bleActive = false,
  bleDate = null,
  firestoreHasData = false,
  firestoreDate = null,
} = {}) {
  if (bleActive) return 'ble'
  if (bleDate && bleDate === todayKey) return 'ble'
  if (firestoreHasData && firestoreDate === todayKey) return 'firestore'
  return 'none'
}

// Total langkah & menit aktif HARI INI.
//
// Rangkuman harian (utils/dailyRollup.js) sudah menjumlahkan seluruh sesi hari
// ini, tapi tertinggal sampai satu interval sinkronisasi (60 detik). Karena itu
// ditambahkan bagian sesi berjalan yang BELUM tertulis: `syncedSteps` adalah
// angka terakhir yang sudah masuk rangkuman, jadi selisihnya tidak pernah
// terhitung dua kali.
//
// Jepitan `Math.max` terhadap angka rangkuman menutup satu jendela sempit: pada
// awal sesi baru, `syncedSteps` masih membawa sisa sesi sebelumnya sampai
// sinkronisasi pertama selesai (lihat catatannya di useFirestoreSync.js).
// Tanpa jepitan itu totalnya sempat berkedip turun — dan angka aktivitas yang
// turun sendiri adalah hal yang paling membingungkan untuk dilihat.
//
// Mengembalikan `null`, bukan objek berisi nol, saat belum ada apa pun hari
// ini: nol yang ditampilkan sebagai angka terbaca seperti hasil pengukuran,
// padahal artinya "belum diukur". ActivityPanel punya keadaan kosongnya sendiri
// untuk itu.
export function todayActivity({
  rollupSteps = 0,
  rollupActiveMinutes = 0,
  sessionSteps = 0,
  sessionActiveMinutes = 0,
  syncedSteps = 0,
  syncedActiveMinutes = 0,
} = {}) {
  // Langkah dan menit aktif memakai perhitungan yang PERSIS sama: angka
  // rangkuman ditambah bagian sesi berjalan yang belum tertulis. Sebelumnya
  // menit aktif memakai Math.max antara keduanya — hasilnya tertinggal sampai
  // satu interval sinkronisasi, dan pada sesi kedua di hari yang sama malah
  // menahan angkanya di total sesi pertama.
  const merge = (rollup, session, synced) => {
    const base = Math.max(0, Number(rollup) || 0)
    const pending = Math.max(0, (Number(session) || 0) - (Number(synced) || 0))
    return Math.max(base, base + pending)
  }

  const steps = Math.round(merge(rollupSteps, sessionSteps, syncedSteps))
  const activeMinutes = Math.round(
    merge(rollupActiveMinutes, sessionActiveMinutes, syncedActiveMinutes),
  )

  if (steps <= 0 && activeMinutes <= 0) return null
  return { steps, activeMinutes }
}
