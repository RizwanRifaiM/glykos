import { COLORS } from '../constants/theme'

// Lambang Glykos. Dipisah jadi komponen sendiri karena sekarang dipakai di dua
// tempat yang tidak boleh berbeda: topbar/sidebar dashboard dan layar
// pemuatan. Menyalin SVG-nya berarti cepat atau lambat keduanya melenceng.
export default function BrandMark({ size = 26, className }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill={COLORS.navy} />
      <path d="M24 8c-2 6-8 10-8 16a8 8 0 0016 0c0-6-6-10-8-16z" fill={COLORS.lightBlue} />
      <path
        d="M18 32c2 4 6 6 6 6s4-2 6-6"
        stroke={COLORS.cream}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
