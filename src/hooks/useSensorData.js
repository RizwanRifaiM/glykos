// src/hooks/useSensorData.js
import { useEffect, useRef, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { collection, addDoc } from 'firebase/firestore'
import { rtdb, db } from "../services/firebase"

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

function parseRTDBReading(raw, deviceId) {
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
      wifi: true,
      signalStrength: -65,
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

export function useSensorData(deviceId = 'ESP32-001') {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastSavedTimestampRef = useRef(null)

  useEffect(() => {
    if (!deviceId) return

    setIsLoading(true)
    // 1. Dapatkan ref dari Realtime Database: devices/{deviceId}
    const sensorRef = ref(rtdb, `devices/${deviceId}`)

    // 2. Listener Realtime Data dari RTDB
    const unsubscribe = onValue(
      sensorRef,
      async (snapshot) => {
        const raw = snapshot.val()
        const parsedData = parseRTDBReading(raw, deviceId)
        setData(parsedData)
        setIsLoading(false)

        // 3. Simpan data ke Firestore dengan struktur JSON konsisten:
        // {"id": "ESP32-001","humidity": 55.0,"temperature": 32.5,"pressure1": 180.5,"pressure2": 210.2,"pressure3": 90.0,"tanggal": "2026-07-30","waktu": "15:30:00"}
        const currentDataKey = `${parsedData.tanggal}_${parsedData.waktu}`
        if (lastSavedTimestampRef.current !== currentDataKey) {
          lastSavedTimestampRef.current = currentDataKey

          try {
            const historyRef = collection(db, 'devices', deviceId, 'history')
            await addDoc(historyRef, {
              id: parsedData.id,
              humidity: parsedData.humidity,
              temperature: parsedData.temperature,
              pressure1: parsedData.pressure1,
              pressure2: parsedData.pressure2,
              pressure3: parsedData.pressure3,
              tanggal: parsedData.tanggal,
              waktu: parsedData.waktu,
              createdAt: Date.now(),
            })
          } catch (err) {
            console.error('Gagal menyimpan histori ke Firestore:', err)
          }
        }
      },
      (error) => {
        console.error('RTDB Listener Error:', error)
        // Fallback ke default data jika RTDB listener mengalami error
        const fallbackData = parseRTDBReading(DEFAULT_JSON, deviceId)
        setData(fallbackData)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [deviceId])

  const refresh = () => {
    if (data) {
      setData({ ...data })
    }
  }

  return { data, isLoading, refresh, devices: DEVICES }
}