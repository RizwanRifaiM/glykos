import { IconThermometer } from './icons'
import { describeTemperatureTrend, TREND_LEVEL_LABELS } from '../utils/temperatureTrend'

// Saran tindak lanjut per tingkat. Sengaja berupa langkah perawatan mandiri
// yang lazim dan satu ajakan memeriksakan diri — BUKAN dosis, bukan diagnosis,
// dan tidak pernah menyuruh berhenti berobat. Aturan yang memunculkannya
// (selisih bertahan berhari-hari) ada di utils/temperatureTrend.js.
const GUIDANCE = {
  warning: [
    'Periksa kaki secara visual hari ini — cari kemerahan, lecet, atau kulit yang terasa lebih hangat.',
    'Pakai insole lagi besok supaya polanya bisa dipastikan, bukan sekadar satu hari yang panas.',
  ],
  danger: [
    'Kurangi beban pada kaki tersebut: batasi berdiri dan berjalan lama selama beberapa hari.',
    'Periksa kaki dua kali sehari — kemerahan, lecet, atau luka sekecil apa pun.',
    'Hubungi tenaga kesehatan bila selisih ini bertahan, atau bila ada luka, nanah, atau demam.',
  ],
}

// Muncul di Ringkasan & Riwayat saat selisih suhu antar area bertahan di atas
// ambang. Pada tingkat `safe` komponen ini tidak merender apa pun — spanduk
// yang selalu ada akan berhenti dibaca justru saat isinya penting.
export default function TemperatureTrendBanner({ trend }) {
  if (!trend || trend.level === 'safe') return null

  const steps = GUIDANCE[trend.level] ?? []
  const range = trend.days ?? []
  const period =
    range.length > 1
      ? `${range[0].label} – ${range[range.length - 1].label}`
      : (range[0]?.label ?? null)

  return (
    <section
      className={`trend-banner trend-banner--${trend.level}`}
      role={trend.level === 'danger' ? 'alert' : undefined}
    >
      <span className="trend-banner__icon" aria-hidden="true">
        <IconThermometer size={26} />
      </span>

      <div className="trend-banner__body">
        <div className="trend-banner__heading">
          <h2>Selisih Suhu Antar Area</h2>
          <span className={`status-pill status-pill--${trend.level}`}>
            {TREND_LEVEL_LABELS[trend.level]}
          </span>
        </div>

        <p className="trend-banner__message">{describeTemperatureTrend(trend)}</p>

        {period && (
          <p className="trend-banner__period">
            Hari yang terpantau: <strong>{period}</strong>
          </p>
        )}

        <ul className="trend-banner__steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>

        {/* Batas yang tidak boleh hilang dari layar: ini pemantauan, bukan
            diagnosis. Ambangnya heuristik, dan sensornya bisa salah baca. */}
        <p className="trend-banner__disclaimer">
          Indikator pemantauan, bukan diagnosis. Keputusan penanganan tetap ada pada tenaga
          kesehatan Anda.
        </p>
      </div>
    </section>
  )
}
