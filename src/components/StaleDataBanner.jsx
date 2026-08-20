import { Trans, useLingui } from '@lingui/react/macro'
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
  const { t } = useLingui()
  const connecting = ble?.status === 'connecting'
  // Variabel dulu: ekspresi anggota (`ble.error`) di dalam pesan ditolak rule
  // lingui/no-expression-in-message — penerjemah hanya melihat placeholder,
  // jadi namanya harus punya arti sendiri.
  const bleError = ble?.error

  // Dua bagian waktu disatukan jadi satu variabel sebelum masuk ke <Trans>:
  // "5 menit lalu (14:32:07)". Kalau dibiarkan sebagai dua ekspresi terpisah di
  // dalam kalimat, penerjemah tidak bisa mengubah tanda kurungnya maupun
  // urutannya — dan sebagian bahasa memang menaruh jam sebelum keterangan
  // relatifnya.
  const relative = formatRelativeTime(updatedAtMs)
  const lastSeen = updatedAtMs ? `${relative} (${formatLastUpdate(new Date(updatedAtMs))})` : relative

  return (
    <section className="onboarding-banner onboarding-banner--stale">
      <span className="onboarding-banner__icon" aria-hidden="true">
        <IconClock size={26} />
      </span>
      <div className="onboarding-banner__body">
        <h2>
          <Trans>Data tidak diperbarui</Trans>
        </h2>
        <p>
          <Trans>
            Perangkat sedang tidak mengirim data. Angka di bawah adalah pembacaan terakhir yang
            tersimpan <strong>{lastSeen}</strong>, bukan kondisi kaki Anda saat ini.
          </Trans>
        </p>
        {ble?.supported && (
          <div className="onboarding-banner__actions">
            <Button variant="primary" onClick={ble.connect} disabled={connecting}>
              <IconBluetooth size={16} />
              {connecting ? t`Menyambungkan…` : t`Sambungkan Ulang`}
            </Button>
          </div>
        )}
        {ble?.error && (
          <p className="onboarding-banner__error">
            <Trans>Bluetooth: {bleError}</Trans>
          </p>
        )}
      </div>
    </section>
  )
}
