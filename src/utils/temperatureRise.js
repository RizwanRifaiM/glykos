// src/utils/temperatureRise.js
// Aturan kenaikan suhu kulit — logika murni, tanpa React maupun Firestore,
// supaya bisa diuji langsung (temperatureRise.test.js).
//
// PERTANYAAN YANG DIJAWAB ATURAN INI
// Bukan "seberapa panas kakinya", melainkan "apakah panasnya TERPUSAT di satu
// tempat". Bedanya menentukan segalanya:
//
//   - Kaki yang menghangat MERATA di semua titik hampir selalu sistemik:
//     ruangan panas, baru berjalan, demam, sepatu tertutup. Bukan pertanda
//     peradangan, dan menandainya merah hanya melatih pengguna mengabaikan
//     peringatan.
//   - Kaki yang menghangat di SATU titik sementara titik lain tetap adalah
//     pola peradangan lokal — dan itulah yang mendahului ulkus, sering
//     berhari-hari sebelum ada yang terlihat.
//
// Karena itu ambang saja tidak cukup. Kenaikan 3 °C di ketiga titik sekaligus
// lebih tidak mengkhawatirkan daripada kenaikan 2,3 °C di satu titik saja.
//
// ACUAN KENAIKAN: AWAL SESI PEMAKAIAN
// Yang dibandingkan adalah suhu tiap area sekarang dengan suhu area yang sama
// saat perangkat baru tersambung hari itu (lihat hooks/useTemperatureRise.js).
//
// Keterbatasannya perlu diingat dan tidak disembunyikan: kaki yang SUDAH
// meradang sebelum sepatu dipakai tidak akan terdeteksi, karena kondisi itu
// ikut menjadi acuannya. Aturan ini menangkap peradangan yang BERKEMBANG
// selama pemakaian, bukan yang sudah ada sebelumnya. Untuk yang terakhir,
// selisih antar area (utils/temperatureTrend.js) tetap jadi jaring keduanya.

// Ambang tiga tingkat, sesuai skala yang dipakai proyek ini.
export const RISE_ATTENTION = 1.0 // °C — di bawah ini dianggap derau/normal
export const RISE_ALERT = 2.2 // °C — ambang pre-ulkus yang dipakai literatur

// Berapa °C selisih antar-kenaikan yang masih dianggap "naik sama rata".
//
// Dipakai untuk membedakan "ketiga titik naik bersama" dari "ketiganya naik
// tapi satu jauh lebih tinggi". Memakai angka yang sama dengan RISE_ATTENTION
// bukan kebetulan: perbedaan yang lebih kecil dari ambang perhatian memang
// belum berarti apa-apa pada sensor NTC ini.
const UNIFORM_TOLERANCE = RISE_ATTENTION

export function riseLevel(rise) {
  if (!Number.isFinite(rise) || rise < RISE_ATTENTION) return 'safe'
  if (rise < RISE_ALERT) return 'warning'
  return 'danger'
}

const EMPTY = {
  level: 'safe',
  hasBaseline: false,
  rises: {},
  maxRise: 0,
  riseSpread: 0,
  risenAreas: [],
  risenCount: 0,
  areaCount: 0,
  systemic: false,
}

// `baseline` & `current`: peta { area: °C }. Area yang tidak ada di KEDUANYA
// dilewati — sensor yang mati di tengah sesi tidak boleh menghasilkan
// "kenaikan" palsu dari nilai yang tidak pernah ada.
export function evaluateTemperatureRise(baseline, current) {
  if (!baseline || !current) return EMPTY

  const rises = {}
  Object.keys(baseline).forEach((area) => {
    const from = Number(baseline[area])
    const to = Number(current[area])
    if (!Number.isFinite(from) || !Number.isFinite(to)) return
    rises[area] = Math.round((to - from) * 10) / 10
  })

  const areas = Object.keys(rises)
  if (areas.length === 0) return EMPTY

  const values = areas.map((area) => rises[area])
  const maxRise = Math.max(...values)
  const minRise = Math.min(...values)
  const riseSpread = Math.round((maxRise - minRise) * 10) / 10

  const risenAreas = areas.filter((area) => rises[area] >= RISE_ATTENTION)

  // SISTEMIK: semua titik yang terukur naik, dan naiknya sama rata.
  //
  // Kedua syarat diperlukan. "Semua titik naik" saja tidak cukup — tiga titik
  // yang naik 3,0 / 1,2 / 1,1 memang semuanya naik, tapi yang pertama naik jauh
  // lebih tinggi, dan justru selisih itulah tandanya.
  //
  // Butuh minimal DUA titik: dengan satu sensor tidak ada yang bisa
  // dibandingkan, jadi tidak ada dasar untuk menyebutnya sistemik. Dalam
  // keraguan, penilaiannya TIDAK diturunkan — pada pemantauan medis, salah
  // menganggap aman lebih mahal daripada salah menganggap perlu diperiksa.
  const systemic =
    areas.length >= 2 && risenAreas.length === areas.length && riseSpread < UNIFORM_TOLERANCE

  return {
    level: systemic ? 'safe' : riseLevel(maxRise),
    hasBaseline: true,
    rises,
    maxRise,
    riseSpread,
    risenAreas,
    risenCount: risenAreas.length,
    areaCount: areas.length,
    systemic,
  }
}
