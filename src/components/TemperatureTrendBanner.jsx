import { msg } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { IconThermometer } from './icons'
import { describeTemperatureTrend, trendLevelLabel } from '../utils/temperatureTrend'

// Saran tindak lanjut per tingkat. Sengaja berupa langkah perawatan mandiri
// yang lazim dan satu ajakan memeriksakan diri — BUKAN dosis, bukan diagnosis,
// dan tidak pernah menyuruh berhenti berobat. Aturan yang memunculkannya
// (selisih bertahan berhari-hari) ada di utils/temperatureTrend.js.
//
// Deskriptor `msg` supaya isi saran ikut bahasa aktif. Ini bagian yang paling
// tidak boleh tertinggal bahasa: saran tindak lanjut yang tidak dimengerti
// pembacanya sama saja dengan tidak ada.
const GUIDANCE = {
  warning: [
    msg`Periksa kaki secara visual hari ini — cari kemerahan, lecet, atau kulit yang terasa lebih hangat.`,
    msg`Pakai sepatu Glykos lagi besok supaya polanya bisa dipastikan, bukan sekadar satu hari yang panas.`,
  ],
  danger: [
    msg`Kurangi beban pada kaki tersebut: batasi berdiri dan berjalan lama selama beberapa hari.`,
    msg`Periksa kaki dua kali sehari — kemerahan, lecet, atau luka sekecil apa pun.`,
    msg`Hubungi tenaga kesehatan bila selisih ini bertahan, atau bila ada luka, nanah, atau demam.`,
  ],
}

// Muncul di Ringkasan & Riwayat saat selisih suhu antar area bertahan di atas
// ambang. Pada tingkat `safe` komponen ini tidak merender apa pun — spanduk
// yang selalu ada akan berhenti dibaca justru saat isinya penting.
export default function TemperatureTrendBanner({ trend }) {
  const { i18n } = useLingui()

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
          <h2>
            <Trans>Selisih Suhu Antar Area</Trans>
          </h2>
          <span className={`status-pill status-pill--${trend.level}`}>
            {trendLevelLabel(i18n, trend.level)}
          </span>
        </div>

        <p className="trend-banner__message">{describeTemperatureTrend(i18n, trend)}</p>

        {period && (
          <p className="trend-banner__period">
            <Trans>
              Hari yang terpantau: <strong>{period}</strong>
            </Trans>
          </p>
        )}

        <ul className="trend-banner__steps">
          {/* Kunci pakai indeks: isi daftar sekarang berupa deskriptor pesan
              (objek), dan memakai teks terjemahannya sebagai kunci akan
              membongkar-pasang seluruh daftar tiap kali bahasa berganti. */}
          {steps.map((step, index) => (
            <li key={index}>{i18n._(step)}</li>
          ))}
        </ul>

        {/* Batas yang tidak boleh hilang dari layar: ini pemantauan, bukan
            diagnosis. Ambangnya heuristik, dan sensornya bisa salah baca. */}
        <p className="trend-banner__disclaimer">
          <Trans>
            Indikator pemantauan, bukan diagnosis. Keputusan penanganan tetap ada pada tenaga
            kesehatan Anda.
          </Trans>
        </p>
      </div>
    </section>
  )
}
