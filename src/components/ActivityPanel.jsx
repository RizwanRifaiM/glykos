import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { IconActivity, IconClock } from './icons'
import { describeFatigueReasons, fatigueLabel } from '../utils/alertMessages'
import { formatNumber } from '../utils/locale'

function FatigueBlock({ fatigue }) {
  const { i18n } = useLingui()

  if (!fatigue?.sessionActive) {
    return (
      <div className="fatigue-block">
        <h3 className="fatigue-block__title">
          <Trans>Indikasi Kelelahan</Trans>
        </h3>
        <p className="metric-card__note">
          <Trans>Belum ada data sesi pemakaian.</Trans>
        </p>
      </div>
    )
  }

  const { level, sustainedMinutes, reasons } = fatigue
  const label = fatigueLabel(i18n, level)

  // `reasons` kini berupa kode + angka (lihat useFatigueMonitor.js); kalimatnya
  // dirakit di sini oleh fungsi yang SAMA dengan yang dipakai halaman
  // Peringatan, jadi alasan yang sama tidak pernah berbunyi berbeda di dua
  // tempat.
  const reasonTexts = describeFatigueReasons(i18n, reasons)
  const sustainedText = formatNumber(Math.round(sustainedMinutes))

  return (
    <div className="fatigue-block">
      <div className="fatigue-block__header">
        <h3 className="fatigue-block__title">
          <Trans>Indikasi Kelelahan</Trans>
        </h3>
        <span className={`status-pill status-pill--${level}`}>{label}</span>
      </div>

      {sustainedMinutes >= 1 && (
        <p className="metric-card__note">
          <Trans>Beban tinggi berkelanjutan: {sustainedText} menit</Trans>
        </p>
      )}

      {reasonTexts.length > 0 ? (
        <ul className="fatigue-reasons">
          {reasonTexts.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p className="metric-card__note">
          <Trans>Belum ada indikasi kelelahan berarti.</Trans>
        </p>
      )}

      <p className="metric-card__note metric-card__note--secondary">
        <Trans>Estimasi berbasis pola sensor, bukan pengukuran klinis kelelahan otot.</Trans>
      </p>
    </div>
  )
}

export default function ActivityPanel({ activity, accel, fatigue }) {
  if (!activity) {
    return (
      <section className="panel activity-panel">
        <h2 className="panel__title">
          <Trans>Aktivitas Harian</Trans>
        </h2>
        <p className="panel__subtitle">
          <Trans>Pola gerak &amp; beban kaki harian</Trans>
        </p>
        <p className="metric-card__note">
          <Trans>
            Belum ada data langkah dari perangkat ini — sensor gerak belum terdeteksi atau belum
            mengirim data.
          </Trans>
        </p>
        <FatigueBlock fatigue={fatigue} />
      </section>
    )
  }

  const hours = Math.floor(activity.activeMinutes / 60)
  const mins = activity.activeMinutes % 60

  // Durasi dirakit sebagai satu variabel, bukan dua potongan di dalam JSX.
  // Singkatan jam/menit berbeda antar bahasa ("2j 15m" vs "2h 15m") dan
  // urutannya pun bisa berbeda — jadi keduanya harus jadi satu pesan yang bisa
  // ditata ulang penerjemah, bukan gabungan yang strukturnya terkunci di kode.
  const stepsText = formatNumber(activity.steps)
  const hoursText = formatNumber(hours)
  const minsText = formatNumber(mins)

  return (
    <section className="panel activity-panel">
      <h2 className="panel__title">
        <Trans>Aktivitas Harian</Trans>
      </h2>
      <p className="panel__subtitle">
        <Trans>Pola gerak &amp; beban kaki harian</Trans>
      </p>
      <div className="activity-panel__grid">
        <div className="activity-stat">
          <span className="activity-stat__icon">
            <IconActivity size={22} />
          </span>
          <div>
            <strong>{stepsText}</strong>
            <span>
              <Trans>Total Langkah</Trans>
            </span>
          </div>
        </div>
        <div className="activity-stat">
          <span className="activity-stat__icon">
            <IconClock size={22} />
          </span>
          <div>
            <strong>
              {hours > 0 ? (
                <Trans>
                  {hoursText}j {minsText}m
                </Trans>
              ) : (
                <Trans>{minsText}m</Trans>
              )}
            </strong>
            <span>
              <Trans>Waktu Aktif</Trans>
            </span>
          </div>
        </div>
      </div>
      {accel && (accel.x !== null || accel.y !== null || accel.z !== null) && (
        <p className="metric-card__note">
          <Trans>
            Jumlah langkah adalah estimasi dari data gerak kaki, bisa terhitung lebih sedikit saat
            berjalan cepat atau berlari.
          </Trans>
        </p>
      )}
      <FatigueBlock fatigue={fatigue} />
    </section>
  )
}
