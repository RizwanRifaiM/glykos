// src/utils/dailyRollup.js
// Agregasi rangkuman harian — logika murni, tanpa Firestore, supaya bisa diuji
// langsung (lihat src/utils/dailyRollup.test.js).
//
// Alasan rangkuman ini ada: halaman Riwayat dulu berlangganan SELURUH koleksi
// `history` lalu menyaring tanggalnya di klien. Pemakaian normal menulis satu
// dokumen per menit (~1.440/hari), jadi setiap kali dashboard dibuka seluruh
// isi koleksi ikut terunduh. Dengan rangkuman ini, 30 hari = 30 dokumen.
// Koleksi `history` mentah tetap ditulis sebagai catatan, hanya tidak lagi
// dibaca borongan.

export function emptyRollup(tanggal) {
  return {
    tanggal,
    pressureMax: 0,
    temperatureMax: 0,
    temperatureDeltaMax: 0,
    humiditySum: 0,
    humidityCount: 0,
    stepsBySession: {},
    activeMinutesBySession: {},
  }
}

const positive = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : 0
}

// Menggabungkan satu sampel ke rangkuman hari berjalan.
//
// Langkah disimpan PER SESI, bukan dijumlahkan langsung: tiap sampel membawa
// hitungan KUMULATIF sejak sesi pemakaiannya dimulai, dan hitungan itu direset
// tiap perangkat tersambung ulang. Menjumlahkan tiap sampel akan melipatgandakan
// angkanya; yang benar adalah nilai terbesar tiap sesi, lalu dijumlahkan antar
// sesi (lihat totalSteps di bawah).
export function mergeDailyRollup(prev, sample) {
  const base = prev && prev.tanggal === sample.tanggal ? prev : emptyRollup(sample.tanggal)
  const humidity = positive(sample.humidity)

  // 0 berarti "sensor belum mengirim", bukan pembacaan — sama seperti guard di
  // useAlerts.js. Nilai nol tidak boleh menarik rata-rata kelembapan ke bawah.
  const sessionKey = sample.sessionId || 'unknown'

  const stepsBySession = { ...base.stepsBySession }
  const steps = positive(sample.steps)
  if (steps > 0) {
    stepsBySession[sessionKey] = Math.max(stepsBySession[sessionKey] ?? 0, steps)
  }

  // Menit aktif mengikuti pola yang persis sama dengan langkah, dan karena
  // alasan yang sama: tiap sampel membawa durasi KUMULATIF sejak sesinya
  // dimulai, jadi menjumlahkan tiap sampel akan melipatgandakannya. Yang benar
  // nilai terbesar tiap sesi, lalu dijumlahkan antar sesi.
  const activeMinutesBySession = { ...base.activeMinutesBySession }
  const activeMinutes = positive(sample.activeMinutes)
  if (activeMinutes > 0) {
    activeMinutesBySession[sessionKey] = Math.max(
      activeMinutesBySession[sessionKey] ?? 0,
      activeMinutes,
    )
  }

  return {
    tanggal: sample.tanggal,
    pressureMax: Math.max(base.pressureMax, positive(sample.pressurePeak)),
    temperatureMax: Math.max(base.temperatureMax, positive(sample.temperature)),
    temperatureDeltaMax: Math.max(base.temperatureDeltaMax, positive(sample.temperatureDelta)),
    humiditySum: base.humiditySum + humidity,
    humidityCount: base.humidityCount + (humidity > 0 ? 1 : 0),
    stepsBySession,
    activeMinutesBySession,
  }
}

function sumBySession(bySession) {
  return Object.values(bySession ?? {}).reduce((total, value) => total + (Number(value) || 0), 0)
}

export function totalSteps(rollup) {
  return sumBySession(rollup?.stepsBySession)
}

export function totalActiveMinutes(rollup) {
  return Math.round(sumBySession(rollup?.activeMinutesBySession))
}

export function averageHumidity(rollup) {
  const count = Number(rollup?.humidityCount) || 0
  if (count <= 0) return 0
  return Math.round((Number(rollup.humiditySum) / count) * 10) / 10
}

// Bentuk yang dipakai grafik & tabel Riwayat.
export function rollupToPoint(rollup) {
  return {
    pressure: Number(rollup?.pressureMax) || 0,
    temperature: Number(rollup?.temperatureMax) || 0,
    temperatureDelta: Number(rollup?.temperatureDeltaMax) || 0,
    humidity: averageHumidity(rollup),
    steps: totalSteps(rollup),
    activeMinutes: totalActiveMinutes(rollup),
  }
}
