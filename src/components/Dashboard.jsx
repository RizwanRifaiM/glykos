import { useState } from 'react'
import { useSensorData } from '../hooks/useSensorData'
import { useHistoryData } from '../hooks/useHistoryData'
import Header from './Header'
import DeviceSelector from './DeviceSelector'
import ConnectionBar from './ConnectionBar'
import { PressureCard, TemperatureCard, HumidityCard } from './MetricCards'
import ActivityPanel from './ActivityPanel'
import HistorySection from './HistorySection'
import ExportPanel from './ExportPanel'
import Button from './Button'

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState('ESP32-001')
  const [historyRange, setHistoryRange] = useState('7d')
  const { data, isLoading, refresh, devices } = useSensorData(deviceId)
  const { history } = useHistoryData(historyRange)

  return (
    <div className="dashboard">
      <Header />

      <DeviceSelector
        devices={devices}
        selectedId={deviceId}
        onSelect={setDeviceId}
      />

      <ConnectionBar connection={data.connection} />

      <div className="dashboard__toolbar">
        <Button variantIndex={1} onClick={refresh} disabled={isLoading}>
          {isLoading ? 'Memuat...' : '↻ Refresh Data'}
        </Button>
      </div>

      <section className="metrics-grid">
        <PressureCard pressure={data.pressure} />
        <TemperatureCard temperature={data.temperature} />
        <HumidityCard humidity={data.humidity} />
      </section>

      

      <div className="dashboard__secondary">
        <ActivityPanel activity={data.activity} />
        <ExportPanel data={data} history={history} />
      </div>

      <HistorySection
        history={history}
        range={historyRange}
        onRangeChange={setHistoryRange}
      />

      

      <footer className="footer">
        <p>
          Glykos · ESP32 DevKit V1 · FSR 402 · NTC · SHT30 · MPU6050
        </p>
        <p className="footer__disclaimer">
          Alat pendamping — bukan pengganti diagnosis medis profesional.
        </p>
      </footer>
    </div>
  )
}
