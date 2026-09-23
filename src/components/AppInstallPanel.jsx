import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import Button from './Button'
import { IconAppWindow, IconArrowDownCircle, IconCheck, IconRefreshCw, IconShare, IconSquarePlus } from './icons'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { usePwaUpdate } from '../hooks/usePwaUpdate'

// Panel "Aplikasi" di halaman Profil.
//
// KENAPA ADA, padahal PwaLayer sudah menampilkan ajakan yang sama:
// spanduk melayang bisa ditutup, dan penutupannya berlaku dua minggu. Tanpa
// tempat tetap, pengguna yang menutupnya lalu berubah pikiran — atau yang ingin
// memastikan aplikasinya sudah versi terbaru — tidak punya jalan sama sekali.
// Ajakan bersifat sementara; pengaturan harus permanen.
export default function AppInstallPanel() {
  const { t } = useLingui()
  const install = usePwaInstall()
  const { updateReady, checking, checkForUpdate, applyUpdate } = usePwaUpdate()
  const [checkedResult, setCheckedResult] = useState(null)

  const handleCheck = async () => {
    const found = await checkForUpdate()
    // Hasilnya dinyatakan meski TIDAK ada pembaruan. Tombol yang ditekan lalu
    // tidak menghasilkan apa-apa di layar terbaca sebagai tombol rusak, bukan
    // sebagai "sudah versi terbaru".
    setCheckedResult(found ? 'found' : 'latest')
  }

  return (
    <section className="panel profile-panel">
      <h2 className="panel__title">
        <Trans>Aplikasi</Trans>
      </h2>
      <p className="panel__subtitle">
        <Trans>
          Pasang Glykos ke layar utama supaya bisa dibuka sekali ketuk, tetap terbuka saat tidak
          ada internet, dan menerima peringatan seperti notifikasi aplikasi biasa.
        </Trans>
      </p>

      <div className="app-install">
        <div className="app-install__status">
          <span className="app-install__icon" aria-hidden="true">
            {install.standalone ? <IconCheck size={18} /> : <IconAppWindow size={18} />}
          </span>
          <p>
            {install.standalone ? (
              <Trans>Terpasang — sedang berjalan sebagai aplikasi.</Trans>
            ) : (
              <Trans>Belum terpasang — sedang berjalan di dalam browser.</Trans>
            )}
          </p>
        </div>

        {!install.standalone && install.canPrompt && (
          <div className="profile-form__actions">
            <Button variant="primary" onClick={install.promptInstall}>
              <IconAppWindow size={16} />
              <Trans>Pasang Aplikasi</Trans>
            </Button>
          </div>
        )}

        {/* iOS tidak punya dialog pemasangan yang bisa dipanggil dari halaman
            (lihat utils/pwa.js), jadi langkahnya ditulis apa adanya. */}
        {!install.standalone && install.iosGuide && (
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

        {!install.standalone && !install.canPrompt && !install.iosGuide && (
          <p className="app-install__note">
            <Trans>
              Browser ini belum menawarkan pemasangan. Buka Glykos di Chrome atau Edge pada
              Android, atau Safari pada iPhone, untuk memasangnya ke layar utama.
            </Trans>
          </p>
        )}

        <div className="app-install__update">
          {updateReady ? (
            <>
              <p className="app-install__note">
                <Trans>Versi baru sudah diunduh dan siap dipasang.</Trans>
              </p>
              <div className="profile-form__actions">
                <Button variant="primary" onClick={applyUpdate}>
                  <IconArrowDownCircle size={16} />
                  <Trans>Muat Ulang ke Versi Baru</Trans>
                </Button>
              </div>
            </>
          ) : (
            <div className="profile-form__actions">
              <Button variant="outline" onClick={handleCheck} disabled={checking}>
                <IconRefreshCw size={16} />
                {checking ? t`Memeriksa…` : t`Periksa Pembaruan`}
              </Button>
              {checkedResult === 'latest' && (
                <span className="profile-form__saved">
                  <Trans>Sudah versi terbaru.</Trans>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
