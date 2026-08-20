// src/utils/humidity.js
// Perhitungan psikrometrik untuk kelembapan — logika murni, tanpa React maupun
// Firestore, supaya bisa diuji langsung (humidity.test.js).
//
// MASALAH YANG DISELESAIKAN
// Kelembapan relatif bukan besaran yang berdiri sendiri. Ia RASIO: berapa
// banyak uap air yang ada dibanding maksimum yang bisa ditampung udara PADA
// SUHU ITU. Angka "70%" tanpa menyebut suhunya tidak menyatakan apa pun
// tentang berapa banyak air yang sebenarnya ada di dalam sepatu.
//
// Sebelumnya `RH` dipakai apa adanya dan dibandingkan langsung dengan ambang
// 70%, sementara `TA` (suhu udara) diterima dari firmware, ditampilkan sebagai
// hiasan di kartu, lalu tidak pernah dipakai untuk apa pun. Akibatnya satu
// ambang tunggal menandai kondisi yang berbeda-beda dari hari ke hari:
//
//   RH sensor 70%, dinormalkan ke suhu kulit 33 °C
//     udara 24 °C -> 41,5 % di kulit
//     udara 28 °C -> 52,6 % di kulit
//     udara 32 °C -> 66,2 % di kulit
//
// Rentang 25 poin, semuanya dari pembacaan sensor yang sama persis.
//
// RUMUS: MAGNUS, KOEFISIEN ALDUCHOV-ESKRIDGE (1996)
// Akurasi ~0,4 % pada rentang -40…60 °C. Ada rumus yang lebih teliti
// (Goff-Gratch, Wexler), tapi bentuk Magnus punya satu keunggulan yang
// menentukan di sini: suhunya muncul sebagai rasio sederhana di dalam
// eksponen, jadi bisa dibalik secara aljabar. Titik embun dihitung dengan dua
// konstanta yang SAMA seperti arah majunya — bukan pendekatan terpisah yang
// bisa menyimpang darinya.
export const MAGNUS_A = 17.625
export const MAGNUS_B = 243.04

// Tekanan uap jenuh di atas air, dalam Pascal.
export function saturationVapourPressure(tempC) {
  if (!Number.isFinite(tempC)) return null
  return 610.94 * Math.exp((MAGNUS_A * tempC) / (MAGNUS_B + tempC))
}

// Tekanan uap aktual, dalam Pascal. Inilah besaran yang sebenarnya "jumlah air
// di udara" — dan yang hampir seragam di ruang tertutup sekecil sepatu.
export function vapourPressure(rh, tempC) {
  const es = saturationVapourPressure(tempC)
  if (es === null || !Number.isFinite(rh)) return null
  return (rh / 100) * es
}

// Titik embun (°C): suhu saat udara ini menjadi jenuh.
//
// Tidak bergantung suhu pengukuran — dua pembacaan dengan titik embun sama
// membawa jumlah air yang sama, meski RH-nya berbeda jauh. Karena itu inilah
// yang layak ditren antar hari, bukan RH mentahnya.
export function dewPoint(rh, tempC) {
  if (!Number.isFinite(rh) || rh <= 0 || !Number.isFinite(tempC)) return null
  const alpha = Math.log(rh / 100) + (MAGNUS_A * tempC) / (MAGNUS_B + tempC)
  return (MAGNUS_B * alpha) / (MAGNUS_A - alpha)
}

// Kelembapan absolut (g/m³) — massa uap air per satuan volume.
// Konstanta 2,1668 = M_air·10³ / R, penyederhanaan baku dari hukum gas ideal.
export function absoluteHumidity(rh, tempC) {
  const e = vapourPressure(rh, tempC)
  if (e === null) return null
  return (2.1668 * e) / (273.15 + tempC)
}

