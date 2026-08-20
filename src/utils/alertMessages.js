// src/utils/alertMessages.js
// Merakit kalimat peringatan dari data terstruktur (lihat utils/alertRules.js).
//
// KENAPA PERAKITAN TERJADI SAAT DIBACA, BUKAN SAAT DICATAT
// Peringatan adalah catatan medis yang bertahan berbulan-bulan, sementara
// bahasa antarmuka bisa berganti kapan saja. Kalau kalimatnya dirakit saat
// dicatat, bahasa yang dipakai saat itu ikut membeku ke dalam data — dan
// satu-satunya cara menerjemahkannya belakangan adalah menulis ulang dokumen
// yang seharusnya append-only. Dengan merakitnya saat dibaca, satu catatan
// yang sama tampil dalam bahasa apa pun tanpa datanya pernah disentuh.
//
// `i18n` dioper eksplisit karena berkas ini juga dipakai di luar React (jalur
// notifikasi di useAlerts.js). Pemanggil di dalam komponen mengambilnya dari
// useLingui() — yang sekaligus membuat komponennya render ulang saat bahasa
// berganti (lihat catatan konvensi di utils/locale.js).
//
// Setiap angka disiapkan sebagai VARIABEL sebelum masuk ke pesan, bukan
// dipanggil di dalamnya (`${formatDecimal(x)}`). Dua alasan: rule
// `lingui/no-expression-in-message` menolak bentuk itu, dan placeholder yang
// bernama (`{peakText}`) jauh lebih bisa dipahami penerjemah daripada
// `{0}` tanpa keterangan apa pun.
//
// PEMBERIAN LOCALE KE FORMATTER
// Angka diformat dengan `i18n.locale` yang DIOPER, bukan locale dari instance
// global. Di aplikasi hanya ada satu instance, jadi keduanya sama — tapi
// membaca global di sini membuat fungsi ini berbohong tentang argumennya:
// dioper instance berbahasa Inggris, angkanya tetap keluar bergaya Indonesia
// ("32,8"). Kesalahan seperti itu tidak terlihat sampai ada instance kedua —
// dan yang pertama kali punya instance kedua adalah pengujian.
import { msg, t } from '@lingui/core/macro'
import {
  getPressureLabelMsg,
  HUMIDITY_RANGE,
  HUMIDITY_RISK,
  LOCATION_LABELS,
  PRESSURE_THRESHOLDS,
  TEMP_DELTA_WARNING,
  TEMP_RANGE,
} from '../constants/thresholds'
import { FATIGUE_LABELS } from '../constants/fatigue'
import { formatDecimal, formatNumber } from './locale'

// Nama metrik. Dipakai sebagai judul baris di halaman Peringatan dan sebagai
// judul notifikasi, jadi harus sama persis di keduanya.
const METRIC_LABELS = {
  pressure: msg`Tekanan`,
  temperature: msg`Suhu`,
  humidity: msg`Kelembapan`,
  fatigue: msg`Kelelahan`,
  temperatureTrend: msg`Selisih Suhu Menetap`,
}

export function metricLabel(i18n, metric) {
  const descriptor = METRIC_LABELS[metric]
  // Metrik yang tidak dikenal (catatan dari versi lama, atau metrik baru yang
  // belum diberi label) ditampilkan apa adanya — lebih baik daripada baris
  // kosong pada catatan medis.
  return descriptor ? i18n._(descriptor) : metric
}

export function locationLabel(i18n, location) {
  const descriptor = LOCATION_LABELS[location]
  return descriptor ? i18n._(descriptor) : (location ?? null)
}

function describePressure(i18n, item) {
  const peakText = formatDecimal(Number(item.values?.peak) || 0, 1, i18n.locale)
  const statusText = i18n._(getPressureLabelMsg(item.status))
  return {
    value: t(i18n)`${peakText} kPa`,
    message: t(i18n)`Tekanan puncak ${peakText} kPa (${statusText})`,
  }
}

function describeTemperature(i18n, item) {
  const highestText = formatDecimal(Number(item.values?.highest) || 0, 1, i18n.locale)
  const deltaText = formatDecimal(Number(item.values?.delta) || 0, 1, i18n.locale)
  const value = t(i18n)`${highestText} °C`

  // Dua kalimat berbeda, bukan satu kalimat dengan sisipan: yang memicu status
  // ini bisa suhu tertingginya, atau SELISIH antar area — dan selisih yang
  // bertahan adalah prediktor pre-ulkus, informasi yang sama sekali berbeda
  // artinya bagi pembacanya.
  if (item.values?.deltaExceeded) {
    return {
      value,
      message: t(i18n)`Selisih suhu ${deltaText} °C antar area — prediktor pre-ulkus`,
    }
  }

  return { value, message: t(i18n)`Suhu tertinggi ${highestText} °C` }
}

function describeHumidity(i18n, item) {
  const humidityText = formatDecimal(Number(item.values?.humidity) || 0, 1, i18n.locale)
  return {
    value: t(i18n)`${humidityText} % RH`,
    message: t(i18n)`Kelembapan sepatu ${humidityText} % RH`,
  }
}

