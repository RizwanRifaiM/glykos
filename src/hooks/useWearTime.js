// src/hooks/useWearTime.js
// Lama perangkat TERHUBUNG pada sesi berjalan, dalam menit.
//
// KENAPA TERPISAH DARI useStepCounter
// Sebelumnya angka ini dihitung di dalam StepCounterSession, dan itu keliru
// secara struktural: penghitung langkah keluar ke keadaan kosong begitu tidak
// ada data akselerometer —
//
//     if (!isLive || !hasAccel) { this.snapshot = EMPTY_RESULT; return }
//
// — sementara lama pemakaian tidak ada hubungannya sama sekali dengan sensor
// gerak. Akibatnya angka waktu jatuh ke nol pada dua keadaan yang keduanya
// wajar terjadi:
//
//   1. Firmware tidak mengirim AX/AY/AZ. Kontrak BLE memang menyebutnya
//      opsional — modul gerak hanya mengirim bila terdeteksi saat startup.
//   2. Sumber data jatuh ke Firestore, yaitu SETIAP kali halaman dimuat ulang.
//      parseSensorReading tidak pernah menghasilkan field `accel`, jadi
//      `hasAccel` selalu false di jalur itu.
//
// Yang diukur di sini hanyalah jam berjalan sejak sesi dimulai. Satu-satunya
// masukannya adalah "apakah perangkat sedang terhubung" — tidak ada sensor,
// tidak ada ambang, tidak ada yang bisa membuatnya kosong selain sesi yang
// memang belum dimulai.
//
// Total HARIAN-nya bukan urusan berkas ini: hitungan di sini direset tiap sesi,
// dan penjumlahan antar sesi terjadi di rangkuman harian (utils/dailyRollup.js)
// lalu digabung di utils/dailyReading.js.
import { useEffect, useState, useSyncExternalStore } from 'react'

// Seberapa sering angkanya diperbarui.
//
// Yang ditampilkan satuan MENIT, jadi 15 detik sudah jauh lebih rapat daripada
// yang bisa terlihat; detak lebih cepat hanya menambah render tanpa mengubah
// apa pun di layar. Konsekuensinya nilai yang ikut tersimpan ke Firestore bisa
// tertinggal paling banyak satu detak — pada angka yang dibulatkan ke menit,
// itu tidak pernah menggeser hasilnya lebih dari satu menit.
const TICK_MS = 15000

// Disimpan DI LUAR React sebagai store eksternal, pola yang sama dengan
// StepCounterSession dan FatigueSession — karena alasan yang sama: nilainya
// bergantung pada Date.now() dan berjalan lewat timer, bukan turunan dari
// props. Sebagai kelas biasa, seluruh perilakunya juga bisa diuji tanpa
// merender apa pun.
export class WearTimeSession {
  constructor() {
    this._listeners = new Set()
    this.startedAt = null
    this.snapshot = 0
  }

  subscribe = (listener) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  _set(value) {
    if (value === this.snapshot) return
    this.snapshot = value
    this._listeners.forEach((listener) => listener())
  }

  start(now = Date.now()) {
    this.startedAt = now
    this._set(0)
  }

  // Sesi berakhir. Hitungan kembali ke nol — yang sudah berlalu sudah tersimpan
  // ke rangkuman harian oleh penulisan penutup di useFirestoreSync.js, dan
  // kartunya menampilkan total harian, bukan angka sesi ini.
  stop() {
    this.startedAt = null
    this._set(0)
  }

  tick(now = Date.now()) {
    if (this.startedAt === null) return
    // Math.max menjaga nilainya tidak pernah negatif kalau jam sistem sempat
    // mundur (penyelarasan NTC/NTP, pengguna mengubah jam) di tengah sesi.
    this._set(Math.max(0, (now - this.startedAt) / 60000))
  }
}

export function useWearTime(active) {
  const [session] = useState(() => new WearTimeSession())

  useEffect(() => {
    if (!active) {
      session.stop()
      return
    }

    session.start()
    const intervalId = setInterval(() => session.tick(), TICK_MS)

    return () => {
      clearInterval(intervalId)
      session.stop()
    }
  }, [active, session])

  return useSyncExternalStore(session.subscribe, session.getSnapshot)
}
