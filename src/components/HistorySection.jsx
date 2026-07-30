import { useState } from 'react'
import Button from './Button'
import HistoryChart from './HistoryChart'

const METRIC_OPTIONS = [
  { key: 'pressure', label: 'Tekanan' },
  { key: 'temperature', label: 'Suhu' },
  { key: 'humidity', label: 'Kelembapan' },
]

export default function HistorySection({ history, range, onRangeChange }) {
  const [metric, setMetric] = useState('pressure')

  return (
    <section className="panel history-section">
      <div className="history-section__header">
        <div>
          <h2 className="panel__title">Histori &amp; Tren</h2>
          <p className="panel__subtitle">
            Pola jangka panjang untuk deteksi dini pre-ulkus
          </p>
        </div>
        <div className="history-section__controls">
          <div className="btn-group">
            <Button variantIndex={0} active={range === '7d'} onClick={() => onRangeChange('7d')}>
              7 Hari
            </Button>
            <Button variantIndex={1} active={range === '30d'} onClick={() => onRangeChange('30d')}>
              30 Hari
            </Button>
          </div>
        </div>
      </div>
      <div className="btn-group btn-group--metric">
        {METRIC_OPTIONS.map((opt, i) => (
          <Button
            key={opt.key}
            variantIndex={i + 2}
            active={metric === opt.key}
            onClick={() => setMetric(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <HistoryChart history={history} metric={metric} />
    </section>
  )
}