// Alasan indikasi kelelahan. Disimpan sebagai KODE + angka oleh
// useFatigueMonitor.js, bukan kalimat — alasan yang sama dengan peringatan.
function describeFatigueReason(i18n, reason) {
  switch (reason?.code) {
    case 'sustained': {
      const minutesText = formatNumber(reason.minutes, { locale: i18n.locale })
      return t(i18n)`Beban tinggi berkelanjutan ${minutesText} menit`
    }
    case 'redistribution': {
      const ppText = formatNumber(reason.pp, { locale: i18n.locale })
      return reason.severity === 'danger'
        ? t(i18n)`Distribusi tekanan bergeser ke metatarsal +${ppText}pp`
        : t(i18n)`Distribusi tekanan mulai bergeser ke metatarsal +${ppText}pp`
    }
    case 'tempRise': {
      const riseText = formatDecimal(reason.celsius, 1, i18n.locale)
      return t(i18n)`Suhu kaki naik ${riseText} °C selama sesi (sinyal sekunder)`
    }
    case 'steps': {
      const stepsText = formatNumber(reason.steps, { locale: i18n.locale })
      return t(i18n)`Total ${stepsText} langkah dalam sesi ini`
    }
    default:
      return null
  }
}

export function describeFatigueReasons(i18n, reasons) {
  return (reasons ?? []).map((reason) => describeFatigueReason(i18n, reason)).filter(Boolean)
}

function describeFatigue(i18n, item) {
  const levelText = i18n._(FATIGUE_LABELS[item.status] ?? FATIGUE_LABELS.safe)
  const reasons = describeFatigueReasons(i18n, item.values?.reasons)

  return {
    value: levelText,
    message:
      reasons.length > 0 ? reasons.join('; ') : t(i18n)`Indikasi kelelahan: ${levelText}`,
  }
}

function describeTrend(i18n, item) {
  const daysText = formatNumber(Number(item.values?.streakDays) || 0, { locale: i18n.locale })
  const maxDeltaText = formatDecimal(Number(item.values?.maxDelta) || 0, 1, i18n.locale)
  const thresholdText = formatDecimal(TEMP_DELTA_WARNING, 1, i18n.locale)
  return {
    value: t(i18n)`${maxDeltaText} °C · ${daysText} hari`,
    message: t(i18n)`Selisih suhu antar area bertahan di atas ${thresholdText} °C selama ${daysText} hari berturut-turut (tertinggi ${maxDeltaText} °C).`,
  }
}

const DESCRIBERS = {
  pressure: describePressure,
  temperature: describeTemperature,
  humidity: describeHumidity,
  fatigue: describeFatigue,
  temperatureTrend: describeTrend,
}

// Bentuk siap tampil dari satu item peringatan terstruktur:
//   { label, location, value, message }
//
// Dipakai untuk peringatan LIVE (dari evaluateMetrics) maupun catatan
// tersimpan dari Firestore — keduanya berbentuk sama, jadi halaman Peringatan
// tidak perlu tahu asal-usulnya.
export function describeAlert(i18n, item) {
  const describe = DESCRIBERS[item?.metric]
  const base = describe ? describe(i18n, item) : { value: null, message: null }

  return {
    label: metricLabel(i18n, item?.metric),
    location: locationLabel(i18n, item?.location),
    value: base.value,
    message: base.message,
  }
}

// Pembeda catatan baru vs lama: hanya penulisan versi terstruktur yang membawa
// `values`.
export function isStructuredAlert(alert) {
  return Boolean(alert?.values && typeof alert.values === 'object')
}

// Catatan LAMA (ditulis sebelum peringatan berbentuk terstruktur) menyimpan
// label/value/message sebagai teks Indonesia jadi. Catatan itu TIDAK diubah —
// memodifikasi catatan medis yang sudah tersimpan bukan hal yang dilakukan
// demi kenyamanan terjemahan — jadi ditampilkan apa adanya, dan ditandai
// `legacy` supaya antarmuka bisa menjelaskannya kalau perlu.
export function describeStoredAlert(i18n, alert) {
  if (isStructuredAlert(alert)) return describeAlert(i18n, alert)

  return {
    label: alert?.label ?? alert?.metric ?? null,
    location: alert?.location ?? null,
    value: alert?.value ?? null,
    message: alert?.message ?? null,
    legacy: true,
  }
}

// Ambang & rentang dalam bentuk teks — dipakai konteks chatbot dan beberapa
// keterangan kartu. Disatukan di sini supaya angka ambang tidak ditulis ulang
// di banyak tempat lalu menyimpang satu per satu.
export function thresholdText(locale) {
  const n = (value) => formatNumber(value, { locale })
  return {
    pressureSafe: n(PRESSURE_THRESHOLDS.safe),
    pressureRisk: n(PRESSURE_THRESHOLDS.warning),
    tempMin: n(TEMP_RANGE.min),
    tempMax: n(TEMP_RANGE.max),
    tempDelta: formatDecimal(TEMP_DELTA_WARNING, 1, locale),
    humidityMin: n(HUMIDITY_RANGE.min),
    humidityMax: n(HUMIDITY_RANGE.max),
    humidityRisk: n(HUMIDITY_RISK),
  }
}
