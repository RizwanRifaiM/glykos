import {
  getPressureLabel,
  getPressureStatus,
  getHumidityStatus,
  getTemperatureStatus,
  LOCATION_LABELS,
  TEMP_DELTA_WARNING,
} from '../constants/thresholds'

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

  return (
    <MetricCard
      icon=""
      title="Tekanan Puncak"
      value={peak}
      unit="kPa"
      status={status}
      detail={`Titik tertinggi: ${location} · ${getPressureLabel(status)}`}
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
  const delta = tObj.delta ?? 0
  const status = delta >= TEMP_DELTA_WARNING ? 'warning' : getTemperatureStatus(highest)
  const location = LOCATION_LABELS[tObj.location] ?? tObj.location ?? 'Metatarsal'
  const points = tObj.points || {}

  return (
    <MetricCard
      icon=""
      title="Suhu Tertinggi"
      value={highest}
      unit="°C"
      status={status}
      detail={`Area terpanas: ${location}`}
    >
      <div className="point-grid">
        {Object.entries(points).map(([key, val]) => (
          <div key={key} className="point-grid__item">
            <span>{LOCATION_LABELS[key] ?? key}</span>
            <strong>{val}°C</strong>
          </div>
        ))}
      </div>
      <div className="temp-compare">
        <div>
          <span>Kaki Kiri</span>
          <strong>{tObj.leftFoot ?? highest}°C</strong>
        </div>
        <div>
          <span>Kaki Kanan</span>
          <strong>{tObj.rightFoot ?? highest}°C</strong>
        </div>
        <div className={delta >= TEMP_DELTA_WARNING ? 'highlight' : ''}>
          <span>Selisih</span>
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

export function HumidityCard({ humidity }) {
  const rh = Number(humidity || 0)
  const status = getHumidityStatus(rh)

  return (
    <MetricCard
      icon=""
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

