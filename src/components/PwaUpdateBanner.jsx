import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import Button from './Button'
import { IconArrowDownCircle, IconX } from './icons'

// Tawaran memasang versi baru. Muncul hanya kalau service worker baru sudah
// SELESAI diunduh dan sedang menunggu — jadi menekannya tidak menunggu jaringan
// dan tetap bekerja meski koneksinya sudah putus setelah itu.
//
// Bisa ditutup, dan penutupannya hanya berlaku untuk sesi ini: pembaruan yang
// tersedia tetap tersedia, dan panel di halaman Profil selalu menyediakan
// jalannya. Yang tidak boleh terjadi adalah spanduk yang tidak bisa
// disingkirkan menutupi angka pembacaan sensor.
export default function PwaUpdateBanner({ onApply }) {
  const { t } = useLingui()
  const [hidden, setHidden] = useState(false)
  const [applying, setApplying] = useState(false)

  if (hidden) return null

  const handleApply = () => {
    // Halaman akan memuat ulang sendiri begitu worker baru mengambil alih
    // (lihat controllerchange di utils/registerServiceWorker.js). Jeda di
    // antaranya bisa terasa satu-dua detik, jadi tombolnya dikunci — dua kali
    // tekan tidak mempercepat apa pun dan hanya membuatnya terlihat rusak.
    setApplying(true)
    onApply()
  }

  return (
    <div className="pwa-card pwa-card--update" role="status">
      <span className="pwa-card__icon" aria-hidden="true">
        <IconArrowDownCircle size={22} />
      </span>

      <div className="pwa-card__body">
        <p className="pwa-card__title">
          <Trans>Versi baru Glykos siap</Trans>
        </p>
        <p className="pwa-card__text">
          <Trans>
            Pembaruan sudah diunduh dan akan aktif setelah aplikasi dimuat ulang. Sambungan
            Bluetooth ke sepatu akan terputus sebentar.
          </Trans>
        </p>
      </div>

      <div className="pwa-card__actions">
        <Button variant="primary" onClick={handleApply} disabled={applying}>
          {applying ? t`Memuat ulang…` : t`Muat Ulang`}
        </Button>
      </div>

      <button
        type="button"
        className="pwa-card__close"
        onClick={() => setHidden(true)}
        aria-label={t`Tutup pemberitahuan pembaruan`}
      >
        <IconX size={16} />
      </button>
    </div>
  )
}
