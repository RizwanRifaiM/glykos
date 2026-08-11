import {
  getPressureLabel,
  getPressureStatus,
  getHumidityStatus,
  getTemperatureStatus,
  LOCATION_LABELS,
  TEMP_DELTA_WARNING,
} from '../constants/thresholds'
import { HISTORY_METRICS_CONFIG } from '../constants/historyMetrics'
import { IconGauge, IconThermometer, IconDroplet } from './icons'
import Sparkline from './Sparkline'

function trendValues(history, key) {
  if (!Array.isArray(history)) return []
  return history.map((row) => Number(row[key])).filter((v) => !isNaN(v))
}

function StatusPill({ status }) {
  const labels = {
    safe: 'Aman',
    warning: 'Perhatian',
    danger: 'Risiko',
  }
  return <span className={`status-pill status-pill--${status}`}>{labels[status]}</span>
}

function MetricCard({ icon, title, value, unit, status, detail, trend, children }) {
  return (
    <article className={`metric-card metric-card--${status}`}>
      <div className="metric-card__header">
        <span className="metric-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 className="metric-card__title">{title}</h3>
          <StatusPill status={status} />
        </div>
        {trend && <div className="metric-card__trend">{trend}</div>}
      </div>
      <div className="metric-card__value">
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
      {detail && <p className="metric-card__detail">{detail}</p>}
      {children}
    </article>
  )
}

export function PressureCard({ pressure, history }) {
  const pObj =
    typeof pressure === 'object' && pressure !== null
      ? pressure
      : {
          peak: Number(pressure || 0),
          location: 'metatarsal',
          points: { metatarsal: Number(pressure || 0) },
        }

  const peak = pObj.peak ?? 0
  const status = getPressureStatus(peak)
  const location = LOCATION_LABELS[pObj.location] ?? pObj.location ?? 'Metatarsal'
  const points = pObj.points || {}
  const trendValuesArr = trendValues(history, 'pressure')

  return (
    <MetricCard
      icon={<IconGauge size={22} />}
      title="Tekanan Puncak"
      value={peak}
      unit="kPa"
      status={status}
      detail={`Titik tertinggi: ${location} · ${getPressureLabel(status)}`}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.pressure.max}
          color={HISTORY_METRICS_CONFIG.pressure.color}
        />
      }
    >
      <div className="point-grid">
        {Object.entries(points).map(([key, val]) => (
          <div key={key} className="point-grid__item">
            <span>{LOCATION_LABELS[key] ?? key}</span>
            <strong>{val} kPa</strong>
          </div>
        ))}
      </div>
      <p className="metric-card__note">
        Ambang: &lt;200 kPa aman · 200–250 perhatian · &gt;250 risiko ulkus
      </p>
    </MetricCard>
  )
}

export function TemperatureCard({ temperature, history }) {
  const tObj =
    typeof temperature === 'object' && temperature !== null
      ? temperature
      : {
          highest: Number(temperature || 0),
          location: 'metatarsal',
          points: { metatarsal: Number(temperature || 0) },
          delta: 0,
        }

  const highest = tObj.highest ?? 0
  const delta = tObj.delta ?? 0
  const status = delta >= TEMP_DELTA_WARNING ? 'warning' : getTemperatureStatus(highest)
  const location = LOCATION_LABELS[tObj.location] ?? tObj.location ?? 'Metatarsal'
  const points = tObj.points || {}
  const trendValuesArr = trendValues(history, 'temperature')

  return (
    <MetricCard
      icon={<IconThermometer size={22} />}
      title="Suhu Kulit"
      value={highest}
      unit="°C"
      status={status}
      detail={`Area terpanas: ${location}`}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.temperature.max}
          color={HISTORY_METRICS_CONFIG.temperature.color}
        />
      }
    >
      <div className="point-grid">
        {Object.entries(points).map(([key, val]) => (
          <div key={key} className="point-grid__item">
            <span>{LOCATION_LABELS[key] ?? key}</span>
            <strong>{val}°C</strong>
          </div>
        ))}
      </div>
      {/* Suhu per area sudah tampil di point-grid di atas. Blok ini hanya
          untuk nilai turunannya — selisih terpanas vs terdingin antar area
          pada kaki yang sama, yang jadi prediktor pre-ulkus. */}
      <div className="temp-compare">
        <div className={delta >= TEMP_DELTA_WARNING ? 'highlight' : ''}>
          <span>Selisih suhu antar area</span>
          <strong>{delta.toFixed(1)}°C</strong>
        </div>
      </div>
      {delta >= TEMP_DELTA_WARNING && (
        <p className="metric-card__alert">
          Selisih suhu &gt;2,2°C — prediktor kuat pre-ulkus
        </p>
      )}
    </MetricCard>
  )
}

export function HumidityCard({ humidity, history, airTemperature }) {
  const rh = Number(humidity || 0)
  const status = getHumidityStatus(rh)
  const trendValuesArr = trendValues(history, 'humidity')

  return (
    <MetricCard
      icon={<IconDroplet size={22} />}
      title="Kelembapan Sepatu"
      value={rh}
      unit="% RH"
      status={status}
      detail="Kelembapan udara di dalam sepatu"
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.humidity.max}
          color={HISTORY_METRICS_CONFIG.humidity.color}
        />
      }
    >
      <div className="humidity-bar">
        <div className="humidity-bar__track">
          <div
            className="humidity-bar__fill"
            style={{ width: `${Math.min(rh, 100)}%` }}
          />
          <div className="humidity-bar__ideal" />
        </div>
        <div className="humidity-bar__labels">
          <span>0%</span>
          <span className="ideal">Ideal 40–60%</span>
          <span>100%</span>
        </div>
      </div>
      <p className="metric-card__note">
        &gt;70% RH meningkatkan risiko maserasi, jamur &amp; infeksi
      </p>
      {typeof airTemperature === 'number' && (
        <p className="metric-card__note metric-card__note--secondary">
          Suhu udara sekitar: {airTemperature}°C
        </p>
      )}
    </MetricCard>
  )
}

