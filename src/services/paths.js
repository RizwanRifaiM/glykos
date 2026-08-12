// src/services/paths.js
// Satu-satunya tempat bentuk path Firestore ditentukan.
//
// SEMUA data perangkat berada di bawah dokumen pengguna:
//   users/{uid}                                     -> profil pasien
//   users/{uid}/devices/{deviceId}/live/current     -> snapshot terbaru
//   users/{uid}/devices/{deviceId}/history/{id}     -> log mentah per menit
//   users/{uid}/devices/{deviceId}/daily/{tanggal}  -> rangkuman harian
//   users/{uid}/devices/{deviceId}/alerts/{id}      -> peringatan
//
// Sebelumnya path-nya `devices/{deviceId}/...` di tingkat atas dengan deviceId
// yang di-hardcode, sehingga setiap akun membaca dan MENIMPA data yang sama —
// login ada tapi tidak memisahkan apa pun. Aturan aksesnya ada di
// `firestore.rules`; keduanya harus diubah bersamaan.
import { collection, doc } from 'firebase/firestore'
import { db } from './firestore'

export function profileDoc(uid) {
  return doc(db, 'users', uid)
}

export function liveDoc(uid, deviceId) {
  return doc(db, 'users', uid, 'devices', deviceId, 'live', 'current')
}

export function historyCollection(uid, deviceId) {
  return collection(db, 'users', uid, 'devices', deviceId, 'history')
}

// Rangkuman per hari, satu dokumen per tanggal. Halaman Riwayat membaca INI,
// bukan koleksi `history` mentah — 30 hari = 30 dokumen, bukan puluhan ribu.
export function dailyCollection(uid, deviceId) {
  return collection(db, 'users', uid, 'devices', deviceId, 'daily')
}

export function dailyDoc(uid, deviceId, dateKey) {
  return doc(db, 'users', uid, 'devices', deviceId, 'daily', dateKey)
}

export function alertsCollection(uid, deviceId) {
  return collection(db, 'users', uid, 'devices', deviceId, 'alerts')
}
