import Button from './Button'
import { IconBluetooth, IconClock } from './icons'
import { formatLastUpdate, formatRelativeTime } from '../utils/formatTime'

// Ditampilkan saat dokumen live ADA tapi sudah kedaluwarsa (lihat
// STALE_AFTER_MS di useSensorData.js).
//
// Keadaan ini dulu tidak ada: `isLive` cuma berarti "dokumennya ada", jadi
// sesudah satu sesi BLE pernah terjadi dashboard selamanya mengaku real-time
// sambil menampilkan angka lama. Angkanya tetap ditampilkan — itu pembacaan
// sungguhan, hanya bukan pembacaan SEKARANG — dan bedanya dinyatakan terbuka.
export default function StaleDataBanner({ ble, updatedAtMs }) {
  const connecting = ble?.status === 'connecting'

  return (
    <section className="onboarding-banner onboarding-banner--stale">
      <span className="onboarding-banner__icon" aria-hidden="true">
        <IconClock size={26} />
      </span>
      <div className="onboarding-banner__body">
        <h2>Data tidak diperbarui</h2>
        <p>
          Perangkat sedang tidak mengirim data. Angka di bawah adalah pembacaan terakhir yang
          tersimpan{' '}
          <strong>
            {formatRelativeTime(updatedAtMs)}
            {updatedAtMs ? ` (${formatLastUpdate(new Date(updatedAtMs))})` : ''}
          </strong>
          , bukan kondisi kaki Anda saat ini.
        </p>
        {ble?.supported && (
          <div className="onboarding-banner__actions">
            <Button variant="primary" onClick={ble.connect} disabled={connecting}>
              <IconBluetooth size={16} />
              {connecting ? 'Menyambungkan…' : 'Sambungkan Ulang'}
            </Button>
          </div>
        )}
        {ble?.error && <p className="onboarding-banner__error">Bluetooth: {ble.error}</p>}
      </div>
    </section>
  )
}
