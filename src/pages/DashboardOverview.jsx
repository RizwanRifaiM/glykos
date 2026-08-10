import { useOutletContext } from 'react-router-dom'
import { PressureCard, TemperatureCard, HumidityCard } from '../components/MetricCards'
import ActivityPanel from '../components/ActivityPanel'
import HistoryChart from '../components/HistoryChart'
import SensorFootMap from '../components/SensorFootMap'
import PageHeader from '../components/PageHeader'
import StatusBanner from '../components/StatusBanner'
import Button, { LinkButton } from '../components/Button'
import { IconDownload, IconFileText, IconRefreshCw } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'

export default function DashboardOverview() {
  const { data, isLive, refresh, history, fatigue } = useOutletContext()

  return (
    <div className="dashboard-overview">
      <PageHeader
        title="Ringkasan"
        subtitle="Kondisi kaki & insole secara real-time"
      />

      <StatusBanner data={data} isLive={isLive} />

      <section className="panel foot-map-panel">
        <h2 className="panel__title">Peta Sensor Insole</h2>
        <p className="panel__subtitle">
          Titik tekanan &amp; suhu per sensor pada insole secara real-time
        </p>
        <div className="foot-map-panel__visual">
          <SensorFootMap
            pressurePoints={data.pressure?.points}
            temperaturePoints={data.temperatureObj?.points}
          />
        </div>
      </section>

      <section className="metrics-grid">
        <PressureCard pressure={data.pressure} history={history} />
        <TemperatureCard temperature={data.temperatureObj} history={history} />
        <HumidityCard humidity={data.humidity} history={history} airTemperature={data.airTemperature} />
      </section>

      <div className="dashboard__row">
        <ActivityPanel activity={data.activity} accel={data.accel} fatigue={fatigue} />

        <section className="panel export-panel">
          <h2 className="panel__title">Export Laporan</h2>
          <p className="panel__subtitle">
            Unduh data untuk konsultasi dokter
          </p>
          <div className="export-panel__actions">
            <Button variant="outline" onClick={() => exportToCsv(data, history)}>
              <IconFileText size={16} />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => exportToPdf(data, history)}>
              <IconDownload size={16} />
              Export PDF
            </Button>
            <Button variant="primary" onClick={refresh}>
              <IconRefreshCw size={16} />
              Refresh Data
            </Button>
          </div>
        </section>
      </div>

      <section className="panel history-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Histori Tren</h2>
            <p className="panel__subtitle">Pola tekanan, suhu &amp; kelembapan — 7 hari terakhir</p>
          </div>
          <LinkButton to="/dashboard/history" variant="outline">
            Lihat Selengkapnya
          </LinkButton>
        </div>
        <HistoryChart history={history} metrics={['pressure', 'temperature', 'humidity']} />
      </section>
    </div>
  )
}
