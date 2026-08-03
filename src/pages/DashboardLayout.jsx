import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { COLORS } from '../constants/theme'
import DeviceSelector from '../components/DeviceSelector'
import ConnectionBar from '../components/ConnectionBar'
import { useSensorData } from '../hooks/useSensorData'
import { useHistoryData } from '../hooks/useHistoryData'
import { useAlerts, useAlertMonitor } from '../hooks/useAlerts'
import { useAuth } from '../contexts/auth-context'
import {
  IconLayoutDashboard,
  IconHistory,
  IconShieldAlert,
  IconIdCard,
  IconLogOut,
  IconMenu,
  IconX,
} from '../components/icons'
import '../App.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Ringkasan', end: true, icon: IconLayoutDashboard },
  { to: '/dashboard/history', label: 'Riwayat Data', icon: IconHistory },
  { to: '/dashboard/alerts', label: 'Riwayat Peringatan', icon: IconShieldAlert },
  { to: '/dashboard/profile', label: 'Profil Pasien', icon: IconIdCard },
]

function Brand() {
  return (
    <div className="app-sidebar__brand">
      <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill={COLORS.navy} />
        <path d="M24 8c-2 6-8 10-8 16a8 8 0 0016 0c0-6-6-10-8-16z" fill={COLORS.lightBlue} />
        <path
          d="M18 32c2 4 6 6 6 6s4-2 6-6"
          stroke={COLORS.cream}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span>Glykos</span>
    </div>
  )
}

function SidebarUser({ onNavigate }) {
  const { user, logout } = useAuth()
  const label = user?.displayName || user?.email || 'Pengguna'
  const initial = label.charAt(0).toUpperCase()

  return (
    <div className="app-sidebar__user">
      {user?.photoURL ? (
        <img className="app-sidebar__avatar" src={user.photoURL} alt="" />
      ) : (
        <span className="app-sidebar__avatar app-sidebar__avatar--fallback">{initial}</span>
      )}
      <div className="app-sidebar__user-info">
        <strong>{label}</strong>
        <span>{user?.email}</span>
      </div>
      <button
        type="button"
        className="app-sidebar__logout"
        onClick={() => {
          onNavigate?.()
          logout()
        }}
        title="Keluar"
        aria-label="Keluar"
      >
        <IconLogOut size={18} />
      </button>
    </div>
  )
}

export default function DashboardLayout() {
  const [deviceId, setDeviceId] = useState('ESP32-001')
  const [historyRange, setHistoryRange] = useState('7d')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const { data, refresh, devices, isLive } = useSensorData(deviceId)
  const { history, isLoading: historyLoading } = useHistoryData(deviceId, historyRange)
  const { alerts, isLoading: alertsLoading } = useAlerts(deviceId)

  useAlertMonitor(deviceId, data)

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${mobileNavOpen ? 'app-sidebar--open' : ''}`}>
        <div className="app-sidebar__header">
          <Brand />
          <button
            type="button"
            className="app-sidebar__close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu"
          >
            <IconX size={20} />
          </button>
        </div>

        <nav className="app-sidebar__nav" aria-label="Navigasi dashboard">
          {NAV_ITEMS.map(({ to, label, end, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`
              }
              onClick={() => setMobileNavOpen(false)}
            >
              <ItemIcon size={18} />
              <span>{label}</span>
              {to === '/dashboard/alerts' && alerts.length > 0 && (
                <span className="app-sidebar__badge">{alerts.length}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <SidebarUser />
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="app-sidebar-overlay"
          aria-label="Tutup menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="app-content">
        <header className="app-topbar">
          <button
            type="button"
            className="app-topbar__menu"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka menu navigasi"
          >
            <IconMenu size={20} />
          </button>

          <DeviceSelector devices={devices} selectedId={deviceId} onSelect={setDeviceId} />

          <div className="app-topbar__spacer" />

          <ConnectionBar
            connection={
              data?.connection || {
                wifi: false,
                signalStrength: -100,
                lastUpdate: new Date(),
              }
            }
          />
        </header>

        <main className="app-main">
          <Outlet
            context={{
              deviceId,
              data,
              isLive,
              refresh,
              history,
              historyLoading,
              historyRange,
              setHistoryRange,
              alerts,
              alertsLoading,
            }}
          />
        </main>

        <footer className="footer app-footer">
          <p>Glykos · ESP32 DevKit V1 · FSR 402 · NTC · SHT30 · MPU6050</p>
        </footer>
      </div>
    </div>
  )
}
