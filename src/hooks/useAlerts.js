// src/hooks/useAlerts.js
import { useEffect, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../services/firebase'
import {
  getPressureStatus,
  getPressureLabel,
  getTemperatureStatus,
  getHumidityStatus,
  TEMP_DELTA_WARNING,
} from '../constants/thresholds'
import { notify } from '../utils/notifications'

const STATUS_RANK = { safe: 0, warning: 1, danger: 2 }

function evaluateMetrics(data) {
  const peak = data.pressure?.peak ?? 0
  const pressureStatus = getPressureStatus(peak)

  const highest = data.temperatureObj?.highest ?? 0
  const delta = data.temperatureObj?.delta ?? 0
  const temperatureStatus = delta >= TEMP_DELTA_WARNING ? 'warning' : getTemperatureStatus(highest)

  const humidity = data.humidity ?? 0
  const humidityStatus = getHumidityStatus(humidity)

  return [
    {
      metric: 'pressure',
      label: 'Tekanan',
      status: pressureStatus,
      value: `${peak} kPa`,
      location: data.pressure?.location ?? null,
      message: `Tekanan puncak ${peak} kPa (${getPressureLabel(pressureStatus)})`,
    },
    {
      metric: 'temperature',
      label: 'Suhu',
      status: temperatureStatus,
      value: `${highest}°C`,
      location: data.temperatureObj?.location ?? null,
      message:
        delta >= TEMP_DELTA_WARNING
          ? `Selisih suhu ${delta.toFixed(1)}°C antar area — prediktor pre-ulkus`
          : `Suhu tertinggi ${highest}°C`,
    },
    {
      metric: 'humidity',
      label: 'Kelembapan',
      status: humidityStatus,
      value: `${humidity}% RH`,
      location: null,
      message: `Kelembapan sepatu ${humidity}% RH`,
    },
  ]
}

async function logAlert(deviceId, item) {
  try {
    await addDoc(collection(db, 'devices', deviceId, 'alerts'), {
      metric: item.metric,
      label: item.label,
      status: item.status,
      value: item.value,
      location: item.location,
      message: item.message,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Gagal mencatat peringatan ke Firestore:', err)
  }
}

// Memantau status tiap metrik dan mencatat entri baru ke
// devices/{deviceId}/alerts setiap kali statusnya naik ke warning/danger,
// plus memicu notifikasi browser untuk status danger. Deteksi ini berjalan
// di sisi klien selama dashboard terbuka — untuk peringatan saat aplikasi
// tertutup diperlukan pemantauan sisi server (Cloud Function + push),
// yang belum diaktifkan pada proyek ini.
export function useAlertMonitor(deviceId, data) {
  const lastStatus = useRef({})

  useEffect(() => {
    lastStatus.current = {}
  }, [deviceId])

  useEffect(() => {
    if (!deviceId || !data) return

    evaluateMetrics(data).forEach((item) => {
      const prevStatus = lastStatus.current[item.metric] ?? 'safe'
      const prevRank = STATUS_RANK[prevStatus]
      const currRank = STATUS_RANK[item.status]

      if (currRank > 0 && item.status !== prevStatus) {
        logAlert(deviceId, item)
        if (item.status === 'danger' && currRank > prevRank) {
          notify(`Glykos — ${item.label} Berisiko`, item.message)
        }
      }

      lastStatus.current[item.metric] = item.status
    })
  }, [deviceId, data])
}

export function useAlerts(deviceId, max = 50) {
  const [alerts, setAlerts] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)
  const key = deviceId ? `${deviceId}:${max}` : null

  useEffect(() => {
    if (!deviceId) return

    const alertsRef = collection(db, 'devices', deviceId, 'alerts')
    const q = query(alertsRef, orderBy('createdAt', 'desc'), limit(max))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAlerts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
        setLoadedKey(key)
      },
      (err) => {
        console.warn('Gagal membaca riwayat peringatan:', err)
        setAlerts([])
        setLoadedKey(key)
      },
    )

    return unsubscribe
  }, [deviceId, max, key])

  return { alerts, isLoading: Boolean(deviceId) && loadedKey !== key }
}
