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
import { formatDecimal, formatMonthYear, formatNumber } from './locale'
import { HBA1C_RANGE, LDL_RANGE, parseLabDate } from './riskProfile'

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

// Tingkat kelelahan sebagai TEKS.
//
// Diekspor sebagai fungsi supaya komponen tidak perlu menyentuh peta
// deskriptornya sendiri — lihat catatan "PETA DESKRIPTOR TIDAK BOLEH KELUAR
// DARI utils/" di eslint.config.js.
export function fatigueLabel(i18n, level) {
  return i18n._(FATIGUE_LABELS[level] ?? FATIGUE_LABELS.safe)
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

  // Kalimat yang berbeda untuk sebab yang berbeda, bukan satu kalimat dengan
  // sisipan. Apa yang memicu status ini menentukan apa yang perlu dilakukan
  // pembacanya, dan itu informasi yang sama sekali berbeda artinya.

  // 1. Penilaian berbasis KENAIKAN dari awal sesi — yang paling tajam.
  if (Number.isFinite(item.values?.maxRise)) {
    const riseText = formatDecimal(item.values.maxRise, 1, i18n.locale)
    const risenText = formatNumber(item.values.risenCount ?? 0, { locale: i18n.locale })
    const areaText = formatNumber(item.values.areaCount ?? 0, { locale: i18n.locale })

    if (item.values.systemic) {
      return {
        value,
        message: t(i18n)`Suhu naik ${riseText} °C merata di semua titik — pola menyeluruh, bukan peradangan setempat`,
      }
    }

    return {
      value,
      message: t(i18n)`Suhu naik ${riseText} °C hanya di ${risenText} dari ${areaText} titik — pola peradangan setempat`,
    }
  }

  // 2. Tanpa acuan awal sesi: selisih antar area pada satu pembacaan.
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
  const value = t(i18n)`${humidityText} % RH`

  // Kalau ada suhu untuk menormalkannya, kalimatnya menyebut angka DI KULIT —
  // itulah yang menentukan statusnya, dan menyebut angka mentah saja akan
  // membuat catatan tidak cocok dengan status yang menyertainya.
  if (Number.isFinite(item.values?.rhAtSkin)) {
    const skinText = formatDecimal(item.values.rhAtSkin, 1, i18n.locale)
    return {
      value,
      message: t(i18n)`Kelembapan sepatu ${humidityText} % RH — setara ${skinText} % di permukaan kulit`,
    }
  }

  return { value, message: t(i18n)`Kelembapan sepatu ${humidityText} % RH` }
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
  const levelText = fatigueLabel(i18n, item.status)
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

// ---------------------------------------------------------------------------
// Tingkat risiko pasien (utils/riskProfile.js)
// ---------------------------------------------------------------------------

const RISK_TIER_LABELS = {
  standard: msg`Standar`,
  elevated: msg`Meningkat`,
  high: msg`Tinggi`,
}

// Petanya tidak diekspor — lihat catatan "PETA DESKRIPTOR TIDAK BOLEH KELUAR
// DARI utils/" di eslint.config.js.
export function riskTierLabel(i18n, tier) {
  return i18n._(RISK_TIER_LABELS[tier] ?? RISK_TIER_LABELS.standard)
}

// Apa yang BERUBAH pada pemantauan di tiap tingkat — ditampilkan di Profil
// supaya pengguna tahu persis akibat dari angka yang ia isi.
export function riskTierEffect(i18n, tier) {
  if (tier === 'high') {
    return t(i18n)`Notifikasi berbunyi sejak status Perlu Perhatian, dan kondisi yang bertahan diingatkan lagi setiap 15 menit.`
  }
  if (tier === 'elevated') {
    return t(i18n)`Notifikasi berbunyi sejak status Perlu Perhatian, bukan hanya saat Risiko.`
  }
  return t(i18n)`Notifikasi berbunyi saat status Risiko; kondisi yang bertahan diingatkan lagi setiap 30 menit.`
}

function labMonth(i18n, date) {
  const parsed = parseLabDate(date)
  return parsed ? formatMonthYear(parsed, i18n.locale) : null
}

// Satu faktor sebagai frasa pendek: "HbA1c 8,4 % (Jun 2026)".
export function describeRiskFactor(i18n, factor) {
  switch (factor?.code) {
    case 'ulcerHistory':
      return t(i18n)`riwayat ulkus`
    case 'neuropathy':
      return t(i18n)`neuropati`
    case 'hba1c': {
      const valueText = formatDecimal(factor.value, 1, i18n.locale)
      const month = labMonth(i18n, factor.date)
      return month ? t(i18n)`HbA1c ${valueText} % (${month})` : t(i18n)`HbA1c ${valueText} %`
    }
    case 'ldl': {
      const valueText = formatNumber(factor.value, { locale: i18n.locale })
      const month = labMonth(i18n, factor.date)
      return month ? t(i18n)`LDL ${valueText} mg/dL (${month})` : t(i18n)`LDL ${valueText} mg/dL`
    }
    default:
      return null
  }
}

// Kalimat tambahan pada peringatan yang dicatat saat pemantauan diperketat.
// Null untuk tingkat Standar dan untuk catatan yang ditulis sebelum fitur ini
// ada — keduanya memang tidak punya alasan tambahan untuk disebut.
//
// Membaca `alert.risk` yang TERSIMPAN, bukan profil sekarang: alasan pada
// catatan lama harus tetap alasan saat catatan itu dibuat.
export function describeRiskNote(i18n, risk) {
  if (!risk || (risk.tier !== 'elevated' && risk.tier !== 'high')) return null

  const reasons = (risk.factors ?? [])
    .map((factor) => describeRiskFactor(i18n, factor))
    .filter(Boolean)
    .join(', ')

  const note = reasons
    ? t(i18n)`Pemantauan diperketat: ${reasons}.`
    : t(i18n)`Pemantauan diperketat sesuai profil kesehatan Anda.`

  if (risk.tier !== 'high') return note
  const advice = t(i18n)`Bila kondisi ini berulang, konsultasikan dengan tenaga kesehatan.`
  return `${note} ${advice}`
}

// Pengingat hasil lab (reminders dari assessRiskProfile).
export function describeLabReminder(i18n, reminder) {
  // Nama pemeriksaan tidak diterjemahkan — HbA1c dan LDL sama di kedua bahasa.
  // eslint-disable-next-line lingui/no-unlocalized-strings
  const lab = reminder?.code === 'ldl' ? 'LDL' : 'HbA1c'
  const range = reminder?.code === 'ldl' ? LDL_RANGE : HBA1C_RANGE
  const unit = reminder?.code === 'ldl' ? 'mg/dL' : '%'

  switch (reminder?.status) {
    case 'missing':
      return t(i18n)`${lab} belum diisi.`
    case 'invalid': {
      const minText = formatNumber(range.min, { locale: i18n.locale })
      const maxText = formatNumber(range.max, { locale: i18n.locale })
      return t(i18n)`Nilai ${lab} di luar rentang wajar (${minText}–${maxText} ${unit}) — periksa kembali angkanya.`
    }
    case 'noDate':
      return t(i18n)`Tanggal pemeriksaan ${lab} belum diisi — nilainya belum dipakai.`
    case 'stale': {
      const monthsText = formatNumber(Math.floor(reminder.ageDays / 30.44), { locale: i18n.locale })
      return t(i18n)`${lab} terakhir diperiksa ${monthsText} bulan lalu — perbarui supaya pemantauan sesuai kondisi Anda sekarang.`
    }
    default:
      return null
  }
}

// Status satu hasil lab untuk penanda di samping kolomnya (Profil). `lab`
// adalah keluaran readLab() di utils/riskProfile.js. Null untuk kolom kosong —
// kolom yang belum diisi tidak perlu diberi label apa pun.
//
//   tone: 'ok'   — dipakai untuk tingkat pemantauan
//         'warn' — ada nilai, tapi TIDAK dipakai (dan kenapa)
export function describeLabStatus(i18n, lab) {
  switch (lab?.status) {
    case 'valid': {
      const months = Math.floor((lab.ageDays ?? 0) / 30.44)
      if (months < 1) return { tone: 'ok', text: t(i18n)`Berlaku · bulan ini` }
      const monthsText = formatNumber(months, { locale: i18n.locale })
      return { tone: 'ok', text: t(i18n)`Berlaku · ${monthsText} bln lalu` }
    }
    case 'stale':
      return { tone: 'warn', text: t(i18n)`Kedaluwarsa` }
    case 'noDate':
      return { tone: 'warn', text: t(i18n)`Perlu tanggal` }
    case 'invalid':
      return { tone: 'warn', text: t(i18n)`Di luar rentang` }
    default:
      return null
  }
}

// Bentuk siap tampil dari satu item peringatan terstruktur:
//   { label, location, value, message, riskNote }
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
    riskNote: describeRiskNote(i18n, item?.risk),
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
