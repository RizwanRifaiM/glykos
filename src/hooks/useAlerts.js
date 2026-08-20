// src/hooks/useAlerts.js
import { useEffect, useRef, useState } from 'react'
import { addDoc, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { alertsCollection } from '../services/paths'
import { notify } from '../utils/notifications'
import { decideAlert, evaluateMetrics, STATUS_RANK } from '../utils/alertRules'
import { describeAlert, metricLabel } from '../utils/alertMessages'

// Aturannya sendiri ada di utils/alertRules.js (fungsi murni, bisa diuji tanpa
// Firestore). Diekspor ulang di sini karena StatusBanner sudah mengimpornya
// lewat modul ini.
export { decideAlert, evaluateMetrics, STATUS_RANK }

// Indikasi kelelahan (useFatigueMonitor.js) bukan bagian dari `data` sensor,
// jadi dievaluasi terpisah lalu digabung ke daftar item yang sama supaya
// mengikuti jalur logAlert/notifikasi/badge yang sudah ada — tidak
// menduplikasi logikanya.
//
// Bentuknya sama dengan keluaran evaluateMetrics: metrik + status + ANGKA,
// tanpa satu pun kalimat. Kalimatnya dirakit utils/alertMessages.js saat
// dibaca — lihat alasannya di berkas itu.
function fatigueMetricItem(fatigue) {
  if (!fatigue?.sessionActive) return null

  return {
    metric: 'fatigue',
    status: fatigue.level,
    location: null,
    values: { reasons: fatigue.reasons ?? [] },
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
//
// YANG DISIMPAN HANYA DATA, BUKAN KALIMAT.
// Sebelumnya di sini tersimpan `label`, `value`, dan `message` sebagai teks
// Indonesia jadi. Konsekuensinya: begitu antarmuka berpindah ke Inggris,
// seluruh riwayat peringatan tetap berbahasa Indonesia — dan satu-satunya cara
// memperbaikinya adalah menulis ulang catatan medis yang seharusnya
// append-only. Kini `metric` + `status` + `values` (angka) yang disimpan, dan
// kalimatnya dirakit saat dibaca oleh utils/alertMessages.js.
//
// Catatan yang ditulis SEBELUM perubahan ini tetap ada dan tetap terbaca —
// describeStoredAlert() menampilkan teks tersimpannya apa adanya. Catatan lama
// sengaja tidak disentuh.
export async function logAlert(uid, deviceId, item) {
  try {
    await addDoc(alertsCollection(uid, deviceId), {
      metric: item.metric,
      status: item.status,
      location: item.location ?? null,
      values: item.values ?? {},
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
  // Notifikasi dikirim dalam bahasa yang sedang aktif. Diambil dari konteks,
  // bukan dari instance global, supaya teks notifikasi ikut bahasa yang dipilih
  // pengguna dan bukan bahasa yang kebetulan aktif saat modul dimuat.
  const { i18n } = useLingui()

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
        if (shouldNotify) {
          const described = describeAlert(i18n, item)
          notify(riskTitle(i18n, item.metric), described.message)
        }
      }

      if (entry.status !== prevEntry?.status || entry.loggedAt !== prevEntry?.loggedAt) {
        changed = true
      }
      stateRef.current[item.metric] = entry
    })

    if (changed) saveState(uid, deviceId, stateRef.current)
  }, [uid, deviceId, data, fatigue, i18n])
}

// Judul notifikasi: "Glykos — Tekanan Berisiko".
//
// Nama produk tidak diterjemahkan; yang diterjemahkan nama metrik dan kata
// keterangannya. Disatukan di sini supaya notifikasi peringatan live dan
// notifikasi tren suhu memakai pola judul yang sama.
export function riskTitle(i18n, metric) {
  const label = metricLabel(i18n, metric)
  return t(i18n)`Glykos — ${label} Berisiko`
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
