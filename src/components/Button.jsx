import { BUTTON_VARIANTS, COLORS } from '../constants/theme'

const variantStyles = {
  navy: { bg: COLORS.navy, text: COLORS.cream, border: COLORS.navy },
  blue: { bg: COLORS.blue, text: COLORS.cream, border: COLORS.blue },
  lightBlue: { bg: COLORS.lightBlue, text: COLORS.navy, border: COLORS.blue },
  red: { bg: COLORS.red, text: COLORS.cream, border: COLORS.red },
  cream: { bg: COLORS.cream, text: COLORS.navy, border: COLORS.blue },
}

export default function Button({
  children,
  variant,
  variantIndex = 0,
  active = false,
  className = '',
  ...props
}) {
  const resolved = variant ?? BUTTON_VARIANTS[variantIndex % BUTTON_VARIANTS.length]
  const style = variantStyles[resolved]

  return (
    <button
      type="button"
      className={`glykos-btn ${active ? 'glykos-btn--active' : ''} ${className}`}
      style={{
        '--btn-bg': style.bg,
        '--btn-text': style.text,
        '--btn-border': style.border,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
