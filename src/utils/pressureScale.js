// src/utils/pressureScale.js
// Skala visual titik tekanan pada peta sensor kaki — fungsi murni, terpisah
// dari komponennya supaya bisa diuji langsung dan supaya Fast Refresh tetap
// bekerja di SensorFootMap.jsx (file komponen hanya boleh mengekspor komponen).
//
// Titik tekanan dulu berjari-jari tetap untuk semua area, jadi satu-satunya
// pembeda antar sensor adalah warna status dan angkanya. Dengan ukuran yang
// ikut besarnya tekanan, sebaran beban terbaca sekilas sebelum angkanya dibaca
// satu per satu.

// Mengikuti skala sumbu grafik Riwayat (HISTORY_METRICS_CONFIG.pressure.max)
// supaya kedua tampilan memakai acuan "penuh" yang sama.
export const PRESSURE_FULL_SCALE_KPA = 300

const DOT_MIN_R = 7
const DOT_MAX_R = 21

const clamp01 = (n) => Math.min(1, Math.max(0, n))

// Nilai di atas skala penuh ditahan, bukan terus membesar — kalau tidak,
// tekanan ekstrem membuat titiknya menelan siluet kaki.
export function pressureDotRadius(kpa) {
  if (!Number.isFinite(kpa)) return DOT_MIN_R
  return DOT_MIN_R + (DOT_MAX_R - DOT_MIN_R) * clamp01(kpa / PRESSURE_FULL_SCALE_KPA)
}

// Denyut "bernapas": makin tinggi tekanan, makin besar simpangannya dan makin
// cepat iramanya — dua isyarat yang searah, jadi titik bertekanan tinggi
// menarik perhatian tanpa perlu warna tambahan.
export function pressurePulse(kpa) {
  const ratio = Number.isFinite(kpa) ? clamp01(kpa / PRESSURE_FULL_SCALE_KPA) : 0
  return {
    scale: 1.06 + ratio * 0.22, // 1,06x  ->  1,28x
    durationSec: 2.6 - ratio * 1.2, // 2,6 detik -> 1,4 detik
  }
}
