import { useOutletContext } from 'react-router-dom'
import { LOCATION_LABELS } from '../constants/thresholds'
import { IconShieldAlert } from '../components/icons'

const STATUS_LABELS = { warning: 'Perhatian', danger: 'Risiko' }

function formatTimestamp(ts) {
  if (!ts) return '—'
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AlertsPage() {
  const { alerts, alertsLoading } = useOutletContext()

  return (
    <section className="panel alerts-panel">
      <h2 className="panel__title">Riwayat Peringatan</h2>
      <p className="panel__subtitle">
        Catatan otomatis setiap kali tekanan, suhu, atau kelembapan memasuki status Perhatian/Risiko
      </p>

      {alertsLoading ? (
        <div className="loading">Memuat riwayat peringatan…</div>
      ) : alerts.length === 0 ? (
        <div className="alerts-panel__empty">
          <IconShieldAlert size={32} />
          <p>Belum ada peringatan tercatat. Semua parameter masih dalam batas aman.</p>
        </div>
      ) : (
        <ul className="alerts-list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alerts-list__item alerts-list__item--${alert.status}`}>
              <span className={`status-pill status-pill--${alert.status}`}>
                {STATUS_LABELS[alert.status] ?? alert.status}
              </span>
              <div className="alerts-list__body">
                <strong>{alert.label ?? alert.metric}</strong>
                <p>{alert.message}</p>
                {alert.location && (
                  <span className="alerts-list__location">
                    Lokasi: {LOCATION_LABELS[alert.location] ?? alert.location}
                  </span>
                )}
              </div>
              <time className="alerts-list__time">{formatTimestamp(alert.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}

      <p className="alerts-panel__note">
        Catatan hanya dibuat saat dashboard sedang dibuka di browser. Untuk peringatan yang
        tetap terkirim saat aplikasi tertutup, diperlukan pemantauan sisi server (Cloud
        Function + push notification) yang belum diaktifkan pada proyek ini.
      </p>
    </section>
  )
}
