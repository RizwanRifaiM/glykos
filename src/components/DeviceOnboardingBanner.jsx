import { Trans, useLingui } from '@lingui/react/macro'
import Button, { AnchorButton } from './Button'
import { IconBluetooth, IconSparkles } from './icons'

// Keadaan kosong yang sebenarnya: belum pernah ada data nyata DAN data contoh
// dimatikan lewat ?demo=0. Secara default pengguna tanpa data melihat data
// contoh, bukan layar ini — lihat utils/demoMode.js.
//
// Layar ini tetap ada karena angka nol yang jujur kadang justru yang
// dibutuhkan, dan supaya pengguna punya jalan keluar dari data contoh.
export default function DeviceOnboardingBanner({ ble }) {
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
          <Trans>Belum ada data dari perangkat</Trans>
        </h2>
        <p>
          <Trans>
            Sambungkan perangkat Glykos Anda lewat Bluetooth untuk mulai memantau tekanan, suhu,
            dan kelembapan kaki secara real-time. Angka 0 di bawah ini bukan hasil pembacaan
            sensor — hanya belum ada data yang tercatat.
          </Trans>
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
