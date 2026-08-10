import { evaluateMetrics, STATUS_RANK } from '../hooks/useAlerts'
import { formatLastUpdate } from '../utils/formatTime'
import { IconWifi, IconWifiOff } from './icons'

const STATUS_LABELS = {
  safe: 'Aman',
  warning: 'Perhatian',
  danger: 'Risiko',
}

export default function StatusBanner({ data, isLive = false }) {
  const metrics = evaluateMetrics(data)
  const worst = metrics.reduce(
    (acc, metric) => (STATUS_RANK[metric.status] > STATUS_RANK[acc.status] ? metric : acc),
    metrics[0],
  )

  const lastUpdate = data?.connection?.lastUpdate

  return (
    <div className={`status-banner status-banner--${worst.status}`}>
      <div className="status-banner__main">
        <span className={`status-pill status-pill--${worst.status}`}>
          {STATUS_LABELS[worst.status]}
        </span>
        <p className="status-banner__message">{worst.message}</p>
      </div>

      <div className="status-banner__meta">
        {isLive ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
        <span>{isLive ? 'Live' : 'Offline'}</span>
        <span className="status-banner__time">
          Update terakhir {formatLastUpdate(lastUpdate)}
        </span>
      </div>
    </div>
  )
}
