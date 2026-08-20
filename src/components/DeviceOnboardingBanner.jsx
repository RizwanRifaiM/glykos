import { Trans, useLingui } from '@lingui/react/macro'
import Button, { AnchorButton } from './Button'
import { IconBluetooth, IconSparkles } from './icons'

// Keadaan kosong — kini jalur DEFAULT, bukan pengecualian.
//
// Sebelumnya pengguna tanpa data melihat data contoh tanpa penanda apa pun, dan
// layar ini hanya muncul kalau demo dimatikan manual. Itu dibalik: angka
// karangan yang tidak bisa dibedakan dari pembacaan sensor tidak punya tempat di
// aplikasi pemantauan (lihat utils/demoMode.js).
//
// Dua keadaan yang dibedakan, karena artinya memang berbeda bagi pembacanya:
//   - belum pernah punya data sama sekali -> perangkat belum pernah tersambung
//   - punya data, tapi bukan hari ini     -> hari baru, belum dipakai
// Menyebut keduanya "belum ada data dari perangkat" akan membuat pengguna yang
// kemarin memakainya mengira datanya hilang.
export default function DeviceOnboardingBanner({ ble, hadDataBefore = false }) {
  const { t } = useLingui()
  const connecting = ble.status === 'connecting'
  const bleError = ble.error

  return (
    <section className="onboarding-banner">
      <span className="onboarding-banner__icon" aria-hidden="true">
        <IconBluetooth size={26} />
      </span>
      <div className="onboarding-banner__body">
        <h2>
          {hadDataBefore ? (
            <Trans>Belum ada pembacaan hari ini</Trans>
          ) : (
            <Trans>Belum ada data dari perangkat</Trans>
          )}
        </h2>
        <p>
          {hadDataBefore ? (
            <Trans>
              Pembacaan Anda sebelumnya tetap tersimpan dan bisa dilihat di halaman Riwayat.
              Sambungkan perangkat Glykos untuk mulai memantau hari ini — tanda &ldquo;—&rdquo; di
              bawah berarti belum ada yang terukur hari ini, bukan nol.
            </Trans>
          ) : (
            <Trans>
              Sambungkan perangkat Glykos Anda lewat Bluetooth untuk mulai memantau tekanan, suhu,
              dan kelembapan kaki secara real-time. Tanda &ldquo;—&rdquo; di bawah berarti belum
              ada pembacaan, bukan hasil pengukuran.
            </Trans>
          )}
        </p>
        {!ble.supported && (
          <p className="onboarding-banner__hint">
            <Trans>
              Browser ini tidak mendukung Web Bluetooth. Buka halaman ini lewat Chrome atau Edge
              (desktop/Android) untuk bisa menyambungkan perangkat.
            </Trans>
          </p>
        )}

        {/* Jalan kembali ke data contoh. Tetap lewat ?demo=1 supaya mode-nya
            selalu terlihat di URL dan selalu disertai DemoModeBanner. */}
        <div className="onboarding-banner__actions">
          {ble.supported && (
            <Button variant="primary" onClick={ble.connect} disabled={connecting}>
              <IconBluetooth size={16} />
              {connecting ? t`Menyambungkan…` : t`Sambungkan Perangkat`}
            </Button>
          )}
          <AnchorButton variant="outline" href="?demo=1">
            <IconSparkles size={16} />
            <Trans>Lihat Contoh Tampilan</Trans>
          </AnchorButton>
        </div>
        <p className="onboarding-banner__hint">
          {/* Nama tombolnya ikut masuk ke dalam pesan sebagai teks, bukan
              ditempel dari luar: kalau tombolnya diterjemahkan tapi rujukan di
              kalimat ini tidak, keduanya berhenti cocok dan petunjuknya
              menyesatkan. */}
          <Trans>
            &ldquo;Lihat Contoh Tampilan&rdquo; mengisi dashboard dengan{' '}
            <strong>data contoh</strong> supaya Anda bisa melihat bentuk grafik &amp; kartu tanpa
            perangkat. Angkanya tidak tersimpan ke basis data.
          </Trans>
        </p>
        {bleError && (
          <p className="onboarding-banner__error">
            <Trans>Bluetooth: {bleError}</Trans>
          </p>
        )}
      </div>
    </section>
  )
}
