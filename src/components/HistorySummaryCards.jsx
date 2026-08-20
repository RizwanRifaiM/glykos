import { msg, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import {
  getPressureStatus,
  getPressureLabelMsg,
  getTemperatureStatus,
  getHumidityStatus,
} from '../constants/thresholds'
import { formatDecimal, formatNumber } from '../utils/locale'
import { IconGauge, IconThermometer, IconDroplet } from './icons'

// Label status per metrik. Sengaja BERBEDA kata untuk keadaan `safe`
// ("Normal" untuk suhu, "Ideal" untuk kelembapan) — bedanya bermakna, jadi
// keduanya tetap dua pesan terpisah supaya penerjemah bisa mempertahankan
// perbedaan itu.
const TEMP_STATUS_LABELS = {
  safe: msg`Normal`,
  warning: msg`Perlu Perhatian`,
  danger: msg`Risiko`,
}
const HUMIDITY_STATUS_LABELS = {
  safe: msg`Ideal`,
  warning: msg`Perlu Perhatian`,
  danger: msg`Risiko Tinggi`,
}

function average(values) {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
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
  const { i18n } = useLingui()

  const pressureDays = history.filter((d) => d.pressure > 0)
  const temperatureDays = history.filter((d) => d.temperature > 0)
  const humidityDays = history.filter((d) => d.humidity > 0)

  const avgPressure = average(pressureDays.map((d) => d.pressure))
  const avgTemperature = average(temperatureDays.map((d) => d.temperature))
  const avgHumidity = average(humidityDays.map((d) => d.humidity))

  const pressureStatus = avgPressure !== null ? getPressureStatus(avgPressure) : null
  const temperatureStatus = avgTemperature !== null ? getTemperatureStatus(avgTemperature) : null
  const humidityStatus = avgHumidity !== null ? getHumidityStatus(avgHumidity) : null

  // Keterangan "Berdasarkan N dari M hari" dirakit satu tempat, bukan tiga
  // kali. Selain menghemat dua pesan terjemahan yang identik, ini juga menutup
  // kemungkinan ketiganya menyimpang bunyinya seiring waktu.
  const totalText = formatNumber(history.length)
  const basis = (days) => {
    const daysText = formatNumber(days.length)
    return t(i18n)`Berdasarkan ${daysText} dari ${totalText} hari yang tercatat`
  }

  return (
    <section className="metrics-grid">
      <SummaryCard
        icon={<IconGauge size={22} />}
        title={t(i18n)`Rata-rata Tekanan — ${rangeLabel}`}
        value={avgPressure !== null ? formatDecimal(avgPressure) : null}
        unit="kPa"
        status={pressureStatus}
        statusLabel={pressureStatus ? i18n._(getPressureLabelMsg(pressureStatus)) : ''}
        detail={basis(pressureDays)}
      />
      <SummaryCard
        icon={<IconThermometer size={22} />}
        title={t(i18n)`Rata-rata Suhu Kulit — ${rangeLabel}`}
        value={avgTemperature !== null ? formatDecimal(avgTemperature) : null}
        unit="°C"
        status={temperatureStatus}
        statusLabel={temperatureStatus ? i18n._(TEMP_STATUS_LABELS[temperatureStatus]) : ''}
        detail={basis(temperatureDays)}
      />
      <SummaryCard
        icon={<IconDroplet size={22} />}
        title={t(i18n)`Rata-rata Kelembapan — ${rangeLabel}`}
        value={avgHumidity !== null ? formatDecimal(avgHumidity) : null}
        unit="% RH"
        status={humidityStatus}
        statusLabel={humidityStatus ? i18n._(HUMIDITY_STATUS_LABELS[humidityStatus]) : ''}
        detail={basis(humidityDays)}
      />
    </section>
  )
}
