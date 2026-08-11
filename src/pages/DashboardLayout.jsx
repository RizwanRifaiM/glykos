import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { COLORS } from '../constants/theme'
import DeviceSelector from '../components/DeviceSelector'
import ConnectionBar from '../components/ConnectionBar'
import BleConnectButton from '../components/BleConnectButton'
import DemoModeBanner from '../components/DemoModeBanner'
import { isDemoMode } from '../utils/demoMode'
import {
  buildDemoHistory,
  buildDemoReading,
  DEMO_ALERTS,
  DEMO_FATIGUE,
} from '../constants/demoData'
import { useSensorData } from '../hooks/useSensorData'
import { useBleSensor } from '../hooks/useBleSensor'
import { useHistoryData } from '../hooks/useHistoryData'
import { useAlerts, useAlertMonitor } from '../hooks/useAlerts'
import { useFatigueMonitor } from '../hooks/useFatigueMonitor'
import { useStepCounter } from '../hooks/useStepCounter'
import { useFirestoreSync } from '../hooks/useFirestoreSync'
import { useAuth } from '../contexts/auth-context'
import {
  IconLayoutDashboard,
  IconHistory,
  IconShieldAlert,
  IconIdCard,
  IconLogOut,
  IconMessageCircle,
} from '../components/icons'
import '../App.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Ringkasan', end: true, icon: IconLayoutDashboard },
  { to: '/dashboard/chatbot', label: 'Chatbot', icon: IconMessageCircle },
  { to: '/dashboard/history', label: 'Riwayat', icon: IconHistory },
  { to: '/dashboard/alerts', label: 'Peringatan', icon: IconShieldAlert },
  { to: '/dashboard/profile', label: 'Profil', icon: IconIdCard },
]

