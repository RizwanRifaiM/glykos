// src/utils/sensorContext.js
// Menyusun ringkasan kondisi pengguna untuk dikirim ke chatbot — logika murni,
// tanpa React maupun jaringan, supaya bisa diuji langsung.
//
// MASALAH YANG DISELESAIKAN
// ChatbotPage tidak pernah membaca useOutletContext, jadi asisten di aplikasi
// PEMANTAUAN ini menjawab tanpa pernah melihat satu angka pun milik pasiennya:
// "tekanan tinggi berisiko ulkus" — benar, tapi sama saja dengan artikel.
//
// BATAS PRIVASI (disengaja, jangan dilonggarkan tanpa alasan kuat)
// Kunci Gemini ikut ter-bundle di klien dan panggilannya langsung dari browser
// (lihat catatan di services/gemini.js), jadi yang dikirim ke sini dibatasi
// pada ANGKA SENSOR AGREGAT saja. Tidak ada nama, email, uid, id perangkat,
// maupun isi profil medis (tipe diabetes, HbA1c, riwayat luka, kontak darurat)
// — justru field-field itu yang paling sensitif dan paling tidak dibutuhkan
// model untuk menjelaskan angka sensor.
import { evaluateMetrics } from './alertRules'
import {
  HUMIDITY_RANGE,
  HUMIDITY_RISK,
  LOCATION_LABELS,
  PRESSURE_THRESHOLDS,
  TEMP_DELTA_WARNING,
  TEMP_RANGE,
} from '../constants/thresholds'
import { TREND_LEVEL_LABELS } from './temperatureTrend'

const STATUS_TEXT = { safe: 'aman', warning: 'perlu perhatian', danger: 'berisiko' }

const round1 = (n) => Math.round(n * 10) / 10

function average(values) {
  if (values.length === 0) return null
  return round1(values.reduce((a, b) => a + b, 0) / values.length)
}

function locationText(key) {
  return LOCATION_LABELS[key] ?? key ?? 'tidak diketahui'
}

// Hari dianggap tercatat kalau ada pembacaan suhu — sama seperti isRecorded()
// di temperatureTrend.js. Nol berarti perangkat tidak dipakai.
function recordedDays(history) {
  return (history ?? []).filter((point) => Number(point?.temperature) > 0)
}

export function buildSensorContext({
  data,
  history = [],
  trend = null,
  fatigue = null,
  isLive = false,
  demoMode = false,
} = {}) {
  if (!data) return ''

  const lines = []

  // Pembatas ini penting: tanpa penanda yang tegas, angka contoh bisa dijawab
  // model seolah-olah kondisi kaki pengguna yang sebenarnya.
  if (demoMode) {
    lines.push(
      'PERHATIAN: angka di bawah adalah DATA CONTOH, bukan pembacaan perangkat pengguna. ' +
        'Sebutkan hal ini kalau pengguna bertanya tentang kondisinya sendiri.',
    )
    lines.push('')
  }

  // Status per metrik diambil dari evaluateMetrics — sumber yang sama dengan
  // spanduk status & pencatatan peringatan, supaya chatbot tidak pernah
  // menyebut kondisi yang berbeda dari yang tertulis di layar.
  const metrics = evaluateMetrics(data)
  const byMetric = Object.fromEntries(metrics.map((item) => [item.metric, item]))

  lines.push('KONDISI TERKINI (dari insole milik pengguna):')
  lines.push(`- Sumber data: ${isLive ? 'pembacaan langsung' : 'pembacaan tersimpan terakhir'}`)

  const peak = data.pressure?.peak ?? 0
  if (peak > 0) {
    lines.push(
      `- Tekanan puncak: ${round1(peak)} kPa di ${locationText(data.pressure?.location)} ` +
        `(${STATUS_TEXT[byMetric.pressure?.status] ?? '-'}; aman < ${PRESSURE_THRESHOLDS.safe} kPa, ` +
        `risiko ulkus > ${PRESSURE_THRESHOLDS.warning} kPa)`,
    )
  }

  const highest = data.temperatureObj?.highest ?? 0
  if (highest > 0) {
    lines.push(
      `- Suhu kulit tertinggi: ${round1(highest)} °C di ${locationText(data.temperatureObj?.location)} ` +
        `(rentang normal ${TEMP_RANGE.min}–${TEMP_RANGE.max} °C)`,
    )

    const delta = data.temperatureObj?.delta ?? 0
    lines.push(
      `- Selisih suhu antar area: ${round1(delta)} °C (ambang perhatian ${TEMP_DELTA_WARNING} °C — ` +
        'selisih yang bertahan berhari-hari adalah prediktor pre-ulkus)',
    )
  }

  const humidity = data.humidity ?? 0
  if (humidity > 0) {
    lines.push(
      `- Kelembapan dalam sepatu: ${round1(humidity)} % RH ` +
        `(${STATUS_TEXT[byMetric.humidity?.status] ?? '-'}; ideal ${HUMIDITY_RANGE.min}–${HUMIDITY_RANGE.max} %, ` +
        `risiko > ${HUMIDITY_RISK} %)`,
    )
  }

  const steps = data.activity?.steps ?? 0
  if (steps > 0) {
    lines.push(
      `- Aktivitas sesi ini: ${steps} langkah, ${data.activity?.activeMinutes ?? 0} menit aktif`,
    )
  }

  if (fatigue?.sessionActive) {
    lines.push(`- Indikasi kelelahan kaki: ${fatigue.level === 'danger' ? 'tinggi' : fatigue.level === 'warning' ? 'sedang' : 'rendah'}`)
  }

  // --- Rangkuman harian ------------------------------------------------------
  const days = recordedDays(history)
  if (days.length > 0) {
    const deltas = days.map((d) => Number(d.temperatureDelta) || 0)
    const overThreshold = deltas.filter((d) => d >= TEMP_DELTA_WARNING).length

    lines.push('')
    lines.push(`RANGKUMAN ${history.length} HARI TERAKHIR (${days.length} hari tercatat):`)
    lines.push(
      `- Tekanan puncak: rata-rata ${average(days.map((d) => Number(d.pressure) || 0))} kPa, ` +
        `tertinggi ${round1(Math.max(...days.map((d) => Number(d.pressure) || 0)))} kPa`,
    )
    lines.push(
      `- Selisih suhu: rata-rata ${average(deltas)} °C, ` +
        `${overThreshold} dari ${days.length} hari di atas ambang ${TEMP_DELTA_WARNING} °C`,
    )
    lines.push(`- Kelembapan: rata-rata ${average(days.map((d) => Number(d.humidity) || 0))} % RH`)

    const totalSteps = days.reduce((sum, d) => sum + (Number(d.steps) || 0), 0)
    if (totalSteps > 0) lines.push(`- Total langkah tercatat: ${totalSteps}`)
  }

  if (trend && trend.level !== 'safe') {
    lines.push('')
    lines.push(
      `POLA YANG SEDANG BERJALAN: selisih suhu di atas ambang selama ${trend.streakDays} hari ` +
        `berturut-turut (tertinggi ${round1(trend.maxDelta)} °C) — status "${TREND_LEVEL_LABELS[trend.level]}".`,
    )
  }

  return lines.join('\n')
}
