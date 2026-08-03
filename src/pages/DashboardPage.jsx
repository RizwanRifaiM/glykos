import { useState } from 'react'
import Header from '../components/Header'
import DeviceSelector from '../components/DeviceSelector'
import ConnectionBar from '../components/ConnectionBar'
import {
  PressureCard,
  TemperatureCard,
  HumidityCard,
} from '../components/MetricCards'
import ActivityPanel from '../components/ActivityPanel'
import HistoryChart from '../components/HistoryChart'
import Button from '../components/Button'
import { useSensorData } from '../hooks/useSensorData'
import { useHistoryData } from '../hooks/useHistoryData'
import { exportToCsv, exportToPdf } from '../utils/exportData'
import { useAuth } from '../contexts/auth-context'
import '../App.css'

const HISTORY_METRICS = [
  { key: 'pressure', label: 'Tekanan' },
  { key: 'temperature', label: 'Suhu' },
  { key: 'humidity', label: 'Kelembapan' },
]

const ALL_HISTORY_METRICS = HISTORY_METRICS.map(({ key }) => key)

function UserBar() {
  const { user, logout } = useAuth()
  const label = user?.displayName || user?.email || 'Pengguna'
  const initial = label.charAt(0).toUpperCase()

  return (
    <div className="user-bar">
      <div className="user-bar__identity">
        {user?.photoURL ? (
          <img className="user-bar__avatar" src={user.photoURL} alt="" />
        ) : (
          <span className="user-bar__avatar user-bar__avatar--fallback">{initial}</span>
        )}
        <span className="user-bar__name">{label}</span>
      </div>
      <Button variant="outline" onClick={logout}>
        Keluar
      </Button>
    </div>
  )
}

function DashboardPage() {
  const [deviceId, setDeviceId] = useState('ESP32-001')
  const [historyRange, setHistoryRange] = useState('7d')
  const [historyMetrics, setHistoryMetrics] = useState(ALL_HISTORY_METRICS)

  function toggleHistoryMetric(key) {
    setHistoryMetrics((prev) => {
      if (prev.includes(key)) {
        if (prev.length > 1) {
          return prev.filter((k) => k !== key)
        }
        return prev
      }
      return [...prev, key]
    })
  }

  const { data, isLoading, refresh, devices } = useSensorData(deviceId)
  const { history } = useHistoryData(deviceId, historyRange)

  return (
    <div className="dashboard page-shell">
      <Header />

      <UserBar />

      <ConnectionBar
        connection={data?.connection || {
          wifi: false,
          signalStrength: -100,
          lastUpdate: new Date()
        }}
      />

      <main className="dashboard__main">
        <DeviceSelector
          devices={devices}
          selectedId={deviceId}
          onSelect={setDeviceId}
        />

        {isLoading || !data ? (
          <div className="loading">Memuat data sensor…</div>
        ) : (
          <>
            <section className="metrics-grid">
              <PressureCard pressure={data.pressure} />
              <TemperatureCard temperature={data.temperature} />
              <HumidityCard humidity={data.humidity} />
            </section>

            <div className="header__context">
              <p className="header__desc">
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
                    Export CSV
                  </Button>
                  <Button variant="secondary" onClick={() => exportToPdf(data, history)}>
                    Export PDF
                  </Button>
                  <Button variant="primary" onClick={refresh}>
                    Refresh Data
                  </Button>
                </div>
              </section>
            </div>

            <section className="panel history-panel">
              <div className="history-panel__header">
                <div>
                  <h2 className="panel__title">Histori Tren</h2>
                  <p className="panel__subtitle">
                    Pola tekanan, suhu &amp; kelembapan —{' '}
                    {historyRange === '7d' ? '7 hari' : '30 hari'} terakhir
                  </p>
                </div>
                <div className="history-panel__controls">
                  <div className="btn-group">
                    <Button
                      active={historyRange === '7d'}
                      onClick={() => setHistoryRange('7d')}
                    >
                      7 Hari
                    </Button>
                    <Button
                      active={historyRange === '30d'}
                      onClick={() => setHistoryRange('30d')}
                    >
                      30 Hari
                    </Button>
                  </div>
                  <div className="btn-group btn-group--metric">
                    {HISTORY_METRICS.map(({ key, label }) => (
                      <Button
                        key={key}
                        active={historyMetrics.includes(key)}
                        onClick={() => toggleHistoryMetric(key)}
                        disabled={
                          historyMetrics.length === 1 && historyMetrics.includes(key)
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <HistoryChart history={history} metrics={historyMetrics} />
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Glykos · ESP32 DevKit V1 · FSR 402 · NTC · SHT30 · MPU6050
        </p>
      </footer>
    </div>
  )
}

export default DashboardPage
