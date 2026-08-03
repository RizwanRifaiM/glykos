import { IconWifi, IconWifiOff } from './icons'

function formatLastUpdate(timestamp) {
  if (!timestamp) return '--:--:--'

  try {
    let date
    if (timestamp instanceof Date) {
      date = timestamp
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    } else if (typeof timestamp === 'number') {
      date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp)
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      return '--:--:--'
    }

    if (isNaN(date.getTime())) return '--:--:--'

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '--:--:--'
  }
}

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
