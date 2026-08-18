// src/hooks/useAlerts.js
import { useEffect, useRef, useState } from 'react'
import { addDoc, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { alertsCollection } from '../services/paths'
import { FATIGUE_LABELS } from '../constants/fatigue'
import { notify } from '../utils/notifications'
import { decideAlert, evaluateMetrics, STATUS_RANK } from '../utils/alertRules'

// Aturannya sendiri ada di utils/alertRules.js (fungsi murni, bisa diuji tanpa
// Firestore). Diekspor ulang di sini karena StatusBanner sudah mengimpornya
// lewat modul ini.
export { decideAlert, evaluateMetrics, STATUS_RANK }

// Indikasi kelelahan (useFatigueMonitor.js) bukan bagian dari `data` sensor,
// jadi dievaluasi terpisah lalu digabung ke daftar item yang sama supaya
// mengikuti jalur logAlert/notifikasi/badge yang sudah ada — tidak
// menduplikasi logikanya.
function fatigueMetricItem(fatigue) {
  if (!fatigue?.sessionActive) return null

  const label = FATIGUE_LABELS[fatigue.level] ?? fatigue.level
  return {
    metric: 'fatigue',
    label: 'Kelelahan',
    status: fatigue.level,
    value: label,
    location: null,
    message:
      fatigue.reasons.length > 0
        ? fatigue.reasons.join('; ')
        : `Indikasi kelelahan: ${label}`,
  }
}

// Referensi tetap supaya konsumen tidak melihat array baru tiap render.
const EMPTY_ALERTS = []

// Status terakhir disimpan di localStorage, bukan hanya di useRef.
//
// Dengan useRef saja, memuat ulang halaman mengosongkan ingatan hook dan
// pembacaan pertama sesudahnya terlihat seperti transisi baru dari `safe` —
// jadi status warning yang sedang berjalan tercatat lagi setiap kali tab
// dibuka. Kuncinya menyertakan uid supaya dua akun di satu browser tidak
// saling mewarisi status.
function stateKey(uid, deviceId) {
  return `glykos:alert-state:${uid}:${deviceId}`
}

function loadState(uid, deviceId) {
  try {
    const stored = window.localStorage.getItem(stateKey(uid, deviceId))
    const parsed = stored ? JSON.parse(stored) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveState(uid, deviceId, state) {
  try {
    window.localStorage.setItem(stateKey(uid, deviceId), JSON.stringify(state))
  } catch {
    // Mode privat / storage penuh — dedup lintas reload hilang, tapi aturan
    // transisi dalam sesi berjalan tetap bekerja lewat ref di bawah.
  }
}

// Diekspor supaya jalur pencatatan peringatan tetap SATU. Dipakai juga oleh
// useTemperatureTrendAlert.js yang sumber datanya rangkuman harian, bukan
// pembacaan live — bentuk dokumennya harus tetap identik supaya halaman
// Peringatan dan kolom Peringatan di Riwayat tidak perlu tahu asal-usulnya.
export async function logAlert(uid, deviceId, item) {
  try {
    await addDoc(alertsCollection(uid, deviceId), {
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
// users/{uid}/devices/{deviceId}/alerts setiap kali statusnya naik ke
// warning/danger, plus memicu notifikasi browser untuk status danger. Deteksi
// ini berjalan di sisi klien selama dashboard terbuka — untuk peringatan saat
// aplikasi tertutup diperlukan pemantauan sisi server (Cloud Function + push),
// yang belum diaktifkan pada proyek ini.
export function useAlertMonitor(uid, deviceId, data, fatigue) {
  const stateRef = useRef({})

  useEffect(() => {
    stateRef.current = uid && deviceId ? loadState(uid, deviceId) : {}
  }, [uid, deviceId])

  useEffect(() => {
    if (!uid || !deviceId || !data) return

    const items = evaluateMetrics(data)
    const fatigueItem = fatigueMetricItem(fatigue)
    if (fatigueItem) items.push(fatigueItem)

    const now = Date.now()
    let changed = false

    items.forEach((item) => {
      const prevEntry = stateRef.current[item.metric]
      const { shouldLog, shouldNotify, entry } = decideAlert(prevEntry, item.status, now)

      if (shouldLog) {
        logAlert(uid, deviceId, item)
        if (shouldNotify) notify(`Glykos — ${item.label} Berisiko`, item.message)
      }

      if (entry.status !== prevEntry?.status || entry.loggedAt !== prevEntry?.loggedAt) {
        changed = true
      }
      stateRef.current[item.metric] = entry
    })

    if (changed) saveState(uid, deviceId, stateRef.current)
  }, [uid, deviceId, data, fatigue])
}

// Batas 200 (bukan 50): selain mengisi halaman Peringatan, daftar ini juga
// dipakai kolom "Peringatan" pada tabel Riwayat yang mencakup 30 hari. Batas
// yang terlalu kecil membuat hari-hari terlama salah tampil "Tidak ada"
// padahal peringatannya ada, hanya terpotong limit.
export function useAlerts(uid, deviceId, max = 200) {
  const subscriptionKey = uid && deviceId ? `${uid}:${deviceId}:${max}` : null

  // Hasil disimpan bersama kunci langganannya — lihat catatan pola yang sama
  // di useSensorData.js.
  const [entry, setEntry] = useState({ key: null, alerts: [] })

  useEffect(() => {
    if (!subscriptionKey) return

    const q = query(alertsCollection(uid, deviceId), orderBy('createdAt', 'desc'), limit(max))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEntry({
          key: subscriptionKey,
          alerts: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        })
      },
      (err) => {
        console.warn('Gagal membaca riwayat peringatan:', err)
        setEntry({ key: subscriptionKey, alerts: [] })
      },
    )

    return unsubscribe
  }, [uid, deviceId, max, subscriptionKey])

  const isCurrent = entry.key === subscriptionKey
  return {
    alerts: isCurrent ? entry.alerts : EMPTY_ALERTS,
    isLoading: Boolean(subscriptionKey) && !isCurrent,
  }
}
