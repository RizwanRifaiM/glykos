import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import GoogleIcon from '../components/GoogleIcon'
import { getAuthErrorMessage } from '../utils/authErrors'
import { COLORS } from '../constants/theme'
import './Auth.css'

export default function RegisterPage() {
  const { user, register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }

    setIsSubmitting(true)
    try {
      await register(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleRegister() {
    setError('')
    setIsSubmitting(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard', { replace: true })
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

        <h2 className="auth-card__title">Buat akun baru</h2>
        <p className="auth-card__subtitle">
          Daftar untuk mulai memantau kondisi kaki secara real-time.
        </p>

        {error && <p className="auth-card__error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Nama Lengkap</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama Anda"
              autoComplete="name"
              required
            />
          </label>
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
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              required
            />
          </label>
          <label className="auth-field">
            <span>Konfirmasi Kata Sandi</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ulangi kata sandi"
              autoComplete="new-password"
              required
            />
          </label>

          <Button
            type="submit"
            variant="primary"
            className="auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Memproses…' : 'Daftar'}
          </Button>
        </form>

        <div className="auth-divider">
          <span>atau</span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="auth-google-btn"
          onClick={handleGoogleRegister}
          disabled={isSubmitting}
        >
          <GoogleIcon />
          Daftar dengan Google
        </Button>

        <p className="auth-card__footer">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </div>
    </div>
  )
}
