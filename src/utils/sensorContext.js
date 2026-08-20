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
//
// RINGKASAN INI IKUT BAHASA ANTARMUKA
// Bukan kosmetik: model menjawab dalam bahasa instruksi sistemnya (lihat
// services/gemini.js). Kalau konteksnya tetap berbahasa Indonesia sementara
// instruksinya Inggris, model harus menerjemahkan sendiri istilah klinis
// sambil menjawab — dan menerjemahkan sambil menyimpulkan adalah cara paling
// mudah membuat angka tertukar atau istilah bergeser artinya. Keduanya
// disatukan dalam satu bahasa supaya tidak ada penerjemahan yang terjadi di
// dalam model.
import { msg, t } from '@lingui/core/macro'
import { evaluateMetrics } from './alertRules'
import { locationLabel, thresholdText } from './alertMessages'
import { TEMP_DELTA_WARNING } from '../constants/thresholds'
import { trendLevelLabel } from './temperatureTrend'
import { formatDecimal, formatNumber } from './locale'

const STATUS_TEXT = {
  safe: msg`aman`,
  warning: msg`perlu perhatian`,
  danger: msg`berisiko`,
}

function statusText(i18n, status) {
  const descriptor = STATUS_TEXT[status]
  return descriptor ? i18n._(descriptor) : '-'
}

