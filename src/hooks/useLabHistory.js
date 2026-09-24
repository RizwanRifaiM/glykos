// src/hooks/useLabHistory.js
// Riwayat hasil lab (users/{uid}/labs) — ditampilkan di halaman Riwayat.
// Bentuk & pengolahannya di utils/labResults.js.
import { useEffect, useState } from 'react'
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { labsCollection } from '../services/paths'

const EMPTY_LABS = []

// 100 catatan: pemeriksaan HbA1c tiap 3 bulan dan LDL tiap tahun berarti
// puluhan tahun riwayat. Batasnya ada hanya supaya satu akun yang rusak tidak
// menarik ribuan dokumen ke browser.
export function useLabHistory(uid, max = 100) {
  const subscriptionKey = uid ? `${uid}:${max}` : null
  // Hasil disimpan bersama kunci langganannya — pola yang sama dengan
  // useAlerts.js, supaya pergantian akun tidak sempat menampilkan riwayat
  // akun sebelumnya.
  const [entry, setEntry] = useState({ key: null, labs: [] })

  useEffect(() => {
    if (!subscriptionKey) return

    const q = query(labsCollection(uid), orderBy('testedAt', 'desc'), limit(max))
    return onSnapshot(
      q,
      (snapshot) => {
        setEntry({
          key: subscriptionKey,
          labs: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        })
      },
      (err) => {
        console.warn('Gagal membaca riwayat hasil lab:', err)
        setEntry({ key: subscriptionKey, labs: [] })
      },
    )
  }, [uid, max, subscriptionKey])

  const isCurrent = entry.key === subscriptionKey
  return {
    labs: isCurrent ? entry.labs : EMPTY_LABS,
    isLoading: Boolean(subscriptionKey) && !isCurrent,
  }
}
