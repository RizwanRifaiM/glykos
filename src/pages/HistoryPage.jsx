import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Button from '../components/Button'
import HistoryChart from '../components/HistoryChart'
import HistorySummaryCards from '../components/HistorySummaryCards'
import PageHeader from '../components/PageHeader'
import { IconDownload, IconFileText, IconHistory } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'
import { getPressureLabel, getPressureStatus } from '../constants/thresholds'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'

const METRIC_KEYS = Object.keys(HISTORY_METRICS_CONFIG)

export default function HistoryPage() {
  const { data, history, historyLoading, historyRange, setHistoryRange } = useOutletContext()
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

      <HistorySummaryCards
        history={history}
        rangeLabel={historyRange === '7d' ? '7 Hari Terakhir' : '30 Hari Terakhir'}
      />

      <section className="panel history-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Tren Historis</h2>
            <p className="panel__subtitle">
              Pola tekanan, suhu &amp; kelembapan — {rangeText} terakhir
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
                <th className="data-table__num">Kelembapan (%RH)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((row) => {
                const hasEntry = row.pressure > 0 || row.temperature > 0 || row.humidity > 0
                const status = hasEntry ? getPressureStatus(row.pressure) : null
                return (
                  <tr key={row.date} className={status ? `data-table__row--${status}` : ''}>
                    <td>{row.label}</td>
                    <td className="data-table__num">{hasEntry ? row.pressure : '—'}</td>
                    <td className="data-table__num">{hasEntry ? row.temperature : '—'}</td>
                    <td className="data-table__num">{hasEntry ? row.humidity : '—'}</td>
                    <td>
                      {status ? (
                        <span className={`status-pill status-pill--${status}`}>
                          {getPressureLabel(status)}
                        </span>
                      ) : (
                        <span className="data-table__no-entry">Tidak ada log</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {sortedHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="data-table__empty">
                    <IconHistory size={22} />
                    {historyLoading ? 'Memuat…' : 'Belum ada data histori.'}
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
