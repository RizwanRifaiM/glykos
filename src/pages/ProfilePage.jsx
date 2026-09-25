import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore'
import { msg, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { db } from '../services/firestore'
import { labsCollection, profileDoc } from '../services/paths'
import { useAuth } from '../contexts/auth-context'
import Button from '../components/Button'
import FaqAccordion from '../components/FaqAccordion'
import AppInstallPanel from '../components/AppInstallPanel'
import { IconBell, IconCheck, IconDroplet, IconHistory, IconUser } from '../components/icons'
import SegmentedControl from '../components/SegmentedControl'
import SelectMenu from '../components/SelectMenu'
import PageHeader from '../components/PageHeader'
import { SkeletonForm } from '../components/Skeleton'
import { formatTimeOfDay } from '../utils/locale'
import { useDayKey } from '../hooks/useDayKey'
import RiskProfilePanel from '../components/RiskProfilePanel'
import {
  HBA1C_RANGE,
  HBA1C_VALID_DAYS,
  LDL_RANGE,
  LDL_VALID_DAYS,
  parseLabDate,
  readLab,
} from '../utils/riskProfile'
import { describeLabStatus, riskTierLabel } from '../utils/alertMessages'
import { newLabEntries, profileFormFromDoc, profilePayload } from '../utils/labResults'
import {
  getNotificationPermission,
  isNotificationSupported,
  notify,
  requestNotificationPermission,
} from '../utils/notifications'

const EMPTY_PROFILE = {
  diabetesType: '',
  hba1c: '',
  hba1cDate: '',
  ldl: '',
  ldlDate: '',
  // Pilihan terstruktur (dibaca utils/riskProfile.js). `woundHistory` tetap
  // ada sebagai catatan bebas di sampingnya — teks bebas tidak bisa dinilai
  // sistem, tapi detailnya tetap berguna bagi pembaca manusia.
  ulcerHistory: '',
  neuropathy: '',
  woundHistory: '',
  emergencyContact: '',
}

// Hasil uji notifikasi disimpan sebagai DESKRIPTOR, bukan kalimat: pesannya
// bertahan di layar dan harus ikut berganti kalau pengguna mengganti bahasa
// sesudahnya.
const TEST_DELIVERED = msg`Terkirim — periksa notifikasi perangkat Anda.`
const TEST_FAILED = msg`Gagal dikirim. Periksa izin notifikasi di pengaturan browser atau sistem.`

// Dulu kegagalan menyimpan hanya masuk console — tombolnya kembali normal dan
// pengguna mengira profilnya tersimpan. Sekarang firestore.rules memeriksa isi
// profil & hasil lab, jadi penolakan adalah hal yang bisa terjadi dan harus
// terlihat.
const SAVE_FAILED = msg`Profil gagal disimpan. Periksa isian dan koneksi internet, lalu coba lagi.`

// Warna pil tingkat pemantauan — sama dengan RiskProfilePanel.
const TIER_PILL = { standard: 'safe', elevated: 'warning', high: 'danger' }

// Pilihan tipe diabetes. `value` adalah NILAI TERSIMPAN dan tidak ikut
// diterjemahkan — ia masuk ke Firestore, jadi mengubahnya berarti memutus
// hubungan dengan profil yang sudah tersimpan. Yang diterjemahkan hanya
// labelnya.
//
// Keterangan singkat di tiap pilihan membantu yang tidak yakin tipenya —
// kalimatnya sengaja umum dan deskriptif, bukan kriteria diagnosis.
const DIABETES_TYPES = [
  {
    value: 'tipe-1',
    label: msg`Tipe 1`,
    description: msg`Tubuh tidak memproduksi insulin; biasanya butuh suntik insulin`,
  },
  {
    value: 'tipe-2',
    label: msg`Tipe 2`,
    description: msg`Tubuh tidak memakai insulin dengan efektif; tipe paling umum`,
  },
  {
    value: 'gestasional',
    label: msg`Gestasional`,
    description: msg`Muncul selama kehamilan`,
  },
]

// Nilai tersimpan tidak diterjemahkan — alasan yang sama dengan DIABETES_TYPES.
// 'yes' adalah satu-satunya nilai yang menaikkan tingkat risiko; 'no' dan
// 'unknown' sama-sama tidak, tapi dibedakan supaya "belum tahu" tidak tercatat
// seolah dokter sudah menyatakan tidak ada.
const ULCER_OPTIONS = [
  { value: 'yes', label: msg`Ya, pernah` },
  { value: 'no', label: msg`Tidak pernah` },
]

const NEUROPATHY_OPTIONS = [
  { value: 'yes', label: msg`Ya` },
  { value: 'no', label: msg`Tidak` },
  { value: 'unknown', label: msg`Tidak tahu` },
]

export default function ProfilePage() {
  const { deviceId, data, riskProfile } = useOutletContext()
  const { user } = useAuth()
  const { i18n } = useLingui()

  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [saveError, setSaveError] = useState(null)
  // Salinan isian sebagaimana TERSIMPAN — pembanding untuk "ada perubahan
  // yang belum disimpan" dan titik kembali tombol Batalkan.
  const [savedForm, setSavedForm] = useState(EMPTY_PROFILE)
  // Profil sebagaimana TERSIMPAN di Firestore — pembanding untuk menentukan
  // hasil lab mana yang baru (utils/labResults.js newLabEntries). Bukan state:
  // perubahannya tidak perlu merender apa pun.
  const savedRef = useRef({})
  const [permission, setPermission] = useState(getNotificationPermission())
  const [testResult, setTestResult] = useState(null)
  // Batas atas kolom tanggal pemeriksaan: hasil lab tidak mungkin bertanggal
  // besok. Dari useDayKey supaya ikut berganti tengah malam.
  const todayKey = useDayKey()

  useEffect(() => {
    if (!user) return
    const ref = profileDoc(user.uid)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          savedRef.current = snap.data()
          const form = profileFormFromDoc(snap.data(), EMPTY_PROFILE)
          setProfile(form)
          setSavedForm(form)
        }
        setIsLoading(false)
      },
      () => setIsLoading(false),
    )
    return unsubscribe
  }, [user])

  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }))
    setSaveError(null)
  }

  function handleDiscard() {
    setProfile(savedForm)
    setSaveError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!user) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const payload = profilePayload(profile)

      // Profil dan riwayat hasil lab ditulis dalam SATU batch: keduanya
      // tersimpan bersama atau tidak sama sekali. Tanpa itu, penolakan aturan
      // pada salah satunya bisa meninggalkan nilai terakhir yang tidak punya
      // catatan riwayat — atau sebaliknya.
      const batch = writeBatch(db)
      batch.set(
        profileDoc(user.uid),
        { ...payload, updatedAt: serverTimestamp() },
        { merge: true },
      )
      newLabEntries(savedRef.current, payload).forEach((entry) => {
        batch.set(doc(labsCollection(user.uid)), { ...entry, createdAt: serverTimestamp() })
      })
      await batch.commit()
      setSavedAt(new Date())
    } catch (err) {
      console.warn('Gagal menyimpan profil:', err)
      setSaveError(SAVE_FAILED)
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
      { tag: 'glykos-test', force: true },
    )
    setTestResult(delivered ? TEST_DELIVERED : TEST_FAILED)
  }

  const deviceName = data?.device?.name ?? deviceId
  const savedTime = savedAt ? formatTimeOfDay(savedAt) : null
  const isDirty = Object.keys(EMPTY_PROFILE).some(
    (key) => String(profile[key] ?? '') !== String(savedForm[key] ?? ''),
  )

  // Status tiap hasil lab DARI ISIAN YANG SEDANG DIKETIK, bukan yang
  // tersimpan: pengguna langsung melihat "Perlu tanggal" atau "Kedaluwarsa"
  // sebelum menekan Simpan. Aturannya sama persis dengan yang menentukan
  // tingkat pemantauan (readLab di utils/riskProfile.js).
  const today = parseLabDate(todayKey)?.getTime() ?? 0
  const labStatus = {
    hba1c: describeLabStatus(
      i18n,
      readLab(profile.hba1c, profile.hba1cDate, HBA1C_RANGE, HBA1C_VALID_DAYS, today),
    ),
    ldl: describeLabStatus(
      i18n,
      readLab(profile.ldl, profile.ldlDate, LDL_RANGE, LDL_VALID_DAYS, today),
    ),
  }

  const displayName = user?.displayName || user?.email || t(i18n)`Pengguna`
  const diabetesLabel = DIABETES_TYPES.find((type) => type.value === savedForm.diabetesType)
  const diabetesText = diabetesLabel ? i18n._(diabetesLabel.label) : null

  return (
    <div className="profile-page">
      <PageHeader
        title={t(i18n)`Profil`}
        subtitle={t(i18n)`Data kesehatan, tingkat pemantauan, dan pengaturan aplikasi`}
      />

      {/* Identitas di atas segalanya: siapa pasiennya, perangkat mana, dan
          tingkat pemantauan yang sedang berlaku — tiga hal yang ingin
          dipastikan orang sebelum mengubah apa pun di bawahnya. */}
      <section className="profile-hero" aria-label={t(i18n)`Ringkasan profil`}>
        <span className="profile-hero__avatar" aria-hidden="true">
          {initialsOf(displayName)}
        </span>
        <div className="profile-hero__identity">
          <h2 className="profile-hero__name">{displayName}</h2>
          {user?.displayName && user?.email && (
            <p className="profile-hero__email">{user.email}</p>
          )}
        </div>
        <dl className="profile-hero__facts">
          <div>
            <dt>
              <Trans>Perangkat</Trans>
            </dt>
            <dd>{deviceName}</dd>
          </div>
          <div>
            <dt>
              <Trans>Tipe diabetes</Trans>
            </dt>
            <dd>{diabetesText ?? '—'}</dd>
          </div>
          <div>
            <dt>
              <Trans>Pemantauan</Trans>
            </dt>
            <dd>
              {riskProfile ? (
                <span
                  className={`status-pill status-pill--${TIER_PILL[riskProfile.tier] ?? 'safe'}`}
                >
                  {riskTierLabel(i18n, riskProfile.tier)}
                </span>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="profile-layout">
        <div className="profile-layout__main">
          {isLoading ? (
            <section className="panel">
              <SkeletonForm fields={9} />
            </section>
          ) : (
            <form className="profile-form" onSubmit={handleSubmit}>
              <SettingsCard
                icon={<IconUser size={18} />}
                title={t(i18n)`Data pasien`}
                description={t(i18n)`Dipakai untuk konteks laporan dan saat keadaan darurat.`}
              >
                {/* <label htmlFor> ke tombol pemicu: tombol termasuk elemen yang
                    bisa diberi label, jadi mengklik teks label memfokuskannya
                    dan pembaca layar mengumumkan namanya. */}
                <div className="profile-field">
                  <label htmlFor="profile-diabetes-type">
                    <Trans>Tipe diabetes</Trans>
                  </label>
                  <SelectMenu
                    id="profile-diabetes-type"
                    value={profile.diabetesType}
                    placeholder={t(i18n)`Pilih tipe`}
                    onChange={(value) => updateField('diabetesType', value)}
                    options={DIABETES_TYPES.map((option) => ({
                      value: option.value,
                      label: i18n._(option.label),
                      description: i18n._(option.description),
                    }))}
                  />
                </div>

                <label className="profile-field">
                  <span>
                    <Trans>Kontak darurat</Trans>
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={profile.emergencyContact}
                    onChange={(e) => updateField('emergencyContact', e.target.value)}
                    placeholder={t(i18n)`Nama & nomor telepon`}
                  />
                </label>
              </SettingsCard>

              {/* HASIL LAB: nilai + tanggal pemeriksaan, berpasangan.
                  Tanggal WAJIB begitu nilainya diisi (`required`): angka
                  tanpa tanggal tidak bisa dinilai masih berlaku atau tidak —
                  dan utils/riskProfile.js memang tidak memakainya.
                  min/max di kolom nilai = rentang wajar di riskProfile.js;
                  browser menolak simpan untuk salah ketik seperti "72". */}
              <SettingsCard
                icon={<IconDroplet size={18} />}
                title={t(i18n)`Hasil laboratorium`}
                description={t(i18n)`Nilai terakhir menentukan tingkat pemantauan. Setiap hasil baru juga tercatat di halaman Riwayat.`}
              >
                <LabField
                  name={t(i18n)`HbA1c`}
                  status={labStatus.hba1c}
                  target={t(i18n)`Target umum penderita diabetes: di bawah 7 %`}
                >
                  <label className="profile-field">
                    <span>
                      <Trans>Nilai</Trans>
                    </span>
                    <span className="input-affix">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min={HBA1C_RANGE.min}
                        max={HBA1C_RANGE.max}
                        value={profile.hba1c}
                        onChange={(e) => updateField('hba1c', e.target.value)}
                        placeholder={t(i18n)`mis. 7.2`}
                      />
                      <span className="input-affix__unit" aria-hidden="true">
                        %
                      </span>
                    </span>
                  </label>
                  <label className="profile-field">
                    <span>
                      <Trans>Tanggal pemeriksaan</Trans>
                    </span>
                    <input
                      type="date"
                      max={todayKey}
                      required={profile.hba1c !== ''}
                      value={profile.hba1cDate}
                      onChange={(e) => updateField('hba1cDate', e.target.value)}
                    />
                  </label>
                </LabField>

                <LabField
                  name={t(i18n)`Kolesterol LDL`}
                  status={labStatus.ldl}
                  target={t(i18n)`Target umum penderita diabetes: di bawah 100 mg/dL`}
                >
                  <label className="profile-field">
                    <span>
                      <Trans>Nilai</Trans>
                    </span>
                    <span className="input-affix">
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min={LDL_RANGE.min}
                        max={LDL_RANGE.max}
                        value={profile.ldl}
                        onChange={(e) => updateField('ldl', e.target.value)}
                        placeholder={t(i18n)`mis. 110`}
                      />
                      <span className="input-affix__unit" aria-hidden="true">
                        mg/dL
                      </span>
                    </span>
                  </label>
                  <label className="profile-field">
                    <span>
                      <Trans>Tanggal pemeriksaan</Trans>
                    </span>
                    <input
                      type="date"
                      max={todayKey}
                      required={profile.ldl !== ''}
                      value={profile.ldlDate}
                      onChange={(e) => updateField('ldlDate', e.target.value)}
                    />
                  </label>
                </LabField>
              </SettingsCard>

              <SettingsCard
                icon={<IconHistory size={18} />}
                title={t(i18n)`Riwayat kaki`}
                description={t(i18n)`Riwayat ulkus dan neuropati adalah faktor risiko terkuat untuk luka kaki baru.`}
              >
                <SegmentedControl
                  name="ulcerHistory"
                  legend={t(i18n)`Pernah ulkus atau amputasi kaki?`}
                  value={profile.ulcerHistory}
                  onChange={(value) => updateField('ulcerHistory', value)}
                  options={ULCER_OPTIONS.map((option) => ({
                    value: option.value,
                    label: i18n._(option.label),
                  }))}
                />

                <SegmentedControl
                  name="neuropathy"
                  legend={t(i18n)`Neuropati, dinyatakan dokter?`}
                  hint={t(i18n)`Berkurangnya rasa pada telapak kaki, misalnya dari pemeriksaan monofilamen. Pilih Tidak tahu bila belum pernah diperiksa.`}
                  value={profile.neuropathy}
                  onChange={(value) => updateField('neuropathy', value)}
                  options={NEUROPATHY_OPTIONS.map((option) => ({
                    value: option.value,
                    label: i18n._(option.label),
                  }))}
                />

                <label className="profile-field profile-field--full">
                  <span>
                    <Trans>Catatan riwayat luka</Trans>
                    <em className="profile-field__optional">
                      <Trans>opsional</Trans>
                    </em>
                  </span>
                  <textarea
                    rows={3}
                    value={profile.woundHistory}
                    onChange={(e) => updateField('woundHistory', e.target.value)}
                    placeholder={t(i18n)`Catatan riwayat luka kaki, operasi, atau amputasi sebelumnya`}
                  />
                </label>
              </SettingsCard>

              {/* Bilah simpan menempel di bawah layar selama formulirnya
                  terlihat. Formulir ini panjang; tombol yang hanya ada di
                  ujung bawah membuat orang mengubah satu angka lalu pergi
                  tanpa sadar belum menyimpan. */}
              <div
                className={`profile-savebar${isDirty ? ' profile-savebar--dirty' : ''}`}
                role="status"
              >
                <p className="profile-savebar__status">
                  {saveError ? (
                    <span className="profile-form__error">{i18n._(saveError)}</span>
                  ) : isSaving ? (
                    <Trans>Menyimpan…</Trans>
                  ) : isDirty ? (
                    <Trans>Ada perubahan yang belum disimpan</Trans>
                  ) : savedTime ? (
                    <Trans>Tersimpan {savedTime}</Trans>
                  ) : (
                    <Trans>Semua perubahan sudah tersimpan</Trans>
                  )}
                </p>
                <div className="profile-savebar__actions">
                  {isDirty && !isSaving && (
                    <Button variant="outline" type="button" onClick={handleDiscard}>
                      <Trans>Batalkan</Trans>
                    </Button>
                  )}
                  <Button type="submit" variant="primary" disabled={isSaving || !isDirty}>
                    {isSaving ? t(i18n)`Menyimpan…` : t(i18n)`Simpan perubahan`}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>

        <aside className="profile-layout__aside">
          <RiskProfilePanel risk={riskProfile} />

          <section className="panel profile-panel">
            <h2 className="panel__title">
              <Trans>Notifikasi peringatan</Trans>
            </h2>
            <p className="panel__subtitle">
              <Trans>
                Izinkan notifikasi browser untuk mendapat peringatan instan saat status berubah
                menjadi Risiko.
              </Trans>
            </p>
            {!isNotificationSupported() ? (
              <p className="profile-note">
                <Trans>Browser ini tidak mendukung notifikasi.</Trans>
              </p>
            ) : permission === 'granted' ? (
              <>
                <p className="profile-note profile-note--ok">
                  <IconCheck size={16} />
                  <Trans>Notifikasi aktif di browser ini.</Trans>
                </p>
                {/* Tombol uji ini bukan pemanis. Notifikasi peringatan hanya
                    muncul saat status benar-benar naik — jadi tanpa cara
                    mencobanya, kegagalan pengiriman (izin dicabut, service
                    worker belum aktif, notifikasi dibungkam OS) baru ketahuan
                    tepat pada saat peringatan yang sungguhan gagal sampai. */}
                <div className="profile-form__actions">
                  <Button variant="outline" onClick={handleTestNotification}>
                    <IconBell size={16} />
                    <Trans>Kirim notifikasi uji</Trans>
                  </Button>
                </div>
                {testResult && <p className="profile-note">{i18n._(testResult)}</p>}
              </>
            ) : permission === 'denied' ? (
              <p className="profile-note">
                <Trans>
                  Notifikasi diblokir. Aktifkan lewat pengaturan izin situs pada browser Anda.
                </Trans>
              </p>
            ) : (
              <Button variant="primary" onClick={handleEnableNotifications}>
                <IconBell size={16} />
                <Trans>Aktifkan notifikasi</Trans>
              </Button>
            )}
          </section>
        </aside>
      </div>

      <AppInstallPanel />

      <section className="panel profile-panel">
        <h2 className="panel__title">
          <Trans>Bantuan &amp; pertanyaan umum</Trans>
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

// Satu kelompok isian: judul + keterangan singkat di kepala, isian di
// badannya. Pola kartu pengaturan yang lazim — setiap kelompok menjelaskan
// untuk apa datanya dipakai sebelum memintanya.
function SettingsCard({ icon, title, description, children }) {
  return (
    <section className="settings-card">
      <header className="settings-card__header">
        <span className="settings-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className="settings-card__title">{title}</h2>
          <p className="settings-card__description">{description}</p>
        </div>
      </header>
      <div className="settings-card__body">{children}</div>
    </section>
  )
}

// Satu hasil lab: nama + status di kepala, nilai & tanggal berdampingan.
function LabField({ name, status, target, children }) {
  return (
    <div className="lab-field profile-field--full">
      <div className="lab-field__header">
        <h3 className="lab-field__name">{name}</h3>
        {status && (
          <span className={`lab-field__status lab-field__status--${status.tone}`}>
            {status.text}
          </span>
        )}
      </div>
      <div className="lab-field__inputs">{children}</div>
      <p className="profile-field__hint">{target}</p>
    </div>
  )
}

// Inisial untuk avatar: dua huruf dari dua kata pertama, atau satu huruf
// untuk nama satu kata / alamat email.
function initialsOf(name) {
  const words = String(name).split('@')[0].split(/[\s._-]+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}
