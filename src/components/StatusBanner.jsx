import { msg } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { evaluateMetrics, STATUS_RANK } from '../hooks/useAlerts'
import { describeAlert } from '../utils/alertMessages'
import { formatLastUpdate } from '../utils/formatTime'
import { IconWifi, IconWifiOff } from './icons'

const STATUS_LABELS = {
  safe: msg`Aman`,
  warning: msg`Perhatian`,
  danger: msg`Risiko`,
}

export default function StatusBanner({ data, isLive = false }) {
  const { i18n } = useLingui()

  const metrics = evaluateMetrics(data)
  const worst = metrics.reduce(
    (acc, metric) => (STATUS_RANK[metric.status] > STATUS_RANK[acc.status] ? metric : acc),
    metrics[0],
  )

  // evaluateMetrics kini hanya mengembalikan angka & status — kalimatnya
  // dirakit di sini. Sumbernya SATU dengan yang dipakai halaman Peringatan,
  // jadi spanduk dan catatan tidak bisa lagi berbeda bunyi untuk kondisi yang
  // sama. Lihat utils/alertMessages.js.
  const described = describeAlert(i18n, worst)

  // Disiapkan sebagai variabel: panggilan fungsi di dalam <Trans> ditolak rule
  // lingui/no-expression-in-message, dan placeholder bernama ({lastUpdateText})
  // lebih berarti bagi penerjemah daripada {0}.
  const lastUpdateText = formatLastUpdate(data?.connection?.lastUpdate)

  return (
    <div className={`status-banner status-banner--${worst.status}`}>
      <div className="status-banner__main">
        <span className={`status-pill status-pill--${worst.status}`}>
          {i18n._(STATUS_LABELS[worst.status])}
        </span>
        <p className="status-banner__message">{described.message}</p>
      </div>

      <div className="status-banner__meta">
        {isLive ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
        {/* "Live" dan "Offline" tetap dibungkus meski kemungkinan besar tidak
            berubah di bahasa Inggris — keputusan itu milik penerjemah, dan
            "Offline" bisa jadi "Tidak aktif" di sisi Indonesia kalau nanti
            dirasa lebih jelas. */}
        <span>{isLive ? <Trans>Live</Trans> : <Trans>Offline</Trans>}</span>
        <span className="status-banner__time">
          <Trans>Update terakhir {lastUpdateText}</Trans>
        </span>
      </div>
    </div>
  )
}
