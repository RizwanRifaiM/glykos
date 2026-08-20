import { Suspense, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useLingui as useLinguiCore } from '@lingui/react'
import BrandMark from '../components/BrandMark'
import LanguageSwitcher from '../components/LanguageSwitcher'
import DeviceSelector from '../components/DeviceSelector'
import ConnectionBar from '../components/ConnectionBar'
import BleConnectButton from '../components/BleConnectButton'
import DemoModeBanner from '../components/DemoModeBanner'
import { SkeletonPage } from '../components/Skeleton'
import { demoPreference, shouldUseDemoData } from '../utils/demoMode'
import {
  buildDemoHistory,
  buildDemoReading,
  DEMO_ALERTS,
  DEMO_FATIGUE,
} from '../constants/demoData'
import { emptyReading, useSensorData } from '../hooks/useSensorData'
import { useBleSensor } from '../hooks/useBleSensor'
import { useHistoryData } from '../hooks/useHistoryData'
import { useAlerts, useAlertMonitor } from '../hooks/useAlerts'
import { useFatigueMonitor } from '../hooks/useFatigueMonitor'
import { useStepCounter } from '../hooks/useStepCounter'
import { useFirestoreSync } from '../hooks/useFirestoreSync'
import { useTemperatureTrendAlert } from '../hooks/useTemperatureTrendAlert'
import { useWakeLock } from '../hooks/useWakeLock'
import { useDayKey } from '../hooks/useDayKey'
import { evaluateTemperatureTrend } from '../utils/temperatureTrend'
import { resolveReadingSource, todayActivity } from '../utils/dailyReading'
import { useAuth } from '../contexts/auth-context'
import {
  IconLayoutDashboard,
  IconHistory,
  IconShieldAlert,
  IconIdCard,
  IconLogOut,
  IconMessageCircle,
  IconSunDot,
} from '../components/icons'
import '../App.css'

// Label navigasi sebagai deskriptor `msg`. Daftar ini dievaluasi sekali saat
// modul dimuat, jadi kalau isinya sudah berupa string ia terkunci pada bahasa
// saat itu — sidebar akan jadi satu-satunya bagian dashboard yang tidak ikut
// berganti.
const NAV_ITEMS = [
  { to: '/dashboard', label: msg`Ringkasan`, end: true, icon: IconLayoutDashboard },
  { to: '/dashboard/chatbot', label: msg`Chatbot`, icon: IconMessageCircle },
  { to: '/dashboard/history', label: msg`Riwayat`, icon: IconHistory },
  { to: '/dashboard/alerts', label: msg`Peringatan`, icon: IconShieldAlert },
  { to: '/dashboard/profile', label: msg`Profil`, icon: IconIdCard },
]

function Brand() {
  return (
    <div className="app-topbar__brand">
      <BrandMark size={26} />
      <span>Glykos</span>
    </div>
  )
}

function TopbarUser() {
  const { user, logout } = useAuth()
  const { t } = useLingui()
  const label = user?.displayName || user?.email || t`Pengguna`
  const initial = label.charAt(0).toUpperCase()

  // Menyimpan URL yang GAGAL, bukan sekadar flag boolean: dengan begini
  // statusnya pulih sendiri saat pengguna berganti akun (photoURL berubah),
  // tanpa perlu effect untuk mereset.
  const [failedPhoto, setFailedPhoto] = useState(null)
  const photoURL = user?.photoURL
  const showPhoto = Boolean(photoURL) && failedPhoto !== photoURL

  return (
    <button
      type="button"
      className="app-topbar__user"
      onClick={logout}
      title={t`Keluar (${label})`}
      aria-label={t`Keluar`}
    >
      {showPhoto ? (
        <img
          className="app-topbar__avatar"
          src={photoURL}
          alt=""
          // Google membalas 403 untuk URL avatar lh3.googleusercontent.com bila
          // browser mengirim header Referer dari origin yang tidak dikenalnya —
          // localhost adalah kasus paling seringnya. Tanpa baris ini, fotonya
          // gagal dimuat dan yang tampil adalah ikon gambar rusak, yang mudah
          // disalahartikan sebagai elemen yang belum di-styling.
          referrerPolicy="no-referrer"
          // Jaring pengaman untuk semua sebab lain (offline, URL kedaluwarsa,
          // pemblokir konten): jatuh ke inisial yang memang sudah bergaya,
          // bukan membiarkan gambar rusak.
          onError={() => setFailedPhoto(photoURL)}
        />
      ) : (
        <span className="app-topbar__avatar app-topbar__avatar--fallback">{initial}</span>
      )}
      <IconLogOut size={16} />
    </button>
  )
}

