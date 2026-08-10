import { COLORS } from '../constants/theme'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'

function buildPath(values, width, height, max) {
  if (values.length === 0) return ''
  const stepX = width / (values.length - 1 || 1)

  return values
    .map((val, i) => {
      const x = i * stepX
      const y = height - (val / max) * (height - 8) - 4
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

export default function HistoryChart({
  history,
  metrics = ['pressure', 'temperature', 'humidity'],
}) {
  const width = 600
  const height = 160
  const visibleMetrics = metrics.filter((key) => HISTORY_METRICS_CONFIG[key])

  return (
    <div className="history-chart">
      {visibleMetrics.length > 0 && (
        <div className="history-chart__legend" aria-hidden="true">
          {visibleMetrics.map((key) => {
            const config = HISTORY_METRICS_CONFIG[key]
            return (
              <span key={key} className="history-chart__legend-item">
                <span
                  className="history-chart__legend-dot"
                  style={{ background: config.color }}
                />
                {config.label}
              </span>
            )
          })}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="history-chart__svg"
        role="img"
        aria-label={`Grafik histori: ${visibleMetrics.map((k) => HISTORY_METRICS_CONFIG[k].label).join(', ')}`}
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            y1={height * ratio}
            x2={width}
            y2={height * ratio}
            stroke={`${COLORS.lightBlue}66`}
            strokeDasharray="4 4"
          />
        ))}

        {visibleMetrics.map((key) => {
          const config = HISTORY_METRICS_CONFIG[key]
          const values = history.map((d) => (typeof d[key] === 'number' && !Number.isNaN(d[key]) ? d[key] : 0))
          const path = buildPath(values, width, height, config.max)
          const stepX = width / (values.length - 1 || 1)

          return (
            <g key={key}>
              <path
                d={path}
                fill="none"
                stroke={config.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {values.map((val, i) => {
                if (!Number.isFinite(val)) return null
                const x = i * stepX
                const y = height - (val / config.max) * (height - 8) - 4
                return (
                  <circle
                    key={`${key}-${history[i].date}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill={config.color}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>

      <div className="history-chart__labels">
        {history
          .filter(
            (_, i) =>
              i === 0 ||
              i === history.length - 1 ||
              i % Math.ceil(history.length / 6) === 0,
          )
          .map((d) => (
            <span key={d.date}>{d.label}</span>
          ))}
      </div>
    </div>
  )
}
