import Button from './Button'
import { IconBluetooth } from './icons'

// Ditampilkan menggantikan StatusBanner selama belum pernah ada data nyata
// (Firestore live doc belum pernah ditulis, lihat isLive di useSensorData.js)
// — supaya pengguna baru tidak salah baca kartu metrik yang semuanya 0 sebagai
// "Aman", dan langsung tahu tindakan yang harus diambil.
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
        {!ble.supported ? (
          <p className="onboarding-banner__hint">
            Browser ini tidak mendukung Web Bluetooth. Buka halaman ini lewat Chrome atau Edge
            (desktop/Android) untuk bisa menyambungkan perangkat.
          </p>
        ) : (
          <Button variant="primary" onClick={ble.connect} disabled={connecting}>
            <IconBluetooth size={16} />
            {connecting ? 'Menyambungkan…' : 'Sambungkan Perangkat'}
          </Button>
        )}
        {ble.error && <p className="onboarding-banner__error">Bluetooth: {ble.error}</p>}
      </div>
    </section>
  )
}
