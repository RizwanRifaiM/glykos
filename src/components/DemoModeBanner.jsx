import { IconAlertTriangle } from './icons'

// Spanduk wajib saat mode demo aktif. Dibuat mencolok & tidak bisa ditutup —
// tujuannya justru supaya angka contoh di bawahnya tidak pernah terbaca
// sebagai pembacaan sensor nyata.
export default function DemoModeBanner() {
  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner__icon" aria-hidden="true">
        <IconAlertTriangle size={20} />
      </span>
      <p>
        <strong>Mode Demo aktif.</strong> Semua angka, grafik, dan peringatan di halaman ini
        adalah <strong>data contoh</strong> — bukan pembacaan sensor dari perangkat Anda dan
        tidak tersimpan ke basis data. Hapus <code>?demo=1</code> dari URL untuk kembali ke
        data sungguhan.
      </p>
    </div>
  )
}
