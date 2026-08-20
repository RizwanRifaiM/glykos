import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useLingui as useLinguiCore } from '@lingui/react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import GoogleIcon from '../components/GoogleIcon'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { getAuthErrorMsg } from '../utils/authErrors'
import { COLORS } from '../constants/theme'
import './Auth.css'

export default function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth()
  const { t } = useLingui()
  // Instance i18n dibutuhkan untuk menyelesaikan DESKRIPTOR galat auth
  // (utils/authErrors.js). Deskriptornya disimpan di state, bukan kalimatnya —
  // jadi pesan yang sedang tampil ikut berganti saat bahasa diubah.
  const { i18n } = useLinguiCore()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getAuthErrorMsg(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setIsSubmitting(true)
    try {
      await loginWithGoogle()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getAuthErrorMsg(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
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
          <h1>Glykos</h1>
        </div>

        {/* Halaman masuk/daftar bisa jadi halaman PERTAMA yang dibuka (tautan
            langsung, PWA yang dipasang ke home screen), jadi pemilih bahasanya
            harus ada di sini juga — bukan hanya di halaman depan. */}
        <div className="auth-card__lang">
          <LanguageSwitcher compact />
        </div>

        <h2 className="auth-card__title">
          <Trans>Masuk ke akun Anda</Trans>
        </h2>
        <p className="auth-card__subtitle">
          <Trans>Pantau kondisi kaki secara real-time setelah masuk.</Trans>
        </p>

        {error && <p className="auth-card__error">{i18n._(error)}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>
              <Trans>Email</Trans>
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="auth-field">
            <span>
              <Trans>Kata Sandi</Trans>
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          <Button
            type="submit"
            variant="primary"
            className="auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? t`Memproses…` : t`Masuk`}
          </Button>
        </form>

        <div className="auth-divider">
          <span>
            <Trans>atau</Trans>
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="auth-google-btn"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          <GoogleIcon />
          <Trans>Masuk dengan Google</Trans>
        </Button>

        <p className="auth-card__footer">
          {/* Tautan ikut MASUK ke dalam pesan. Kalau dipecah jadi teks + <Link>
              terpisah, penerjemah tidak bisa memindahkan posisi tautannya —
              padahal susunan kalimatnya berbeda antar bahasa. */}
          <Trans>
            Belum punya akun? <Link to="/register">Daftar di sini</Link>
          </Trans>
        </p>
      </div>
    </div>
  )
}
