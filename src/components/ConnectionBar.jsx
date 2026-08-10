import { IconWifi, IconWifiOff } from './icons'
import { formatLastUpdate } from '../utils/formatTime'

export default function ConnectionBar({ connection }) {
  const { wifi = false, lastUpdate } = connection || {}

  return (
    <div
      className={`connection-pill ${wifi ? 'connection-pill--online' : 'connection-pill--offline'}`}
      title={wifi ? 'Terhubung ke ESP32' : 'Menampilkan data cadangan — perangkat belum terhubung'}
    >
      {wifi ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
      <span className="connection-pill__label">{wifi ? 'Live' : 'Offline'}</span>
      <span className="connection-pill__time">{formatLastUpdate(lastUpdate)}</span>
    </div>
  )
}
