import {
  getPressureStatus,
  getPressureLabel,
  getTemperatureStatus,
  getHumidityStatus,
} from '../constants/thresholds'
import { IconGauge, IconThermometer, IconDroplet } from './icons'

const TEMP_STATUS_LABELS = { safe: 'Normal', warning: 'Perlu Perhatian', danger: 'Risiko' }
const HUMIDITY_STATUS_LABELS = { safe: 'Ideal', warning: 'Perlu Perhatian', danger: 'Risiko Tinggi' }

function average(values) {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function SummaryCard({ icon, title, value, unit, status, statusLabel, detail }) {
  const hasValue = value !== null

  return (
    <article className={`metric-card ${hasValue ? `metric-card--${status}` : 'metric-card--empty'}`}>
      <div className="metric-card__header">
        <span className="metric-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 className="metric-card__title">{title}</h3>
          {hasValue && <span className={`status-pill status-pill--${status}`}>{statusLabel}</span>}
        </div>
      </div>
      <div className="metric-card__value">
        <strong>{hasValue ? value : '—'}</strong>
        {hasValue && <span>{unit}</span>}
      </div>
      <p className="metric-card__detail">{detail}</p>
    </article>
  )
}

// Ringkasan rata-rata selama rentang histori yang sedang dipilih (7 hari /
// 30 hari). Hari tanpa data (nilai 0 dari useHistoryData) diabaikan supaya
// tidak menurunkan rata-rata secara artifisial.
export default function HistorySummaryCards({ history, rangeLabel }) {
  const pressureDays = history.filter((d) => d.pressure > 0)
  const temperatureDays = history.filter((d) => d.temperature > 0)
  const humidityDays = history.filter((d) => d.humidity > 0)

  const avgPressure = average(pressureDays.map((d) => d.pressure))
  const avgTemperature = average(temperatureDays.map((d) => d.temperature))
  const avgHumidity = average(humidityDays.map((d) => d.humidity))

  const pressureStatus = avgPressure !== null ? getPressureStatus(avgPressure) : null
  const temperatureStatus = avgTemperature !== null ? getTemperatureStatus(avgTemperature) : null
  const humidityStatus = avgHumidity !== null ? getHumidityStatus(avgHumidity) : null

  return (
    <section className="metrics-grid">
      <SummaryCard
        icon={<IconGauge size={22} />}
        title={`Rata-rata Tekanan — ${rangeLabel}`}
        value={avgPressure !== null ? round1(avgPressure) : null}
        unit="kPa"
        status={pressureStatus}
        statusLabel={pressureStatus ? getPressureLabel(pressureStatus) : ''}
        detail={`Berdasarkan ${pressureDays.length} dari ${history.length} hari yang tercatat`}
      />
      <SummaryCard
        icon={<IconThermometer size={22} />}
        title={`Rata-rata Suhu Kulit — ${rangeLabel}`}
        value={avgTemperature !== null ? round1(avgTemperature) : null}
        unit="°C"
        status={temperatureStatus}
        statusLabel={temperatureStatus ? TEMP_STATUS_LABELS[temperatureStatus] : ''}
        detail={`Berdasarkan ${temperatureDays.length} dari ${history.length} hari yang tercatat`}
      />
      <SummaryCard
        icon={<IconDroplet size={22} />}
        title={`Rata-rata Kelembapan — ${rangeLabel}`}
        value={avgHumidity !== null ? round1(avgHumidity) : null}
        unit="% RH"
        status={humidityStatus}
        statusLabel={humidityStatus ? HUMIDITY_STATUS_LABELS[humidityStatus] : ''}
        detail={`Berdasarkan ${humidityDays.length} dari ${history.length} hari yang tercatat`}
      />
    </section>
  )
}
