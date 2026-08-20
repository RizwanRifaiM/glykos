// src/hooks/useFatigueMonitor.js
import { useEffect, useState, useSyncExternalStore } from 'react'
import { PRESSURE_THRESHOLDS } from '../constants/thresholds'
import {
  SUSTAINED_WARNING_MIN,
  SUSTAINED_DANGER_MIN,
  SUSTAINED_GAP_GRACE_SEC,
  REDISTRIBUTION_WARNING_PP,
  REDISTRIBUTION_DANGER_PP,
  TEMP_RISE_SECONDARY_C,
  STEPS_WARNING,
  STEPS_DANGER,
} from '../constants/fatigue'

const EMPTY_RESULT = {
  level: 'safe',
  sustainedMinutes: 0,
  distributionShiftPct: 0,
  steps: 0,
  reasons: [],
  sessionActive: false,
}

function distributionOf(points) {
  const heel = Number(points?.heel ?? 0)
  const metatarsal = Number(points?.metatarsal ?? 0)
  const toe = Number(points?.toe ?? 0)
  const total = heel + metatarsal + toe
  if (total <= 0) return null

  return {
    heelPct: (heel / total) * 100,
    metatarsalPct: (metatarsal / total) * 100,
    toePct: (toe / total) * 100,
  }
}

// Menyimpan state satu "sesi pemakaian" DI LUAR React (mirip BleSensor di
// services/ble.js) karena perhitungannya bergantung pada Date.now() dan
// akumulasi berjalan — bukan sesuatu yang bisa diturunkan murni dari props
// saat render. Komponen membaca snapshot-nya lewat useSyncExternalStore.
// Diekspor untuk pengujian — lihat catatan yang sama di useStepCounter.js.
export class FatigueSession {
  constructor() {
    this._listeners = new Set()
    this._reset()
  }

  _reset() {
    this.baselineDistribution = null
    this.baselineTemp = null
    this.sustainedSince = null
    this.lastAboveAt = null
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

  // Dipanggil tiap kali `data`/`isLive`/`steps` berubah — lihat useFatigueMonitor().
  update(data, isLive, steps) {
    if (isLive && !this.wasLive) this._reset()
    this.wasLive = isLive

    if (!isLive || !data) {
      if (this.snapshot !== EMPTY_RESULT) {
        this.snapshot = EMPTY_RESULT
        this._notify()
      }
      return
    }

    const now = Date.now()
    const peak = Number(data.pressure?.peak ?? 0)
    const highestTemp = Number(data.temperatureObj?.highest ?? 0)
    const distribution = distributionOf(data.pressure?.points)

    if (!this.baselineDistribution && distribution) {
      this.baselineDistribution = distribution
    }
    if (this.baselineTemp === null && highestTemp > 0) {
      this.baselineTemp = highestTemp
    }

    const aboveThreshold = peak >= PRESSURE_THRESHOLDS.safe
    if (aboveThreshold) {
      if (!this.sustainedSince) this.sustainedSince = now
      this.lastAboveAt = now
    } else if (
      this.sustainedSince &&
      this.lastAboveAt &&
      now - this.lastAboveAt > SUSTAINED_GAP_GRACE_SEC * 1000
    ) {
      this.sustainedSince = null
    }

    const sustainedMinutes = this.sustainedSince ? (now - this.sustainedSince) / 60000 : 0

    const distributionShiftPct =
      distribution && this.baselineDistribution
        ? distribution.metatarsalPct - this.baselineDistribution.metatarsalPct
        : 0

    const tempRiseC = this.baselineTemp !== null ? highestTemp - this.baselineTemp : 0

    let points = 0

    // `reasons` berisi KODE + angka, bukan kalimat.
    //
    // Sebelumnya di sini dirakit kalimat berbahasa Indonesia lengkap dengan
    // `toLocaleString('id-ID')`. Itu membuat alasan kelelahan tidak bisa ikut
    // berganti bahasa — dan kalau alasannya ikut tercatat sebagai peringatan,
    // bahasanya bahkan tertulis ke Firestore. Perakitan kalimatnya kini ada di
    // utils/alertMessages.js (describeFatigueReasons) dan terjadi saat dibaca.
    const reasons = []

    if (sustainedMinutes >= SUSTAINED_DANGER_MIN) {
      points += 2
      reasons.push({ code: 'sustained', minutes: Math.round(sustainedMinutes) })
    } else if (sustainedMinutes >= SUSTAINED_WARNING_MIN) {
      points += 1
      reasons.push({ code: 'sustained', minutes: Math.round(sustainedMinutes) })
    }

    if (distributionShiftPct >= REDISTRIBUTION_DANGER_PP) {
      points += 2
      reasons.push({
        code: 'redistribution',
        pp: Math.round(distributionShiftPct),
        severity: 'danger',
      })
    } else if (distributionShiftPct >= REDISTRIBUTION_WARNING_PP) {
      points += 1
      reasons.push({
        code: 'redistribution',
        pp: Math.round(distributionShiftPct),
        severity: 'warning',
      })
    }

    if (tempRiseC >= TEMP_RISE_SECONDARY_C && this.sustainedSince) {
      points += 1
      reasons.push({ code: 'tempRise', celsius: tempRiseC })
    }

    const totalSteps = Number(steps) || 0
    if (totalSteps >= STEPS_DANGER) {
      points += 2
      reasons.push({ code: 'steps', steps: totalSteps })
    } else if (totalSteps >= STEPS_WARNING) {
      points += 1
      reasons.push({ code: 'steps', steps: totalSteps })
    }

    const level = points >= 4 ? 'danger' : points >= 2 ? 'warning' : 'safe'

    this.snapshot = {
      level,
      sustainedMinutes,
      distributionShiftPct,
      steps: totalSteps,
      reasons,
      sessionActive: true,
    }
    this._notify()
  }
}

// Memantau satu "sesi pemakaian" (sejak perangkat live) untuk indikasi
// kelelahan lewat pola sensor yang sudah ada — lihat constants/fatigue.js
// untuk dasar riset & tingkat keyakinan tiap faktor. Ini heuristik
// transparan (bisa dijelaskan alasannya), BUKAN pengukuran klinis kelelahan
// otot.
//
// `steps` dioper dari useStepCounter.js (dihitung dari akselerasi MPU6050 —
// lihat catatan keterbatasan sample rate di sana). Belum mencakup degradasi
// cadence/gait (langkah melambat dibanding awal sesi) — itu perlu analisis
// lebih rumit & lebih rawan noise pada sample rate BLE saat ini (~3,3Hz),
// jadi baru total langkah kumulatif yang dipakai dulu.
export function useFatigueMonitor(deviceId, data, isLive, steps) {
  const [session] = useState(() => new FatigueSession())

  useEffect(() => {
    session.reset()
  }, [deviceId, session])

  useEffect(() => {
    session.update(data, isLive, steps)
  }, [session, data, isLive, steps])

  return useSyncExternalStore(session.subscribe, session.getSnapshot)
}
