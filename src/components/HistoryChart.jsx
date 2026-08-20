import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { useId, useRef, useState } from 'react'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'
import { formatDecimal } from '../utils/locale'

const WIDTH = 320
const HEIGHT = 176
const PAD = { top: 14, right: 14, bottom: 22, left: 34 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

function xFor(index, count) {
  if (count <= 1) return PAD.left
  return PAD.left + (index / (count - 1)) * PLOT_W
}

function yFor(value, max) {
  const clamped = Math.min(Math.max(value, 0), max)
  return PAD.top + PLOT_H - (clamped / max) * PLOT_H
}

function linePath(values, max) {
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i, values.length)} ${yFor(v, max)}`)
    .join(' ')
}

function areaPath(values, max) {
  if (values.length === 0) return ''
  const top = linePath(values, max)
  const baseline = yFor(0, max)
  const lastX = xFor(values.length - 1, values.length)
  const firstX = xFor(0, values.length)
  // Perintah path SVG, bukan teks.
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return `${top} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`
}

function nearestIndex(values, clientX, svgEl) {
  const rect = svgEl.getBoundingClientRect()
  const relX = ((clientX - rect.left) / rect.width) * WIDTH
  let best = 0
  let bestDist = Infinity
  values.forEach((_, i) => {
    const dist = Math.abs(xFor(i, values.length) - relX)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  return best
}

function MetricChart({ metricKey, config, history }) {
  const gradientId = useId()
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const values = history.map((d) =>
    typeof d[metricKey] === 'number' && !Number.isNaN(d[metricKey]) ? d[metricKey] : 0,
  )
  const hasData = values.some((v) => v > 0)
  const { i18n } = useLingui()
  // `config.label` berupa deskriptor pesan (lihat constants/historyMetrics.js),
  // jadi diselesaikan di sini. `unit` tidak diterjemahkan — kPa/°C/% adalah
  // simbol SI yang sama di kedua bahasa.
  const { max, color, unit } = config
  const label = i18n._(config.label)
  const ticks = [0, max / 2, max]

  const lastIndex = values.length - 1
  const activeIndex = hoverIndex ?? lastIndex
  const activeValue = values[activeIndex]
  const activePoint = history[activeIndex]

  const xLabelStep = Math.max(1, Math.ceil(history.length / 5))
  const xLabels = history.filter(
    (_, i) => i === 0 || i === history.length - 1 || i % xLabelStep === 0,
  )

  // Disiapkan sebagai variabel: indeks array di dalam pesan ditolak rule
  // lingui/no-expression-in-message, dan penerjemah butuh nama placeholder yang
  // punya arti.
  const lastValue = formatDecimal(values[lastIndex])
  const chartLabel = t(i18n)`Grafik ${label} — nilai terakhir ${lastValue} ${unit}`

  function handlePointerMove(e) {
    if (!svgRef.current || values.length === 0) return
    setHoverIndex(nearestIndex(values, e.clientX, svgRef.current))
  }

  return (
    <article className={`history-chart-card history-chart-card--${metricKey}`}>
      <header className="history-chart-card__header">
        <span className="history-chart-card__key" style={{ background: color }} aria-hidden="true" />
        <div className="history-chart-card__title-group">
          <h3 className="history-chart-card__title">{label}</h3>
          <span className="history-chart-card__unit">{unit}</span>
        </div>
        {hasData && (
          <div className="history-chart-card__readout">
            <strong>{formatDecimal(activeValue)}</strong>
            <span>{unit}</span>
          </div>
        )}
      </header>

      {hasData ? (
        <div className="history-chart-card__plot">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="history-chart-card__svg"
            role="img"
            aria-label={chartLabel}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Dinamai `tick`, bukan `t`: nama `t` di sini akan MENUTUPI macro
                `t` yang diimpor di kepala berkas. Saat ini pemakaian macro-nya
                berada di luar cakupan ini sehingga tidak bentrok, tapi
                penamaan yang menutupi macro terjemahan adalah jebakan yang
                hanya perlu satu kali pemindahan kode untuk meledak. */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={yFor(tick, max)}
                  y2={yFor(tick, max)}
                  className="history-chart-card__gridline"
                />
                <text
                  x={PAD.left - 8}
                  y={yFor(tick, max)}
                  className="history-chart-card__tick"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {formatDecimal(Math.round(tick), 0)}
                </text>
              </g>
            ))}

            <path d={areaPath(values, max)} fill={`url(#${gradientId})`} stroke="none" />
            <path
              d={linePath(values, max)}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex, values.length)}
                x2={xFor(hoverIndex, values.length)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                className="history-chart-card__crosshair"
              />
            )}

            <circle
              cx={xFor(activeIndex, values.length)}
              cy={yFor(activeValue, max)}
              r="4"
              fill={color}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </svg>

          {hoverIndex !== null && (
            <div
              className="history-chart-card__tooltip"
              style={{ left: `${Math.min(88, Math.max(12, (xFor(hoverIndex, values.length) / WIDTH) * 100))}%` }}
            >
              <span className="history-chart-card__tooltip-date">{activePoint.label}</span>
              <span className="history-chart-card__tooltip-value">
                {formatDecimal(activeValue)} {unit}
              </span>
            </div>
          )}

          <div className="history-chart-card__x-labels">
            {xLabels.map((d) => (
              <span key={d.date}>{d.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <p className="history-chart-card__empty">
          <Trans>Belum ada data pada rentang ini.</Trans>
        </p>
      )}
    </article>
  )
}

export default function HistoryChart({ history, metrics = ['pressure', 'temperature', 'humidity'] }) {
  const visibleMetrics = metrics.filter((key) => HISTORY_METRICS_CONFIG[key])

  return (
    <div className="history-chart-grid">
      {visibleMetrics.map((key) => (
        <MetricChart key={key} metricKey={key} config={HISTORY_METRICS_CONFIG[key]} history={history} />
      ))}
    </div>
  )
}
