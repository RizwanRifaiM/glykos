import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { LinkButton } from './Button'
import { IconIdCard } from './icons'
import { describeLabReminder } from '../utils/alertMessages'

// Pengingat di Ringkasan saat hasil lab kosong, tidak sah, tanpa tanggal, atau
// kedaluwarsa (utils/riskProfile.js).
//
// Dalam keadaan itu pemantauan diam-diam jatuh ke tingkat Standar — arah gagal
// yang benar, tapi pengguna perlu tahu bahwa data yang pernah ia isi sudah
// tidak dipakai lagi. Sengaja ringkas dan tanpa warna peringatan: ini ajakan
// memperbarui data, bukan tanda bahaya pada kaki.
export default function LabReminderBanner({ risk }) {
  const { i18n } = useLingui()

  const reminders = (risk?.reminders ?? [])
    .map((reminder) => describeLabReminder(i18n, reminder))
    .filter(Boolean)
  if (reminders.length === 0) return null

  return (
    <section className="lab-reminder">
      <span className="lab-reminder__icon" aria-hidden="true">
        <IconIdCard size={20} />
      </span>
      <div className="lab-reminder__body">
        <strong>
          <Trans>Data kesehatan perlu diperbarui</Trans>
        </strong>
        <p>{reminders.join(' ')}</p>
      </div>
      <LinkButton to="/dashboard/profile" variant="outline">
        <Trans>Buka Profil</Trans>
      </LinkButton>
    </section>
  )
}
