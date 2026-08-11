import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LOCATION_LABELS } from '../constants/thresholds'
import Button from '../components/Button'
import {
  IconShieldAlert,
  IconGauge,
  IconThermometer,
  IconDroplet,
  IconActivity,
} from '../components/icons'
import PageHeader from '../components/PageHeader'

const STATUS_LABELS = { warning: 'Perhatian', danger: 'Risiko' }

const METRIC_ICONS = {
  pressure: IconGauge,
  temperature: IconThermometer,
  humidity: IconDroplet,
  fatigue: IconActivity,
}

const SEVERITY_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'danger', label: 'Risiko' },
  { key: 'warning', label: 'Perhatian' },
]

function toDate(ts) {
  if (!ts) return null
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
  return isNaN(date.getTime()) ? null : date
}

function formatTimestamp(ts) {
  const date = toDate(ts)
  if (!date) return '—'
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function dayGroupLabel(date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (startOfDate.getTime() === startOfToday.getTime()) return 'Hari Ini'
  if (startOfDate.getTime() === startOfYesterday.getTime()) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AlertsPage() {
  const { alerts, alertsLoading } = useOutletContext()
  const [severityFilter, setSeverityFilter] = useState('all')

  const counts = useMemo(() => {
    let danger = 0
    let warning = 0
    alerts.forEach((alert) => {
      if (alert.status === 'danger') danger += 1
      else if (alert.status === 'warning') warning += 1
    })
    return { total: alerts.length, danger, warning }
  }, [alerts])

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'all') return alerts
    return alerts.filter((alert) => alert.status === severityFilter)
  }, [alerts, severityFilter])

  const groups = useMemo(() => {
    const map = new Map()
    filteredAlerts.forEach((alert) => {
      const date = toDate(alert.createdAt)
      const label = date ? dayGroupLabel(date) : 'Waktu tidak diketahui'
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(alert)
    })
    return [...map.entries()]
  }, [filteredAlerts])

  const lastAlertAt = alerts.length > 0 ? formatTimestamp(alerts[0].createdAt) : '—'

  return (
    <div className="alerts-page">
      <PageHeader
        title="Peringatan"
        subtitle="Dipicu saat tekanan, suhu, atau kelembapan memasuki status Perhatian/Risiko"
      />

      <section className="metrics-grid">
        <article className="metric-card metric-card--safe">
          <div className="metric-card__header">
            <span className="metric-card__icon" aria-hidden="true">
              <IconShieldAlert size={22} />
            </span>
            <div>
              <h3 className="metric-card__title">Total Peringatan</h3>
            </div>
          </div>
          <div className="metric-card__value">
            <strong>{counts.total}</strong>
            <span>entri</span>
          </div>
          <p className="metric-card__detail">Peringatan terakhir: {lastAlertAt}</p>
        </article>

        <article className="metric-card metric-card--warning">
          <div className="metric-card__header">
            <span className="metric-card__icon" aria-hidden="true">
              <IconShieldAlert size={22} />
            </span>
            <div>
              <h3 className="metric-card__title">Perlu Perhatian</h3>
            </div>
          </div>
          <div className="metric-card__value">
            <strong>{counts.warning}</strong>
            <span>entri</span>
          </div>
          <p className="metric-card__detail">Status mendekati ambang risiko</p>
        </article>

        <article className="metric-card metric-card--danger">
          <div className="metric-card__header">
            <span className="metric-card__icon" aria-hidden="true">
              <IconShieldAlert size={22} />
            </span>
            <div>
              <h3 className="metric-card__title">Risiko Terdeteksi</h3>
            </div>
          </div>
          <div className="metric-card__value">
            <strong>{counts.danger}</strong>
            <span>entri</span>
          </div>
          <p className="metric-card__detail">Melewati ambang aman — perlu tindakan</p>
        </article>
      </section>

      <section className="panel alerts-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Riwayat Peringatan</h2>
            <p className="panel__subtitle">
              {alertsLoading
                ? 'Memuat riwayat peringatan…'
                : `${filteredAlerts.length} dari ${alerts.length} entri`}
            </p>
          </div>
          <div className="btn-group" role="group" aria-label="Filter tingkat keparahan">
            {SEVERITY_FILTERS.map(({ key, label }) => (
              <Button key={key} active={severityFilter === key} onClick={() => setSeverityFilter(key)}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        {alertsLoading ? (
          <div className="loading">Memuat riwayat peringatan…</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="alerts-panel__empty">
            <IconShieldAlert size={32} />
            <p>
              {alerts.length === 0
                ? 'Belum ada peringatan tercatat. Semua parameter masih dalam batas aman.'
                : 'Tidak ada peringatan dengan filter ini.'}
            </p>
          </div>
        ) : (
          groups.map(([groupLabel, items]) => (
            <div key={groupLabel} className="alerts-group">
              <h3 className="alerts-group__label">{groupLabel}</h3>
              <ul className="alerts-list">
                {items.map((alert) => {
                  const MetricIcon = METRIC_ICONS[alert.metric] ?? IconShieldAlert
                  return (
                    <li key={alert.id} className={`alerts-list__item alerts-list__item--${alert.status}`}>
                      <span className={`alerts-list__icon alerts-list__icon--${alert.status}`} aria-hidden="true">
                        <MetricIcon size={18} />
                      </span>
                      <div className="alerts-list__body">
                        <div className="alerts-list__title-row">
                          <strong>{alert.label ?? alert.metric}</strong>
                          <span className={`status-pill status-pill--${alert.status}`}>
                            {STATUS_LABELS[alert.status] ?? alert.status}
                          </span>
                        </div>
                        <p>{alert.message}</p>
                        {alert.location && (
                          <span className="alerts-list__location">
                            Lokasi: {LOCATION_LABELS[alert.location] ?? alert.location}
                          </span>
                        )}
                      </div>
                      <time className="alerts-list__time">{formatTimestamp(alert.createdAt)}</time>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}

        <p className="alerts-panel__note">
          Catatan hanya dibuat saat dashboard sedang dibuka di browser. Untuk peringatan yang
          tetap terkirim saat aplikasi tertutup, diperlukan pemantauan sisi server (Cloud
          Function + push notification) yang belum diaktifkan pada proyek ini.
        </p>
      </section>
    </div>
  )
}
