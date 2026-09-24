// src/hooks/useRiskProfile.js
// Tingkat risiko pasien dari profil yang TERSIMPAN (users/{uid}). Aturannya
// ada di utils/riskProfile.js; hook ini hanya menyambungkannya ke Firestore.
//
// Dipasang di DashboardLayout, bukan di halaman Profil: pemakainya yang
// terpenting adalah useAlertMonitor, yang berjalan di halaman mana pun selama
// dashboard terbuka. Halaman Profil tetap berlangganan dokumen yang sama untuk
// formulirnya sendiri — SDK Firestore menyatukan kedua langganan itu jadi satu
// koneksi.
//
// Yang dinilai adalah profil TERSIMPAN, bukan isian formulir yang belum
// disimpan: mengetik angka tanpa menekan Simpan tidak boleh diam-diam
// mengubah cara peringatan bekerja.
import { useEffect, useMemo, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { profileDoc } from '../services/paths'
import { assessRiskProfile, parseLabDate } from '../utils/riskProfile'

// `dayKey` dari useDayKey: umur hasil lab dihitung terhadap tengah malam hari
// ini, jadi penilaiannya berganti sendiri saat hasil lab melewati masa
// berlakunya — tanpa Date.now() di dalam render, yang akan membuat nilainya
// berubah di setiap render.
//
// Mengembalikan `null` selama profil belum terbaca. Pemakai membedakan
// "belum tahu" dari "Standar": useAlertMonitor menunggu, supaya peringatan
// pertama sesudah halaman dibuka tidak tercatat dengan tingkat yang salah.
export function useRiskProfile(uid, dayKey) {
  const [entry, setEntry] = useState({ uid: null, profile: null })

  useEffect(() => {
    if (!uid) return

    return onSnapshot(
      profileDoc(uid),
      (snap) => setEntry({ uid, profile: snap.exists() ? snap.data() : {} }),
      (err) => {
        // Profil yang tidak terbaca dinilai sebagai profil kosong — tingkat
        // Standar, bukan menahan seluruh pemantauan.
        console.warn('Gagal membaca profil untuk tingkat risiko:', err)
        setEntry({ uid, profile: {} })
      },
    )
  }, [uid])

  const profile = entry.uid === uid ? entry.profile : null

  return useMemo(() => {
    if (!profile) return null
    const today = parseLabDate(dayKey)
    return assessRiskProfile(profile, today ? today.getTime() : undefined)
  }, [profile, dayKey])
}
