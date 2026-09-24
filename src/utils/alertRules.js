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

// Jeda minimum sebelum satu METRIK boleh memicu peringatan lagi.
//
// Perhatikan kata "metrik", bukan "metrik dengan status yang sama". Versi
// sebelumnya menjaga pasangan (metrik, status) dan justru karena itu bocor:
// syaratnya `loggedStatus === status`, sehingga nilai yang berosilasi ANTARA DUA
// STATUS TIDAK AMAN melewatinya seluruhnya. Urutan warning → danger → warning
// → danger tidak pernah mengulang status yang sama dua kali berurutan, jadi
// tidak ada satu pun kejadian yang tertahan — dan effect-nya berjalan tiap paket
// BLE, sekitar tiga kali per detik. Nilai yang menggantung tepat di ambang
// karena itu bisa mengirim notifikasi berkali-kali dalam satu menit, persis
// kebalikan dari maksud cooldown ini.
//
// Sekarang jedanya murni berbasis WAKTU per metrik: setelah satu peringatan
// tercatat, metrik itu diam selama jeda ini apa pun yang terjadi pada statusnya
// — KECUALI kondisinya memburuk (lihat decideAlert).
//
// 30 menit dipilih dengan sesi pemakaian nyata sebagai ukuran: 2–3 jam berarti
// paling banyak 4–6 peringatan per metrik. Cukup untuk melihat kondisi yang
// bertahan atau memburuk, tanpa menenggelamkan halaman Peringatan — dan
// notifikasi yang terlalu sering adalah notifikasi yang mulai diabaikan, yang
// pada aplikasi pemantauan sama merugikannya dengan tidak ada notifikasi.
export const ALERT_COOLDOWN_MS = 30 * 60 * 1000

// Jeda untuk pasien berisiko TINGGI (utils/riskProfile.js): kondisi yang
// bertahan diingatkan dua kali lebih sering. Tidak lebih pendek dari ini —
// 15 menit masih memberi waktu untuk benar-benar duduk dan mengurangi beban
// sebelum HP berbunyi lagi.
export const HIGH_RISK_COOLDOWN_MS = 15 * 60 * 1000

// Cara peringatan diperlakukan per tingkat risiko pasien.
//
//   notifyFrom — status TERENDAH yang membunyikan notifikasi. Semua status
//                non-aman tetap DICATAT di tingkat mana pun; yang berubah
//                hanya apakah HP ikut berbunyi.
//   cooldownMs — jeda sebelum metrik yang sama boleh memicu lagi.
//
// Angka ambang sensor SENGAJA tidak ada di sini — lihat alasannya di kepala
// utils/riskProfile.js.
const ALERT_POLICIES = {
  standard: { notifyFrom: 'danger', cooldownMs: ALERT_COOLDOWN_MS },
  elevated: { notifyFrom: 'warning', cooldownMs: ALERT_COOLDOWN_MS },
  high: { notifyFrom: 'warning', cooldownMs: HIGH_RISK_COOLDOWN_MS },
}

// Tingkat yang tidak dikenal jatuh ke Standar — arah gagal yang sama dengan
// data profil yang tidak sah.
export function alertPolicy(tier) {
  return ALERT_POLICIES[tier] ?? ALERT_POLICIES.standard
}

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
//      sebelum jeda lewat, sekalipun sempat kembali ke `safe`.
//
// `policy` berasal dari tingkat risiko pasien (alertPolicy di atas); tanpanya
// berlaku kebijakan Standar.
export function decideAlert(prevEntry, status, now, policy = alertPolicy('standard')) {
  const { cooldownMs, notifyFrom } = policy
  const currRank = STATUS_RANK[status] ?? 0
  // Dibandingkan dengan status yang TERAKHIR TERCATAT, bukan dengan status
  // pembacaan sebelumnya. Itu bedanya dengan versi lama, dan itu yang menutup
  // osilasi: status pembacaan berganti tiap 300 ms, sementara yang TERCATAT
  // hanya berganti saat benar-benar ada peringatan baru.
  const loggedRank = STATUS_RANK[prevEntry?.loggedStatus] ?? 0

  const unchanged = {
    status,
    loggedStatus: prevEntry?.loggedStatus,
    loggedAt: prevEntry?.loggedAt,
  }

  // 'safe' bukan peringatan. Pemulihan sengaja TIDAK mencatat apa pun, dan juga
  // TIDAK mengosongkan jeda: kaki yang kembali aman lalu melampaui ambang lagi
  // lima menit kemudian adalah pola berjalan yang normal, bukan kejadian baru
  // yang perlu membunyikan HP sekali lagi.
  if (currRank === 0) {
    return { shouldLog: false, shouldNotify: false, entry: unchanged }
  }

  const neverLogged = typeof prevEntry?.loggedAt !== 'number'

  // PERBURUKAN SELALU LOLOS, tanpa menunggu jeda. warning yang sudah tercatat
  // lalu menjadi danger dua menit kemudian adalah kejadian yang berbeda dan
  // lebih buruk — menahannya 28 menit lagi berarti menahan justru peringatan
  // yang paling perlu didengar.
  const worsened = currRank > loggedRank

  // KONDISI YANG BERTAHAN mengulang setelah jeda. Tanpa cabang ini, danger yang
  // menetap sepanjang sore hanya berbunyi sekali di awal lalu senyap — padahal
  // yang bertahan berjam-jam di atas ambang justru yang paling mengkhawatirkan.
  const cooldownPassed = !neverLogged && now - prevEntry.loggedAt >= cooldownMs

  if (!neverLogged && !worsened && !cooldownPassed) {
    return { shouldLog: false, shouldNotify: false, entry: unchanged }
  }

  return {
    shouldLog: true,
    // SETIAP danger yang tercatat ikut memberi notifikasi, termasuk pengulangan
    // setelah jeda. Dulu syaratnya `currRank > prevRank` — hanya saat status
    // NAIK — sehingga danger yang bertahan tidak pernah memberi tahu lagi meski
    // catatannya terus bertambah. Pengulangannya benar-benar terdengar di HP
    // karena tag notifikasinya per metrik dan `renotify` aktif (lihat
    // utils/notifications.js); tanpa keduanya, notifikasi kedua hanya menimpa
    // yang pertama dalam diam.
    //
    // Batas bawahnya ditentukan tingkat risiko: Standar hanya berbunyi pada
    // danger, Meningkat/Tinggi sudah berbunyi sejak warning.
    shouldNotify: currRank >= (STATUS_RANK[notifyFrom] ?? STATUS_RANK.danger),
    entry: { status, loggedStatus: status, loggedAt: now },
  }
}
