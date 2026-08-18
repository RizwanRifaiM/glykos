// src/hooks/useWakeLock.js
// Menahan layar tetap menyala selama perangkat BLE tersambung.
//
// KENAPA PERLU: firmware ESP32 tidak punya WiFi, jadi browser inilah SATU-
// SATUNYA jalur datanya (lihat README). Begitu layar HP mati, halamannya
// dibekukan: notifikasi BLE berhenti diproses, useFirestoreSync tidak lagi
// menulis tiap 60 detik, dan hitungan langkah berhenti. Akibatnya pemakaian
// seharian meninggalkan riwayat yang bolong — tanpa apa pun yang memberi tahu
// pengguna bahwa datanya hilang.
//
// Wake lock dilepas otomatis saat sesi berakhir, jadi layar tidak menyala
// lebih lama dari yang dibutuhkan.
import { useEffect, useRef, useState } from 'react'

// Kemampuan browser tidak pernah berubah selama halaman hidup, jadi ini
// dihitung sekali di tingkat modul — bukan disimpan sebagai state yang harus
// ditulis dari dalam effect.
const SUPPORTED = typeof navigator !== 'undefined' && 'wakeLock' in navigator

export function useWakeLock(active) {
  // Hanya diisi dari lanjutan async & event listener — tidak pernah dari badan
  // effect secara sinkron. Keadaan 'unsupported' dan 'idle saat tidak aktif'
  // sengaja DITURUNKAN di bawah, bukan disimpan.
  const [outcome, setOutcome] = useState('idle')
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!SUPPORTED || !active) return

    let cancelled = false

    async function acquire() {
      // Sudah pegang satu yang masih hidup — jangan minta dobel.
      if (sentinelRef.current && !sentinelRef.current.released) return

      try {
        const sentinel = await navigator.wakeLock.request('screen')

        // Sesi sudah berakhir selagi permintaan berjalan.
        if (cancelled) {
          sentinel.release().catch(() => undefined)
          return
        }

        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          if (!cancelled) setOutcome('idle')
        })
        setOutcome('active')
      } catch {
        // Ditolak browser, baterai lemah, atau tab tidak terlihat. Bukan
        // kondisi fatal — pemantauan tetap jalan selama layar menyala.
        if (!cancelled) setOutcome('error')
      }
    }

    acquire()

    // Browser SELALU melepas wake lock begitu tab tersembunyi, dan tidak
    // mengembalikannya sendiri. Tanpa pemasangan ulang di sini, satu kali
    // berpindah aplikasi sudah cukup membuat penahan layar hilang diam-diam
    // untuk sisa sesi.
    function handleVisibility() {
      if (document.visibilityState === 'visible') acquire()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      sentinelRef.current?.release().catch(() => undefined)
      sentinelRef.current = null
      // Supaya sesi berikutnya tidak mewarisi 'error' dari sesi sebelumnya.
      setOutcome('idle')
    }
  }, [active])

  if (!SUPPORTED) return 'unsupported'
  if (!active) return 'idle'
  return outcome
}
