// src/hooks/useHistoryData.js
import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

function getEntryPressure(entry) {
  if (typeof entry.pressure === 'number' && !Number.isNaN(entry.pressure)) return entry.pressure
  const p1 = Number(entry.pressure1 ?? 0)
  const p2 = Number(entry.pressure2 ?? 0)
  const p3 = Number(entry.pressure3 ?? 0)
  return Math.max(p1, p2, p3)
}

function getEntryTemperature(entry) {
  if (typeof entry.temperature === 'number' && !Number.isNaN(entry.temperature)) return entry.temperature
  const t1 = Number(entry.temperature1 ?? 0)
  const t2 = Number(entry.temperature2 ?? 0)
  const t3 = Number(entry.temperature3 ?? 0)
  return Math.max(t1, t2, t3)
}

function getEntrySteps(entry) {
  const steps = Number(entry.activity?.steps ?? entry.steps ?? entry.langkah ?? 0)
  return typeof steps === 'number' && !Number.isNaN(steps) ? steps : 0
}

function getEntryHumidity(entry) {
  const humidity = Number(entry.humidity ?? entry.hum ?? 0)
  return typeof humidity === 'number' && !Number.isNaN(humidity) ? humidity : 0
}

function parseEntryTimestamp(entry) {
  const createdAt = entry.createdAt
  if (createdAt) {
    if (typeof createdAt.toMillis === 'function') return createdAt.toMillis()
    if (typeof createdAt === 'number') return createdAt
    if (typeof createdAt === 'string') {
      const parsed = Date.parse(createdAt)
      if (!Number.isNaN(parsed)) return parsed
    }
  }

  const date = entry.tanggal || entry.date
  const time = entry.waktu || ''
  if (date) {
    const parsed = Date.parse(`${date}T${time}`)
    if (!Number.isNaN(parsed)) return parsed
  }

  return 0
}

function normalizeHistoryEntry(entry, docId) {
  const dateKey = entry.tanggal || entry.date
  const timestamp = parseEntryTimestamp(entry)
  return {
    _docId: docId,
    date: dateKey,
    label: dateKey ? new Date(dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Unknown',
    timestamp,
    pressure: getEntryPressure(entry),
    temperature: getEntryTemperature(entry),
    humidity: getEntryHumidity(entry),
    steps: getEntrySteps(entry),
    raw: entry,
  }
}

export function useHistoryData(deviceId = 'glykos-device', range = '7d') {
  const [history, setHistory] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)
  const days = range === '30d' ? 30 : 7
  const key = `${deviceId}:${days}`

  useEffect(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date(end)
    start.setDate(end.getDate() - (days - 1))
    start.setHours(0, 0, 0, 0)

    const historyRef = collection(db, 'devices')

    const unsubscribe = onSnapshot(
      historyRef,
      (snapshot) => {
        const normalizedDeviceId = deviceId?.trim().toLowerCase()
        const entries = snapshot.docs
          .map((docSnap) => ({ entry: docSnap.data(), _docId: docSnap.id }))
          .filter(({ entry }) => entry && typeof entry.id === 'string')
          .filter(({ entry }) => entry.id.trim().toLowerCase() === normalizedDeviceId)
          .map(({ entry, _docId }) => normalizeHistoryEntry(entry, _docId))
          .filter((item) => item.timestamp >= start.getTime() && item.timestamp <= end.getTime())
          .sort((a, b) => b.timestamp - a.timestamp)

        setHistory(entries)
        setLoadedKey(key)
      },
      (err) => {
        console.warn('Gagal membaca Firestore untuk histori:', err)
        setHistory([])
        setLoadedKey(key)
      },
    )

    return unsubscribe
  }, [deviceId, days, key])

  return { history, isLoading: loadedKey !== key, range, days }
}
