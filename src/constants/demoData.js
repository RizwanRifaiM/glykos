// Data contoh untuk MODE DEMO — lihat src/utils/demoMode.js untuk kapan mode
// ini menyala. Dipakai untuk meninjau tampilan grafik & kartu tanpa perangkat
// BLE tersambung.
//
// PENTING — angka di berkas ini hanya boleh tampil bila pengguna MEMINTANYA
// lewat ?demo=1, dan selalu bersama DemoModeBanner.
//
// Sebelumnya ia juga dipakai sebagai tampilan awal untuk pengguna yang belum
// punya data, tanpa spanduk penanda. Itu dihapus: angka karangan yang tidak
// bisa dibedakan dari pembacaan sensor tidak punya tempat di aplikasi
// pemantauan, dan pada pemakaian nyata memang langsung disalahartikan sebagai
// pembacaan sungguhan. Penggantinya keadaan kosong yang jujur — lihat
// utils/demoMode.js.
//
// Satu batas yang tersisa dan tidak boleh dilonggarkan: tidak ada satu pun
// angka di sini yang ditulis ke Firestore. Sinkronisasi hanya berjalan saat BLE
// aktif (useFirestoreSync), dan pencatatan peringatan dimatikan saat mode demo
// (DashboardLayout.jsx).

import { toDateKey, toTimeKey } from '../utils/formatTime'
import { formatShortDate } from '../utils/locale'

// Deterministik: nilai untuk indeks hari yang sama selalu sama, jadi grafik
// tidak berkedip tiap render ulang.
function noise(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const round1 = (n) => Math.round(n * 10) / 10

// Kurva sengaja dirancang MELEWATI setiap ambang di constants/thresholds.js,
// supaya ketiga status (aman → perhatian → risiko) terlihat dalam satu layar.
export function buildDemoHistory(days = 7) {
  const points = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)

  for (let i = 0; i < days; i++) {
    const d = new Date(end)
    d.setDate(end.getDate() - (days - 1 - i))

    // 0 di awal rentang → 1 di hari terakhir.
    const progress = days > 1 ? i / (days - 1) : 1

    // Tekanan: 140 kPa (aman) menanjak ke ~265 kPa (risiko ulkus).
    const pressure = 140 + progress * 125 + (noise(i + 1) - 0.5) * 16

    // Suhu kulit: 29,4 °C naik pelan ke ~33 °C.
    const temperature = 29.4 + progress * 3.4 + (noise(i + 7) - 0.5) * 0.6

    // Selisih suhu antar-area: 0,6 °C (normal) menanjak melewati ambang
    // TEMP_DELTA_WARNING (2,2 °C) pada beberapa hari TERAKHIR berturut-turut —
    // sengaja, supaya aturan persistensi di utils/temperatureTrend.js ikut
    // terlihat aktif di mode demo, bukan cuma grafiknya.
    const temperatureDelta = 0.6 + progress * 2.2 + (noise(i + 17) - 0.5) * 0.3

    // Kelembapan: 44 % RH naik melewati ambang 70 %.
    const humidity = 44 + progress * 32 + (noise(i + 13) - 0.5) * 5

    // Langkah harian: bervariasi 2.000–7.500, sebagian hari sengaja 0
    // (perangkat tidak dipakai) supaya tampilan "—" ikut terlihat.
    const idle = noise(i + 29) < 0.12
    const steps = idle ? 0 : Math.round(2000 + noise(i + 23) * 5500)

    points.push({
      date: toDateKey(d),
      // Label tanggal ikut bahasa aktif ("13 Agu" / "Aug 13") — lihat
      // utils/locale.js. Sebelumnya 'id-ID' di-hardcode, jadi grafik demo
      // tetap berbahasa Indonesia di antarmuka Inggris.
      label: formatShortDate(d),
      timestamp: d.getTime(),
      pressure: round1(Math.max(0, pressure)),
      temperature: round1(temperature),
      temperatureDelta: round1(Math.max(0, temperatureDelta)),
      humidity: round1(Math.min(100, Math.max(0, humidity))),
      steps,
    })
  }

  return points
}

const DEMO_DEVICE = { id: 'glykos-device', name: 'Glykos Device (Demo)', foot: 'right' }

