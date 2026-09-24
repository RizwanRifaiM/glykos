// Ambang batas indikator kelelahan (fatigue) — heuristik transparan, BUKAN
// diagnosis klinis. Dasar riset per faktor (lihat plan/PR terkait untuk detail):
//
// 1) Durasi beban tinggi berkelanjutan: extension langsung dari
//    PRESSURE_THRESHOLDS.safe yang sudah ada (constants/thresholds.js) — waktu
//    di bawah beban adalah definisi paparan kelelahan paling langsung.
// 2) Redistribusi tekanan (metatarsal naik, tumit/jari turun): didukung studi
//    JMIR Human Factors 2025 "Effectiveness of Using a Digital Wearable
//    Plantar Pressure Device to Detect Muscle Fatigue" — arah perubahan
//    divalidasi sEMG, ambang persentase di bawah ini heuristik kami.
// 3) Kenaikan suhu bertahap: EVIDENSI LEMAH/TIDAK KONSISTEN pada literatur
//    (korelasi suhu kulit vs rasa lelah tidak signifikan pada beberapa studi)
//    — sengaja diberi bobot kecil & sekunder, lihat useFatigueMonitor.js.
// 4) Total langkah per sesi (dari useStepCounter.js): proxy akumulasi
//    eksposur berjalan — konsepnya sama seperti faktor durasi (#1), tapi
//    menangkap pola jalan terputus-putus (banyak jeda pendek berulang) yang
//    tidak akan memicu streak durasi. Bobot mengikuti skala faktor #1.

import { msg } from '@lingui/core/macro'

export const SUSTAINED_WARNING_MIN = 15 // menit beban tinggi berkelanjutan
export const SUSTAINED_DANGER_MIN = 30
export const SUSTAINED_GAP_GRACE_SEC = 90 // jeda singkat yang tidak me-reset streak

export const REDISTRIBUTION_WARNING_PP = 8 // percentage-point pergeseran ke metatarsal
export const REDISTRIBUTION_DANGER_PP = 15

export const TEMP_RISE_SECONDARY_C = 1.5 // sinyal sekunder, bobot kecil

export const STEPS_WARNING = 800 // total langkah dalam satu sesi pemakaian
export const STEPS_DANGER = 1500

// Skor gabungan: tiap faktor menyumbang 1–2 poin (lihat useFatigueMonitor.js).
// Satu faktor kuat saja (2 poin) sudah "perhatian"; butuh dua faktor kuat —
// atau beberapa yang lebih ringan — untuk "risiko".
export const FATIGUE_WARNING_POINTS = 2
export const FATIGUE_DANGER_POINTS = 4

// Deskriptor `msg`, diselesaikan pemanggil dengan i18n._(). Lihat alasannya di
// constants/thresholds.js.
export const FATIGUE_LABELS = {
  safe: msg`Rendah`,
  warning: msg`Sedang`,
  danger: msg`Tinggi`,
}
