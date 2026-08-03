// src/hooks/useSensorData.js
import { useMemo, useState } from 'react'

const DEVICES = {
  'ESP32-001': { name: 'Insole Kiri — Budi', foot: 'left' }
}

const DEFAULT_JSON = {
  id: 'ESP32-001',
  humidity: 55.0,
  temperature: 32.5,
  pressure1: 180.5,
  pressure2: 210.2,
  pressure3: 90.0,
  tanggal: '2026-07-30',
  waktu: '15:30:00',
}

function parseSensorReading(raw, deviceId) {
  const dataRaw = raw || DEFAULT_JSON

  // Format JSON Konsisten:
  // {"id": "ESP32-001","humidity": 55.0,"temperature": 32.5,"pressure1": 180.5,"pressure2": 210.2,"pressure3": 90.0,"tanggal": "2026-07-30","waktu": "15:30:00"}
  const id = dataRaw.id || deviceId || 'ESP32-001'
  const p1 = Number(dataRaw.pressure1 ?? 0)
  const p2 = Number(dataRaw.pressure2 ?? 0)
  const p3 = Number(dataRaw.pressure3 ?? 0)
  const temperatureVal = Number(dataRaw.temperature ?? 0)
  const humidityVal = Number(dataRaw.humidity ?? 0)
  const tanggal = dataRaw.tanggal || new Date().toISOString().slice(0, 10)
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
    device: DEVICES[id] || DEVICES['ESP32-001'],
    connection: {
      wifi: false,
      signalStrength: -100,
      lastUpdate: new Date(),
    },
    pressure: {
      peak: peakPressure,
      location: maxLocation,
      points: {
        heel: p1,
        metatarsal: p2,
        toe: p3,
        pressure1: p1,
        pressure2: p2,
        pressure3: p3,
      },
    },
    temperatureObj: {
      highest: temperatureVal,
      location: 'Metatarsal',
      points: { Metatarsal: temperatureVal },
      leftFoot: temperatureVal,
      rightFoot: temperatureVal,
      delta: 0,
    },
    activity: dataRaw.activity || {
      steps: 1250,
      activeMinutes: 45,
    },
  }
}

// TODO: pembacaan sensor live akan datang dari BLE (belum diimplementasikan).
// Untuk sementara hook ini hanya menyediakan data contoh statis.
export function useSensorData(deviceId = 'ESP32-001') {
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now())

  const data = useMemo(() => {
    const reading = parseSensorReading(DEFAULT_JSON, deviceId)
    reading.connection.lastUpdate = new Date(refreshedAt)
    return reading
  }, [deviceId, refreshedAt])

  const refresh = () => setRefreshedAt(Date.now())

  return { data, isLoading: false, refresh, devices: DEVICES }
}
