// src/hooks/useStepCounter.js
import { useEffect, useState, useSyncExternalStore } from 'react'

// Ambang deteksi langkah (satuan g, deviasi dinamis dari baseline gravitasi).
const RISE_THRESHOLD_G = 0.12
const FALL_THRESHOLD_G = -0.12
const MIN_STEP_INTERVAL_MS = 350 // jeda minimum antar langkah (refractory period)
const BASELINE_ALPHA = 0.05 // laju adaptasi baseline gravitasi (EMA, per sampel)

const EMPTY_RESULT = { steps: 0, wearMinutes: 0, sessionActive: false }

// State impuratif satu "sesi pemakaian" disimpan DI LUAR React (pola sama
// seperti BleSensor di services/ble.js & FatigueSession di
// useFatigueMonitor.js) karena bergantung pada Date.now() dan akumulasi
// berjalan antar notifikasi BLE.
// Diekspor untuk pengujian: seluruh logika deteksi langkah ada di kelas ini,
// jadi bisa diuji dengan menyuapkan deret akselerasi tanpa merender React.
export class StepCounterSession {
  constructor() {
    this._listeners = new Set()
    this._reset()
  }

  _reset() {
    this.baseline = null
    this.state = 'idle' // 'idle' | 'armed'
    this.steps = 0
    this.lastStepAt = null
    this.sessionStartedAt = null
    this.wasLive = false
    this.snapshot = EMPTY_RESULT
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

  // Dipanggil tiap kali `data`/`isLive` berubah — lihat useStepCounter().
  update(data, isLive) {
    if (isLive && !this.wasLive) this._reset()
    this.wasLive = isLive

    const accel = data?.accel
    const hasAccel =
      accel && typeof accel.x === 'number' && typeof accel.y === 'number' && typeof accel.z === 'number'

    if (!isLive || !hasAccel) {
      if (this.snapshot !== EMPTY_RESULT) {
        this.snapshot = EMPTY_RESULT
        this._notify()
      }
      return
    }

    const now = Date.now()
    if (!this.sessionStartedAt) this.sessionStartedAt = now

    const magnitude = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z)

    // Baseline gravitasi adaptif (EMA lambat) — supaya deteksi langkah tetap
    // netral terhadap orientasi pemasangan perangkat, bukan asumsi kaku 1g.
    if (this.baseline === null) this.baseline = magnitude
    else this.baseline += BASELINE_ALPHA * (magnitude - this.baseline)

    const dynamic = magnitude - this.baseline

    // Threshold-crossing dengan hysteresis: satu langkah = naik melewati
    // ambang atas lalu turun melewati ambang bawah (mencegah noise kecil di
    // sekitar satu ambang dihitung berkali-kali), dibatasi jeda minimum.
    if (this.state === 'idle' && dynamic > RISE_THRESHOLD_G) {
      this.state = 'armed'
    } else if (this.state === 'armed' && dynamic < FALL_THRESHOLD_G) {
      const sinceLastStep = this.lastStepAt ? now - this.lastStepAt : Infinity
      if (sinceLastStep >= MIN_STEP_INTERVAL_MS) {
        this.steps += 1
        this.lastStepAt = now
      }
      this.state = 'idle'
    }

    this.snapshot = {
      steps: this.steps,
      // LAMA PERANGKAT TERHUBUNG pada sesi ini, dalam menit.
      //
      // Dinamai `wearMinutes`, bukan `activeMinutes`, karena itulah yang
      // benar-benar diukurnya: jam berjalan sejak sesi dimulai, tanpa
      // memandang apakah kakinya bergerak. Nama lamanya menjanjikan "waktu
      // aktif" dan sempat membuat kartu menampilkan 480 menit untuk seseorang
      // yang duduk seharian dengan sepatu terpasang.
      //
      // Nama yang menyiratkan arti berbeda dari isinya adalah jebakan yang
      // sudah sekali menimbulkan bug di proyek ini (lihat catatan prop `id` di
      // components/SensorFootMap.jsx), jadi kali ini namanya ikut diperbaiki
      // bersama artinya — bukan hanya komentarnya.
      wearMinutes: (now - this.sessionStartedAt) / 60000,
      sessionActive: true,
    }
    this._notify()
  }
}

// Menghitung jumlah langkah dari akselerasi mentah MPU6050 (AX/AY/AZ, satuan
// g) yang dikirim firmware lewat BLE — firmware TIDAK melakukan deteksi
// langkah sendiri (lihat komentar `accel` di useBleSensor.js), jadi seluruh
// proses (magnitude, baseline gravitasi adaptif, deteksi ambang dengan
// hysteresis, refractory period) dihitung di web app ini.
//
// Algoritma: "dynamic threshold-crossing with hysteresis", pola standar pada
// literatur/aplikasi pedometer berbasis akselerometer (mis. app note AN-2554
// Analog Devices "Step Counting Using the ADXL367") — magnitude =
// √(x²+y²+z²), baseline gravitasi mengikuti sinyal secara pelan (EMA) supaya
// tetap netral terhadap orientasi kaki, satu langkah dihitung saat sinyal
// dinamis naik melewati ambang lalu turun melewati ambang berlawanan, dengan
// jeda minimum antar langkah supaya satu ayunan tidak dihitung berkali-kali.
//
// KETERBATASAN PENTING (baca sebelum mengandalkan angka ini): firmware saat
// ini mengirim notifikasi BLE tiap ~300ms (~3,3 sampel/detik). Literatur
// step-detection akselerometer umumnya memakai 25-50Hz. Pada 3,3Hz kita ada
// DI BAWAH batas Nyquist untuk cadence jalan cepat/lari (satu langkah
// tercepat ~0,3 detik = ~3,3Hz, perlu sampling >=6,6Hz supaya puncaknya tidak
// terlewat/alias). Jadi: pada jalan santai/normal algoritma ini cukup masuk
// akal, tapi pada jalan cepat/lari kemungkinan UNDERCOUNT karena banyak
// puncak akselerasi jatuh di antara dua sampel. ini keterbatasan laju
// notifikasi BLE firmware, bukan bug di algoritma — perbaikan lanjut perlu
// firmware mengirim lebih sering, atau ESP32 sendiri yang mendeteksi langkah
// (sampling MPU6050 jauh lebih cepat secara lokal) lalu mengirim hasilnya.
export function useStepCounter(deviceId, data, isLive) {
  const [session] = useState(() => new StepCounterSession())

  useEffect(() => {
    session.reset()
  }, [deviceId, session])

  useEffect(() => {
    session.update(data, isLive)
  }, [session, data, isLive])

  return useSyncExternalStore(session.subscribe, session.getSnapshot)
}
