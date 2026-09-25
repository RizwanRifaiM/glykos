import { useCallback, useEffect, useState } from 'react'
import { dismissInstall, isInstallDismissed, isIos, isStandalone, markDisplayMode } from '../utils/pwa'

// Menangkap `beforeinstallprompt` dan menyediakan tombol pasang milik aplikasi
// sendiri.
//
// KENAPA HARUS DITANGKAP DI TINGKAT MODUL, BUKAN DI DALAM EFFECT
// Chrome memicu kejadian ini SEKALI, sangat awal — biasanya sebelum React
// selesai memasang komponen mana pun. Effect yang baru mendaftar setelah itu
// tidak pernah melihatnya, dan tombol "Pasang" tidak akan pernah muncul di
// pemuatan pertama. Pendengar di bawah dipasang saat modul dimuat (jauh lebih
// awal) dan menyimpan kejadiannya, lalu hook membacanya kapan pun ia siap.
let deferredPrompt = null
const promptListeners = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Wajib: tanpa preventDefault, Chrome menampilkan mini-infobar bawaannya
    // sendiri dan kejadiannya tidak bisa dipakai lagi belakangan.
    event.preventDefault()
    deferredPrompt = event
    promptListeners.forEach((listener) => listener())
  })

  window.addEventListener('appinstalled', () => {
    // Kejadiannya hangus setelah aplikasi terpasang. Membiarkannya tersimpan
    // berarti tombol "Pasang" tetap tampil dan tidak melakukan apa-apa saat
    // ditekan.
    deferredPrompt = null
    markDisplayMode()
    promptListeners.forEach((listener) => listener())
  })
}

export function usePwaInstall() {
  const [standalone, setStandalone] = useState(isStandalone)
  const [canPrompt, setCanPrompt] = useState(() => deferredPrompt !== null)
  const [dismissed, setDismissed] = useState(isInstallDismissed)

  useEffect(() => {
    const sync = () => {
      setCanPrompt(deferredPrompt !== null)
      setStandalone(isStandalone())
    }

    promptListeners.add(sync)

    // display-mode bisa berubah TANPA memuat ulang halaman: pengguna memasang
    // aplikasinya lalu membukanya dari ikon, dan tab yang sama berpindah ke
    // mode standalone. Tanpa pendengar ini, ajakan memasang tetap menempel di
    // layar aplikasi yang sudah terpasang.
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener('change', sync)

    sync()
    return () => {
      promptListeners.delete(sync)
      media.removeEventListener('change', sync)
    }
  }, [])

  const dismiss = useCallback(() => {
    dismissInstall()
    setDismissed(true)
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable'

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    // Kejadiannya hanya boleh dipakai SATU KALI — memanggil prompt() untuk
    // kedua kalinya melempar galat. Dibuang apa pun jawabannya; kalau pengguna
    // menolak, Chrome akan memicu kejadian barunya sendiri lain kali.
    deferredPrompt = null
    promptListeners.forEach((listener) => listener())

    if (outcome === 'dismissed') dismiss()
    return outcome
  }, [dismiss])

  // iOS tidak punya API pemasangan sama sekali (lihat utils/pwa.js), jadi
  // yang bisa ditawarkan di sana hanyalah petunjuk manual.
  const iosGuide = !standalone && isIos()

  return {
    // Sudah berjalan sebagai aplikasi terpasang.
    standalone,
    // Platformnya menyediakan dialog pemasangan dan kejadiannya sudah ditangkap.
    canPrompt: canPrompt && !standalone,
    // Butuh petunjuk manual "Bagikan → Tambahkan ke Layar Utama".
    iosGuide,
    dismissed,
    dismiss,
    promptInstall,
  }
}
