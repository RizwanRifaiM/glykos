import { useCallback, useEffect, useState } from 'react'
import {
  applyUpdate,
  checkForUpdate,
  hasWaitingWorker,
  subscribeToWaitingWorker,
} from '../utils/registerServiceWorker'

// Keadaan "ada versi baru yang siap dipasang".
//
// KENAPA PEMBARUAN HARUS DITAWARKAN, BUKAN DIPAKSAKAN
// Service worker versi sebelumnya memanggil skipWaiting() begitu selesai
// terpasang, sehingga rilis baru mengambil alih tab yang sedang terbuka tanpa
// pemberitahuan. Untuk aplikasi ini akibatnya konkret: halaman dashboard dimuat
// malas per rute, jadi tab lama yang sudah kehilangan chunk-nya akan gagal
// membuka menu — di tengah sesi pemantauan yang sedang berjalan, dengan sepatu
// tersambung lewat Bluetooth. Pembaruan yang memutus sambungan BLE tanpa
// diminta adalah pembaruan yang merugikan.
//
// Sekarang worker baru menunggu, dan pengguna yang memilih kapan berpindah.
export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(hasWaitingWorker)
  const [checking, setChecking] = useState(false)

  useEffect(() => subscribeToWaitingWorker(setUpdateReady), [])

  const check = useCallback(async () => {
    setChecking(true)
    try {
      return await checkForUpdate()
    } finally {
      setChecking(false)
    }
  }, [])

  return {
    updateReady,
    checking,
    checkForUpdate: check,
    // Tidak dibungkus useCallback: applyUpdate diimpor dari modul, jadi
    // acuannya sudah stabil dengan sendirinya.
    applyUpdate,
  }
}
