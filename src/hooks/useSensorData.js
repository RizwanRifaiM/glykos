// src/hooks/useSensorData.js
import { useEffect, useMemo, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { liveDoc } from '../services/paths'
import { toDateKey } from '../utils/formatTime'

// Baru ada satu perangkat, dipasang di kaki KANAN. Struktur map dipertahankan
// supaya perangkat kedua (kaki kiri) tinggal ditambahkan di sini tanpa
// mengubah DeviceSelector.
const DEVICES = {
  'glykos-device': { name: 'Glykos Device', foot: 'right' }
}

// Batas usia dokumen `live/current` sebelum dianggap BASI.
//
// useFirestoreSync menulis tiap 60 detik selama BLE tersambung, jadi jeda dua
// kali interval itu sudah cukup untuk menyimpulkan sesi berakhir tanpa
// menandai jeda tulis normal sebagai putus.
//
// Sebelumnya `isLive` hanya berarti "dokumennya ada" — nilai yang SELALU benar
// begitu satu sesi BLE pernah terjadi, sehingga dashboard permanen menampilkan
// badge "Live" berisi angka lama, dan monitor kelelahan/langkah ikut mengira
// sesi masih berjalan.
export const STALE_AFTER_MS = 120000

// Seberapa sering kesegaran dievaluasi ulang. Diperlukan karena saat perangkat
// berhenti mengirim, TIDAK ADA snapshot baru yang datang — tanpa detak ini
// status "live" tidak akan pernah berubah jadi basi dengan sendirinya.
const FRESHNESS_TICK_MS = 15000

// Ditampilkan hanya saat BELUM ADA perangkat tersambung & belum ada data live
// di Firestore — sengaja nol semua, BUKAN data dummy/simulasi, supaya
// dashboard tidak menyesatkan seolah ada pembacaan sensor nyata.
const DEFAULT_JSON = {
  id: 'glykos-device',
  humidity: 0,
  temperature: 0,
  pressure1: 0,
  pressure2: 0,
  pressure3: 0,
  tanggal: toDateKey(new Date()),
  waktu: new Date().toLocaleTimeString('id-ID'),
}

// Tiga titik NTC firmware, disimpan per area oleh useFirestoreSync.
const TEMP_AREA_FIELDS = {
  metatarsal: 'temperatureMetatarsal',
  heel: 'temperatureHeel',
  lateral: 'temperatureLateral',
}

// `updatedAt` ditulis dengan serverTimestamp(). Pada snapshot lokal yang belum
// dikonfirmasi server nilainya masih null — itu ditangani lewat
// `hasPendingWrites` di pemanggil, bukan di sini.
export function readUpdatedAtMs(raw) {
  const value = raw?.updatedAt
  if (!value) return null
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  const asNumber = Number(value)
  return Number.isFinite(asNumber) ? asNumber : null
}

// Dokumen LAMA (ditulis sebelum field per-area ada) tidak punya key ini dan
// menghasilkan objek kosong — pemanggil lalu jatuh ke perilaku sebelumnya,
// yaitu satu titik metatarsal berisi nilai tertinggi. `null` sengaja dibedakan
// dari 0: null berarti sensornya tidak mengirim, 0 adalah pembacaan sungguhan.
function readTempPoints(dataRaw) {
  const points = {}
  Object.entries(TEMP_AREA_FIELDS).forEach(([key, field]) => {
    const stored = dataRaw[field]
    if (stored === null || stored === undefined) return
    const value = Number(stored)
    if (Number.isFinite(value)) points[key] = value
  })
  return points
}

function parseSensorReading(raw, deviceId) {
  const dataRaw = raw || DEFAULT_JSON

  // Format JSON Konsisten (ditulis oleh useFirestoreSync.js selama BLE tersambung):
  // {"id": "glykos-device","humidity": 55.0,"temperature": 32.5,"pressure1": 120.0,"pressure2": 210.2,"pressure3": 90.0,"tanggal": "2026-08-10","waktu": "15:30:00"}
  const id = dataRaw.id || deviceId || 'glykos-device'
  const p1 = Number(dataRaw.pressure1 ?? 0)
  const p2 = Number(dataRaw.pressure2 ?? 0)
  const p3 = Number(dataRaw.pressure3 ?? 0)
  const temperatureVal = Number(dataRaw.temperature ?? 0)
  const humidityVal = Number(dataRaw.humidity ?? 0)
  const tanggal = dataRaw.tanggal || toDateKey(new Date())
  const waktu = dataRaw.waktu || new Date().toLocaleTimeString('id-ID')

  const tempPoints = readTempPoints(dataRaw)
  const tempValues = Object.values(tempPoints)
  const hasTempAreas = tempValues.length > 0
  const highestTemp = hasTempAreas ? Math.max(...tempValues) : temperatureVal
  const storedDelta = Number(dataRaw.temperatureDelta)
  const tempDelta = Number.isFinite(storedDelta)
    ? storedDelta
    : tempValues.length >= 2
      ? Math.round((highestTemp - Math.min(...tempValues)) * 10) / 10
      : 0
  const tempLocation =
    Object.keys(tempPoints).find((key) => tempPoints[key] === highestTemp) ?? 'metatarsal'

  const peakPressure = Math.max(p1, p2, p3)
  let maxLocation = 'metatarsal'
  if (p1 === peakPressure) maxLocation = 'heel'
  else if (p2 === peakPressure) maxLocation = 'metatarsal'
  else if (p3 === peakPressure) maxLocation = 'toe'

  return {
    // Standard Consistent JSON fields:
    id,
    humidity: humidityVal,
    temperature: temperatureVal,
    pressure1: p1,
    pressure2: p2,
    pressure3: p3,
    tanggal,
    waktu,

    // UI Helper / Derived fields:
    deviceId: id,
    device: DEVICES[id] || DEVICES['glykos-device'],
    connection: {
      wifi: false,
      signalStrength: -100,
      lastUpdate: new Date(),
    },
    pressure: {
      // Hanya nama area di sini. Jangan tambahkan alias pressure1/2/3 —
      // PressureCard me-render seluruh isi `points`, jadi duplikat akan
      // muncul sebagai baris kedua berisi angka yang sama. Nilai mentahnya
      // sudah tersedia di field pressure1/2/3 tingkat atas (dipakai
      // useFirestoreSync & exportData).
      peak: peakPressure,
      location: maxLocation,
      points: {
        heel: p1,
        metatarsal: p2,
        toe: p3,
      },
    },
    temperatureObj: {
      // T1/T2/T3 adalah tiga area pada SATU kaki (forefoot/tumit/lateral),
      // bukan perbandingan kaki kiri vs kanan — lihat catatan di
      // useBleSensor.js. Karena itu tidak ada lagi field leftFoot/rightFoot.
      highest: highestTemp,
      location: tempLocation,
      // Tanpa field per-area (dokumen lama), satu titik metatarsal dipakai
      // sebagai perkiraan terbaik — TAPI hanya kalau nilainya sungguhan.
      // Suhu kulit 0 °C tidak mungkin pada kaki hidup, jadi 0 berarti "belum
      // ada data": kembalikan objek kosong supaya kartu Suhu masuk ke keadaan
      // kosong, bukan mengarang baris "Metatarsal 0°C".
      points: hasTempAreas ? tempPoints : temperatureVal > 0 ? { metatarsal: temperatureVal } : {},
      delta: tempDelta,
    },
    activity: dataRaw.activity || {
      steps: 0,
      activeMinutes: 0,
    },
  }
}

// Membaca dokumen live (users/{uid}/devices/{deviceId}/live/current) secara
// realtime via onSnapshot. Firmware ESP32 tidak menulis ke path ini langsung
// (tidak ada WiFi di perangkat) — yang menulis adalah WEB APP ini sendiri lewat
// useFirestoreSync.js selama BLE tersambung. Selama belum pernah ada sesi BLE
// sama sekali, dokumen tidak ada dan hook jatuh ke DEFAULT_JSON (nol semua).
//
// `isLive` berarti "ada pembacaan yang BARU" — dokumen yang ada tapi kedaluwarsa
// dikembalikan sebagai `isStale`, supaya dashboard bisa menampilkan angkanya
// dengan penanda "terakhir diperbarui …" alih-alih mengaku real-time.
export function useSensorData(uid, deviceId = 'glykos-device') {
  const subscriptionKey = uid && deviceId ? `${uid}:${deviceId}` : null

  // Data disimpan BERSAMA kunci langganannya, lalu dipakai hanya kalau
  // kuncinya masih cocok. Dengan begitu berganti akun/perangkat tidak perlu
  // "membersihkan" state lewat setState di badan effect — data lama otomatis
  // tidak terpakai sejak render pertama setelah kuncinya berubah.
  const [entry, setEntry] = useState({ key: null, raw: null, pendingWrite: false })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!subscriptionKey) return

    const unsubscribe = onSnapshot(
      liveDoc(uid, deviceId),
      (snap) => {
        setEntry({
          key: subscriptionKey,
          raw: snap.exists() ? snap.data() : null,
          pendingWrite: snap.metadata.hasPendingWrites,
        })
        setNow(Date.now())
      },
      (err) => {
        console.warn('Gagal membaca data live:', err)
        setEntry({ key: subscriptionKey, raw: null, pendingWrite: false })
      },
    )
    return unsubscribe
  }, [uid, deviceId, subscriptionKey])

  const isCurrent = entry.key === subscriptionKey
  const raw = isCurrent ? entry.raw : null
  const pendingWrite = isCurrent ? entry.pendingWrite : false

  // Hanya berdetak selama ada dokumen untuk dinilai — tanpa data, tidak ada
  // yang bisa berubah basi.
  useEffect(() => {
    if (!raw) return
    const intervalId = setInterval(() => setNow(Date.now()), FRESHNESS_TICK_MS)
    return () => clearInterval(intervalId)
  }, [raw])

  const updatedAtMs = useMemo(() => readUpdatedAtMs(raw), [raw])

  // Tulisan yang belum dikonfirmasi server punya updatedAt null sesaat —
  // itu tulisan kita sendiri barusan, jadi jelas segar.
  const isFresh = pendingWrite || (updatedAtMs !== null && now - updatedAtMs < STALE_AFTER_MS)
  const hasData = Boolean(raw)
  const isLive = hasData && isFresh
  const isStale = hasData && !isFresh

  const data = useMemo(() => {
    const reading = parseSensorReading(raw || DEFAULT_JSON, deviceId)
    reading.connection.wifi = isLive
    reading.connection.lastUpdate = updatedAtMs ? new Date(updatedAtMs) : new Date(now)
    return reading
    // `now` sengaja tidak jadi dependensi: nilainya hanya cadangan label waktu
    // saat belum ada updatedAt, tidak sepadan dengan render ulang tiap detak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, isLive, deviceId, updatedAtMs])

  const refresh = () => setNow(Date.now())

  return {
    data,
    isLoading: false,
    refresh,
    devices: DEVICES,
    isLive,
    isStale,
    updatedAtMs,
    // `hasData` = dokumen live-nya ada (segar maupun basi). `isLoaded` = jawaban
    // pertama dari Firestore sudah tiba, jadi "belum ada data" sudah pasti
    // bukan sekadar "belum sempat dibaca". Keduanya dipakai untuk memutuskan
    // apakah data contoh boleh ditampilkan — lihat utils/demoMode.js.
    hasData,
    isLoaded: isCurrent,
  }
}
