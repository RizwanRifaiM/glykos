// src/hooks/useHistoryData.js
import { useEffect, useMemo, useState } from 'react'
import { onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useLingui } from '@lingui/react'
import { dailyCollection } from '../services/paths'
import { rollupToPoint } from '../utils/dailyRollup'
import { toDateKey } from '../utils/formatTime'
import { formatShortDate } from '../utils/locale'

const EMPTY_POINT = {
  pressure: 0,
  temperature: 0,
  temperatureDelta: 0,
  temperatureRise: 0,
  temperatureRisenAreas: 0,
  temperatureAreaCount: 0,
  humidity: 0,
  dewPoint: 0,
  steps: 0,
  wearMinutes: 0,
}

// Membaca rangkuman harian (satu dokumen per tanggal) yang ditulis
// useFirestoreSync, DIBATASI pada rentang tanggal yang sedang ditampilkan.
//
// Sebelumnya hook ini berlangganan seluruh koleksi `history` mentah tanpa
// where/orderBy/limit lalu menyaring tanggalnya di klien — pemakaian normal
// menulis ~1.440 dokumen per hari, jadi dalam sebulan setiap kali dashboard
// dibuka puluhan ribu dokumen ikut terunduh. Sekarang 30 hari = 30 dokumen.
function buildPoints(rollupsByDate, start, days, locale) {
  const points = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    // Kunci tanggal LOKAL — harus cocok dengan `tanggal` yang ditulis
    // useFirestoreSync dan dengan label yang dilihat pengguna. Sebelumnya
    // memakai toISOString() yang berbasis UTC, sehingga di UTC+7 kuncinya
    // selalu meleset satu hari dari label barisnya sendiri.
    const dateKey = toDateKey(d)
    const rollup = rollupsByDate[dateKey]

    points.push({
      date: dateKey,
      // `locale` dioper masuk, bukan dibaca dari instance global di dalam
      // formatShortDate. Bedanya bukan gaya penulisan: dengan dioper,
      // ketergantungan label pada bahasa jadi TERLIHAT oleh
      // react-hooks/exhaustive-deps, sehingga aturan itu ikut menjaga useMemo
      // di bawah tetap benar. Kalau dibaca dari global, linter menganggap
      // dependensi locale-nya berlebihan dan menyarankan menghapusnya — saran
      // yang justru akan membuat label membeku di bahasa lama.
      label: formatShortDate(d, locale),
      timestamp: d.getTime(),
      // Tanpa rangkuman untuk hari itu: nol, BUKAN data simulasi.
      ...(rollup ? rollupToPoint(rollup) : EMPTY_POINT),
    })
  }

  return points
}

export function useHistoryData(uid, deviceId = 'glykos-device', range = '7d') {
  const days = range === '30d' ? 30 : 7
  // Label sumbu tanggal ("13 Agu" / "Aug 13") ikut bahasa aktif, jadi
  // `i18n.locale` ikut jadi dependensi useMemo di bawah. Tanpa itu label yang
  // sudah terhitung tidak pernah dihitung ulang, dan sumbu grafik Riwayat tetap
  // berbahasa lama setelah pengguna berganti bahasa.
  const { i18n } = useLingui()
  const subscriptionKey = uid && deviceId ? `${uid}:${deviceId}:${days}` : null

  const { start, startKey, endKey } = useMemo(() => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const from = new Date(end)
    from.setDate(end.getDate() - (days - 1))
    from.setHours(0, 0, 0, 0)
    return { start: from, startKey: toDateKey(from), endKey: toDateKey(end) }
  }, [days])

  // Hasil disimpan bersama kunci langganannya — lihat catatan pola yang sama
  // di useSensorData.js.
  const [entry, setEntry] = useState({ key: null, rollups: {} })

  useEffect(() => {
    if (!subscriptionKey) return

    // `tanggal` berformat YYYY-MM-DD, jadi urutan leksikalnya sama dengan
    // urutan kronologisnya — perbandingan string di sini aman.
    const q = query(
      dailyCollection(uid, deviceId),
      where('tanggal', '>=', startKey),
      where('tanggal', '<=', endKey),
      orderBy('tanggal'),
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rollups = {}
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          const dateKey = data?.tanggal || docSnap.id
          if (dateKey) rollups[dateKey] = data
        })
        setEntry({ key: subscriptionKey, rollups })
      },
      (err) => {
        console.warn('Gagal membaca rangkuman riwayat:', err)
        setEntry({ key: subscriptionKey, rollups: {} })
      },
    )

    return unsubscribe
  }, [uid, deviceId, subscriptionKey, startKey, endKey])

  const isCurrent = entry.key === subscriptionKey
  const history = useMemo(
    () => buildPoints(isCurrent ? entry.rollups : {}, start, days, i18n.locale),
    [isCurrent, entry.rollups, start, days, i18n.locale],
  )

  return { history, isLoading: Boolean(subscriptionKey) && !isCurrent, range, days }
}
