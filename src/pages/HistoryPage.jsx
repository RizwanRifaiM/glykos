import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import Button from '../components/Button'
import HistoryChart from '../components/HistoryChart'
import HistorySummaryCards from '../components/HistorySummaryCards'
import PageHeader from '../components/PageHeader'
import TemperatureTrendBanner from '../components/TemperatureTrendBanner'
import { SkeletonTableRows } from '../components/Skeleton'
import { IconDownload, IconFileText, IconHistory } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'
import { getPressureLabelMsg, getPressureStatus, TEMP_DELTA_WARNING } from '../constants/thresholds'
import { riseLevel } from '../utils/temperatureRise'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'
import { toDateKey } from '../utils/formatTime'
import { formatDecimal, formatNumber } from '../utils/locale'

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

// Isi kolom "Titik naik".
//
// Rangkuman harian mencatat kenaikan TERPUSAT terbesar hari itu beserta pola
// pada saat itu (lihat utils/dailyRollup.js). Kalau tidak ada kenaikan terpusat
// sama sekali, kolomnya menyatakan "seragam" — bukan dikosongkan, karena
// "naik merata" adalah temuan yang berarti, bukan ketiadaan data.
function RiseCell({ row, hasEntry }) {
  const { i18n } = useLingui()

  if (!hasEntry) return '—'

  const rise = Number(row.temperatureRise) || 0
  const risen = Number(row.temperatureRisenAreas) || 0
  const areas = Number(row.temperatureAreaCount) || 0

  if (rise <= 0 || risen <= 0 || areas <= 0) {
    return <span className="data-table__no-entry">{t(i18n)`seragam`}</span>
  }

  const level = riseLevel(rise)
  const risenText = formatNumber(risen)
  const areaText = formatNumber(areas)

  return (
    <span className={`status-pill status-pill--${level}`}>
      {t(i18n)`${risenText} dari ${areaText} titik`}
    </span>
  )
}

const riseCell = (row, hasEntry) => <RiseCell row={row} hasEntry={hasEntry} />

