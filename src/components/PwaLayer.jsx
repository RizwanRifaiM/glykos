import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Trans } from '@lingui/react/macro'
import InstallPrompt from './InstallPrompt'
import PwaUpdateBanner from './PwaUpdateBanner'
import { IconWifiOff } from './icons'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { usePwaUpdate } from '../hooks/usePwaUpdate'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

// Ajakan memasang baru muncul setelah jeda ini.
//
// Menampilkannya pada detik pertama adalah pola yang membuat orang menutupnya
// tanpa membaca — dan penutupan itu berlaku dua minggu (lihat utils/pwa.js),
// jadi ajakan yang muncul terlalu cepat justru MENGURANGI peluang aplikasinya
// dipasang. Jeda ini memberi waktu halamannya selesai dimuat dan dilihat lebih
// dulu.
const INSTALL_DELAY_MS = 8000

// Satu tempat untuk seluruh pemberitahuan tingkat-aplikasi milik PWA: status
// jaringan, pembaruan yang menunggu, dan ajakan memasang.
//
// Disatukan karena ketiganya berebut sudut layar yang sama. Sebagai komponen
// terpisah yang masing-masing memasang dirinya sendiri, dua di antaranya bisa
// muncul bertumpuk dan menutupi bagian bawah dashboard — persis tempat navigasi
// bawah berada di ponsel.
export default function PwaLayer() {
  const online = useOnlineStatus()
  const { updateReady, applyUpdate } = usePwaUpdate()
  const install = usePwaInstall()
  const { pathname } = useLocation()
  const [installDelayPassed, setInstallDelayPassed] = useState(false)

  // Ajakan memasang HANYA di dalam dashboard.
  //
  // Halaman depan dilihat orang yang belum tentu punya perangkatnya; mengajak
  // mereka memasang aplikasi pemantauan sebelum ada yang bisa dipantau adalah
  // gangguan. Yang sudah masuk ke dashboard sudah punya akun — di sana ajakan
  // itu punya arti.
  const onDashboard = pathname.startsWith('/dashboard')

  useEffect(() => {
    if (!onDashboard) return undefined
    const timer = window.setTimeout(() => setInstallDelayPassed(true), INSTALL_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [onDashboard])

  const showInstall =
    onDashboard &&
    installDelayPassed &&
    !install.standalone &&
    !install.dismissed &&
    (install.canPrompt || install.iosGuide) &&
    // Pembaruan lebih mendesak daripada pemasangan, dan dua kartu sekaligus di
    // sudut yang sama tidak terbaca sebagai satu pun.
    !updateReady

  if (online && !updateReady && !showInstall) return null

  return (
    <div className="pwa-layer">
      {!online && (
        <div className="pwa-card pwa-card--offline" role="status">
          <span className="pwa-card__icon" aria-hidden="true">
            <IconWifiOff size={20} />
          </span>
          <div className="pwa-card__body">
            <p className="pwa-card__title">
              <Trans>Tidak ada internet</Trans>
            </p>
            {/* Dinyatakan terbuka bahwa Bluetooth TIDAK ikut terputus. Tanpa
                kalimat ini, "offline" mudah dibaca sebagai "sepatu tidak
                terpantau lagi" — padahal justru bagian itu yang masih jalan. */}
            <p className="pwa-card__text">
              <Trans>
                Data terakhir tetap ditampilkan dan sepatu tetap terbaca lewat Bluetooth.
                Penyimpanan ke server dilanjutkan otomatis saat koneksi kembali.
              </Trans>
            </p>
          </div>
        </div>
      )}

      {updateReady && <PwaUpdateBanner onApply={applyUpdate} />}

      {showInstall && (
        <InstallPrompt
          canPrompt={install.canPrompt}
          iosGuide={install.iosGuide}
          onInstall={install.promptInstall}
          onDismiss={install.dismiss}
        />
      )}
    </div>
  )
}
