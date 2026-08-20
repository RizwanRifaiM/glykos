// src/utils/temperatureTrend.js
// Aturan "selisih suhu bertahan beberapa hari" — logika murni, tanpa React
// maupun Firestore, supaya bisa diuji langsung (temperatureTrend.test.js).
//
// KENAPA TERPISAH DARI alertRules.js
// alertRules.js mengevaluasi SATU pembacaan live: delta ≥ 2,2 °C sekarang →
// catat peringatan. Itu berguna, tapi tidak cukup — sepatu yang panas, jalan
// jauh, atau lantai hangat bisa menaikkan selisih antar-area selama satu sesi
// tanpa ada apa pun yang terjadi pada kakinya.
//
// Yang dipakai pada pemantauan suhu kaki diabetik justru selisih yang
// BERTAHAN antar hari: selisih di atas ambang pada dua hari berturut-turut
// dibaca sebagai tanda peradangan yang perlu ditindaklanjuti (mengurangi beban
// pada area itu), bukan sekadar variasi harian. Karena rangkuman harian sudah
// tersimpan satu dokumen per tanggal (utils/dailyRollup.js), aturan itu bisa
// dihitung di sini tanpa data tambahan apa pun.
//
// Ini tetap heuristik pemantauan, BUKAN diagnosis — lihat catatan serupa di
// constants/fatigue.js.
import { msg, t } from '@lingui/core/macro'
import { TEMP_DELTA_WARNING } from '../constants/thresholds'
import { formatDecimal, formatNumber } from './locale'

// Berapa hari berturut-turut selisih harus bertahan sebelum dinaikkan dari
// "perhatian" jadi "perlu tindakan".
export const SUSTAINED_DAYS = 2

// Deskriptor `msg`, diselesaikan pemanggil dengan i18n._(). Lihat alasannya di
// constants/thresholds.js.
export const TREND_LEVEL_LABELS = {
  safe: msg`Normal`,
  warning: msg`Perlu Perhatian`,
  danger: msg`Perlu Tindakan`,
}

// Satu hari dianggap TERCATAT hanya bila ada pembacaan suhu di hari itu.
// useHistoryData selalu mengembalikan satu baris per tanggal dalam rentang dan
// mengisi hari tanpa rangkuman dengan nol — nol berarti "perangkat tidak
// dipakai", bukan "selisihnya 0 °C". Tanpa pembeda ini, satu hari libur akan
// terbaca sebagai hari normal dan diam-diam memutus rangkaian.
function isRecorded(point) {
  return Number(point?.temperature) > 0
}

// Selisih hari kalender antara dua kunci tanggal 'YYYY-MM-DD'.
// Sengaja lewat Date.UTC: konstruktor Date lokal ikut terpengaruh pergeseran
// zona/DST, sehingga dua tanggal berurutan bisa berjarak 0,96 atau 1,04 hari.
function dayGap(earlierKey, laterKey) {
  const parse = (key) => {
    const [y, m, d] = String(key).split('-').map(Number)
    if (!y || !m || !d) return null
    return Date.UTC(y, m - 1, d)
  }
  const a = parse(earlierKey)
  const b = parse(laterKey)
  if (a === null || b === null) return null
  return Math.round((b - a) / 86400000)
}

// Menilai rangkaian hari TERAKHIR yang selisihnya di atas ambang.
//
// Dihitung mundur dari hari tercatat paling baru. Hari tanpa pembacaan di
// ujung (mis. perangkat belum dipakai hari ini) diloncati — belum dipakai
// bukan berarti membaik. Tapi celah tanggal DI TENGAH rangkaian memutusnya:
// kalau Senin dan Kamis sama-sama di atas ambang sementara Selasa–Rabu tidak
// terpantau, kita tidak punya dasar untuk menyebutnya bertahan berturut-turut.
export function evaluateTemperatureTrend(history, options = {}) {
  const threshold = options.threshold ?? TEMP_DELTA_WARNING
  const sustainedDays = options.sustainedDays ?? SUSTAINED_DAYS

  const recorded = (history ?? []).filter(isRecorded)

  const empty = {
    level: 'safe',
    streakDays: 0,
    threshold,
    sustainedDays,
    maxDelta: 0,
    days: [],
    recordedDays: recorded.length,
  }

  if (recorded.length === 0) return empty

  const streak = []
  for (let i = recorded.length - 1; i >= 0; i--) {
    const point = recorded[i]
    if (Number(point.temperatureDelta) < threshold) break

    // Hari yang baru saja diterima harus persis sehari sebelum hari yang sudah
    // masuk rangkaian.
    const previous = streak[0]
    if (previous) {
      const gap = dayGap(point.date, previous.date)
      if (gap !== 1) break
    }

    streak.unshift(point)
  }

  if (streak.length === 0) return empty

  const level = streak.length >= sustainedDays ? 'danger' : 'warning'

  return {
    level,
    streakDays: streak.length,
    threshold,
    sustainedDays,
    maxDelta: streak.reduce((max, p) => Math.max(max, Number(p.temperatureDelta) || 0), 0),
    days: streak,
    recordedDays: recorded.length,
  }
}

// Kalimat yang dibaca pengguna. Disatukan di sini supaya spanduk, notifikasi,
// dan catatan peringatan memakai kata yang sama persis.
//
// `i18n` dioper eksplisit (lihat konvensi di utils/locale.js). Angkanya lewat
// formatDecimal, bukan toFixed(1): toFixed selalu memakai TITIK desimal,
// sehingga pada antarmuka Indonesia kalimat ini menulis "2.7 °C" sementara
// seluruh teks di sekitarnya menulis "2,7 °C".
export function describeTemperatureTrend(i18n, trend) {
  if (!trend || trend.level === 'safe') {
    return t(i18n)`Selisih suhu antar area kaki dalam batas normal.`
  }

  // Locale diambil dari instance yang DIOPER, bukan dari global — lihat catatan
  // "PEMBERIAN LOCALE KE FORMATTER" di utils/alertMessages.js.
  const locale = i18n.locale
  const deltaText = formatDecimal(trend.maxDelta, 1, locale)
  const thresholdText = formatDecimal(trend.threshold, 1, locale)

  if (trend.level === 'danger') {
    const daysText = formatNumber(trend.streakDays, { locale })
    return t(i18n)`Selisih suhu antar area bertahan di atas ${thresholdText} °C selama ${daysText} hari berturut-turut (tertinggi ${deltaText} °C).`
  }

  return t(i18n)`Selisih suhu antar area mencapai ${deltaText} °C hari ini, di atas ambang ${thresholdText} °C.`
}
