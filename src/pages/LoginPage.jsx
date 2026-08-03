import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import GoogleIcon from '../components/GoogleIcon'
import { getAuthErrorMessage } from '../utils/authErrors'
import { COLORS } from '../constants/theme'
import './Auth.css'

export default function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setIsSubmitting(true)
    try {
      await loginWithGoogle()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
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

        <h2 className="auth-card__title">Masuk ke akun Anda</h2>
        <p className="auth-card__subtitle">
          Pantau kondisi kaki secara real-time setelah masuk.
        </p>

        {error && <p className="auth-card__error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
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
            <span>Kata Sandi</span>
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
            {isSubmitting ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="auth-google-btn"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          <GoogleIcon />
          Masuk dengan Google
        </Button>

        <p className="auth-card__footer">
          Belum punya akun? <Link to="/register">Daftar di sini</Link>
        </p>
      </div>
    </div>
  )
}
