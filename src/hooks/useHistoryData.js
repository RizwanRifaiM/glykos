// src/hooks/useHistoryData.js
import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { toDateKey } from '../utils/formatTime'

// Total langkah sehari.
//
// Tiap dokumen menyimpan langkah KUMULATIF sejak sesi pemakaiannya dimulai,
// dan hitungan itu direset tiap perangkat tersambung ulang. Jadi total harian
// bukan penjumlahan semua dokumen (akan berlipat ganda), melainkan jumlah
// dari nilai TERBESAR pada masing-masing sesi.
//
// Dokumen lama yang ditulis sebelum sessionId ada dikelompokkan ke satu ember
// 'legacy' — untuk data itu totalnya jadi nilai terbesar hari tersebut, yang
// merupakan perkiraan terbaik yang bisa didapat tanpa penanda sesi.
function sumStepsPerSession(dayEntries) {
  const maxBySession = {}
  dayEntries.forEach((entry) => {
    const value = Number(entry.steps)
    if (!Number.isFinite(value) || value <= 0) return
    const key = entry.sessionId || 'legacy'
    maxBySession[key] = Math.max(maxBySession[key] ?? 0, value)
  })
  return Object.values(maxBySession).reduce((total, value) => total + value, 0)
}

function buildPoints(groupedByDate, start, days) {
  const points = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    // Kunci tanggal LOKAL — harus cocok dengan `tanggal` yang ditulis
    // useFirestoreSync dan dengan label yang dilihat pengguna. Sebelumnya
    // memakai toISOString() yang berbasis UTC, sehingga di UTC+7 kuncinya
    // selalu meleset satu hari dari label barisnya sendiri.
    const dateKey = toDateKey(d)

    const dayEntries = groupedByDate[dateKey] || []

    if (dayEntries.length > 0) {
      const pressures = dayEntries
        .map((e) => {
          if (typeof e.pressure === 'number') return e.pressure
          const p1 = Number(e.pressure1 ?? 0)
          const p2 = Number(e.pressure2 ?? 0)
          const p3 = Number(e.pressure3 ?? 0)
          return Math.max(p1, p2, p3)
        })
        .filter((v) => typeof v === 'number' && !isNaN(v) && v > 0)

      const temperatures = dayEntries
        .map((e) => Number(e.temperature))
        .filter((v) => typeof v === 'number' && !isNaN(v) && v > 0)

      const humidities = dayEntries
        .map((e) => Number(e.humidity))
        .filter((v) => typeof v === 'number' && !isNaN(v) && v > 0)

      points.push({
        date: dateKey,
        label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        timestamp: d.getTime(),
        pressure: pressures.length > 0 ? Math.max(...pressures) : 0,
        temperature: temperatures.length > 0 ? Math.max(...temperatures) : 0,
        humidity:
          humidities.length > 0
            ? Math.round((humidities.reduce((a, b) => a + b, 0) / humidities.length) * 10) / 10
            : 0,
        steps: sumStepsPerSession(dayEntries),
      })
    } else {
      // Belum ada log Firestore untuk hari ini — nol, BUKAN data simulasi.
      points.push({
        date: dateKey,
        label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        timestamp: d.getTime(),
        pressure: 0,
        temperature: 0,
        humidity: 0,
        steps: 0,
      })
    }
  }

  return points
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

    const historyRef = collection(db, 'devices', deviceId, 'history')

    const unsubscribe = onSnapshot(
      historyRef,
      (snapshot) => {
        const groupedByDate = {}
        snapshot.forEach((docSnap) => {
          const entry = docSnap.data()
          if (!entry) return

          const dateKey = entry.tanggal || entry.date
          if (!dateKey) return

          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = []
          }
          groupedByDate[dateKey].push(entry)
        })

        setHistory(buildPoints(groupedByDate, start, days))
        setLoadedKey(key)
      },
      (err) => {
        console.warn('Gagal membaca Firestore, menggunakan data default tren:', err)
        setHistory(buildPoints({}, start, days))
        setLoadedKey(key)
      },
    )

    return unsubscribe
  }, [deviceId, days, key])

  return { history, isLoading: loadedKey !== key, range, days }
}
