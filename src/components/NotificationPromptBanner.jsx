import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import Button from './Button'
import { IconBell } from './icons'
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../utils/notifications'

// Ajakan menyalakan notifikasi, di Ringkasan.
//
// Sebelumnya tombolnya hanya ada di halaman Profil. Akibatnya pengguna yang
// tidak pernah membuka Profil memakai sepatu seharian dengan izin notifikasi
// yang belum pernah diminta — peringatan tekanan/suhu tetap tercatat, tapi HP
// tidak pernah berbunyi. Padahal notifikasi di HP adalah satu-satunya cara
// peringatan sampai saat layar tidak sedang dilihat.
//
// Hanya muncul selama izinnya BELUM DITENTUKAN. Setelah diizinkan tidak ada
// yang perlu disampaikan; setelah ditolak, browser tidak akan menampilkan
// dialognya lagi, jadi tombol di sini tidak berguna — penjelasan untuk keadaan
// itu tetap ada di Profil.
export default function NotificationPromptBanner() {
  const [permission, setPermission] = useState(getNotificationPermission)

  if (permission !== 'default') return null

  // Dipanggil langsung dari klik: Chrome Android mengabaikan permintaan izin
  // yang tidak berasal dari gestur pengguna.
  async function handleEnable() {
    setPermission(await requestNotificationPermission())
  }

  return (
    <section className="notify-prompt">
      <span className="notify-prompt__icon" aria-hidden="true">
        <IconBell size={20} />
      </span>
      <div className="notify-prompt__body">
        <strong>
          <Trans>Nyalakan notifikasi di HP ini</Trans>
        </strong>
        <p>
          <Trans>
            Supaya peringatan tekanan dan suhu kaki, serta pemberitahuan saat sepatu terputus,
            muncul di HP walaupun layar tidak sedang dilihat.
          </Trans>
        </p>
      </div>
      <Button variant="primary" onClick={handleEnable}>
        <Trans>Aktifkan notifikasi</Trans>
      </Button>
    </section>
  )
}
