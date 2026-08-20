import { useLingui } from '@lingui/react/macro'
import BrandMark from './BrandMark'

// Layar pemuatan tingkat aplikasi: dipakai saat memeriksa status login
// (ProtectedRoute) dan saat mengunduh chunk rute yang di-lazy-load (App.jsx).
//
// Tiga keputusan yang membedakannya dari sekadar tulisan "Memuat…":
//
// 1. BERMEREK, bukan kosong. Layar putih tanpa apa pun di detik pertama
//    terbaca seperti aplikasi gagal dimuat. Lambang + nama produk membuat
//    jeda itu terasa disengaja.
// 2. Progress bar indeterminate, bukan spinner. Kita memang tidak tahu
//    persentasenya, dan bar horizontal lebih tenang secara visual daripada
//    spinner yang berputar di tengah layar.
// 3. MUNCUL TERLAMBAT (~200 ms, lewat animation-delay di CSS). Pada koneksi
//    cepat pemuatan selesai sebelum loader ini sempat terlihat, jadi tidak ada
//    kedipan. Ini praktik standar: indikator pemuatan yang berkelebat 80 ms
//    justru membuat aplikasi terasa lebih tersendat, bukan lebih responsif.
//
// Gayanya ada di index.css (BUKAN Auth.css atau App.css) karena keduanya ikut
// chunk yang di-lazy-load — loader yang menunggu chunk-nya sendiri untuk bisa
// tampil rapi jelas tidak ada gunanya.
export default function AppLoader({ label }) {
  // useLingui dari '@lingui/react/macro' mengembalikan `t` yang sudah terikat
  // ke instance di konteks — jadi teks bawaan di bawah ikut berganti bahasa
  // tanpa perlu mengoper apa pun dari pemanggil.
  const { t } = useLingui()

  // Label bawaan dihitung DI DALAM komponen, bukan sebagai nilai bawaan
  // parameter. Nilai bawaan parameter tetap dievaluasi setiap render, jadi
  // keduanya sama-sama bekerja — tapi macro `t` hanya boleh dipanggil di dalam
  // fungsi (rule lingui/t-call-in-function), dan menaruhnya di posisi parameter
  // membuat aturan itu lebih mudah dilanggar tanpa sadar saat kode digeser.
  const text = label ?? t`Menyiapkan dashboard…`

  return (
    <div className="app-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="app-loader__panel">
        <span className="app-loader__mark">
          <BrandMark size={44} />
        </span>
        <span className="app-loader__wordmark">Glykos</span>
        <span className="app-loader__track">
          <span className="app-loader__bar" />
        </span>
        <span className="app-loader__label">{text}</span>
      </div>
    </div>
  )
}
