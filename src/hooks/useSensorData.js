// src/hooks/useSensorData.js
import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { ref, onValue } from 'firebase/database'
import { db, rtdb } from '../services/firebase'

const DEVICES = {
  'ESP32-001': { name: 'ESP32-001', foot: 'right' },
  'glykos-device': { name: 'Glykos Device', foot: 'right' },
}

function getTimestampValue(doc = {}) {
  if (doc.createdAt) {
    if (typeof doc.createdAt.toMillis === 'function') return doc.createdAt.toMillis()
    if (typeof doc.createdAt === 'number') return doc.createdAt
    if (typeof doc.createdAt === 'string') {
      const parsed = Date.parse(doc.createdAt)
      if (!Number.isNaN(parsed)) return parsed
    }
  }

  const date = doc.tanggal || doc.date
  const time = doc.waktu || ''
  if (date) {
    const value = Date.parse(`${date}T${time}`)
    if (!Number.isNaN(value)) return value
  }

  return 0
}

function normalizeId(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function parseSensorReading(raw = {}, deviceId) {
  const dataRaw = raw

  // Format JSON Konsisten:
  // {
  //   "id": "ESP32-001",
  //   "humidity": 55.0,
  //   "temperature1": 32.5,
  //   "temperature2": 32.5,
  //   "temperature3": 32.5,
  //   "pressure1": 180.5,
  //   "pressure2": 210.2,
  //   "pressure3": 90.0,
  //   "tanggal": "2026-07-30",
  //   "waktu": "15:30:00",
  //   "langkah": 2000
  // }
  const id = dataRaw.id || deviceId || 'glykos-device'
  const p1 = Number(dataRaw.pressure1 ?? 0)
  const p2 = Number(dataRaw.pressure2 ?? 0)
  const p3 = Number(dataRaw.pressure3 ?? 0)
  const t1 = Number(dataRaw.temperature1 ?? 0)
  const t2 = Number(dataRaw.temperature2 ?? 0)
  const t3 = Number(dataRaw.temperature3 ?? 0)
  const temperatureVal = Math.max(t1, t2, t3, 0)
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
    device: DEVICES[id] || DEVICES['glykos-device'],
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
    activity: dataRaw.activity ?? null,
  }
}

// Membaca dokumen "live" (devices/{deviceId}/live/current) secara realtime via
// onSnapshot. Selama firmware ESP32 belum mengirim ke path ini (BLE/WiFi belum
// diimplementasikan di perangkat), dokumen tidak akan ada dan hook otomatis
// jatuh ke DEFAULT_JSON — begitu perangkat mulai menulis, UI update sendiri
// tanpa perlu refresh manual.
export function useSensorData(deviceId = 'glykos-device') {
  const [raw, setRaw] = useState(null)
  const [rawFirestore, setRawFirestore] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now())

  useEffect(() => {
    const dbRef = ref(rtdb, `devices/${deviceId}/live/current`)
    const unsubscribeRtdb = onValue(
      dbRef,
      async (snap) => {
        const data = snap.exists() ? snap.val() : null
        if (data) {
          setRaw(data)
          setIsLive(true)
          try {
            await addDoc(collection(db, 'devices'), {
              ...data,
              createdAt: serverTimestamp(),
            })
          } catch (err) {
            console.error('Failed to write live sensor data to Firestore:', err)
          }
        } else {
          setRaw(null)
          setIsLive(false)
        }
      },
      (error) => {
        console.error('Realtime DB listener error:', error)
        setRaw(null)
        setIsLive(false)
      },
    )

    return () => unsubscribeRtdb()
  }, [deviceId])

  useEffect(() => {
    const firestoreRef = collection(db, 'devices')
    const normalizedDeviceId = normalizeId(deviceId)
    const unsubscribeFirestore = onSnapshot(
      firestoreRef,
      (snapshot) => {
        const docs = snapshot.docs
          .map((docSnap) => ({ ...docSnap.data(), _docId: docSnap.id }))
          .filter((doc) => normalizeId(doc.id) === normalizedDeviceId)
          .sort((a, b) => getTimestampValue(b) - getTimestampValue(a))

        setRawFirestore(docs[0] || null)
      },
      (error) => {
        console.error('Firestore listener error:', error)
        setRawFirestore(null)
      },
    )

    return unsubscribeFirestore
  }, [deviceId])

  const data = useMemo(() => {
    const source = rawFirestore ?? raw ?? {}
    const reading = parseSensorReading(source, deviceId)
    reading.connection.wifi = isLive
    reading.connection.lastUpdate = isLive ? new Date() : new Date(refreshedAt)
    return reading
  }, [raw, rawFirestore, isLive, deviceId, refreshedAt])

  const refresh = () => setRefreshedAt(Date.now())

  return { data, isLoading: false, refresh, devices: DEVICES, isLive }
}
