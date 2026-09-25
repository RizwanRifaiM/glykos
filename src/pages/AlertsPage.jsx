import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { msg, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import Button from '../components/Button'
import {
  IconShieldAlert,
  IconGauge,
  IconThermometer,
  IconDroplet,
  IconActivity,
} from '../components/icons'
import PageHeader from '../components/PageHeader'
import { SkeletonAlertList } from '../components/Skeleton'
import { describeStoredAlert } from '../utils/alertMessages'
import { alertDate, groupAlertEvents } from '../utils/alertEvents'
import { formatDateTime, formatLongDate, formatNumber, formatTimeOfDay } from '../utils/locale'

const STATUS_LABELS = { warning: msg`Perhatian`, danger: msg`Risiko` }

const METRIC_ICONS = {
  pressure: IconGauge,
  temperature: IconThermometer,
  // Selisih suhu yang bertahan berhari-hari (useTemperatureTrendAlert.js) —
  // metrik terpisah dari `temperature` karena sumbernya rangkuman harian,
  // bukan pembacaan live.
  temperatureTrend: IconThermometer,
  humidity: IconDroplet,
  fatigue: IconActivity,
}

const SEVERITY_FILTERS = [
  { key: 'all', label: msg`Semua` },
  { key: 'danger', label: msg`Risiko` },
  { key: 'warning', label: msg`Perhatian` },
]

function formatTimestamp(ts) {
  const date = alertDate(ts)
  if (!date) return '—'
  return formatDateTime(date) ?? '—'
}

// Rentang jam satu kejadian gabungan, mis. "13.05–15.40". Kejadian dengan satu
// catatan tetap menampilkan tanggal & jam lengkap seperti sebelumnya.
function formatEventTime(event) {
  if (event.count === 1 || !event.firstAt || !event.lastAt) {
    return formatTimestamp(event.latest.createdAt)
  }
  return `${formatTimeOfDay(event.firstAt)}–${formatTimeOfDay(event.lastAt)}`
}

// Label kelompok per hari. Dikelompokkan berdasarkan KUNCI stabil ('today',
// 'yesterday', atau tanggal ISO) lalu diterjemahkan saat dirender.
//
// Sebelumnya kelompoknya di-key oleh teks label itu sendiri. Begitu label ikut
// bahasa, kunci pengelompokannya berubah setiap kali bahasa diganti — dan
// karena Map mempertahankan urutan penyisipan, seluruh daftar dibongkar-pasang
// tanpa alasan. Kunci dan tampilan sekarang dua hal terpisah.
function dayGroupKey(date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfToday.getDate() - 1)
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (startOfDate.getTime() === startOfToday.getTime()) return { kind: 'today' }
  if (startOfDate.getTime() === startOfYesterday.getTime()) return { kind: 'yesterday' }
  return { kind: 'date', time: startOfDate.getTime() }
}

function dayGroupLabel(i18n, key) {
  if (key.kind === 'today') return t(i18n)`Hari Ini`
  if (key.kind === 'yesterday') return t(i18n)`Kemarin`
  if (key.kind === 'unknown') return t(i18n)`Waktu tidak diketahui`
  return formatLongDate(new Date(key.time)) ?? t(i18n)`Waktu tidak diketahui`
}

