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
  if (!supported) {
    return (
      <button
        type="button"
        className="ble-button ble-button--disabled"
        disabled
        title="Web Bluetooth hanya didukung di Chrome/Edge lewat http://localhost atau HTTPS"
      >
        <IconBluetooth size={16} />
        <span className="ble-button__label">BLE tak didukung</span>
      </button>
    )
  }

  if (isConnected) {
    return (
      <button
        type="button"
        className="ble-button ble-button--connected"
        onClick={onDisconnect}
        title={`Terhubung ke ${deviceName || 'perangkat BLE'} — klik untuk memutuskan`}
      >
        <IconBluetooth size={16} />
        <span className="ble-button__label">{deviceName || 'Terhubung'}</span>
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
      title="Sambungkan ke perangkat Glykos via Bluetooth"
    >
      <IconBluetooth size={16} />
      <span className="ble-button__label">
        {connecting ? 'Menyambungkan…' : 'Sambungkan BLE'}
      </span>
    </button>
  )
}