function Brand() {
  return (
    <div className="app-topbar__brand">
      <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
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

function TopbarUser() {
  const { user, logout } = useAuth()
  const label = user?.displayName || user?.email || 'Pengguna'
  const initial = label.charAt(0).toUpperCase()

  return (
    <button
      type="button"
      className="app-topbar__user"
      onClick={logout}
      title={`Keluar (${label})`}
      aria-label="Keluar"
    >
      {user?.photoURL ? (
        <img className="app-topbar__avatar" src={user.photoURL} alt="" />
      ) : (
        <span className="app-topbar__avatar app-topbar__avatar--fallback">{initial}</span>
      )}
      <IconLogOut size={16} />
    </button>
  )
}

export default function DashboardLayout() {
  const [deviceId, setDeviceId] = useState('glykos-device')
  const [historyRange, setHistoryRange] = useState('7d')
  const demoMode = isDemoMode()

  const {
    data: firestoreData,
    refresh,
    devices,
    isLive: firestoreLive,
  } = useSensorData(deviceId)
  const ble = useBleSensor()
  const { history: realHistory, isLoading: realHistoryLoading } = useHistoryData(
    deviceId,
    historyRange,
  )
  const { alerts: realAlerts, isLoading: realAlertsLoading } = useAlerts(deviceId)

  // Saat perangkat BLE terhubung dan sudah mengirim paket, datanya jadi sumber
  // live yang meng-override data Firestore/cadangan.
  const bleActive = ble.isConnected && ble.reading
  const rawData = bleActive ? ble.reading : firestoreData
  const isLive = bleActive ? true : firestoreLive

  // Firmware BLE tidak menghitung langkah sendiri (hanya kirim AX/AY/AZ
  // mentah) — dihitung di web app lewat useStepCounter, lalu dipakai
  // menggantikan `activity: null` bawaan useBleSensor supaya ActivityPanel
  // menampilkannya lewat jalur yang sama seperti data Firestore.
  const stepCounter = useStepCounter(deviceId, rawData, isLive)

  // Firmware tidak punya WiFi — web app ini yang menuliskan pembacaan BLE ke
  // Firestore (live/current + history) selama perangkat tersambung.
  // Dipanggil SETELAH useStepCounter karena jumlah langkah ikut disimpan;
  // tanpa itu kolom Langkah di tabel Riwayat selalu kosong.
  useFirestoreSync(deviceId, ble.reading, bleActive, stepCounter.steps)
  const liveData =
    bleActive && !rawData.activity && stepCounter.sessionActive
      ? {
          ...rawData,
          activity: {
            steps: stepCounter.steps,
            activeMinutes: Math.round(stepCounter.activeMinutes),
          },
        }
      : rawData

  const liveFatigue = useFatigueMonitor(deviceId, liveData, isLive, stepCounter.steps)

  // useAlertMonitor MENULIS ke Firestore setiap kali status naik ke
  // warning/danger. Di mode demo `null` dioper supaya hook-nya no-op —
  // tanpa ini, angka contoh akan mencatat peringatan palsu ke basis data
  // sungguhan dan muncul lagi nanti sebagai riwayat asli.
  useAlertMonitor(deviceId, demoMode ? null : liveData, liveFatigue)

  // Penggantian data demo dilakukan SETELAH semua hook di atas, supaya jalur
  // data sungguhan (termasuk penulisan Firestore) tidak terpengaruh sama sekali.
  const data = demoMode ? buildDemoReading() : liveData
  const fatigue = demoMode ? DEMO_FATIGUE : liveFatigue
  const history = demoMode ? buildDemoHistory(historyRange === '30d' ? 30 : 7) : realHistory
  const historyLoading = demoMode ? false : realHistoryLoading
  const alerts = demoMode ? DEMO_ALERTS : realAlerts
  const alertsLoading = demoMode ? false : realAlertsLoading
  // Ditandai live supaya banner onboarding "belum ada data" tidak menutupi
  // kartu metrik yang justru ingin ditinjau.
  const displayLive = demoMode ? true : isLive

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Brand />

        <nav className="app-sidebar__nav" aria-label="Navigasi dashboard">
          {NAV_ITEMS.map(({ to, label, end, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`
              }
            >
              <span className="app-sidebar__icon">
                <ItemIcon size={20} />
                {to === '/dashboard/alerts' && alerts.length > 0 && (
                  <span className="app-sidebar__badge">{alerts.length}</span>
                )}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__footer">
          <TopbarUser />
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <Brand />

          <DeviceSelector devices={devices} selectedId={deviceId} onSelect={setDeviceId} />

          <div className="app-topbar__spacer" />

          <BleConnectButton
            supported={ble.supported}
            status={ble.status}
            isConnected={ble.isConnected}
            deviceName={ble.deviceName}
            onConnect={ble.connect}
            onDisconnect={ble.disconnect}
          />

          <ConnectionBar
            connection={
              data?.connection || {
                wifi: false,
                signalStrength: -100,
                lastUpdate: new Date(),
              }
            }
          />

          <TopbarUser />
        </header>

        {ble.error && (
          <p className="ble-error" role="alert">
            Bluetooth: {ble.error}
          </p>
        )}

        {demoMode && <DemoModeBanner />}

        <main className="app-main">
          <Outlet
            context={{
              deviceId,
              data,
              isLive: displayLive,
              refresh,
              history,
              historyLoading,
              historyRange,
              setHistoryRange,
              alerts,
              alertsLoading,
              fatigue,
              ble,
            }}
          />
        </main>

        <footer className="footer app-footer">
          <p>Glykos — pemantauan kaki diabetes</p>
        </footer>
      </div>

      <nav className="app-bottom-nav" aria-label="Navigasi dashboard">
        {NAV_ITEMS.map(({ to, label, end, icon: ItemIcon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `app-bottom-nav__link ${isActive ? 'app-bottom-nav__link--active' : ''}`
            }
          >
            <span className="app-bottom-nav__icon">
              <ItemIcon size={20} />
              {to === '/dashboard/alerts' && alerts.length > 0 && (
                <span className="app-bottom-nav__badge">{alerts.length}</span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
