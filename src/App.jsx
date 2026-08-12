import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLoader from './components/AppLoader'
import LandingPage from './pages/LandingPage'

// Landing page dimuat langsung — itu halaman pertama yang dilihat pengunjung,
// jadi menundanya justru memperlambat yang paling sering dibuka.
//
// Sisanya dipecah: seluruh dashboard (termasuk Firestore, grafik, dan chatbot)
// tidak perlu ikut terunduh sebelum seseorang benar-benar masuk. Sebelumnya
// semuanya jadi satu chunk >1 MB yang harus selesai diunduh hanya untuk
// menampilkan halaman depan.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'))
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const AlertsPage = lazy(() => import('./pages/AlertsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ChatbotPage = lazy(() => import('./pages/ChatbotPage'))

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<AppLoader label="Memuat halaman…" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="chatbot" element={<ChatbotPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
