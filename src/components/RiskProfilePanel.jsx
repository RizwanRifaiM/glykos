import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import {
  describeLabReminder,
  describeRiskFactor,
  riskTierEffect,
  riskTierLabel,
} from '../utils/alertMessages'
import { RISK_TIERS } from '../utils/riskProfile'

// Panel di halaman Profil: apa akibat dari data yang diisi di sebelahnya.
//
// Tanpa panel ini, mengisi HbA1c/LDL/riwayat ulkus terasa seperti mengisi
// formulir yang tidak dibaca siapa pun — padahal isinya mengubah kapan HP
// berbunyi. Pengguna berhak tahu itu, dan tahu alasannya.
//
// Yang diwarnai adalah INTENSITAS PEMANTAUAN, bukan penilaian atas kondisi
// pengguna — karena itu judulnya "Tingkat Pemantauan", bukan "Risiko Anda".
//
// Membaca `risk` dari useRiskProfile (profil TERSIMPAN), jadi panel baru
// berubah setelah formulir disimpan — sama seperti peringatannya.
export default function RiskProfilePanel({ risk }) {
  const { i18n } = useLingui()

  if (!risk) return null

  const currentIndex = RISK_TIERS.indexOf(risk.tier)
  const factors = risk.factors.map((factor) => describeRiskFactor(i18n, factor)).filter(Boolean)
  const reminders = risk.reminders
    .map((reminder) => describeLabReminder(i18n, reminder))
    .filter(Boolean)

  return (
    <section className={`panel profile-panel risk-panel risk-panel--${risk.tier}`}>
      <h2 className="panel__title">
        <Trans>Tingkat pemantauan</Trans>
      </h2>

      {/* Tiga tingkat ditampilkan sekaligus, bukan hanya yang aktif: posisi
          relatifnya ("dua dari tiga") lebih mudah dibaca daripada satu kata. */}
      <ol className="tier-meter">
        {RISK_TIERS.map((tier, index) => (
          <li
            key={tier}
            className={[
              'tier-meter__step',
              index <= currentIndex ? 'tier-meter__step--reached' : '',
              index === currentIndex ? 'tier-meter__step--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            {riskTierLabel(i18n, tier)}
          </li>
        ))}
      </ol>

      <p className="risk-panel__effect">{riskTierEffect(i18n, risk.tier)}</p>

      {factors.length > 0 ? (
        <div className="risk-panel__block">
          <h3>
            <Trans>Yang memperketat pemantauan</Trans>
          </h3>
          <ul className="risk-panel__chips">
            {factors.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="risk-panel__empty">
          <Trans>
            Belum ada faktor yang memperketat pemantauan. Tingkat ini dipakai juga saat data kesehatan
            kosong atau kedaluwarsa.
          </Trans>
        </p>
      )}

      {reminders.length > 0 && (
        <div className="risk-panel__callout">
          <h3>
            <Trans>Perlu dilengkapi</Trans>
          </h3>
          <ul>
            {reminders.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="risk-panel__disclaimer">
        <Trans>
          Angka ambang sensor tidak berubah — yang disesuaikan hanya kapan dan seberapa sering Anda
          diingatkan. Ini penyesuaian pemantauan, bukan diagnosis.
        </Trans>
      </p>
    </section>
  )
}
