// src/hooks/useConnectionLostAlert.js
// Notifikasi di HP saat sepatu Glykos PUTUS SENDIRI dari Bluetooth.
//
// KENAPA PERLU: firmware tidak punya WiFi, jadi begitu BLE putus (sepatu di
// luar jangkauan, baterai habis, Bluetooth HP dimatikan) seluruh pemantauan
// berhenti — tidak ada pembacaan, tidak ada peringatan tekanan/suhu. Tanpa
// notifikasi ini, pengguna yang HP-nya di saku mengira kakinya masih dipantau,
// padahal peringatan berikutnya tidak akan pernah datang.
//
// Sengaja TIDAK dicatat ke koleksi `alerts`: ini keadaan perangkat, bukan
// temuan pada kaki, dan halaman Peringatan/Riwayat membaca koleksi itu sebagai
// catatan klinis.
//
// DUA PENAHAN supaya tidak menjadi notifikasi yang terlalu sering:
//   1. Masa tenggang. BLE sering putus sesaat lalu tersambung lagi (sinyal
//      terhalang tubuh, HP berpindah saku). Notifikasi baru dikirim kalau
//      sepatu MASIH terputus setelah CONNECTION_LOST_GRACE_MS.
//   2. Jeda sendiri. Sepatu yang putus-sambung berulang kali hanya memberi
//      tahu sekali per CONNECTION_LOST_COOLDOWN_MS. Di atas itu, notifikasinya
//      tetap tunduk pada jeda global di utils/notifications.js.
import { useEffect, useRef } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { notify } from '../utils/notifications'

export const CONNECTION_LOST_GRACE_MS = 2 * 60 * 1000
export const CONNECTION_LOST_COOLDOWN_MS = 60 * 60 * 1000

export function useConnectionLostAlert(lostAt, enabled) {
  const { i18n } = useLingui()
  // Kejadian putus yang sudah diberitahukan, dan kapan. `i18n` ikut dependensi
  // effect, jadi tanpa penjaga ini mengganti bahasa setelah sepatu putus akan
  // membunyikan HP sekali lagi untuk kejadian yang sama.
  const notifiedRef = useRef({ lostAt: null, at: 0 })

  useEffect(() => {
    if (!enabled || !lostAt || notifiedRef.current.lostAt === lostAt) return

    // `lostAt` kembali null begitu tersambung ulang, dan effect ini dibersihkan
    // — jadi timer di bawah hanya menembak kalau putusnya benar-benar bertahan.
    const delay = Math.max(0, lostAt + CONNECTION_LOST_GRACE_MS - Date.now())
    const timer = setTimeout(() => {
      const now = Date.now()
      const lastAt = notifiedRef.current.at
      // Kejadian ini dianggap sudah ditangani, terkirim atau tidak.
      notifiedRef.current = { lostAt, at: lastAt }
      if (now - lastAt < CONNECTION_LOST_COOLDOWN_MS) return
      notifiedRef.current = { lostAt, at: now }

      notify(
        t(i18n)`Glykos — Sepatu Terputus`,
        t(i18n)`Pemantauan kaki berhenti. Buka Glykos dan sambungkan ulang sepatu supaya peringatan tetap sampai.`,
        // Tag sendiri: tidak boleh menimpa peringatan tekanan/suhu yang belum
        // dibaca. Prioritas setara "perlu perhatian", bukan "berisiko".
        { tag: 'glykos-connection', url: '/dashboard', priority: 1 },
      )
    }, delay)

    return () => clearTimeout(timer)
  }, [lostAt, enabled, i18n])
}
