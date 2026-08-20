// src/utils/alertRules.js
// Aturan peringatan sebagai fungsi murni — tanpa React, Firestore, maupun
// localStorage, supaya bisa diuji langsung (alertRules.test.js). useAlerts.js
// hanya menyambungkannya ke sumber data dan penyimpanan.
//
// TIDAK ADA TEKS DI BERKAS INI — dan itu disengaja.
//
// Sebelumnya evaluateMetrics() mengembalikan kalimat jadi ('Tekanan puncak 210
// kPa (Risiko Ulkus)'), lalu useAlerts.logAlert menyimpan kalimat itu ke
// Firestore. Akibatnya bahasa ikut TERTULIS ke dalam catatan medis: begitu
// antarmuka berpindah ke Inggris, seluruh riwayat peringatan tetap berbahasa
// Indonesia dan tidak ada cara memperbaikinya tanpa mengubah data yang sudah
// tersimpan.
//
// Sekarang berkas ini hanya menghasilkan ANGKA & STATUS. Perakitan kalimatnya
// ada di utils/alertMessages.js dan terjadi saat dibaca, jadi satu catatan yang
// sama bisa ditampilkan dalam bahasa apa pun — termasuk catatan yang ditulis
// bulan lalu.
import {
  getPressureStatus,
  getTemperatureStatus,
  getHumidityStatus,
  TEMP_DELTA_WARNING,
} from '../constants/thresholds'
import { analyseHumidity, coolestSkinTemp } from './humidity'

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

  // KENAIKAN dari awal sesi lebih tajam daripada suhu mutlak maupun selisih
  // antar area, jadi dipakai lebih dulu bila tersedia.
  //
  // Yang membedakannya: kenaikan MERATA di semua titik hampir selalu sistemik
  // (ruangan panas, baru berjalan, demam) dan bukan pertanda peradangan,
  // sementara kenaikan yang TERPUSAT di satu titik adalah pola yang mendahului
  // ulkus. Aturannya di utils/temperatureRise.js.
  //
  // `temperatureRise` hanya ada selama sesi BLE berjalan — ia butuh acuan awal
  // sesi. Setelah halaman dimuat ulang, atau saat data datang dari Firestore
  // saja, penilaian jatuh ke aturan lama: selisih antar area pada satu
  // pembacaan. Itu bukan penurunan mutu diam-diam, melainkan memang satu-
  // satunya yang bisa dinilai tanpa acuan.
  const rise = data.temperatureRise
  const useRise = Boolean(rise?.hasBaseline) && hasTemperature

  const deltaExceeded = hasTemperature && delta >= TEMP_DELTA_WARNING
  const temperatureStatus = !hasTemperature
    ? 'safe'
    : useRise
      ? rise.level
      : deltaExceeded
        ? 'warning'
        : getTemperatureStatus(highest)

  // KELEMBAPAN DINILAI PADA PERMUKAAN KULIT, bukan pada pembacaan mentah.
  //
  // RH adalah rasio terhadap suhu tempat ia diukur, jadi ambang tunggal pada
  // angka mentah menandai kondisi yang berbeda-beda: 70 % pada udara 24 °C
  // setara 41,5 % di kulit 33 °C, sementara 70 % pada udara 32 °C setara
  // 66,2 % — rentang 25 poin dari pembacaan sensor yang sama persis.
  // Perhitungannya di utils/humidity.js.
  //
  // Acuan suhunya titik kulit TERDINGIN: permukaan yang lebih dingin punya RH
  // lebih tinggi, dan di situlah kulit paling sulit melepas keringat.
  //
  // Tanpa TA (firmware hanya mengirimnya bila sensornya terdeteksi) penilaian
  // jatuh ke angka mentah — bukan ke suhu yang ditebak.
  const humidity = data.humidity ?? 0
  const humidityAnalysis = analyseHumidity({
    rh: humidity,
    airTemp: data.airTemperature,
    skinTemp: coolestSkinTemp(data.temperatureObj?.points),
  })
  const humidityForStatus = humidityAnalysis.rhAtSkin ?? humidity
  const humidityStatus = humidity > 0 ? getHumidityStatus(humidityForStatus) : 'safe'

  return [
    {
      metric: 'pressure',
      status: pressureStatus,
      location: data.pressure?.location ?? null,
      values: { peak },
    },
    {
      metric: 'temperature',
      status: temperatureStatus,
      location: data.temperatureObj?.location ?? null,
      // Nilai disimpan apa adanya, bukan dihitung ulang saat dibaca. Catatan
      // medis harus tetap mengatakan hal yang sama seperti saat dibuat: kalau
      // ambangnya diubah nanti, peringatan lama tidak boleh berubah bunyinya
      // secara retroaktif.
      //
      // Field kenaikan hanya ikut bila penilaiannya memang memakai kenaikan —
      // catatan yang menyebut "1 dari 3 titik" padahal dinilai dari selisih
      // antar area akan menyesatkan pembacanya.
      values: useRise
        ? {
            highest,
            delta,
            deltaExceeded,
            maxRise: rise.maxRise,
            risenCount: rise.risenCount,
            areaCount: rise.areaCount,
            systemic: rise.systemic,
          }
        : { highest, delta, deltaExceeded },
    },
    {
      metric: 'humidity',
      status: humidityStatus,
      location: null,
      // Angka mentah TETAP disimpan sebagai `humidity` — itu yang benar-benar
      // dibaca sensor, dan catatan medis tidak boleh kehilangan pembacaan
      // aslinya. Turunannya disimpan berdampingan, bukan menggantikannya.
      values: {
        humidity,
        rhAtSkin: humidityAnalysis.rhAtSkin,
        dewPoint: humidityAnalysis.dewPoint,
        dewPointMargin: humidityAnalysis.dewPointMargin,
      },
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
