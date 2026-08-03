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
