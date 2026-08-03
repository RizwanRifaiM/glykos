import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import { IconBell } from '../components/icons'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../utils/notifications'

const EMPTY_PROFILE = {
  diabetesType: '',
  hba1c: '',
  woundHistory: '',
  emergencyContact: '',
}

export default function ProfilePage() {
  const { deviceId, data } = useOutletContext()
  const { user } = useAuth()

  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [permission, setPermission] = useState(getNotificationPermission())

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({ ...EMPTY_PROFILE, ...snap.data() })
        }
        setIsLoading(false)
      },
      () => setIsLoading(false),
    )
    return unsubscribe
  }, [user])

  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!user) return
    setIsSaving(true)
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { ...profile, updatedAt: serverTimestamp() },
        { merge: true },
      )
      setSavedAt(new Date())
    } catch (err) {
      console.warn('Gagal menyimpan profil:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  return (
    <div className="profile-page">
      <section className="panel profile-panel">
        <h2 className="panel__title">Profil Pasien</h2>
        <p className="panel__subtitle">
          {user?.displayName || user?.email} · Perangkat terpasang: {data?.device?.name ?? deviceId}
        </p>

        {isLoading ? (
          <div className="loading">Memuat profil…</div>
        ) : (
          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="profile-field">
              <span>Tipe Diabetes</span>
              <select
                value={profile.diabetesType}
                onChange={(e) => updateField('diabetesType', e.target.value)}
              >
                <option value="">Pilih tipe</option>
                <option value="tipe-1">Tipe 1</option>
                <option value="tipe-2">Tipe 2</option>
                <option value="gestasional">Gestasional</option>
              </select>
            </label>

            <label className="profile-field">
              <span>HbA1c Terakhir (%)</span>
              <input
                type="number"
                step="0.1"
                value={profile.hba1c}
                onChange={(e) => updateField('hba1c', e.target.value)}
                placeholder="mis. 7.2"
              />
            </label>

            <label className="profile-field">
              <span>Riwayat Luka / Ulkus</span>
              <textarea
                rows={3}
                value={profile.woundHistory}
                onChange={(e) => updateField('woundHistory', e.target.value)}
                placeholder="Catatan riwayat luka kaki, operasi, atau amputasi sebelumnya"
              />
            </label>

            <label className="profile-field">
              <span>Kontak Darurat</span>
              <input
                type="text"
                value={profile.emergencyContact}
                onChange={(e) => updateField('emergencyContact', e.target.value)}
                placeholder="Nama & nomor telepon"
              />
            </label>

            <div className="profile-form__actions">
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Menyimpan…' : 'Simpan Profil'}
              </Button>
              {savedAt && (
                <span className="profile-form__saved">
                  Tersimpan {savedAt.toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel profile-panel">
        <h2 className="panel__title">Notifikasi Peringatan</h2>
        <p className="panel__subtitle">
          Izinkan notifikasi browser untuk mendapat peringatan instan saat status berubah menjadi Risiko.
        </p>
        {!isNotificationSupported() ? (
          <p>Browser ini tidak mendukung notifikasi.</p>
        ) : permission === 'granted' ? (
          <p className="profile-form__saved">Notifikasi aktif di browser ini.</p>
        ) : permission === 'denied' ? (
          <p>Notifikasi diblokir. Aktifkan lewat pengaturan izin situs pada browser Anda.</p>
        ) : (
          <Button variant="primary" onClick={handleEnableNotifications}>
            <IconBell size={16} />
            Aktifkan Notifikasi
          </Button>
        )}
      </section>
    </div>
  )
}
