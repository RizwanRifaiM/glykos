import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Button from '../components/Button'
import HistoryChart from '../components/HistoryChart'
import { IconDownload, IconFileText } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'

const METRICS = [
  { key: 'pressure', label: 'Tekanan' },
  { key: 'temperature', label: 'Suhu' },
  { key: 'humidity', label: 'Kelembapan' },
]

export default function HistoryPage() {
  const { data, history, historyLoading, historyRange, setHistoryRange } = useOutletContext()
  const [visibleMetrics, setVisibleMetrics] = useState(METRICS.map((m) => m.key))
  const [sortDesc, setSortDesc] = useState(true)

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
    rows.sort((a, b) => (sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
    return rows
  }, [history, sortDesc])

  return (
    <div className="history-page">
      <section className="panel history-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Histori Tren</h2>
            <p className="panel__subtitle">
              Pola tekanan, suhu &amp; kelembapan —{' '}
              {historyRange === '7d' ? '7 hari' : '30 hari'} terakhir
            </p>
          </div>
          <div className="history-panel__controls">
            <div className="btn-group">
              <Button active={historyRange === '7d'} onClick={() => setHistoryRange('7d')}>
                7 Hari
              </Button>
              <Button active={historyRange === '30d'} onClick={() => setHistoryRange('30d')}>
                30 Hari
              </Button>
            </div>
            <div className="btn-group btn-group--metric">
              {METRICS.map(({ key, label }) => (
                <Button
                  key={key}
                  active={visibleMetrics.includes(key)}
                  onClick={() => toggleMetric(key)}
                  disabled={visibleMetrics.length === 1 && visibleMetrics.includes(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <HistoryChart history={history} metrics={visibleMetrics} />
      </section>

      <section className="panel history-table-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Tabel Data</h2>
            <p className="panel__subtitle">
              {historyLoading ? 'Memuat data…' : `${sortedHistory.length} entri`}
            </p>
          </div>
          <div className="export-panel__actions">
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
              Urutkan: {sortDesc ? 'Terbaru' : 'Terlama'}
            </Button>
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
                <th>Tekanan (kPa)</th>
                <th>Suhu (°C)</th>
                <th>Kelembapan (%RH)</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((row) => (
                <tr key={row.date}>
                  <td>{row.label}</td>
                  <td>{row.pressure}</td>
                  <td>{row.temperature}</td>
                  <td>{row.humidity}</td>
                </tr>
              ))}
              {sortedHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="data-table__empty">
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
