import { IconActivity, IconClock } from './icons'

export default function ActivityPanel({ activity = { steps: 0, activeMinutes: 0 } }) {
  const safeActivity = activity || { steps: 0, activeMinutes: 0 }
  const hours = Math.floor((safeActivity.activeMinutes ?? 0) / 60)
  const mins = (safeActivity.activeMinutes ?? 0) % 60

  return (
    <section className="panel activity-panel">
      <h2 className="panel__title">Aktivitas Harian</h2>
      <p className="panel__subtitle">Data dari MPU6050 — pola tekanan &amp; gerak</p>
      <div className="activity-panel__grid">
        <div className="activity-stat">
          <span className="activity-stat__icon">
            <IconActivity size={22} />
          </span>
          <div>
            <strong>{(safeActivity.steps ?? 0).toLocaleString('id-ID')}</strong>
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
    </section>
  )
}
