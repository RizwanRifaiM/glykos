import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { msg, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { profileDoc } from '../services/paths'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import FaqAccordion from '../components/FaqAccordion'
import { IconBell } from '../components/icons'
import PageHeader from '../components/PageHeader'
import { SkeletonForm } from '../components/Skeleton'
import { formatTimeOfDay } from '../utils/locale'
import {
  getNotificationPermission,
  isNotificationSupported,
  notify,
  requestNotificationPermission,
} from '../utils/notifications'

const EMPTY_PROFILE = {
  diabetesType: '',
  hba1c: '',
  woundHistory: '',
  emergencyContact: '',
}

// Hasil uji notifikasi disimpan sebagai DESKRIPTOR, bukan kalimat: pesannya
// bertahan di layar dan harus ikut berganti kalau pengguna mengganti bahasa
// sesudahnya.
const TEST_DELIVERED = msg`Terkirim — periksa notifikasi perangkat Anda.`
const TEST_FAILED = msg`Gagal dikirim. Periksa izin notifikasi di pengaturan browser atau sistem.`

// Pilihan tipe diabetes. `value` adalah NILAI TERSIMPAN dan tidak ikut
// diterjemahkan — ia masuk ke Firestore, jadi mengubahnya berarti memutus
// hubungan dengan profil yang sudah tersimpan. Yang diterjemahkan hanya
// labelnya.
const DIABETES_TYPES = [
  { value: 'tipe-1', label: msg`Tipe 1` },
  { value: 'tipe-2', label: msg`Tipe 2` },
  { value: 'gestasional', label: msg`Gestasional` },
]

export default function ProfilePage() {
  const { deviceId, data } = useOutletContext()
  const { user } = useAuth()
  const { i18n } = useLingui()

  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [permission, setPermission] = useState(getNotificationPermission())
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    if (!user) return
    const ref = profileDoc(user.uid)
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
        profileDoc(user.uid),
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

  async function handleTestNotification() {
    const delivered = await notify(
      t(i18n)`Glykos — Notifikasi Uji`,
      t(i18n)`Notifikasi berhasil dikirim. Peringatan sungguhan akan tampil seperti ini.`,
      { tag: 'glykos-test' },
    )
    setTestResult(delivered ? TEST_DELIVERED : TEST_FAILED)
  }

  const deviceName = data?.device?.name ?? deviceId
  const savedTime = savedAt ? formatTimeOfDay(savedAt) : null

  return (
    <div className="profile-page">
      <PageHeader title={t(i18n)`Profil`} subtitle={user?.displayName || user?.email} />

      <section className="panel profile-panel">
        <h2 className="panel__title">
          <Trans>Profil Pasien</Trans>
        </h2>
        <p className="panel__subtitle">
          <Trans>Perangkat terpasang: {deviceName}</Trans>
        </p>

        {isLoading ? (
          <SkeletonForm fields={4} />
        ) : (
          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="profile-field">
              <span>
                <Trans>Tipe Diabetes</Trans>
              </span>
              <select
                value={profile.diabetesType}
                onChange={(e) => updateField('diabetesType', e.target.value)}
              >
                <option value="">{t(i18n)`Pilih tipe`}</option>
                {DIABETES_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {i18n._(option.label)}
                  </option>
                ))}
              </select>
            </label>

            <label className="profile-field">
              <span>
                <Trans>HbA1c Terakhir (%)</Trans>
              </span>
              <input
                type="number"
                step="0.1"
                value={profile.hba1c}
                onChange={(e) => updateField('hba1c', e.target.value)}
                placeholder={t(i18n)`mis. 7.2`}
              />
            </label>

            <label className="profile-field profile-field--full">
              <span>
                <Trans>Riwayat Luka / Ulkus</Trans>
              </span>
              <textarea
                rows={3}
                value={profile.woundHistory}
                onChange={(e) => updateField('woundHistory', e.target.value)}
                placeholder={t(i18n)`Catatan riwayat luka kaki, operasi, atau amputasi sebelumnya`}
              />
            </label>

            <label className="profile-field profile-field--full">
              <span>
                <Trans>Kontak Darurat</Trans>
              </span>
              <input
                type="text"
                value={profile.emergencyContact}
                onChange={(e) => updateField('emergencyContact', e.target.value)}
                placeholder={t(i18n)`Nama & nomor telepon`}
              />
            </label>

            <div className="profile-form__actions profile-field--full">
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? t(i18n)`Menyimpan…` : t(i18n)`Simpan Profil`}
              </Button>
              {savedTime && (
                <span className="profile-form__saved">
                  <Trans>Tersimpan {savedTime}</Trans>
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel profile-panel">
        <h2 className="panel__title">
          <Trans>Notifikasi Peringatan</Trans>
        </h2>
        <p className="panel__subtitle">
          <Trans>
            Izinkan notifikasi browser untuk mendapat peringatan instan saat status berubah menjadi
            Risiko.
          </Trans>
        </p>
        {!isNotificationSupported() ? (
          <p>
            <Trans>Browser ini tidak mendukung notifikasi.</Trans>
          </p>
        ) : permission === 'granted' ? (
          <>
            <p className="profile-form__saved">
              <Trans>Notifikasi aktif di browser ini.</Trans>
            </p>
            {/* Tombol uji ini bukan pemanis. Notifikasi peringatan hanya
                muncul saat status benar-benar naik ke Risiko — jadi tanpa cara
                mencobanya, kegagalan pengiriman (izin dicabut, service worker
                belum aktif, notifikasi dibungkam OS) baru ketahuan tepat pada
                saat peringatan yang sungguhan gagal sampai. */}
            <div className="profile-form__actions">
              <Button variant="outline" onClick={handleTestNotification}>
                <IconBell size={16} />
                <Trans>Kirim Notifikasi Uji</Trans>
              </Button>
              {testResult && <span className="profile-form__saved">{i18n._(testResult)}</span>}
            </div>
          </>
        ) : permission === 'denied' ? (
          <p>
            <Trans>
              Notifikasi diblokir. Aktifkan lewat pengaturan izin situs pada browser Anda.
            </Trans>
          </p>
        ) : (
          <Button variant="primary" onClick={handleEnableNotifications}>
            <IconBell size={16} />
            <Trans>Aktifkan Notifikasi</Trans>
          </Button>
        )}
      </section>

      <section className="panel profile-panel">
        <h2 className="panel__title">
          <Trans>Bantuan &amp; Pertanyaan Umum</Trans>
        </h2>
        <p className="panel__subtitle">
          <Trans>
            Masalah yang sering dialami pengguna seputar koneksi perangkat dan fitur aplikasi.
          </Trans>
        </p>
        <FaqAccordion />
      </section>
    </div>
  )
}
