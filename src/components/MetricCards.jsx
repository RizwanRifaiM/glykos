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

// `empty` = belum ada pembacaan sensor sama sekali. Tanpa ini, nilai 0 masuk ke
// getXStatus() dan kartunya memvonis status untuk sesuatu yang tidak pernah
// diukur — kartu Suhu menampilkan "Aman" dan kartu Kelembapan "Perhatian"
// padahal perangkat belum pernah tersambung. Polanya mengikuti
// HistorySummaryCards.jsx yang sudah memakai .metric-card--empty.
//
// `lead` = kartu ini memegang metrik terpenting di halaman dan mendapat
// bobot visual lebih besar (kolom lebih lebar, angka lebih besar). Yang
// memutuskan kartu mana adalah halamannya, bukan kartunya sendiri —
// prioritas itu milik konteks halaman, bukan milik satu metrik.
function MetricCard({
  icon,
  title,
  value,
  unit,
  status,
  detail,
  trend,
  empty = false,
  lead = false,
  children,
}) {
  const classes = [
    'metric-card',
    empty ? 'metric-card--empty' : `metric-card--${status}`,
    lead ? 'metric-card--lead' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classes}>
      <div className="metric-card__header">
        <span className="metric-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h3 className="metric-card__title">{title}</h3>
          {empty ? (
            <span className="metric-card__detail">Belum ada data</span>
          ) : (
            <StatusPill status={status} />
          )}
        </div>
        {trend && <div className="metric-card__trend">{trend}</div>}
      </div>
      <div className="metric-card__value">
        <strong>{empty ? '—' : value}</strong>
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
      icon={<IconGauge size={20} />}
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

export function TemperatureCard({ temperature, history, lead = false }) {
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
  // Tidak ada satu pun NTC yang mengirim. Suhu kulit 0 °C mustahil pada kaki
  // hidup, jadi diperlakukan sebagai "belum ada data", bukan pembacaan.
  const isEmpty = Object.keys(points).length === 0 || highest <= 0

  return (
    <MetricCard
      icon={<IconThermometer size={20} />}
      title="Suhu Kulit"
      value={highest}
      unit="°C"
      status={status}
      empty={isEmpty}
      lead={lead}
      detail={isEmpty ? undefined : `Area terpanas: ${location}`}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.temperature.max}
          color={HISTORY_METRICS_CONFIG.temperature.color}
        />
      }
    >
      {isEmpty ? (
        <p className="metric-card__note">
          Belum ada pembacaan dari sensor NTC. Sambungkan perangkat lewat Bluetooth untuk
          melihat suhu per area (Metatarsal, Tumit, Lateral).
        </p>
      ) : (
        <>
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
              pada kaki yang sama, yang jadi prediktor pre-ulkus. Butuh minimal
              DUA area; dengan satu titik saja selisihnya tidak punya arti. */}
          {Object.keys(points).length >= 2 && (
            <div className="temp-compare">
              <div className={delta >= TEMP_DELTA_WARNING ? 'highlight' : ''}>
                <span>Selisih suhu antar area</span>
                <strong>{delta.toFixed(1)}°C</strong>
              </div>
            </div>
          )}
        </>
      )}
      {!isEmpty && delta >= TEMP_DELTA_WARNING && (
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
  // getHumidityStatus(0) jatuh ke cabang terakhir dan mengembalikan 'warning',
  // sehingga kartu ini memvonis "Perhatian" untuk sensor yang belum pernah
  // mengirim apa pun. 0% RH mustahil di dalam sepatu — perlakukan sebagai
  // belum ada data. (RH memang key opsional: firmware tidak mengirimnya kalau
  // sensor kelembapan tidak terdeteksi.)
  const isEmpty = !(rh > 0)

  return (
    <MetricCard
      icon={<IconDroplet size={20} />}
      title="Kelembapan Sepatu"
      value={rh}
      unit="% RH"
      status={status}
      empty={isEmpty}
      detail={isEmpty ? undefined : 'Kelembapan udara di dalam sepatu'}
      trend={
        <Sparkline
          values={trendValuesArr}
          max={HISTORY_METRICS_CONFIG.humidity.max}
          color={HISTORY_METRICS_CONFIG.humidity.color}
        />
      }
    >
      {isEmpty ? (
        <p className="metric-card__note">
          Sensor kelembapan belum mengirim data. Sambungkan perangkat lewat Bluetooth.
        </p>
      ) : (
        <>
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
        </>
      )}
      {typeof airTemperature === 'number' && (
        <p className="metric-card__note metric-card__note--secondary">
          Suhu udara sekitar: {airTemperature}°C
        </p>
      )}
    </MetricCard>
  )
}