export default function DashboardLayout() {
  const { t } = useLingui()
  // `i18n` dipakai untuk menyelesaikan deskriptor label navigasi. Sekaligus
  // membuat komponen ini berlangganan perubahan bahasa — penting karena data
  // contoh (buildDemoHistory) merakit label tanggal menurut bahasa aktif.
  const { i18n } = useLinguiCore()
  const [deviceId, setDeviceId] = useState('glykos-device')
  const [historyRange, setHistoryRange] = useState('7d')
  // Berganti sendiri tepat pukul 00:00 — inilah yang mengakhiri masa berlaku
  // pembacaan kemarin. Lihat useDayKey.js.
  const todayKey = useDayKey()
  const demoPref = demoPreference()

  // Seluruh data sensor tersimpan di bawah users/{uid} — lihat services/paths.js.
  // Tanpa uid, hook-hook di bawah tidak berlangganan apa pun.
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const {
    data: firestoreData,
    refresh,
    devices,
    isLive: firestoreLive,
    isStale: firestoreStale,
    updatedAtMs,
    hasData: firestoreHasData,
    isLoaded: firestoreLoaded,
  } = useSensorData(uid, deviceId)
  const ble = useBleSensor()
  const { history: realHistory, isLoading: realHistoryLoading } = useHistoryData(
    uid,
    deviceId,
    historyRange,
  )
  const { alerts: realAlerts, isLoading: realAlertsLoading } = useAlerts(uid, deviceId)

  // Saat perangkat BLE terhubung dan sudah mengirim paket, datanya jadi sumber
  // live yang meng-override data Firestore/cadangan.
  //
  // `Boolean(...)` bukan hiasan. Tanpanya nilainya adalah OBJEK `ble.reading`,
  // yang identitasnya berganti pada SETIAP paket BLE (~3 kali per detik). Nilai
  // itu dipakai sebagai dependensi effect di useFirestoreSync dan useWakeLock,
  // jadi keduanya ikut dipasang ulang tiga kali per detik: interval 60 detik
  // tidak pernah sempat menembak (setiap pemasangan ulang menulis ke Firestore
  // lagi), sessionId berganti tiap paket sehingga hitungan langkah harian
  // menggelembung, dan wake lock berulang kali dilepas lalu diminta ulang.
  const bleActive = Boolean(ble.isConnected && ble.reading)

  // SUMBER ANGKA DI KARTU, berurutan:
  //   1. pembacaan BLE terakhir — bertahan setelah perangkat terputus, jadi
  //      angka yang sudah sempat terbaca tidak hilang hanya karena koneksinya
  //      putus;
  //   2. dokumen live Firestore — dipakai setelah halaman dimuat ulang, saat
  //      pembacaan di memori sudah tidak ada.
  //
  // Keduanya dibatasi HARI INI. Lihat catatan tentang reset tengah malam di
  // bawah.
  // Aturannya sendiri ada di utils/dailyReading.js (fungsi murni, bisa diuji
  // tanpa merender apa pun); di sini hanya disambungkan ke sumber datanya.
  const readingSource = resolveReadingSource({
    todayKey,
    bleActive,
    bleDate: ble.reading?.tanggal ?? null,
    firestoreHasData,
    firestoreDate: firestoreData?.tanggal ?? null,
  })
  const firestoreIsToday = readingSource === 'firestore'
  const rawData = readingSource === 'ble' ? ble.reading : firestoreData

  // RESET SEKALI SEHARI, PUKUL 00:00 — bukan saat perangkat terputus.
  //
  // Angka di kartu adalah pembacaan TERAKHIR yang diterima, dan pembacaan itu
  // tetap berlaku sepanjang hari meski perangkat sudah dilepas: kaki yang
  // menerima tekanan 240 kPa pagi tadi tetap menerima tekanan itu, dan
  // menghapusnya dari layar begitu Bluetooth putus menyembunyikan kejadian yang
  // sungguh terjadi.
  //
  // Yang mengakhiri masa berlakunya adalah pergantian hari. `useDayKey`
  // berganti tepat tengah malam, dan karena setiap pembacaan membawa
  // `tanggal`-nya sendiri, perbandingan ini bekerja sama benarnya baik untuk
  // halaman yang dibuka melewati tengah malam maupun yang baru dibuka
  // keesokan harinya.
  //
  // Tidak ada apa pun yang dihapus dari Firestore saat reset ini: `live/current`
  // tetap berisi pembacaan terakhir, hanya berhenti ditampilkan sebagai
  // pembacaan HARI INI. Riwayat harian tetap utuh di koleksi `daily`.
  const hasReadingToday = readingSource !== 'none'

  // "Live" menuntut pembacaan hari ini, bukan sekadar dokumen yang segar.
  // Keduanya nyaris selalu sama — kecuali persis di sekitar tengah malam, saat
  // dokumen berumur dua menit sudah menjadi milik hari kemarin.
  const isLive = bleActive ? true : firestoreLive && firestoreIsToday

  // Data contoh dipakai selama pengguna belum punya data sendiri — supaya
  // dashboard sesudah login tidak berisi angka nol semua. Begitu ada pembacaan
  // nyata (BLE tersambung ATAU dokumen live sudah pernah ditulis), data contoh
  // mundur seketika: yang nyata selalu menang. Lihat utils/demoMode.js.
  //
  // Sengaja memakai `firestoreHasData` (pernah punya data), BUKAN
  // `hasReadingToday`. Kalau dipakai yang kedua, dashboard akan berbalik
  // menampilkan data contoh setiap lewat tengah malam — pengguna yang kemarin
  // melihat angkanya sendiri akan menemukan angka karangan pada 00.01, tanpa
  // spanduk penanda apa pun (mode auto memang tanpa spanduk). Keadaan kosong
  // yang jujur jauh lebih baik di sana.
  const hasRealData = Boolean(bleActive || firestoreHasData)
  const demoMode = shouldUseDemoData(demoPref, {
    hasRealData,
    isLoaded: firestoreLoaded,
  })

  // Firmware BLE tidak menghitung langkah sendiri (hanya kirim AX/AY/AZ
  // mentah) — dihitung di web app lewat useStepCounter, lalu dipakai
  // menggantikan `activity: null` bawaan useBleSensor supaya ActivityPanel
  // menampilkannya lewat jalur yang sama seperti data Firestore.
  const stepCounter = useStepCounter(deviceId, rawData, isLive)

  // Layar ditahan menyala HANYA selama BLE benar-benar tersambung — layar mati
  // membekukan halaman, dan halaman inilah satu-satunya jalur data perangkat.
  // Lihat useWakeLock.js.
  const wakeLockStatus = useWakeLock(bleActive)

  // Firmware tidak punya WiFi — web app ini yang menuliskan pembacaan BLE ke
  // Firestore (live/current + history) selama perangkat tersambung.
  // Dipanggil SETELAH useStepCounter karena jumlah langkah ikut disimpan;
  // tanpa itu kolom Langkah di tabel Riwayat selalu kosong.
  const { syncedSteps } = useFirestoreSync(
    uid,
    deviceId,
    ble.reading,
    bleActive,
    stepCounter.steps,
    stepCounter.activeMinutes,
  )

  // AKTIVITAS DITAMPILKAN SEBAGAI TOTAL HARI INI, bukan total sesi berjalan.
  //
  // Hitungan langkah di useStepCounter direset tiap kali perangkat tersambung
  // ulang — benar untuk keperluannya sendiri (deteksi kelelahan mengukur satu
  // sesi pemakaian), tapi salah untuk kartu: seseorang yang menyambungkan
  // perangkat lagi sore hari akan melihat langkah paginya lenyap. Aturan
  // penggabungannya ada di utils/dailyReading.js.
  const todayPoint = realHistory.length > 0 ? realHistory[realHistory.length - 1] : null
  const rollupSteps = todayPoint?.date === todayKey ? (todayPoint.steps ?? 0) : 0
  const rollupActiveMinutes = todayPoint?.date === todayKey ? (todayPoint.activeMinutes ?? 0) : 0

  const activityToday = useMemo(
    () =>
      todayActivity({
        rollupSteps,
        rollupActiveMinutes,
        sessionSteps: stepCounter.steps,
        sessionActiveMinutes: stepCounter.activeMinutes,
        syncedSteps,
      }),
    [rollupSteps, rollupActiveMinutes, stepCounter.steps, stepCounter.activeMinutes, syncedSteps],
  )

  // Tanpa pembacaan hari ini, kartu diisi NOL — bukan angka kemarin, dan bukan
  // data contoh. Inilah wujud reset pukul 00:00 di layar.
  const liveData = useMemo(() => {
    if (!hasReadingToday) return emptyReading(deviceId)
    return activityToday ? { ...rawData, activity: activityToday } : rawData
  }, [hasReadingToday, deviceId, rawData, activityToday])

  const liveFatigue = useFatigueMonitor(deviceId, liveData, isLive, stepCounter.steps)

  // useAlertMonitor MENULIS ke Firestore setiap kali status naik ke
  // warning/danger. Di mode demo `null` dioper supaya hook-nya no-op —
  // tanpa ini, angka contoh akan mencatat peringatan palsu ke basis data
  // sungguhan dan muncul lagi nanti sebagai riwayat asli.
  useAlertMonitor(uid, deviceId, demoMode ? null : liveData, liveFatigue)

  // Penggantian data demo dilakukan SETELAH semua hook di atas, supaya jalur
  // data sungguhan (termasuk penulisan Firestore) tidak terpengaruh sama sekali.
  const data = demoMode ? buildDemoReading() : liveData
  const fatigue = demoMode ? DEMO_FATIGUE : liveFatigue
  const history = demoMode ? buildDemoHistory(historyRange === '30d' ? 30 : 7) : realHistory
  const historyLoading = demoMode ? false : realHistoryLoading
  const alerts = demoMode ? DEMO_ALERTS : realAlerts
  const alertsLoading = demoMode ? false : realAlertsLoading

  // Aturan "selisih suhu bertahan berhari-hari" dihitung dari rangkuman
  // HARIAN, bukan pembacaan live — jadi sumbernya `history`, bukan `data`.
  // Lihat utils/temperatureTrend.js.
  const temperatureTrend = useMemo(() => evaluateTemperatureTrend(history), [history])

  // uid `null` saat mode demo membuat hook-nya no-op, dengan alasan yang sama
  // seperti useAlertMonitor di atas: angka contoh tidak boleh mengendap di
  // Firestore sebagai peringatan sungguhan.
  useTemperatureTrendAlert(demoMode ? null : uid, deviceId, temperatureTrend)
  // Ditandai live supaya banner onboarding "belum ada data" tidak menutupi
  // kartu metrik yang justru ingin ditinjau. Ajakan menyambungkan perangkat
  // tidak hilang — pindah ke DemoModeBanner yang membawa tombol Bluetooth-nya.
  const displayLive = demoMode ? true : isLive
  // "Basi" hanya berlaku untuk data Firestore: selama BLE tersambung, sumber
  // datanya perangkat langsung dan selalu baru.
  //
  // `!hasReadingToday` juga mematikannya: hari yang baru dimulai bukan "data
  // yang berhenti diperbarui", melainkan hari yang memang belum punya
  // pembacaan. Spanduk yang tepat untuk keadaan itu adalah ajakan
  // menyambungkan perangkat, yang muncul sendiri saat live & stale sama-sama
  // mati (lihat DashboardOverview.jsx).
  const displayStale =
    demoMode || bleActive || !hasReadingToday ? false : firestoreStale
  // Variabel dulu: ekspresi anggota di dalam <Trans> ditolak rule
  // lingui/no-expression-in-message.
  const bleError = ble.error

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Brand />

        <nav className="app-sidebar__nav" aria-label={t`Navigasi dashboard`}>
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
              <span>{i18n._(label)}</span>
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

          {/* Menahan layar menyala adalah perubahan perilaku yang terasa di
              baterai pengguna — jadi dinyatakan, bukan dilakukan diam-diam. */}
          {wakeLockStatus === 'active' && (
            <span
              className="wakelock-pill"
              title={t`Layar ditahan menyala selama sepatu tersambung, supaya data tidak terputus saat layar mati.`}
            >
              <IconSunDot size={14} />
              <span className="wakelock-pill__label">
                <Trans>Layar aktif</Trans>
              </span>
            </span>
          )}

          {/* Pemilih bahasa di topbar, bukan disembunyikan di halaman Profil:
              seseorang yang tidak mengerti bahasa yang sedang aktif harus bisa
              menemukan jalan keluarnya tanpa lebih dulu menavigasi menu
              berbahasa itu. Bentuk compact (ID/EN) supaya tidak berebut ruang
              dengan status koneksi. */}
          <LanguageSwitcher compact />

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

        {bleError && (
          <p className="ble-error" role="alert">
            <Trans>Bluetooth: {bleError}</Trans>
          </p>
        )}

        {/* Hanya untuk mode demo yang diminta eksplisit lewat ?demo=1. Pada
            mode otomatis (default, saat pengguna belum punya data) spanduknya
            sengaja tidak ditampilkan atas permintaan — dashboard langsung
            berisi data contoh tanpa penanda. */}
        {demoMode && demoPref === 'on' && <DemoModeBanner />}

        <main className="app-main">
          {/* Batas Suspense sendiri untuk rute anak: saat berpindah halaman,
              yang berkerangka hanya area konten — sidebar & topbar tetap di
              tempatnya. Tanpa ini, fallback di App.jsx yang menutupi seluruh
              layar ikut menelan shell dashboard tiap kali pindah halaman. */}
          <Suspense fallback={<SkeletonPage />}>
            <Outlet
              context={{
                deviceId,
                data,
                isLive: displayLive,
                isStale: displayStale,
                updatedAtMs,
                refresh,
                history,
                historyLoading,
                historyRange,
                setHistoryRange,
                alerts,
                alertsLoading,
                fatigue,
                temperatureTrend,
                // Dibutuhkan ChatbotPage: angka contoh harus ditandai sebagai
                // contoh sebelum dikirim ke model, bukan disajikan sebagai
                // kondisi kaki pengguna. Lihat utils/sensorContext.js.
                demoMode,
                ble,
              }}
            />
          </Suspense>
        </main>

        <footer className="footer app-footer">
          <p>
            <Trans>Glykos — pemantauan kaki diabetes</Trans>
          </p>
        </footer>
      </div>

      <nav className="app-bottom-nav" aria-label={t`Navigasi dashboard`}>
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
            <span>{i18n._(label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
