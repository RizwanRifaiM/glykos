// Data contoh untuk MODE DEMO — lihat src/utils/demoMode.js untuk kapan mode
// ini menyala. Dipakai untuk meninjau tampilan grafik & kartu tanpa perangkat
// BLE tersambung.
//
// PENTING — data ini dipakai sebagai tampilan awal selama pengguna belum punya
// data sendiri, TANPA spanduk penanda (dihapus atas permintaan). Karena itu dua
// batas berikut jadi satu-satunya yang tersisa dan tidak boleh dilonggarkan:
//   1. Data nyata SELALU menang. shouldUseDemoData() mematikan mode demo begitu
//      ada pembacaan BLE atau dokumen live di Firestore — termasuk pembacaan
//      lama yang sudah basi, karena itu pun tetap data sungguhan.
//   2. Tidak ada satu pun angka di sini yang ditulis ke Firestore:
//      sinkronisasi hanya berjalan saat BLE aktif (useFirestoreSync), dan
//      pencatatan peringatan dimatikan saat mode demo (DashboardLayout.jsx).
//
// Melanggar salah satunya membuat aplikasi pemantauan medis menampilkan angka
// karangan sebagai kondisi kaki pengguna, tanpa apa pun yang mengoreksinya.

import { toDateKey } from '../utils/formatTime'

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

    // Kelembapan: 44 % RH naik melewati ambang 70 %.
    const humidity = 44 + progress * 32 + (noise(i + 13) - 0.5) * 5

    // Langkah harian: bervariasi 2.000–7.500, sebagian hari sengaja 0
    // (perangkat tidak dipakai) supaya tampilan "—" ikut terlihat.
    const idle = noise(i + 29) < 0.12
    const steps = idle ? 0 : Math.round(2000 + noise(i + 23) * 5500)

    points.push({
      date: toDateKey(d),
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      timestamp: d.getTime(),
      pressure: round1(Math.max(0, pressure)),
      temperature: round1(temperature),
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
    waktu: now.toLocaleTimeString('id-ID'),

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

    activity: { steps: 4218, activeMinutes: 96 },
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
  reasons: [
    'Beban tinggi berkelanjutan 14 menit',
    'Distribusi tekanan mulai bergeser ke metatarsal +7pp',
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
export const DEMO_ALERTS = [
  {
    id: 'demo-1',
    metric: 'pressure',
    label: 'Tekanan',
    status: 'danger',
    value: '265 kPa',
    location: 'metatarsal',
    message: 'Tekanan puncak 265 kPa (Risiko Ulkus)',
    createdAt: hoursAgo(1),
  },
  {
    id: 'demo-2',
    metric: 'temperature',
    label: 'Suhu',
    status: 'warning',
    value: '32.8°C',
    location: 'metatarsal',
    message: 'Selisih suhu 2.7°C antar area — prediktor pre-ulkus',
    createdAt: hoursAgo(3),
  },
  {
    id: 'demo-3',
    metric: 'fatigue',
    label: 'Kelelahan',
    status: 'warning',
    value: 'Waspada',
    location: null,
    message: 'Beban tinggi berkelanjutan 14 menit',
    createdAt: hoursAgo(6),
  },
  {
    id: 'demo-4',
    metric: 'humidity',
    label: 'Kelembapan',
    status: 'warning',
    value: '72.5% RH',
    location: null,
    message: 'Kelembapan sepatu 72.5% RH',
    createdAt: daysAgo(1, 9),
  },
  {
    id: 'demo-5',
    metric: 'pressure',
    label: 'Tekanan',
    status: 'warning',
    value: '228 kPa',
    location: 'heel',
    message: 'Tekanan puncak 228 kPa (Perlu Perhatian)',
    createdAt: daysAgo(1, 16),
  },
  {
    id: 'demo-6',
    metric: 'temperature',
    label: 'Suhu',
    status: 'danger',
    value: '34.1°C',
    location: 'heel',
    message: 'Selisih suhu 3.2°C antar area — prediktor pre-ulkus',
    createdAt: daysAgo(2, 11),
  },
  {
    id: 'demo-7',
    metric: 'humidity',
    label: 'Kelembapan',
    status: 'warning',
    value: '71.2% RH',
    location: null,
    message: 'Kelembapan sepatu 71.2% RH',
    createdAt: daysAgo(4, 15),
  },
  {
    id: 'demo-8',
    metric: 'pressure',
    label: 'Tekanan',
    status: 'danger',
    value: '258 kPa',
    location: 'metatarsal',
    message: 'Tekanan puncak 258 kPa (Risiko Ulkus)',
    createdAt: daysAgo(5, 10),
  },
  {
    id: 'demo-9',
    metric: 'fatigue',
    label: 'Kelelahan',
    status: 'warning',
    value: 'Waspada',
    location: null,
    message: 'Total 6.140 langkah dalam sesi ini',
    createdAt: daysAgo(12, 13),
  },
  {
    id: 'demo-10',
    metric: 'pressure',
    label: 'Tekanan',
    status: 'warning',
    value: '214 kPa',
    location: 'heel',
    message: 'Tekanan puncak 214 kPa (Perlu Perhatian)',
    createdAt: daysAgo(18, 8),
  },
]
