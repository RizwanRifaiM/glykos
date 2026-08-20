// src/hooks/useTemperatureRise.js
// Menjaga suhu acuan (baseline) satu sesi pemakaian, lalu menilai kenaikannya.
//
// Aturannya sendiri ada di utils/temperatureRise.js (fungsi murni); berkas ini
// hanya menjawab satu pertanyaan: apa acuannya?
//
// ACUAN = SUHU SAAT PERANGKAT BARU TERSAMBUNG
// Bukan suhu kemarin, bukan rata-rata beberapa hari. Konsekuensinya jujur dan
// perlu diketahui: kaki yang SUDAH meradang sebelum sepatu dipakai tidak akan
// terdeteksi, karena kondisi itu ikut menjadi acuannya. Yang ditangkap aturan
// ini adalah peradangan yang BERKEMBANG selama pemakaian.
//
// RATA-RATA BEBERAPA SAMPEL PERTAMA, BUKAN SAMPEL PERTAMA SAJA
// Sensor NTC berderau, dan satu pembacaan tunggal sebagai acuan berarti seluruh
// penilaian sesi itu digantungkan pada satu angka yang kebetulan. Beberapa
// sampel pertama dirata-ratakan dulu; pada laju BLE ~3,3 Hz, itu hanya beberapa
// detik pertama dan tidak terasa oleh pengguna.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { evaluateTemperatureRise } from '../utils/temperatureRise'

// Berapa sampel yang dirata-ratakan untuk membentuk acuan.
// ~3,3 paket/detik, jadi 10 sampel ≈ 3 detik.
const BASELINE_SAMPLES = 10

const EMPTY_SNAPSHOT = { baseline: null, sampleCount: 0 }

// Disimpan DI LUAR React sebagai store eksternal — pola yang sama dengan
// StepCounterSession, FatigueSession, dan WearTimeSession, karena alasan yang
// sama: keadaannya menumpuk antar notifikasi BLE, bukan turunan props. Sebagai
// kelas biasa, seluruh perilakunya bisa diuji tanpa merender apa pun.
export class TemperatureBaselineSession {
  constructor() {
    this._listeners = new Set()
    this._reset()
  }

  _reset() {
    this.sums = {}
    this.counts = {}
    this.sampleCount = 0
    this.snapshot = EMPTY_SNAPSHOT
  }

  reset() {
    this._reset()
    this._notify()
  }

  subscribe = (listener) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  _notify() {
    this._listeners.forEach((listener) => listener())
  }

  // Dipanggil tiap kali pembacaan suhu per area berubah.
  //
  // Setelah acuan terbentuk, pembacaan berikutnya TIDAK lagi mengubahnya —
  // acuan yang ikut bergeser mengikuti suhu terkini tidak akan pernah
  // menunjukkan kenaikan apa pun.
  update(points) {
    if (this.sampleCount >= BASELINE_SAMPLES) return
    if (!points) return

    const areas = Object.keys(points).filter((area) => Number.isFinite(points[area]))
    if (areas.length === 0) return

    areas.forEach((area) => {
      this.sums[area] = (this.sums[area] ?? 0) + points[area]
      this.counts[area] = (this.counts[area] ?? 0) + 1
    })
    this.sampleCount += 1

    const baseline = {}
    areas.forEach((area) => {
      baseline[area] = this.sums[area] / this.counts[area]
    })

    // Acuan sudah bisa dipakai sejak sampel pertama, lalu terus dihaluskan
    // sampai BASELINE_SAMPLES. Menunggu sampai genap sepuluh berarti tiga detik
    // pertama sesi tidak punya penilaian sama sekali — dan tiga detik itu tidak
    // membuat penilaiannya lebih benar, hanya lebih terlambat.
    this.snapshot = { baseline, sampleCount: this.sampleCount }
    this._notify()
  }
}

// `points` = peta suhu per area dari pembacaan sekarang (data.temperatureObj.points).
//
// Acuan hanya dibentuk selama SESI BLE berjalan. Saat perangkat tidak
// tersambung tidak ada acuan, dan hasilnya kosong — bukan nol, karena "tidak
// ada dasar menilai" berbeda dari "tidak ada kenaikan".
export function useTemperatureRise(active, points) {
  const [session] = useState(() => new TemperatureBaselineSession())

  useEffect(() => {
    if (!active) {
      session.reset()
      return
    }
    return () => session.reset()
  }, [active, session])

  useEffect(() => {
    if (!active) return
    session.update(points)
  }, [active, session, points])

  const { baseline } = useSyncExternalStore(session.subscribe, session.getSnapshot)

  return evaluateTemperatureRise(baseline, points)
}
