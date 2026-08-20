import { Trans, useLingui } from '@lingui/react/macro'
import { IconBluetooth, IconX } from './icons'

// Tombol koneksi Web Bluetooth di topbar. Menerima state dari useBleSensor.
export default function BleConnectButton({
  supported,
  status,
  isConnected,
  deviceName,
  onConnect,
  onDisconnect,
}) {
  const { t } = useLingui()

  if (!supported) {
    return (
      <button
        type="button"
        className="ble-button ble-button--disabled"
        disabled
        title={t`Web Bluetooth hanya didukung di Chrome/Edge lewat http://localhost atau HTTPS`}
      >
        <IconBluetooth size={16} />
        <span className="ble-button__label">
          <Trans>BLE tak didukung</Trans>
        </span>
      </button>
    )
  }

  if (isConnected) {
    // Nama perangkat disiapkan sebagai variabel supaya pesannya punya satu
    // placeholder bernama, bukan ekspresi bercabang di dalam kalimat.
    const target = deviceName || t`perangkat BLE`

    return (
      <button
        type="button"
        className="ble-button ble-button--connected"
        onClick={onDisconnect}
        title={t`Terhubung ke ${target} — klik untuk memutuskan`}
      >
        <IconBluetooth size={16} />
        <span className="ble-button__label">{deviceName || t`Terhubung`}</span>
        <IconX size={14} />
      </button>
    )
  }

  const connecting = status === 'connecting'

  return (
    <button
      type="button"
      className="ble-button"
      onClick={onConnect}
      disabled={connecting}
      title={t`Sambungkan ke perangkat Glykos via Bluetooth`}
    >
      <IconBluetooth size={16} />
      <span className="ble-button__label">
        {connecting ? t`Menyambungkan…` : t`Sambungkan BLE`}
      </span>
    </button>
  )
}
