import { useOutletContext } from 'react-router-dom'
import { PressureCard, TemperatureCard, HumidityCard } from '../components/MetricCards'
import ActivityPanel from '../components/ActivityPanel'
import DeviceOnboardingBanner from '../components/DeviceOnboardingBanner'
import StaleDataBanner from '../components/StaleDataBanner'
import HistoryChart from '../components/HistoryChart'
import SensorFootMap from '../components/SensorFootMap'
import PageHeader from '../components/PageHeader'
import StatusBanner from '../components/StatusBanner'
import TemperatureTrendBanner from '../components/TemperatureTrendBanner'
import Button, { LinkButton } from '../components/Button'
import { IconDownload, IconFileText, IconRefreshCw } from '../components/icons'
import { exportToCsv, exportToPdf } from '../utils/exportData'

export default function DashboardOverview() {
  const { data, isLive, isStale, updatedAtMs, refresh, history, fatigue, temperatureTrend, ble } =
    useOutletContext()

  return (
    <div className="dashboard-overview">
      <PageHeader
        title="Ringkasan"
        subtitle="Kondisi kaki & insole secara real-time"
        actions={
          <>
            <Button variant="outline" onClick={() => exportToCsv(data, history)}>
              <IconFileText size={16} />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportToPdf(data, history)}>
              <IconDownload size={16} />
              PDF
            </Button>
            <Button variant="primary" onClick={refresh}>
              <IconRefreshCw size={16} />
              Refresh
            </Button>
          </>
        }
      />

      {/* Tiga keadaan yang berbeda, jangan disatukan: data baru (StatusBanner),
          data lama yang masih ditampilkan tapi bukan kondisi sekarang
          (StaleDataBanner), dan belum pernah ada data sama sekali. */}
      {isLive ? (
        <StatusBanner data={data} isLive={isLive} />
      ) : isStale ? (
        <StaleDataBanner ble={ble} updatedAtMs={updatedAtMs} />
      ) : (
        <DeviceOnboardingBanner ble={ble} />
      )}

      {/* Ditaruh di atas kartu metrik: pola berhari-hari lebih penting
          daripada angka satu detik terakhir, dan komponennya sendiri tidak
          merender apa pun selama kondisinya normal. */}
      <TemperatureTrendBanner trend={temperatureTrend} />

      {/* Urutan mengikuti bobot klinis, bukan urutan sensor di firmware.
          Selisih suhu antar area adalah prediktor pre-ulkus terkuat dari
          ketiganya — komponen ini sudah menyalakan peringatan sendiri di
          atas 2,2 °C — jadi kartu Suhu yang memegang kolom utama dan angka
          terbesar. Tekanan dan kelembapan jadi pendukung. */}
      <section className="metrics-grid">
        <TemperatureCard temperature={data.temperatureObj} history={history} lead />
        <PressureCard pressure={data.pressure} history={history} />
        <HumidityCard
          humidity={data.humidity}
          history={history}
          airTemperature={data.airTemperature}
        />
      </section>

      <div className="dashboard__row">
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

        <ActivityPanel activity={data.activity} accel={data.accel} fatigue={fatigue} />
      </div>

      <section className="panel history-panel">
        <div className="history-panel__header">
          <div>
            <h2 className="panel__title">Histori Tren</h2>
            <p className="panel__subtitle">
              Pola tekanan, suhu, selisih suhu &amp; kelembapan — 7 hari terakhir
            </p>
          </div>
          <LinkButton to="/dashboard/history" variant="outline">
            Lihat Selengkapnya
          </LinkButton>
        </div>
        <HistoryChart
          history={history}
          metrics={['pressure', 'temperature', 'temperatureDelta', 'humidity']}
        />
      </section>
    </div>
  )
}