// RH yang sama, dinyatakan pada suhu lain.
//
//   RH₂ = RH₁ · es(T₁) / es(T₂)
//
// Berlaku karena tekanan uap `e` praktis seragam di ruang tertutup sekecil
// sepatu, sementara es(T) naik curam terhadap suhu. Itulah sebabnya RH berubah
// drastis hanya karena berpindah tempat pengukuran, tanpa ada air yang
// bertambah atau berkurang sedikit pun.
export function relativeHumidityAt(rh, fromTempC, toTempC) {
  const esFrom = saturationVapourPressure(fromTempC)
  const esTo = saturationVapourPressure(toTempC)
  if (esFrom === null || esTo === null || !Number.isFinite(rh) || esTo === 0) return null
  // Dijepit ke 100: di atas itu berarti mengembun, dan "120 % RH" bukan keadaan
  // yang bisa diukur — yang terjadi air berubah jadi titik-titik embun.
  return Math.min(100, (rh * esFrom) / esTo)
}

// Batas RH yang masih dianggap pembacaan sah.
//
// Nol diperlakukan sebagai "sensor belum mengirim", bukan pembacaan — 0 % RH
// di dalam sepatu yang dipakai kaki hidup tidak mungkin terjadi. Di atas 100
// berarti sensor rusak atau mengembun, dan menampilkannya sebagai angka akan
// membuat pembacaan mustahil terlihat seperti data.
export function isValidHumidity(rh) {
  return Number.isFinite(rh) && rh > 0 && rh <= 100
}

const EMPTY = {
  valid: false,
  rh: 0,
  rhAtSkin: null,
  dewPoint: null,
  absoluteHumidity: null,
  dewPointMargin: null,
  skinTemp: null,
  airTemp: null,
}

// Suhu kulit acuan = titik TERDINGIN yang terukur.
//
// Ini kebalikan dari yang mungkin diduga, dan alasannya justru inti soalnya:
// RH di suatu permukaan = e / es(T), jadi permukaan yang lebih DINGIN punya
// es lebih kecil dan karenanya RH lebih TINGGI. Titik terdingin adalah tempat
// udara paling dekat ke jenuh, yaitu tempat kulit paling sulit melepas
// keringat — dan di situlah maserasi bermula. Memakai titik terpanas akan
// menghasilkan angka yang paling optimistis di seluruh kaki.
export function coolestSkinTemp(points) {
  const values = Object.values(points ?? {}).filter((value) => Number.isFinite(value) && value > 0)
  if (values.length === 0) return null
  return Math.min(...values)
}

// Ringkasan lengkap satu pembacaan kelembapan.
//
// `airTemp` (TA) dan `skinTemp` keduanya opsional: firmware hanya mengirim TA
// bila sensornya terdeteksi, dan NTC bisa lepas di tengah sesi. Tanpa
// keduanya, yang dikembalikan hanyalah RH apa adanya — bukan angka turunan
// yang dikarang dari suhu yang ditebak.
export function analyseHumidity({ rh, airTemp = null, skinTemp = null } = {}) {
  if (!isValidHumidity(rh)) return { ...EMPTY, rh: Number.isFinite(rh) ? rh : 0 }

  const hasAir = Number.isFinite(airTemp)
  const hasSkin = Number.isFinite(skinTemp) && skinTemp > 0

  const result = {
    ...EMPTY,
    valid: true,
    rh,
    airTemp: hasAir ? airTemp : null,
    skinTemp: hasSkin ? skinTemp : null,
  }

  if (!hasAir) return result

  result.dewPoint = dewPoint(rh, airTemp)
  result.absoluteHumidity = absoluteHumidity(rh, airTemp)

  if (hasSkin) {
    result.rhAtSkin = relativeHumidityAt(rh, airTemp, skinTemp)
    // Jarak titik embun: berapa derajat kulit masih berada DI ATAS suhu
    // jenuhnya. Nol atau negatif berarti uap mengembun di permukaan kulit —
    // kulit tidak punya jalan lagi melepas keringat, dan itulah mekanisme
    // maserasi yang sebenarnya. Ukuran ini tidak bergantung suhu, jadi bisa
    // dibandingkan antar hari dengan cara yang tidak bisa dilakukan RH mentah.
    result.dewPointMargin =
      result.dewPoint === null ? null : Math.round((skinTemp - result.dewPoint) * 10) / 10
  }

  return result
}
