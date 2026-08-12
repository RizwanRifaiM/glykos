// src/utils/alertRules.js
// Aturan peringatan sebagai fungsi murni — tanpa React, Firestore, maupun
// localStorage, supaya bisa diuji langsung (alertRules.test.js). useAlerts.js
// hanya menyambungkannya ke sumber data dan penyimpanan.
import {
  getPressureStatus,
  getPressureLabel,
  getTemperatureStatus,
  getHumidityStatus,
  TEMP_DELTA_WARNING,
} from '../constants/thresholds'

export const STATUS_RANK = { safe: 0, warning: 1, danger: 2 }

// Jeda minimum sebelum metrik yang SAMA boleh mencatat status yang SAMA lagi.
// Tanpa ini, nilai yang berosilasi tepat di sekitar ambang (mis. tekanan
// 199↔201 kPa) menghasilkan deretan peringatan identik yang membanjiri
// halaman Peringatan dan menenggelamkan kejadian yang benar-benar baru.
export const ALERT_COOLDOWN_MS = 10 * 60 * 1000

export function evaluateMetrics(data) {
  const peak = data.pressure?.peak ?? 0
  const pressureStatus = getPressureStatus(peak)

  // Nilai 0 pada suhu kulit & kelembapan berarti "sensor belum mengirim",
  // bukan pembacaan — suhu kaki 0 °C dan 0% RH di dalam sepatu sama-sama
  // mustahil. Tanpa guard ini getHumidityStatus(0) mengembalikan 'warning'
  // (jatuh ke cabang terakhir), sehingga setiap kali dashboard dibuka tanpa
  // perangkat, transisi palsu safe -> warning ikut TERCATAT ke Firestore
  // sebagai peringatan sungguhan dan muncul lagi nanti di halaman Riwayat.
  const highest = data.temperatureObj?.highest ?? 0
  const delta = data.temperatureObj?.delta ?? 0
  const hasTemperature = highest > 0
  const temperatureStatus = !hasTemperature
    ? 'safe'
    : delta >= TEMP_DELTA_WARNING
      ? 'warning'
      : getTemperatureStatus(highest)

  const humidity = data.humidity ?? 0
  const humidityStatus = humidity > 0 ? getHumidityStatus(humidity) : 'safe'

  return [
    {
      metric: 'pressure',
      label: 'Tekanan',
      status: pressureStatus,
      value: `${peak} kPa`,
      location: data.pressure?.location ?? null,
      message: `Tekanan puncak ${peak} kPa (${getPressureLabel(pressureStatus)})`,
    },
    {
      metric: 'temperature',
      label: 'Suhu',
      status: temperatureStatus,
      value: `${highest}°C`,
      location: data.temperatureObj?.location ?? null,
      message:
        delta >= TEMP_DELTA_WARNING
          ? `Selisih suhu ${delta.toFixed(1)}°C antar area — prediktor pre-ulkus`
          : `Suhu tertinggi ${highest}°C`,
    },
    {
      metric: 'humidity',
      label: 'Kelembapan',
      status: humidityStatus,
      value: `${humidity}% RH`,
      location: null,
      message: `Kelembapan sepatu ${humidity}% RH`,
    },
  ]
}

// Keputusan "catat atau tidak" untuk satu metrik.
//
// Dua aturan:
//   1. Hanya transisi ke status baru yang dicatat (bukan tiap pembacaan).
//   2. Status yang sama pada metrik yang sama tidak boleh dicatat ulang
//      sebelum ALERT_COOLDOWN_MS lewat, sekalipun sempat kembali ke `safe`.
export function decideAlert(prevEntry, status, now, cooldownMs = ALERT_COOLDOWN_MS) {
  const prevStatus = prevEntry?.status ?? 'safe'
  const currRank = STATUS_RANK[status] ?? 0
  const prevRank = STATUS_RANK[prevStatus] ?? 0

  const unchanged = {
    status,
    loggedStatus: prevEntry?.loggedStatus,
    loggedAt: prevEntry?.loggedAt,
  }

  if (currRank === 0 || status === prevStatus) {
    return { shouldLog: false, shouldNotify: false, entry: unchanged }
  }

  const withinCooldown =
    prevEntry?.loggedStatus === status &&
    typeof prevEntry?.loggedAt === 'number' &&
    now - prevEntry.loggedAt < cooldownMs

  if (withinCooldown) {
    return { shouldLog: false, shouldNotify: false, entry: unchanged }
  }

  return {
    shouldLog: true,
    shouldNotify: status === 'danger' && currRank > prevRank,
    entry: { status, loggedStatus: status, loggedAt: now },
  }
}
