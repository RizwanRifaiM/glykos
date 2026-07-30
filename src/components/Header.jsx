import { COLORS } from '../constants/theme'

export default function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="40" height="40">
            <circle cx="24" cy="24" r="22" fill={COLORS.navy} />
            <path
              d="M24 8c-2 6-8 10-8 16a8 8 0 0016 0c0-6-6-10-8-16z"
              fill={COLORS.lightBlue}
            />
            <path
              d="M18 32c2 4 6 6 6 6s4-2 6-6"
              stroke={COLORS.cream}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="header__title">Glykos</h1>
          <p className="header__tagline">
            
          </p>
        </div>
      </div>
      
      
    </header>
  )
}