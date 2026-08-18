import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Button from '../components/Button'
import HistoryChart from '../components/HistoryChart'
import HistorySummaryCards from '../components/HistorySummaryCards'
import PageHeader from '../components/PageHeader'
import TemperatureTrendBanner from '../components/TemperatureTrendBanner'
import { SkeletonTableRows } from '../components/Skeleton'
import { IconDownload, IconFileText, IconHistory } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'
import { getPressureLabel, getPressureStatus, TEMP_DELTA_WARNING } from '../constants/thresholds'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'
import { toDateKey } from '../utils/formatTime'

const METRIC_KEYS = Object.keys(HISTORY_METRICS_CONFIG)

const ALERT_RANK = { warning: 1, danger: 2 }

// Merangkum peringatan yang tercatat menjadi "tingkat terparah per tanggal",
// dipakai kolom Peringatan pada tabel. Kuncinya memakai tanggal LOKAL supaya
// cocok dengan `date` tiap baris riwayat.
function buildAlertsByDate(alerts) {
  const byDate = {}
  alerts.forEach((alert) => {
    const raw = alert.createdAt
    const date =
      raw && typeof raw.toDate === 'function' ? raw.toDate() : raw ? new Date(raw) : null
    const key = date ? toDateKey(date) : null
    if (!key) return

    const rank = ALERT_RANK[alert.status] ?? 0
    if (rank === 0) return

    const current = byDate[key]
    if (!current) {
      byDate[key] = { level: alert.status, count: 1 }
      return
    }
    current.count += 1
    if (rank > (ALERT_RANK[current.level] ?? 0)) current.level = alert.status
  })
  return byDate
}

export default function HistoryPage() {
  const { data, history, historyLoading, historyRange, setHistoryRange, alerts, temperatureTrend } =
    useOutletContext()
  const [visibleMetrics, setVisibleMetrics] = useState(METRIC_KEYS)
  const [sortDesc, setSortDesc] = useState(true)
  const rangeText = historyRange === '7d' ? '7 hari' : '30 hari'

  function toggleMetric(key) {
    setVisibleMetrics((prev) => {
      if (prev.includes(key)) {
        if (prev.length > 1) return prev.filter((k) => k !== key)
        return prev
      }
      return [...prev, key]
    })
  }

  const alertsByDate = useMemo(() => buildAlertsByDate(alerts ?? []), [alerts])

  const sortedHistory = useMemo(() => {
    const rows = [...history]
    rows.sort((a, b) => {
      if (sortDesc) return (b.timestamp || 0) - (a.timestamp || 0)
      return (a.timestamp || 0) - (b.timestamp || 0)
    })
    return rows
  }, [history, sortDesc])

  return (
    <div className="history-page">
      <PageHeader
        title="Riwayat"
        subtitle="Data historis tekanan, suhu & kelembapan insole"
        actions={
          <div className="btn-group" role="group" aria-label="Rentang waktu">
            <Button active={historyRange === '7d'} onClick={() => setHistoryRange('7d')}>
              7 Hari
            </Button>
            <Button active={historyRange === '30d'} onClick={() => setHistoryRange('30d')}>
              30 Hari
            </Button>
          </div>
        }
      />

      <TemperatureTrendBanner trend={temperatureTrend} />

      <HistorySummaryCards
        history={history}
        rangeLabel={historyRange === '7d' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
      />

      <section className="panel history-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Tren Historis</h2>
            <p className="panel__subtitle">
              Pola tekanan, suhu, selisih suhu &amp; kelembapan — {rangeText} terakhir
            </p>
          </div>
          <div className="metric-toggle-group" role="group" aria-label="Tampilkan metrik">
            {METRIC_KEYS.map((key) => {
              const config = HISTORY_METRICS_CONFIG[key]
              const active = visibleMetrics.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={`metric-toggle ${active ? 'metric-toggle--active' : ''}`}
                  onClick={() => toggleMetric(key)}
                  disabled={visibleMetrics.length === 1 && active}
                  aria-pressed={active}
                >
                  <span className="metric-toggle__dot" style={{ background: config.color }} aria-hidden="true" />
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>
        <HistoryChart history={history} metrics={visibleMetrics} />
      </section>

      <section className="panel history-table-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Tabel Data</h2>
            <p className="panel__subtitle">
              {historyLoading ? 'Memuat data…' : `${sortedHistory.length} entri dalam ${rangeText} terakhir`}
            </p>
          </div>
          <div className="export-panel__actions">
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
              Urutkan: {sortDesc ? 'Terbaru' : 'Terlama'}
            </Button>
            <span className="action-divider" aria-hidden="true" />
            <Button variant="outline" onClick={() => exportToCsv(data, history)}>
              <IconFileText size={16} />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => exportToPdf(data, history)}>
              <IconDownload size={16} />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th className="data-table__num">Tekanan (kPa)</th>
                <th className="data-table__num">Suhu (°C)</th>
                {/* Selisih suhu antar-area — prediktor pre-ulkus, lihat
                    utils/temperatureTrend.js. Sudah lama ikut tersimpan di
                    rangkuman harian tapi belum pernah ditampilkan. */}
                <th className="data-table__num">Selisih (°C)</th>
                <th className="data-table__num">Kelembapan (%RH)</th>
                <th className="data-table__num">Langkah</th>
                <th>Status</th>
                <th>Peringatan</th>
              </tr>
            </thead>
            <tbody aria-busy={historyLoading || undefined}>
              {/* Selama memuat, tabelnya diisi kerangka — BUKAN baris data.
                  useHistoryData selalu mengembalikan satu baris per hari dalam
                  rentang (berisi nol selama data belum tiba), jadi tanpa cabang
                  ini pengguna melihat tabel penuh berisi "—" yang terbaca
                  seperti "tidak ada data" padahal datanya masih dalam
                  perjalanan. */}
              {historyLoading && <SkeletonTableRows rows={sortedHistory.length || 7} columns={8} />}
              {!historyLoading && sortedHistory.map((row) => {
                const hasEntry = row.pressure > 0 || row.temperature > 0 || row.humidity > 0
                const status = hasEntry ? getPressureStatus(row.pressure) : null
                const alert = alertsByDate[row.date]
                return (
                  <tr key={row.date} className={status ? `data-table__row--${status}` : ''}>
                    <td>{row.label}</td>
                    <td className="data-table__num">{hasEntry ? row.pressure : '—'}</td>
                    <td className="data-table__num">{hasEntry ? row.temperature : '—'}</td>
                    <td className="data-table__num">
                      {hasEntry && row.temperatureDelta > 0 ? (
                        <span
                          className={
                            row.temperatureDelta >= TEMP_DELTA_WARNING
                              ? 'data-table__flag'
                              : undefined
                          }
                        >
                          {row.temperatureDelta.toFixed(1)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="data-table__num">{hasEntry ? row.humidity : '—'}</td>
                    <td className="data-table__num">
                      {row.steps > 0 ? row.steps.toLocaleString('id-ID') : '—'}
                    </td>
                    <td>
                      {status ? (
                        <span className={`status-pill status-pill--${status}`}>
                          {getPressureLabel(status)}
                        </span>
                      ) : (
                        <span className="data-table__no-entry">Tidak ada log</span>
                      )}
                    </td>
                    <td>
                      {alert ? (
                        <span className={`status-pill status-pill--${alert.level}`}>
                          {alert.count} peringatan
                        </span>
                      ) : (
                        <span className="data-table__no-entry">
                          {hasEntry ? 'Tidak ada' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!historyLoading && sortedHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="data-table__empty">
                    <IconHistory size={22} />
                    Belum ada data histori.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