export default function HistoryPage() {
  const { data, history, historyLoading, historyRange, setHistoryRange, alerts, temperatureTrend } =
    useOutletContext()
  const { i18n } = useLingui()
  const [visibleMetrics, setVisibleMetrics] = useState(METRIC_KEYS)
  const [sortDesc, setSortDesc] = useState(true)

  // Rentangnya dipakai sebagai ANGKA lalu dirakit lewat `plural`, bukan dua
  // kalimat berisi "7 hari"/"30 hari". Bahasa Indonesia tidak membedakan
  // bentuknya, tapi sisi Inggris butuh "1 day" vs "7 days" — dan angka yang
  // tertanam di dalam teks membuat bentuk itu tidak mungkin dibuat penerjemah.
  const rangeDays = historyRange === '7d' ? 7 : 30
  const rangeText = plural(rangeDays, { one: '# hari', other: '# hari' })
  const rangeLabel = plural(rangeDays, { one: '# Hari Terakhir', other: '# Hari Terakhir' })

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

  const sortLabel = sortDesc ? t(i18n)`Terbaru` : t(i18n)`Terlama`
  const entryCount = formatNumber(sortedHistory.length)

  return (
    <div className="history-page">
      <PageHeader
        title={t(i18n)`Riwayat`}
        subtitle={t(i18n)`Data historis tekanan, suhu & kelembapan sepatu`}
        actions={
          <div className="btn-group" role="group" aria-label={t(i18n)`Rentang waktu`}>
            <Button active={historyRange === '7d'} onClick={() => setHistoryRange('7d')}>
              <Trans>7 Hari</Trans>
            </Button>
            <Button active={historyRange === '30d'} onClick={() => setHistoryRange('30d')}>
              <Trans>30 Hari</Trans>
            </Button>
          </div>
        }
      />

      <TemperatureTrendBanner trend={temperatureTrend} />

      <HistorySummaryCards history={history} rangeLabel={rangeLabel} />

      <section className="panel history-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">
              <Trans>Tren Historis</Trans>
            </h2>
            <p className="panel__subtitle">
              <Trans>
                Pola tekanan, suhu, selisih suhu &amp; kelembapan — {rangeText} terakhir
              </Trans>
            </p>
          </div>
          <div className="metric-toggle-group" role="group" aria-label={t(i18n)`Tampilkan metrik`}>
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
                  <span
                    className="metric-toggle__dot"
                    style={{ background: config.color }}
                    aria-hidden="true"
                  />
                  {i18n._(config.label)}
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
            <h2 className="panel__title">
              <Trans>Tabel Data</Trans>
            </h2>
            <p className="panel__subtitle">
              {historyLoading ? (
                <Trans>Memuat data…</Trans>
              ) : (
                <Trans>
                  {entryCount} entri dalam {rangeText} terakhir
                </Trans>
              )}
            </p>
          </div>
          <div className="export-panel__actions">
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)}>
              {/* Kata kuncinya disiapkan lebih dulu supaya seluruh label jadi
                  SATU pesan. Kalau "Urutkan:" dan nilainya dipisah, penerjemah
                  tidak bisa mengubah tanda baca maupun urutannya. */}
              <Trans>Urutkan: {sortLabel}</Trans>
            </Button>
            <span className="action-divider" aria-hidden="true" />
            {/* Laporan yang diekspor ikut bahasa antarmuka — i18n dioper ke
                exportToCsv/exportToPdf, lihat utils/exportData.js. */}
            <Button variant="outline" onClick={() => exportToCsv(i18n, data, history)}>
              <IconFileText size={16} />
              <Trans>Export CSV</Trans>
            </Button>
            <Button variant="secondary" onClick={() => exportToPdf(i18n, data, history)}>
              <IconDownload size={16} />
              <Trans>Export PDF</Trans>
            </Button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <Trans>Tanggal</Trans>
                </th>
                <th className="data-table__num">
                  <Trans>Tekanan (kPa)</Trans>
                </th>
                <th className="data-table__num">
                  <Trans>Suhu (°C)</Trans>
                </th>
                {/* Selisih suhu antar-area — prediktor pre-ulkus, lihat
                    utils/temperatureTrend.js. Sudah lama ikut tersimpan di
                    rangkuman harian tapi belum pernah ditampilkan. */}
                <th className="data-table__num">
                  <Trans>Selisih (°C)</Trans>
                </th>
                {/* Berapa titik yang naik menentukan ARTI kenaikannya: naik di
                    semua titik itu pola menyeluruh (ruangan panas, aktivitas),
                    naik di satu titik itu pola peradangan setempat. Angka
                    kenaikan tanpa keterangan ini tidak bisa dibedakan
                    keduanya — lihat utils/temperatureRise.js. */}
                <th>
                  <Trans>Titik naik</Trans>
                </th>
                <th className="data-table__num">
                  <Trans>Kelembapan (%RH)</Trans>
                </th>
                <th className="data-table__num">
                  <Trans>Langkah</Trans>
                </th>
                <th>
                  <Trans>Status</Trans>
                </th>
                <th>
                  <Trans>Peringatan</Trans>
                </th>
              </tr>
            </thead>
            <tbody aria-busy={historyLoading || undefined}>
              {/* Selama memuat, tabelnya diisi kerangka — BUKAN baris data.
                  useHistoryData selalu mengembalikan satu baris per hari dalam
                  rentang (berisi nol selama data belum tiba), jadi tanpa cabang
                  ini pengguna melihat tabel penuh berisi "—" yang terbaca
                  seperti "tidak ada data" padahal datanya masih dalam
                  perjalanan. */}
              {historyLoading && <SkeletonTableRows rows={sortedHistory.length || 7} columns={9} />}
              {!historyLoading &&
                sortedHistory.map((row) => {
                  const hasEntry = row.pressure > 0 || row.temperature > 0 || row.humidity > 0
                  const status = hasEntry ? getPressureStatus(row.pressure) : null
                  const alert = alertsByDate[row.date]
                  return (
                    <tr key={row.date} className={status ? `data-table__row--${status}` : ''}>
                      <td>{row.label}</td>
                      <td className="data-table__num">
                        {hasEntry ? formatDecimal(row.pressure) : '—'}
                      </td>
                      <td className="data-table__num">
                        {hasEntry ? formatDecimal(row.temperature) : '—'}
                      </td>
                      <td className="data-table__num">
                        {hasEntry && row.temperatureDelta > 0 ? (
                          <span
                            className={
                              row.temperatureDelta >= TEMP_DELTA_WARNING
                                ? 'data-table__flag'
                                : undefined
                            }
                          >
                            {formatDecimal(row.temperatureDelta)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {riseCell(row, hasEntry)}
                      </td>
                      <td className="data-table__num">
                        {hasEntry ? formatDecimal(row.humidity) : '—'}
                      </td>
                      <td className="data-table__num">
                        {row.steps > 0 ? formatNumber(row.steps) : '—'}
                      </td>
                      <td>
                        {status ? (
                          <span className={`status-pill status-pill--${status}`}>
                            {i18n._(getPressureLabelMsg(status))}
                          </span>
                        ) : (
                          <span className="data-table__no-entry">
                            <Trans>Tidak ada log</Trans>
                          </span>
                        )}
                      </td>
                      <td>
                        {alert ? (
                          <span className={`status-pill status-pill--${alert.level}`}>
                            {plural(alert.count, { one: '# peringatan', other: '# peringatan' })}
                          </span>
                        ) : (
                          <span className="data-table__no-entry">
                            {hasEntry ? <Trans>Tidak ada</Trans> : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              {!historyLoading && sortedHistory.length === 0 && (
                <tr>
                  <td colSpan={9} className="data-table__empty">
                    <IconHistory size={22} />
                    <Trans>Belum ada data histori.</Trans>
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