function average(values) {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

// Hari dianggap tercatat kalau ada pembacaan suhu — sama seperti isRecorded()
// di temperatureTrend.js. Nol berarti perangkat tidak dipakai.
function recordedDays(history) {
  return (history ?? []).filter((point) => Number(point?.temperature) > 0)
}

export function buildSensorContext(
  i18n,
  { data, history = [], trend = null, fatigue = null, isLive = false, demoMode = false } = {},
) {
  if (!data) return ''

  const lines = []
  const locale = i18n.locale
  const th = thresholdText(locale)

  // Pembatas ini penting: tanpa penanda yang tegas, angka contoh bisa dijawab
  // model seolah-olah kondisi kaki pengguna yang sebenarnya.
  if (demoMode) {
    lines.push(
      t(i18n)`PERHATIAN: angka di bawah adalah DATA CONTOH, bukan pembacaan perangkat pengguna. Sebutkan hal ini kalau pengguna bertanya tentang kondisinya sendiri.`,
    )
    lines.push('')
  }

  // Status per metrik diambil dari evaluateMetrics — sumber yang sama dengan
  // spanduk status & pencatatan peringatan, supaya chatbot tidak pernah
  // menyebut kondisi yang berbeda dari yang tertulis di layar.
  const metrics = evaluateMetrics(data)
  const byMetric = Object.fromEntries(metrics.map((item) => [item.metric, item]))

  lines.push(t(i18n)`KONDISI TERKINI (dari sepatu milik pengguna):`)

  const sourceText = isLive
    ? t(i18n)`pembacaan langsung`
    : t(i18n)`pembacaan tersimpan terakhir`
  lines.push(t(i18n)`- Sumber data: ${sourceText}`)

  const peak = data.pressure?.peak ?? 0
  if (peak > 0) {
    const peakText = formatDecimal(peak, 1, locale)
    const where = locationLabel(i18n, data.pressure?.location) ?? t(i18n)`tidak diketahui`
    const state = statusText(i18n, byMetric.pressure?.status)
    lines.push(
      t(i18n)`- Tekanan puncak: ${peakText} kPa di ${where} (${state}; aman < ${th.pressureSafe} kPa, risiko ulkus > ${th.pressureRisk} kPa)`,
    )
  }

  const highest = data.temperatureObj?.highest ?? 0
  if (highest > 0) {
    const highestText = formatDecimal(highest, 1, locale)
    const where = locationLabel(i18n, data.temperatureObj?.location) ?? t(i18n)`tidak diketahui`
    lines.push(
      t(i18n)`- Suhu kulit tertinggi: ${highestText} °C di ${where} (rentang normal ${th.tempMin}–${th.tempMax} °C)`,
    )

    const deltaText = formatDecimal(data.temperatureObj?.delta ?? 0, 1, locale)
    lines.push(
      t(i18n)`- Selisih suhu antar area: ${deltaText} °C (ambang perhatian ${th.tempDelta} °C — selisih yang bertahan berhari-hari adalah prediktor pre-ulkus)`,
    )
  }

  const humidity = data.humidity ?? 0
  if (humidity > 0) {
    const humidityText = formatDecimal(humidity, 1, locale)
    const state = statusText(i18n, byMetric.humidity?.status)
    lines.push(
      t(i18n)`- Kelembapan dalam sepatu: ${humidityText} % RH (${state}; ideal ${th.humidityMin}–${th.humidityMax} %, risiko > ${th.humidityRisk} %)`,
    )
  }

  const steps = data.activity?.steps ?? 0
  if (steps > 0) {
    const stepsText = formatNumber(steps, { locale })
    const minutesText = formatNumber(data.activity?.activeMinutes ?? 0, { locale })
    // "hari ini", bukan "sesi ini": angka ini sekarang total seluruh sesi hari
    // ini (lihat utils/dailyReading.js). Label yang salah di sini bukan soal
    // kerapian — model akan mengulanginya kepada pengguna sebagai fakta.
    lines.push(t(i18n)`- Aktivitas hari ini: ${stepsText} langkah, ${minutesText} menit aktif`)
  }

  if (fatigue?.sessionActive) {
    const levelText =
      fatigue.level === 'danger'
        ? t(i18n)`tinggi`
        : fatigue.level === 'warning'
          ? t(i18n)`sedang`
          : t(i18n)`rendah`
    lines.push(t(i18n)`- Indikasi kelelahan kaki: ${levelText}`)
  }

  // --- Rangkuman harian ------------------------------------------------------
  const days = recordedDays(history)
  if (days.length > 0) {
    const deltas = days.map((d) => Number(d.temperatureDelta) || 0)
    const pressures = days.map((d) => Number(d.pressure) || 0)
    const overThreshold = deltas.filter((d) => d >= TEMP_DELTA_WARNING).length

    const rangeText = formatNumber(history.length, { locale })
    const recordedText = formatNumber(days.length, { locale })
    lines.push('')
    lines.push(t(i18n)`RANGKUMAN ${rangeText} HARI TERAKHIR (${recordedText} hari tercatat):`)

    const avgPressure = formatDecimal(average(pressures) ?? 0, 1, locale)
    const maxPressure = formatDecimal(Math.max(...pressures), 1, locale)
    lines.push(
      t(i18n)`- Tekanan puncak: rata-rata ${avgPressure} kPa, tertinggi ${maxPressure} kPa`,
    )

    const avgDelta = formatDecimal(average(deltas) ?? 0, 1, locale)
    const overText = formatNumber(overThreshold, { locale })
    lines.push(
      t(i18n)`- Selisih suhu: rata-rata ${avgDelta} °C, ${overText} dari ${recordedText} hari di atas ambang ${th.tempDelta} °C`,
    )

    const avgHumidity = formatDecimal(
      average(days.map((d) => Number(d.humidity) || 0)) ?? 0,
      1,
      locale,
    )
    lines.push(t(i18n)`- Kelembapan: rata-rata ${avgHumidity} % RH`)

    const totalSteps = days.reduce((sum, d) => sum + (Number(d.steps) || 0), 0)
    if (totalSteps > 0) {
      const totalStepsText = formatNumber(totalSteps, { locale })
      lines.push(t(i18n)`- Total langkah tercatat: ${totalStepsText}`)
    }
  }

  if (trend && trend.level !== 'safe') {
    const daysText = formatNumber(trend.streakDays, { locale })
    const maxDeltaText = formatDecimal(trend.maxDelta, 1, locale)
    const levelText = trendLevelLabel(i18n, trend.level)
    lines.push('')
    lines.push(
      t(i18n)`POLA YANG SEDANG BERJALAN: selisih suhu di atas ambang selama ${daysText} hari berturut-turut (tertinggi ${maxDeltaText} °C) — status "${levelText}".`,
    )
  }

  return lines.join('\n')
}
