// src/hooks/useBleSensor.js
// Membungkus BleSensor menjadi state React dan menormalkan paket CSV BLE ke
// bentuk "reading" yang sama dengan useSensorData, sehingga seluruh komponen
// dashboard (MetricCards, InsoleIllustration, alert monitor, export) bekerja
// tanpa perubahan.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BleSensor, isBleSupported } from '../services/ble'

const DEVICE_META = { id: 'glykos-device', name: 'Glykos Device', foot: 'left' }

// Pemetaan lokasi sesuai kontrak firmware:
//   P1 = Hallux (jari kaki),  P2 = Metatarsal1,  P3 = Tumit
// F1/F2/F3 = tegangan mentah FSR (mV) — hanya dipakai kalau P tidak dikirim.
// Faktor konversi ini PLACEHOLDER; ganti dengan kurva kalibrasi FSR nyata.
const FSR_MV_TO_KPA = 0.1

const round1 = (n) => Math.round(n * 10) / 10

// Ambil kPa: utamakan P (siap pakai); fallback estimasi dari F (mV).
function toKpa(pValue, fValue) {
  if (typeof pValue === 'number') return round1(pValue)
  if (typeof fValue === 'number') return round1(fValue * FSR_MV_TO_KPA)
  return 0
}

function normalizeBleReading(raw, receivedAt, isConnected) {
  const toe = toKpa(raw.P1, raw.F1) // Hallux
  const metatarsal = toKpa(raw.P2, raw.F2) // Metatarsal1
  const heel = toKpa(raw.P3, raw.F3) // Tumit

  const peak = Math.max(heel, metatarsal, toe)
  let location = 'metatarsal'
  if (peak === heel) location = 'heel'
  else if (peak === toe) location = 'toe'

  // Suhu NTC: T1 = forefoot, T2 = tumit. Selisih keduanya adalah prediktor
  // pre-ulkus (dipakai oleh threshold TEMP_DELTA_WARNING).
  const t1 = typeof raw.T1 === 'number' ? round1(raw.T1) : null
  const t2 = typeof raw.T2 === 'number' ? round1(raw.T2) : null
  const temps = [t1, t2].filter((v) => v !== null)
  const highest = temps.length ? Math.max(...temps) : 0
  const delta = t1 !== null && t2 !== null ? round1(Math.abs(t1 - t2)) : 0
  const tempLocation = t1 !== null && t2 !== null && t2 > t1 ? 'Tumit' : 'Forefoot'

  const tempPoints = {}
  if (t1 !== null) tempPoints.Forefoot = t1
  if (t2 !== null) tempPoints.Tumit = t2

  const humidity = typeof raw.RH === 'number' ? round1(raw.RH) : 0
  const now = receivedAt ? new Date(receivedAt) : new Date()

  return {
    // Field standar (selaras dengan useSensorData)
    id: DEVICE_META.id,
    deviceId: DEVICE_META.id,
    device: DEVICE_META,
    humidity,
    temperature: highest,
    pressure1: heel,
    pressure2: metatarsal,
    pressure3: toe,
    tanggal: now.toISOString().slice(0, 10),
    waktu: now.toLocaleTimeString('id-ID'),

    connection: {
      wifi: isConnected, // memicu badge "Live" pada ConnectionBar
      signalStrength: -50,
      lastUpdate: now,
    },
    pressure: {
      peak,
      location,
      points: {
        heel,
        metatarsal,
        toe,
        pressure1: toKpa(raw.P1, raw.F1),
        pressure2: toKpa(raw.P2, raw.F2),
        pressure3: toKpa(raw.P3, raw.F3),
      },
    },
    temperatureObj: {
      highest,
      location: tempLocation,
      points: tempPoints,
      leftFoot: t1 ?? highest, // forefoot
      rightFoot: t2 ?? highest, // tumit
      delta,
    },
    // Firmware hanya mengirim akselerasi mentah (AX/AY/AZ), belum langkah kaki.
    activity: null,
    airTemperature: typeof raw.TA === 'number' ? round1(raw.TA) : null,
    accel: {
      x: raw.AX ?? null,
      y: raw.AY ?? null,
      z: raw.AZ ?? null,
    },
  }
}

export function useBleSensor() {
  const [status, setStatus] = useState('idle') // idle|connecting|connected|disconnected|error
  const [deviceName, setDeviceName] = useState(null)
  const [error, setError] = useState(null)
  const [raw, setRaw] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const sensorRef = useRef(null)

  useEffect(() => {
    const sensor = new BleSensor({
      onReading: (merged) => {
        setRaw(merged)
        setUpdatedAt(Date.now())
      },
      onStatus: ({ status: next, deviceName: name, error: err }) => {
        setStatus(next)
        if (name) setDeviceName(name)
        if (err) setError(err.message || String(err))
        else if (next === 'connecting' || next === 'connected') setError(null)
      },
    })
    sensorRef.current = sensor
    return () => {
      sensor.disconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    try {
      await sensorRef.current?.connect()
    } catch (err) {
      // Pengguna menutup dialog pemilih perangkat -> NotFoundError, bukan error nyata.
      if (err?.name === 'NotFoundError') {
        setStatus('idle')
        setError(null)
      }
      // Error lain sudah dilaporkan lewat onStatus('error').
    }
  }, [])

  const disconnect = useCallback(async () => {
    await sensorRef.current?.disconnect()
    setRaw(null)
    setUpdatedAt(null)
  }, [])

  const isConnected = status === 'connected'

  const reading = useMemo(() => {
    if (!raw) return null
    return normalizeBleReading(raw, updatedAt, isConnected)
  }, [raw, updatedAt, isConnected])

  return {
    supported: isBleSupported(),
    status,
    isConnected,
    deviceName,
    error,
    reading,
    connect,
    disconnect,
  }
}
