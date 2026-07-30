import Button from './Button'
import { exportToCsv, exportToPdf } from '../utils/exportData'

export default function ExportPanel({ data, history }) {
  return (
    <section className="panel export-panel">
      <h2 className="panel__title">Export untuk Dokter</h2>
      <p className="panel__subtitle">
        Unduh data monitoring untuk konsultasi medis
      </p>
      <div className="export-panel__actions">
        <Button variantIndex={3} onClick={() => exportToCsv(data, history)}>
          📄 Export CSV
        </Button>
        <Button variantIndex={4} onClick={() => exportToPdf(data, history)}>
          🖨️ Export PDF
        </Button>
      </div>
    </section>
  )
}