// Bentuk objek mengikuti persis keluaran useSensorData/useBleSensor, supaya
// seluruh komponen dashboard bekerja tanpa perubahan.
export function buildDemoReading() {
  const now = new Date()

  const heel = 118.4
  const metatarsal = 236.7 // masuk rentang "perhatian" (200–250 kPa)
  const toe = 84.2
  const peak = Math.max(heel, metatarsal, toe)

  // Tiga NTC firmware: T1→metatarsal (forefoot), T2→heel (tumit),
  // T3→lateral (sisi luar telapak). Dua yang pertama berbagi kunci dengan
  // pressure.points; `lateral` tidak punya pasangan FSR.
  const tMetatarsal = 32.8
  const tHeel = 30.1
  const tLateral = 31.4
  const highest = Math.max(tMetatarsal, tHeel, tLateral)
  const delta = round1(highest - Math.min(tMetatarsal, tHeel, tLateral)) // 2,7 °C → memicu peringatan

  return {
    id: DEMO_DEVICE.id,
    deviceId: DEMO_DEVICE.id,
    device: DEMO_DEVICE,

    humidity: 72.5,
    temperature: highest,
    pressure1: heel,
    pressure2: metatarsal,
    pressure3: toe,
    tanggal: toDateKey(now),
    waktu: toTimeKey(now),

    connection: {
      wifi: true,
      signalStrength: -52,
      lastUpdate: now,
    },

    pressure: {
      peak,
      location: 'metatarsal',
      points: {
        heel,
        metatarsal,
        toe,
      },
    },

    temperatureObj: {
      highest,
      location: 'metatarsal',
      points: { metatarsal: tMetatarsal, heel: tHeel, lateral: tLateral },
      delta,
    },

    activity: { steps: 4218, wearMinutes: 96 },
    airTemperature: 28.6,
    accel: { x: 0.02, y: -0.04, z: 0.99 },
  }
}

// Indikasi kelelahan contoh — bentuknya mengikuti snapshot useFatigueMonitor.
export const DEMO_FATIGUE = {
  level: 'warning',
  sustainedMinutes: 14,
  distributionShiftPct: 7.4,
  steps: 4218,
  // Kode + angka, bukan kalimat — bentuknya sama dengan yang dihasilkan
  // useFatigueMonitor.js sekarang. Kalimatnya dirakit describeFatigueReasons()
  // saat dibaca, jadi alasan contoh ikut berganti bahasa tanpa diduplikasi.
  reasons: [
    { code: 'sustained', minutes: 14 },
    { code: 'redistribution', pp: 7, severity: 'warning' },
  ],
  sessionActive: true,
}

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000)
const daysAgo = (d, hour = 14) => {
  const date = new Date()
  date.setDate(date.getDate() - d)
  date.setHours(hour, 30, 0, 0)
  return date
}

// Peringatan contoh — sengaja disebar ke beberapa tanggal (bukan hanya hari
// ini) supaya pengelompokan per hari di halaman Peringatan DAN kolom
// "Peringatan" pada tabel Riwayat sama-sama menunjukkan variasi: ada hari
// berisiko, hari perlu perhatian, dan hari tanpa peringatan sama sekali.
//
// Bentuknya TERSTRUKTUR, sama seperti peringatan sungguhan (lihat
// utils/alertRules.js): metrik + status + angka, tanpa kalimat. Sebelumnya
// setiap entri membawa `label`/`value`/`message` berbahasa Indonesia yang
// ditulis tangan — sepuluh kalimat yang harus diterjemahkan terpisah dan
// dijaga agar tetap sama bunyinya dengan kalimat sungguhan. Sekarang keduanya
// dirakit fungsi yang sama, jadi mode demo tidak bisa lagi menyimpang dari
// tampilan sebenarnya.
export const DEMO_ALERTS = [
  { id: 'demo-1', metric: 'pressure', status: 'danger', location: 'metatarsal', values: { peak: 265 }, createdAt: hoursAgo(1) },
  {
    id: 'demo-2',
    metric: 'temperature',
    status: 'warning',
    location: 'metatarsal',
    values: { highest: 32.8, delta: 2.7, deltaExceeded: true },
    createdAt: hoursAgo(3),
  },
  {
    id: 'demo-3',
    metric: 'fatigue',
    status: 'warning',
    location: null,
    values: { reasons: [{ code: 'sustained', minutes: 14 }] },
    createdAt: hoursAgo(6),
  },
  { id: 'demo-4', metric: 'humidity', status: 'warning', location: null, values: { humidity: 72.5 }, createdAt: daysAgo(1, 9) },
  { id: 'demo-5', metric: 'pressure', status: 'warning', location: 'heel', values: { peak: 228 }, createdAt: daysAgo(1, 16) },
  {
    id: 'demo-6',
    metric: 'temperature',
    status: 'danger',
    location: 'heel',
    values: { highest: 34.1, delta: 3.2, deltaExceeded: true },
    createdAt: daysAgo(2, 11),
  },
  { id: 'demo-7', metric: 'humidity', status: 'warning', location: null, values: { humidity: 71.2 }, createdAt: daysAgo(4, 15) },
  { id: 'demo-8', metric: 'pressure', status: 'danger', location: 'metatarsal', values: { peak: 258 }, createdAt: daysAgo(5, 10) },
  {
    id: 'demo-9',
    metric: 'fatigue',
    status: 'warning',
    location: null,
    values: { reasons: [{ code: 'steps', steps: 6140 }] },
    createdAt: daysAgo(12, 13),
  },
  { id: 'demo-10', metric: 'pressure', status: 'warning', location: 'heel', values: { peak: 214 }, createdAt: daysAgo(18, 8) },
]
