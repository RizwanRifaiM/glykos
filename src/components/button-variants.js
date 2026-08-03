import { COLORS } from '../constants/theme'

const VARIANTS = {
  primary: { bg: COLORS.navy, text: COLORS.cream, border: COLORS.navy },
  secondary: { bg: COLORS.blue, text: COLORS.cream, border: COLORS.blue },
  outline: { bg: 'transparent', text: COLORS.navy, border: COLORS.navy },
  danger: { bg: COLORS.red, text: COLORS.cream, border: COLORS.red },
}

export function variantProps(variant, active, className) {
  const style = VARIANTS[variant]
  const cssVars = style
    ? {
        '--btn-bg': style.bg,
        '--btn-text': style.text,
        '--btn-border': style.border,
      }
    : undefined

  return {
    className: `glykos-btn glykos-btn--${variant} ${active ? 'glykos-btn--active' : ''} ${className}`.trim(),
    style: cssVars,
  }
}
