// Lambang Glykos. Dipisah jadi komponen sendiri karena dipakai di banyak
// tempat yang tidak boleh berbeda: topbar/sidebar dashboard, layar pemuatan,
// halaman depan, dan kartu masuk/daftar. Menyalin gambarnya berarti cepat atau
// lambat salah satunya melenceng — itu persis yang terjadi pada lambang lama.
//
// `size` di sini adalah TINGGI, bukan sisi kotak. Lambangnya berbentuk telapak
// kaki yang lebih lebar daripada tingginya, jadi memaksanya ke kotak persegi
// menyisakan ruang kosong atas-bawah dan membuatnya tampak kekecilan.
const ASPECT = 235 / 160

export default function BrandMark({ size = 26, className }) {
  return (
    <img
      src="/brand-mark.png"
      alt=""
      aria-hidden="true"
      width={Math.round(size * ASPECT)}
      height={size}
      className={className}
      draggable="false"
    />
  )
}
