import { Trans } from '@lingui/react/macro'
import { AnchorButton } from './Button'
import { IconAlertTriangle, IconX } from './icons'
import { demoToggleHref } from '../utils/demoMode'

// Spanduk untuk mode demo yang diminta EKSPLISIT lewat ?demo=1. Tidak bisa
// ditutup — selama mode itu menyala, angka contoh di bawahnya tidak boleh
// terbaca sebagai pembacaan sensor nyata.
//
// Mode demo otomatis (default saat pengguna belum punya data) TIDAK memakai
// spanduk ini; lihat catatan di DashboardLayout.jsx.
export default function DemoModeBanner() {
  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner__icon" aria-hidden="true">
        <IconAlertTriangle size={20} />
      </span>
      <p>
        {/* Tag <strong> ikut MASUK ke dalam pesan, bukan memecah kalimatnya jadi
            beberapa <Trans> terpisah. Kalau dipecah, penerjemah menerima
            potongan tanpa konteks dan tidak bisa memindahkan penekanannya —
            padahal bagian yang perlu ditebalkan bisa jatuh di tempat berbeda
            pada bahasa lain. Lingui menyimpan tag-nya sebagai penanda di dalam
            pesan, jadi strukturnya tetap utuh. */}
        <Trans>
          <strong>Mode Demo aktif.</strong> Semua angka, grafik, dan peringatan di halaman ini
          adalah <strong>data contoh</strong> — bukan pembacaan sensor dari perangkat Anda dan
          tidak tersimpan ke basis data.
        </Trans>
      </p>

      <div className="demo-banner__actions">
        {/* Ke ?demo=0, bukan ke URL polos: tanpa parameter, mode demo otomatis
            akan menyala lagi seketika dan tombolnya terlihat rusak. */}
        <AnchorButton variant="danger" className="demo-banner__exit" href={demoToggleHref(false)}>
          <IconX size={14} />
          <Trans>Keluar Mode Demo</Trans>
        </AnchorButton>
      </div>
    </div>
  )
}
