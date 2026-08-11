// src/hooks/useSensorData.js
import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { toDateKey } from '../utils/formatTime'

// Baru ada satu perangkat, dipasang di kaki KANAN. Struktur map dipertahankan
// supaya perangkat kedua (kaki kiri) tinggal ditambahkan di sini tanpa
// mengubah DeviceSelector.
const DEVICES = {
  'glykos-device': { name: 'Glykos Device', foot: 'right' }
}

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
      highest: temperatureVal,
      location: 'metatarsal',
      points: { metatarsal: temperatureVal },
      delta: 0,
    },
    activity: dataRaw.activity || {
      steps: 0,
      activeMinutes: 0,
    },
  }
}

// Membaca dokumen "live" (devices/{deviceId}/live/current) secara realtime via
// onSnapshot. Firmware ESP32 tidak menulis ke path ini langsung (tidak ada
// WiFi di perangkat) — yang menulis adalah WEB APP ini sendiri lewat
// useFirestoreSync.js selama BLE tersambung. Selama belum pernah ada sesi BLE
// sama sekali, dokumen tidak ada dan hook jatuh ke DEFAULT_JSON (nol semua).
export function useSensorData(deviceId = 'glykos-device') {
  const [raw, setRaw] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now())

  useEffect(() => {
    const ref = doc(db, 'devices', deviceId, 'live', 'current')
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setRaw(snap.data())
          setIsLive(true)
        } else {
          setRaw(null)
          setIsLive(false)
        }
      },
      () => {
        setRaw(null)
        setIsLive(false)
      },
    )
    return unsubscribe
  }, [deviceId])

  const data = useMemo(() => {
    const reading = parseSensorReading(raw || DEFAULT_JSON, deviceId)
    reading.connection.wifi = isLive
    reading.connection.lastUpdate = isLive ? new Date() : new Date(refreshedAt)
    return reading
  }, [raw, isLive, deviceId, refreshedAt])

  const refresh = () => setRefreshedAt(Date.now())

  return { data, isLoading: false, refresh, devices: DEVICES, isLive }
}
