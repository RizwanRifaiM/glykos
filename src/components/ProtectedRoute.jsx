import { Navigate, useLocation } from 'react-router-dom'
import { useLingui } from '@lingui/react/macro'
import { useAuth } from '../contexts/auth-context'
import AppLoader from './AppLoader'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { t } = useLingui()

  // Firebase Auth memulihkan sesi dari penyimpanan lokal sebelum memutuskan
  // apakah pengguna sudah login. Selama itu jangan mengalihkan ke /login —
  // pengguna yang sudah masuk akan terlempar keluar tiap kali me-refresh.
  if (loading) {
    return <AppLoader label={t`Memeriksa sesi…`} />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
