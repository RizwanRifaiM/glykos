// Interval & batas waktu jalur data. Dipisah ke modul murni (tanpa React
// maupun Firebase) supaya bisa dibaca pengujian — termasuk penjaga halaman
// public/ambang-batas.html (utils/thresholdsPage.test.js).

// Penyimpanan ke Firestore selama BLE tersambung. Cukup untuk membentuk tren
// harian di halaman Riwayat, sekaligus menghindari kuota write Firestore
// membengkak (firmware kirim BLE tiap ~300 ms — jelas terlalu sering untuk
// ditulis satu-satu). Dipakai hooks/useFirestoreSync.js.
export const SYNC_INTERVAL_MS = 60000

// `live/current` yang tidak diperbarui lebih lama dari ini berhenti dihitung
// sebagai live. Dua kali interval tulis, supaya satu jeda tulis normal tidak
// terbaca sebagai putus. Dipakai hooks/useSensorData.js.
export const STALE_AFTER_MS = 120000
