import { useOutletContext } from 'react-router-dom'
import { PressureCard, TemperatureCard, HumidityCard } from '../components/MetricCards'
import ActivityPanel from '../components/ActivityPanel'
import HistoryChart from '../components/HistoryChart'
import Button, { LinkButton } from '../components/Button'
import { IconDownload, IconFileText, IconRefreshCw } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'

export default function DashboardOverview() {
  const { data, refresh, history } = useOutletContext()

  return (
    <div className="dashboard-overview">
      <section className="metrics-grid">
        <PressureCard pressure={data.pressure} />
        <TemperatureCard temperature={data.temperatureObj} />
        <HumidityCard humidity={data.humidity} />
      </section>

      <div className="info-callout">
        <p className="info-callout__text">
          Banyak penderita diabetes mengalami <strong>neuropati</strong> (mati rasa pada saraf kaki),
          sehingga mereka tidak menyadari adanya tekanan berlebih atau peradangan dini yang berisiko
          menjadi ulkus diabetik. <strong>Glykos</strong> hadir sebagai &ldquo;indera pengganti&rdquo; untuk mencegah luka yang sulit sembuh tersebut.
          Hasil akan dikirim secara <em>real-time</em> ke <em>dashboard</em> ini agar pasien, keluarga, maupun dokter
          dapat memantau kondisi kaki kapan saja untuk tindakan preventif.
        </p>
      </div>

      <div className="dashboard__row">
        <ActivityPanel activity={data.activity} />

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
