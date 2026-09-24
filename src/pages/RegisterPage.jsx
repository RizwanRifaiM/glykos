import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useLingui as useLinguiCore } from '@lingui/react'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import GoogleIcon from '../components/GoogleIcon'
import BrandMark from '../components/BrandMark'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { IconArrowLeft } from '../components/icons'
import { getAuthErrorMsg } from '../utils/authErrors'
import './Auth.css'

// Galat validasi sisi klien — dua-duanya deskriptor, sama seperti galat dari
// Firebase (utils/authErrors.js). Yang disimpan di state adalah DESKRIPTOR,
// bukan kalimat: kalau pengguna mengganti bahasa selagi pesan galat masih
// tampil, pesannya ikut berganti alih-alih tertinggal.
const PASSWORD_MISMATCH = msg`Konfirmasi kata sandi tidak cocok.`
const PASSWORD_TOO_SHORT = msg`Kata sandi minimal 6 karakter.`

export default function RegisterPage() {
  const { user, register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const { t } = useLingui()
  const { i18n } = useLinguiCore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(PASSWORD_MISMATCH)
      return
    }
    if (password.length < 6) {
      setError(PASSWORD_TOO_SHORT)
      return
    }

    setIsSubmitting(true)
    try {
      await register(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getAuthErrorMsg(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleRegister() {
    setError(null)
    setIsSubmitting(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getAuthErrorMsg(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-card__back">
          <IconArrowLeft size={16} />
          <Trans>Kembali ke Beranda</Trans>
        </Link>

        <div className="auth-card__brand">
          <BrandMark size={36} />
          <h1>Glykos</h1>
        </div>

        {/* Halaman masuk/daftar bisa jadi halaman PERTAMA yang dibuka (tautan
            langsung, PWA yang dipasang ke home screen), jadi pemilih bahasanya
            harus ada di sini juga — bukan hanya di halaman depan. */}
        <div className="auth-card__lang">
          <LanguageSwitcher compact />
        </div>

        <h2 className="auth-card__title">
          <Trans>Buat akun baru</Trans>
        </h2>
        <p className="auth-card__subtitle">
          <Trans>Daftar untuk mulai memantau kondisi kaki secara real-time.</Trans>
        </p>

        {error && <p className="auth-card__error">{i18n._(error)}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>
              <Trans>Nama Lengkap</Trans>
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t`Nama Anda`}
              autoComplete="name"
              required
            />
          </label>
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
              placeholder={t`Minimal 6 karakter`}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="auth-field">
            <span>
              <Trans>Konfirmasi Kata Sandi</Trans>
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t`Ulangi kata sandi`}
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
            {isSubmitting ? t`Memproses…` : t`Daftar`}
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
          onClick={handleGoogleRegister}
          disabled={isSubmitting}
        >
          <GoogleIcon />
          <Trans>Daftar dengan Google</Trans>
        </Button>

        <p className="auth-card__footer">
          {/* Tautan ikut masuk ke dalam pesan — lihat catatan yang sama di
              LoginPage.jsx. */}
          <Trans>
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </Trans>
        </p>
      </div>
    </div>
  )
}
