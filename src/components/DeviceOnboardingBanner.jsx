import Button, { AnchorButton } from './Button'
import { IconBluetooth, IconSparkles } from './icons'

// Keadaan kosong yang sebenarnya: belum pernah ada data nyata DAN data contoh
// dimatikan lewat ?demo=0. Secara default pengguna tanpa data melihat data
// contoh, bukan layar ini — lihat utils/demoMode.js.
//
// Layar ini tetap ada karena angka nol yang jujur kadang justru yang
// dibutuhkan, dan supaya pengguna punya jalan keluar dari data contoh.
export default function DeviceOnboardingBanner({ ble }) {
  const connecting = ble.status === 'connecting'

  return (
    <section className="onboarding-banner">
      <span className="onboarding-banner__icon" aria-hidden="true">
        <IconBluetooth size={26} />
      </span>
      <div className="onboarding-banner__body">
        <h2>Belum ada data dari perangkat</h2>
        <p>
          Sambungkan Smart Insole Anda lewat Bluetooth untuk mulai memantau tekanan, suhu, dan
          kelembapan kaki secara real-time. Angka 0 di bawah ini bukan hasil pembacaan sensor —
          hanya belum ada data yang tercatat.
        </p>
        {!ble.supported && (
          <p className="onboarding-banner__hint">
            Browser ini tidak mendukung Web Bluetooth. Buka halaman ini lewat Chrome atau Edge
            (desktop/Android) untuk bisa menyambungkan perangkat.
          </p>
        )}

        {/* Jalan kembali ke data contoh. Tetap lewat ?demo=1 supaya mode-nya
            selalu terlihat di URL dan selalu disertai DemoModeBanner. */}
        <div className="onboarding-banner__actions">
          {ble.supported && (
            <Button variant="primary" onClick={ble.connect} disabled={connecting}>
              <IconBluetooth size={16} />
              {connecting ? 'Menyambungkan…' : 'Sambungkan Perangkat'}
            </Button>
          )}
          <AnchorButton variant="outline" href="?demo=1">
            <IconSparkles size={16} />
            Lihat Contoh Tampilan
          </AnchorButton>
        </div>
        <p className="onboarding-banner__hint">
          &ldquo;Lihat Contoh Tampilan&rdquo; mengisi dashboard dengan <strong>data contoh</strong>{' '}
          supaya Anda bisa melihat bentuk grafik &amp; kartu tanpa perangkat. Angkanya tidak
          tersimpan ke basis data.
        </p>
        {ble.error && <p className="onboarding-banner__error">Bluetooth: {ble.error}</p>}
      </div>
    </section>
  )
}