export default function AlertsPage() {
  const { alerts, alertsLoading } = useOutletContext()
  const { i18n } = useLingui()
  const [severityFilter, setSeverityFilter] = useState('all')

  // Yang dihitung dan ditampilkan adalah KEJADIAN, bukan catatan mentah —
  // catatan yang berulang untuk kondisi yang sama pada hari yang sama
  // digabung. Lihat utils/alertEvents.js.
  const events = useMemo(() => groupAlertEvents(alerts), [alerts])

  const counts = useMemo(() => {
    let danger = 0
    let warning = 0
    events.forEach((event) => {
      if (event.status === 'danger') danger += 1
      else if (event.status === 'warning') warning += 1
    })
    return { total: events.length, danger, warning }
  }, [events])

  const filteredEvents = useMemo(() => {
    if (severityFilter === 'all') return events
    return events.filter((event) => event.status === severityFilter)
  }, [events, severityFilter])

  const groups = useMemo(() => {
    const map = new Map()
    filteredEvents.forEach((event) => {
      const key = event.lastAt ? dayGroupKey(event.lastAt) : { kind: 'unknown' }
      const id = key.kind === 'date' ? `date:${key.time}` : key.kind
      if (!map.has(id)) map.set(id, { key, items: [] })
      map.get(id).items.push(event)
    })
    return [...map.entries()]
  }, [filteredEvents])

  const lastAlertAt = alerts.length > 0 ? formatTimestamp(alerts[0].createdAt) : '—'
  const shownCount = formatNumber(filteredEvents.length)
  const totalCount = formatNumber(events.length)

  return (
    <div className="alerts-page">
      <PageHeader
        title={t(i18n)`Peringatan`}
        subtitle={t(i18n)`Dipicu saat tekanan, suhu, atau kelembapan memasuki status Perhatian/Risiko`}
      />

      <section className="metrics-grid metrics-grid--stats">
        <article className="metric-card metric-card--safe">
          <div className="metric-card__header">
            <span className="metric-card__icon" aria-hidden="true">
              <IconShieldAlert size={22} />
            </span>
            <div>
              <h3 className="metric-card__title">
                <Trans>Total Peringatan</Trans>
              </h3>
            </div>
          </div>
          <div className="metric-card__value">
            <strong>{formatNumber(counts.total)}</strong>
            <span>
              <Trans>kejadian</Trans>
            </span>
          </div>
          <p className="metric-card__detail">
            <Trans>Peringatan terakhir: {lastAlertAt}</Trans>
          </p>
        </article>

        <article className="metric-card metric-card--warning">
          <div className="metric-card__header">
            <span className="metric-card__icon" aria-hidden="true">
              <IconShieldAlert size={22} />
            </span>
            <div>
              <h3 className="metric-card__title">
                <Trans>Perlu Perhatian</Trans>
              </h3>
            </div>
          </div>
          <div className="metric-card__value">
            <strong>{formatNumber(counts.warning)}</strong>
            <span>
              <Trans>kejadian</Trans>
            </span>
          </div>
          <p className="metric-card__detail">
            <Trans>Status mendekati ambang risiko</Trans>
          </p>
        </article>

        <article className="metric-card metric-card--danger">
          <div className="metric-card__header">
            <span className="metric-card__icon" aria-hidden="true">
              <IconShieldAlert size={22} />
            </span>
            <div>
              <h3 className="metric-card__title">
                <Trans>Risiko Terdeteksi</Trans>
              </h3>
            </div>
          </div>
          <div className="metric-card__value">
            <strong>{formatNumber(counts.danger)}</strong>
            <span>
              <Trans>kejadian</Trans>
            </span>
          </div>
          <p className="metric-card__detail">
            <Trans>Melewati ambang aman — perlu tindakan</Trans>
          </p>
        </article>
      </section>

      <section className="panel alerts-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">
              <Trans>Riwayat Peringatan</Trans>
            </h2>
            <p className="panel__subtitle">
              {alertsLoading ? (
                <Trans>Memuat riwayat peringatan…</Trans>
              ) : (
                <Trans>
                  {shownCount} dari {totalCount} kejadian
                </Trans>
              )}
            </p>
          </div>
          <div className="btn-group" role="group" aria-label={t(i18n)`Filter tingkat keparahan`}>
            {SEVERITY_FILTERS.map(({ key, label }) => (
              <Button
                key={key}
                active={severityFilter === key}
                onClick={() => setSeverityFilter(key)}
              >
                {i18n._(label)}
              </Button>
            ))}
          </div>
        </div>

        {alertsLoading ? (
          <SkeletonAlertList items={4} />
        ) : filteredEvents.length === 0 ? (
          <div className="alerts-panel__empty">
            <IconShieldAlert size={32} />
            <p>
              {alerts.length === 0 ? (
                <Trans>
                  Belum ada peringatan tercatat. Semua parameter masih dalam batas aman.
                </Trans>
              ) : (
                <Trans>Tidak ada peringatan dengan filter ini.</Trans>
              )}
            </p>
          </div>
        ) : (
          groups.map(([groupId, group]) => (
            <div key={groupId} className="alerts-group">
              <h3 className="alerts-group__label">{dayGroupLabel(i18n, group.key)}</h3>
              <ul className="alerts-list">
                {group.items.map((event) => {
                  const alert = event.latest
                  const MetricIcon = METRIC_ICONS[alert.metric] ?? IconShieldAlert
                  // Catatan BARU tersimpan sebagai data terstruktur dan
                  // kalimatnya dirakit di sini, jadi ikut bahasa aktif. Catatan
                  // LAMA (sebelum perubahan itu) menyimpan kalimat Indonesia
                  // jadi dan ditampilkan apa adanya — data medis yang sudah
                  // tersimpan tidak ditulis ulang demi terjemahan. Lihat
                  // describeStoredAlert di utils/alertMessages.js.
                  const view = describeStoredAlert(i18n, alert)
                  // Variabel dulu — `view.location` di dalam <Trans> ditolak
                  // rule lingui/no-expression-in-message.
                  const areaName = view.location
                  const repeatCount = formatNumber(event.count)
                  return (
                    <li
                      key={event.id}
                      className={`alerts-list__item alerts-list__item--${alert.status}`}
                    >
                      <span
                        className={`alerts-list__icon alerts-list__icon--${alert.status}`}
                        aria-hidden="true"
                      >
                        <MetricIcon size={18} />
                      </span>
                      <div className="alerts-list__body">
                        <div className="alerts-list__title-row">
                          <strong>{view.label}</strong>
                          <span className={`status-pill status-pill--${alert.status}`}>
                            {STATUS_LABELS[alert.status]
                              ? i18n._(STATUS_LABELS[alert.status])
                              : alert.status}
                          </span>
                          {event.count > 1 && (
                            <span className="alerts-list__count">
                              <Trans>{repeatCount}× tercatat</Trans>
                            </span>
                          )}
                        </div>
                        <p>{view.message}</p>
                        {view.location && (
                          <span className="alerts-list__location">
                            <Trans>Lokasi: {areaName}</Trans>
                          </span>
                        )}
                        {/* Catatan aslinya tetap bisa dilihat satu per satu —
                            yang digabung hanya tampilannya. */}
                        {event.count > 1 && (
                          <details className="alerts-list__details">
                            <summary>
                              <Trans>Lihat {repeatCount} catatan</Trans>
                            </summary>
                            <ul>
                              {event.items.map((item) => (
                                <li key={item.id}>
                                  <time>{formatTimestamp(item.createdAt)}</time>
                                  <span>{describeStoredAlert(i18n, item).message}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                      <time className="alerts-list__time">{formatEventTime(event)}</time>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}

        <p className="alerts-panel__note">
          <Trans>
            Catatan hanya dibuat saat dashboard sedang dibuka di browser. Untuk peringatan yang
            tetap terkirim saat aplikasi tertutup, diperlukan pemantauan sisi server (Cloud
            Function + push notification) yang belum diaktifkan pada proyek ini.
          </Trans>
        </p>
      </section>
    </div>
  )
}
