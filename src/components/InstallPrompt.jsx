import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import Button from './Button'
import BrandMark from './BrandMark'
import { IconShare, IconSquarePlus, IconX } from './icons'

// Ajakan memasang Glykos ke layar utama.
//
// KENAPA MEMASANG BENAR-BENAR BERARTI DI SINI, bukan sekadar pemanis:
//   - Notifikasi peringatan. Di Android, notifikasi dari situs yang dibuka di
//     tab mudah tenggelam dan bisa dimatikan browser; dari aplikasi terpasang
//     ia diperlakukan seperti notifikasi aplikasi lain.
//   - Aplikasinya dipakai SAMBIL BERJALAN. Membuka tab, mencari alamatnya, lalu
//     menunggu halaman adalah tiga langkah yang tidak dilakukan orang di tengah
//     aktivitas; satu ketukan ikon adalah satu langkah.
//   - Layar penuh tanpa bilah alamat memberi ruang lebih untuk peta tekanan.
//
// Kalimat di bawah menyebut alasan itu, bukan "pasang aplikasi kami" — ajakan
// yang tidak menjelaskan untung apa pun untuk pengguna pantas diabaikan.
export default function InstallPrompt({ canPrompt, iosGuide, onInstall, onDismiss }) {
  const { t } = useLingui()
  const [showIosSteps, setShowIosSteps] = useState(false)

  return (
    <div className="pwa-card pwa-card--install">
      <span className="pwa-card__icon pwa-card__icon--brand" aria-hidden="true">
        <BrandMark size={22} />
      </span>

      <div className="pwa-card__body">
        <p className="pwa-card__title">
          <Trans>Pasang Glykos di layar utama</Trans>
        </p>
        <p className="pwa-card__text">
          <Trans>
            Terbuka sekali ketuk, tetap bisa dibuka saat tidak ada internet, dan peringatan
            suhu masuk seperti notifikasi aplikasi biasa.
          </Trans>
        </p>

        {showIosSteps && (
          <ol className="pwa-ios-steps">
            <li>
              <span className="pwa-ios-steps__icon" aria-hidden="true">
                <IconShare size={16} />
              </span>
              <Trans>Ketuk tombol Bagikan di bilah bawah Safari.</Trans>
            </li>
            <li>
              <span className="pwa-ios-steps__icon" aria-hidden="true">
                <IconSquarePlus size={16} />
              </span>
              <Trans>Pilih Tambahkan ke Layar Utama, lalu ketuk Tambah.</Trans>
            </li>
          </ol>
        )}
      </div>

      <div className="pwa-card__actions">
        {canPrompt ? (
          <Button variant="primary" onClick={onInstall}>
            <Trans>Pasang</Trans>
          </Button>
        ) : (
          iosGuide && (
            // Di iOS tidak ada dialog yang bisa dibuka dari halaman, jadi
            // tombolnya membuka petunjuk — bukan menjanjikan pemasangan yang
            // tidak bisa dijalankannya.
            <Button variant="primary" onClick={() => setShowIosSteps((open) => !open)}>
              {showIosSteps ? t`Sembunyikan Cara` : t`Lihat Caranya`}
            </Button>
          )
        )}
      </div>

      <button
        type="button"
        className="pwa-card__close"
        onClick={onDismiss}
        aria-label={t`Tutup ajakan memasang aplikasi`}
      >
        <IconX size={16} />
      </button>
    </div>
  )
}
