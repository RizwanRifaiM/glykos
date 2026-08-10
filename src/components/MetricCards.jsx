import {
  getPressureLabel,
  getPressureStatus,
  getHumidityStatus,
  getTemperatureStatus,
  LOCATION_LABELS,
} from '../constants/thresholds'
import { IconGauge, IconThermometer, IconDroplet } from './icons'

function StatusPill({ status }) {
  const labels = {
    safe: 'Aman',
    warning: 'Perhatian',
    danger: 'Risiko',
  }
  return <span className={`status-pill status-pill--${status}`}>{labels[status]}</span>
}

function MetricCard({ icon, title, value, unit, status, detail, children }) {
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

export function PressureCard({ pressure }) {
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
  const pressurePoints = [
    { key: 'heel', value: points.heel ?? 0 },
    { key: 'metatarsal', value: points.metatarsal ?? 0 },
    { key: 'toe', value: points.toe ?? 0 },
  ]

  return (
    <MetricCard
      icon={<IconGauge size={22} />}
      title="Tekanan Puncak"
      value={peak}
      unit="kPa"
      status={status}
      detail={`Titik tertinggi: ${location} · ${getPressureLabel(status)}`}
    >
      <div className="point-grid">
        {pressurePoints.map(({ key, value }) => (
          <div key={key} className="point-grid__item">
            <span>{LOCATION_LABELS[key] ?? key}</span>
            <strong>{value} kPa</strong>
          </div>
        ))}
      </div>
      <p className="metric-card__note">
        Ambang: &lt;200 kPa aman · 200–250 perhatian · &gt;250 risiko ulkus
      </p>
    </MetricCard>
  )
}

export function TemperatureCard({ temperature }) {
  const tObj =
    typeof temperature === 'object' && temperature !== null
      ? temperature
      : {
          highest: Number(temperature || 0),
          location: 'metatarsal',
          points: { metatarsal: Number(temperature || 0) },
          leftFoot: Number(temperature || 0),
          rightFoot: Number(temperature || 0),
          delta: 0,
        }

  const highest = tObj.highest ?? 0
  const status = getTemperatureStatus(highest)
  const location = LOCATION_LABELS[tObj.location] ?? tObj.location ?? 'Metatarsal'
  const points = tObj.points || {}
  const temperaturePoints = [
    {
      key: 'heel',
      label: 'Tumit',
      value: points.Tumit ?? points.heel ?? tObj.rightFoot ?? highest,
    },
    {
      key: 'metatarsal',
      label: 'Metatarsal',
      value: points.metatarsal ?? highest,
    },
    {
      key: 'toe',
      label: 'Jari Kaki',
      value: points.toe ?? points.Forefoot ?? tObj.leftFoot ?? highest,
    },
  ]

  return (
    <MetricCard
      icon={<IconThermometer size={22} />}
      title="Suhu Tertinggi"
      value={highest}
      unit="°C"
      status={status}
      detail={`Area terpanas: ${location}`}
    >
      <div className="point-grid">
        {temperaturePoints.map(({ key, label, value }) => (
          <div key={key} className="point-grid__item">
            <span>{label}</span>
            <strong>{value}°C</strong>
          </div>
        ))}
      </div>
    </MetricCard>
  )
}

export function HumidityCard({ humidity }) {
  const rh = Number(humidity || 0)
  const status = getHumidityStatus(rh)

  return (
    <MetricCard
      icon={<IconDroplet size={22} />}
      title="Kelembapan Sepatu"
      value={rh}
      unit="% RH"
      status={status}
      detail="Sensor SHT30 / AHT20"
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
    </MetricCard>
  )
}

