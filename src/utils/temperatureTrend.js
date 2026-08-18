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
import { TEMP_DELTA_WARNING } from '../constants/thresholds'

// Berapa hari berturut-turut selisih harus bertahan sebelum dinaikkan dari
// "perhatian" jadi "perlu tindakan".
export const SUSTAINED_DAYS = 2

export const TREND_LEVEL_LABELS = {
  safe: 'Normal',
  warning: 'Perlu Perhatian',
  danger: 'Perlu Tindakan',
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
export function describeTemperatureTrend(trend) {
  if (!trend || trend.level === 'safe') {
    return 'Selisih suhu antar area kaki dalam batas normal.'
  }

  const delta = trend.maxDelta.toFixed(1)
  const ambang = trend.threshold.toFixed(1)

  if (trend.level === 'danger') {
    return `Selisih suhu antar area bertahan di atas ${ambang} °C selama ${trend.streakDays} hari berturut-turut (tertinggi ${delta} °C).`
  }

  return `Selisih suhu antar area mencapai ${delta} °C hari ini, di atas ambang ${ambang} °C.`
}
