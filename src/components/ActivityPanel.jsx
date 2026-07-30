export default function ActivityPanel({ activity }) {
  const hours = Math.floor(activity.activeMinutes / 60)
  const mins = activity.activeMinutes % 60

  return (
    <section className="panel activity-panel">
      <h2 className="panel__title">Aktivitas Harian</h2>
      <p className="panel__subtitle">Data dari MPU6050 — pola tekanan &amp; gerak</p>
      <div className="activity-panel__grid">
        <div className="activity-stat">
          <span className="activity-stat__icon">👣</span>
          <div>
            <strong>{activity.steps.toLocaleString('id-ID')}</strong>
            <span>Total Langkah</span>
          </div>
        </div>
        <div className="activity-stat">
          <span className="activity-stat__icon">⏱️</span>
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
