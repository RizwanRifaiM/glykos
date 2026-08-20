export const PRESSURE_THRESHOLDS = {
  safe: 200,
  warning: 250,
}

export const TEMP_RANGE = { min: 28, max: 33 }
export const TEMP_DELTA_WARNING = 2.2

export const HUMIDITY_RANGE = { min: 40, max: 60 }
export const HUMIDITY_RISK = 70

export function getPressureStatus(kpa) {
  if (kpa < PRESSURE_THRESHOLDS.safe) return 'safe'
  if (kpa <= PRESSURE_THRESHOLDS.warning) return 'warning'
  return 'danger'
}

// Label status tekanan sebagai DESKRIPTOR pesan (`msg`), bukan string.
//
// Deskriptor adalah objek {id, message} yang belum diterjemahkan; pemanggil
// menyelesaikannya dengan `i18n._(deskriptor)`. Ini yang membuat peta label
// statis tetap ikut berganti bahasa: kalau di sini sudah berupa string,
// nilainya terkunci pada bahasa yang aktif saat modul ini pertama dievaluasi —
// yaitu saat halaman dimuat — dan tidak pernah berubah lagi sesudahnya.
//
// Berakhiran `Msg` supaya tipe kembaliannya jelas di tempat pemakaian. Tanpa
// itu, `getPressureLabel(status)` yang tiba-tiba mengembalikan objek akan
// tampil sebagai "[object Object]" di layar tanpa error apa pun.
import { msg } from '@lingui/core/macro'

const PRESSURE_LABELS = {
  safe: msg`Aman`,
  warning: msg`Perlu Perhatian`,
  danger: msg`Risiko Ulkus`,
}

export function getPressureLabelMsg(status) {
  return PRESSURE_LABELS[status]
}

export function getTemperatureStatus(celsius) {
  if (celsius >= TEMP_RANGE.min && celsius <= TEMP_RANGE.max) return 'safe'
  if (celsius > TEMP_RANGE.max) return 'warning'
  return 'safe'
}

export function getHumidityStatus(rh) {
  if (rh >= HUMIDITY_RANGE.min && rh <= HUMIDITY_RANGE.max) return 'safe'
  if (rh > HUMIDITY_RISK) return 'danger'
  if (rh > HUMIDITY_RANGE.max) return 'warning'
  return 'warning'
}

// `toe` hanya dipakai sensor TEKANAN (P1/Hallux); `lateral` hanya dipakai
// sensor SUHU (T3, sisi luar telapak). Keduanya sengaja ada di satu peta nama
// supaya kartu Tekanan & Suhu memakai istilah yang sama untuk area yang sama.
//
// Deskriptor `msg`, sama alasannya dengan PRESSURE_LABELS di atas. Pemanggil
// menyelesaikannya lewat i18n._(LOCATION_LABELS[key]).
//
// "Metatarsal" dan "Lateral" adalah istilah anatomi yang sama di kedua bahasa,
// tapi tetap dibungkus: kalau tidak, keduanya jadi satu-satunya label yang
// tidak bisa disesuaikan penerjemah — dan kapitalisasi serta istilah pilihan
// ("ball of foot" lebih terbaca daripada "metatarsal" untuk pembaca umum
// berbahasa Inggris) justru keputusan yang layak mereka ambil.
export const LOCATION_LABELS = {
  heel: msg`Tumit`,
  metatarsal: msg`Metatarsal`,
  toe: msg`Jari Kaki`,
  lateral: msg`Lateral`,
}

