import { IconActivity, IconClock } from './icons'
import { FATIGUE_LABELS } from '../constants/fatigue'

function AccelBlock({ accel }) {
  const hasData = accel && (accel.x !== null || accel.y !== null || accel.z !== null)
  if (!hasData) return null

  const x = accel.x ?? 0
  const y = accel.y ?? 0
  const z = accel.z ?? 0
  const magnitude = Math.sqrt(x * x + y * y + z * z)

  return (
    <div className="fatigue-block">
      <h3 className="fatigue-block__title">Akselerasi</h3>
      <div className="temp-compare">
        <div>
          <span>X</span>
          <strong>{x.toFixed(2)} g</strong>
        </div>
        <div>
          <span>Y</span>
          <strong>{y.toFixed(2)} g</strong>
        </div>
        <div>
          <span>Z</span>
          <strong>{z.toFixed(2)} g</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{magnitude.toFixed(2)} g</strong>
        </div>
      </div>
      <p className="metric-card__note">
        ~1 g saat diam (gravitasi) — naik saat kaki bergerak/melangkah.
      </p>
    </div>
  )
}

function FatigueBlock({ fatigue }) {
  if (!fatigue?.sessionActive) {
    return (
      <div className="fatigue-block">
        <h3 className="fatigue-block__title">Indikasi Kelelahan</h3>
        <p className="metric-card__note">Belum ada data sesi pemakaian.</p>
      </div>
    )
  }

  const { level, sustainedMinutes, reasons } = fatigue
  const label = FATIGUE_LABELS[level] ?? level

  return (
    <div className="fatigue-block">
      <div className="fatigue-block__header">
        <h3 className="fatigue-block__title">Indikasi Kelelahan</h3>
        <span className={`status-pill status-pill--${level}`}>{label}</span>
      </div>

      {sustainedMinutes >= 1 && (
        <p className="metric-card__note">
          Beban tinggi berkelanjutan: {Math.round(sustainedMinutes)} menit
        </p>
      )}

      {reasons.length > 0 ? (
        <ul className="fatigue-reasons">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p className="metric-card__note">Belum ada indikasi kelelahan berarti.</p>
      )}

      <p className="metric-card__note metric-card__note--secondary">
        Estimasi berbasis pola sensor, bukan pengukuran klinis kelelahan otot.
      </p>
    </div>
  )
}

export default function ActivityPanel({ activity, accel, fatigue }) {
  if (!activity) {
    return (
      <section className="panel activity-panel">
        <h2 className="panel__title">Aktivitas Harian</h2>
        <p className="panel__subtitle">Pola gerak &amp; beban kaki harian</p>
        <p className="metric-card__note">
          Belum ada data langkah dari perangkat ini — sensor gerak belum terdeteksi atau belum
          mengirim data.
        </p>
        <AccelBlock accel={accel} />
        <FatigueBlock fatigue={fatigue} />
      </section>
    )
  }

  const hours = Math.floor(activity.activeMinutes / 60)
  const mins = activity.activeMinutes % 60

  return (
    <section className="panel activity-panel">
      <h2 className="panel__title">Aktivitas Harian</h2>
      <p className="panel__subtitle">Pola gerak &amp; beban kaki harian</p>
      <div className="activity-panel__grid">
        <div className="activity-stat">
          <span className="activity-stat__icon">
            <IconActivity size={22} />
          </span>
          <div>
            <strong>{activity.steps.toLocaleString('id-ID')}</strong>
            <span>Total Langkah</span>
          </div>
        </div>
        <div className="activity-stat">
          <span className="activity-stat__icon">
            <IconClock size={22} />
          </span>
          <div>
            <strong>
              {hours > 0 ? `${hours}j ` : ''}
              {mins}m
            </strong>
            <span>Waktu Aktif</span>
          </div>
        </div>
      </div>
      {accel && (accel.x !== null || accel.y !== null || accel.z !== null) && (
        <p className="metric-card__note">
          Jumlah langkah adalah estimasi dari data gerak kaki, bisa terhitung lebih sedikit
          saat berjalan cepat atau berlari.
        </p>
      )}
      <AccelBlock accel={accel} />
      <FatigueBlock fatigue={fatigue} />
    </section>
  )
}
