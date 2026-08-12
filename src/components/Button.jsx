import { Link } from 'react-router-dom'
import { variantProps } from './button-variants'

export default function Button({
  children,
  variant = 'chip',
  active = false,
  className = '',
  ...props
}) {
  return (
    <button type="button" {...variantProps(variant, active, className)} {...props}>
      {children}
    </button>
  )
}

export function LinkButton({
  children,
  variant = 'chip',
  active = false,
  className = '',
  ...props
}) {
  return (
    <Link {...variantProps(variant, active, className)} {...props}>
      {children}
    </Link>
  )
}

// Tautan <a> biasa (memuat ulang halaman), bukan <Link> milik router.
// Dipakai untuk menyalakan/mematikan ?demo=1: isDemoMode() membaca
// window.location.search saat render, jadi muat ulang penuh menjamin seluruh
// pohon komponen ikut berganti sumber data — tidak ada sisa state sesi
// sebelumnya yang bercampur dengan angka contoh.
export function AnchorButton({
  children,
  variant = 'chip',
  active = false,
  className = '',
  ...props
}) {
  return (
    <a {...variantProps(variant, active, className)} {...props}>
      {children}
    </a>
  )
}
