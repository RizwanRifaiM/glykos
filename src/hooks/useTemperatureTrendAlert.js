// src/hooks/useTemperatureTrendAlert.js
// Mencatat peringatan saat selisih suhu antar area bertahan beberapa hari
// berturut-turut. Aturannya sendiri ada di utils/temperatureTrend.js (fungsi
// murni); hook ini hanya menyambungkannya ke Firestore dan notifikasi.
//
// Bedanya dengan useAlertMonitor: yang itu bereaksi pada pembacaan LIVE dan
// bisa memicu beberapa kali dalam satu sesi, sementara yang ini bekerja pada
// rangkuman HARIAN — jadi paling banyak satu catatan per hari, dan hanya saat
// rangkaiannya benar-benar bertambah panjang.
import { useEffect, useRef } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { logAlert } from './useAlerts'
import { notify } from '../utils/notifications'
import { describeAlert } from '../utils/alertMessages'

function stateKey(uid, deviceId) {
  return `glykos:temp-trend-alert:${uid}:${deviceId}`
}

function loadLastLogged(uid, deviceId) {
  try {
    const stored = window.localStorage.getItem(stateKey(uid, deviceId))
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveLastLogged(uid, deviceId, value) {
  try {
    window.localStorage.setItem(stateKey(uid, deviceId), JSON.stringify(value))
  } catch {
    // Mode privat / storage penuh. Konsekuensinya catatan yang sama bisa
    // muncul lagi setelah reload — mengganggu, tapi tidak merusak data.
  }
}

export function useTemperatureTrendAlert(uid, deviceId, trend) {
  const lastRef = useRef(null)
  // Judul & isi notifikasi mengikuti bahasa yang sedang aktif — diambil dari
  // konteks, bukan instance global. Lihat catatan yang sama di useAlerts.js.
  const { i18n } = useLingui()

  useEffect(() => {
    lastRef.current = uid && deviceId ? loadLastLogged(uid, deviceId) : null
  }, [uid, deviceId])

  useEffect(() => {
    if (!uid || !deviceId || !trend || trend.level !== 'danger') return

    const days = trend.days ?? []
    const latestDate = days[days.length - 1]?.date
    if (!latestDate) return

    // Dedup dua lapis. `date` menahan pencatatan berulang selama hari yang
    // sama (tiap kali dashboard dibuka, tiap kali rangkuman harian diperbarui),
    // sementara `streakDays` sengaja ikut dibandingkan supaya rangkaian yang
    // MEMANJANG — 2 hari jadi 3 — tetap tercatat sebagai kejadian baru, karena
    // itu memang perburukan.
    const last = lastRef.current
    if (last?.date === latestDate && last?.streakDays >= trend.streakDays) return

    // Sama bentuknya dengan peringatan live: metrik + status + ANGKA, tanpa
    // kalimat. Kalimatnya dirakit saat dibaca (utils/alertMessages.js), supaya
    // catatan ini bisa ditampilkan dalam bahasa apa pun nanti — termasuk oleh
    // pengguna yang mengganti bahasa setelah peringatannya tercatat.
    const item = {
      metric: 'temperatureTrend',
      status: 'danger',
      location: null,
      values: { streakDays: trend.streakDays, maxDelta: trend.maxDelta },
    }

    logAlert(uid, deviceId, item)
    // Judulnya TIDAK memakai riskTitle(): pola "… Berisiko" cocok untuk metrik
    // sesaat ("Tekanan Berisiko"), tapi janggal untuk temuan yang namanya
    // sudah berupa keterangan sendiri — "Selisih Suhu Menetap Berisiko".
    notify(t(i18n)`Glykos — Selisih Suhu Menetap`, describeAlert(i18n, item).message)

    const next = { date: latestDate, streakDays: trend.streakDays }
    lastRef.current = next
    saveLastLogged(uid, deviceId, next)
  }, [uid, deviceId, trend, i18n])
}
