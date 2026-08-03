import { useEffect, useState } from 'react'
import { LinkButton } from '../components/Button'
import { variantProps } from '../components/button-variants'
import { useAuth } from '../contexts/auth-context'
import InsoleIllustration from '../components/InsoleIllustration'
import { COLORS } from '../constants/theme'
import {
  IconGauge,
  IconThermometer,
  IconDroplet,
  IconActivity,
  IconLayoutDashboard,
  IconFileText,
  IconMenu,
  IconX,
} from '../components/icons'
import './Landing.css'

const SENSORS = [
  { code: 'FSR 402', label: 'Sensor Tekanan', accent: 'wine' },
  { code: 'NTC', label: 'Sensor Suhu', accent: 'blush' },
  { code: 'SHT30', label: 'Suhu & Kelembapan', accent: 'sage' },
  { code: 'MPU6050', label: 'Gerak & Aktivitas', accent: 'forest' },
]

const FEATURES = [
  {
    icon: IconGauge,
    accent: 'rose',
    title: 'Pemantauan Tekanan Plantar',
    desc: 'Sensor FSR 402 pada titik tumit, metatarsal & jari kaki mendeteksi tekanan berlebih yang berisiko memicu luka.',
  },
  {
    icon: IconThermometer,
    accent: 'green',
    title: 'Deteksi Selisih Suhu Kaki',
    desc: 'Selisih suhu antar area atau antar kaki adalah salah satu prediktor dini peradangan sebelum luka terlihat kasat mata.',
  },
  {
    icon: IconDroplet,
    accent: 'rose',
    title: 'Kelembapan Dalam Sepatu',
    desc: 'Kelembapan berlebih meningkatkan risiko maserasi & infeksi jamur pada kulit yang sudah rentan.',
  },
  {
    icon: IconActivity,
    accent: 'green',
    title: 'Aktivitas & Pola Gerak',
    desc: 'Rekam jumlah langkah dan waktu aktif harian untuk memahami beban yang diterima kaki sepanjang hari.',
  },
  {
    icon: IconLayoutDashboard,
    accent: 'rose',
    title: 'Dashboard Real-time',
    desc: 'Semua data sensor tersaji dalam satu dashboard yang mudah dibaca, kapan saja dan di mana saja.',
  },
  {
    icon: IconFileText,
    accent: 'green',
    title: 'Export Laporan Medis',
    desc: 'Unduh riwayat data dalam format CSV atau PDF untuk dibawa ke konsultasi dengan dokter.',
  },
]

// `photo` kosong dulu — begitu foto anggota tersedia, isi dengan path
// gambarnya (mis. '/team/arkanara.jpg') dan kartu otomatis menampilkan
// foto tersebut menggantikan avatar inisial.
const TEAM = [
  { name: 'Arkanara Romanza Andiwa', role: 'CEO', photo: null, accent: 'green' },
  { name: 'Anya Parisya Rivendra', role: 'CFO', photo: null, accent: 'rose' },
  { name: 'Khadijah Subagyo', role: 'CTO', photo: null, accent: 'green' },
  { name: 'Radinka Danastria Ramadhanti Bima Puteri', role: 'COO', photo: null, accent: 'rose' },
  { name: 'Raiqa Mazaya Fatin Muqofa', role: 'CMO', photo: null, accent: 'mixed' },
]

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

const STEPS = [
  {
    step: '01',
    accent: 'forest',
    title: 'Pakai Insole Glykos',
    desc: 'Pasang insole pintar Glykos ke dalam sepatu seperti biasa — tidak mengubah kenyamanan sehari-hari.',
  },
  {
    step: '02',
    accent: 'wine',
    title: 'Sensor Merekam Kondisi Kaki',
    desc: 'Tekanan, suhu, kelembapan & aktivitas terekam otomatis dan dikirim secara real-time.',
  },
  {
    step: '03',
    accent: 'forest',
    title: 'Pantau & Tindak Lanjuti',
    desc: 'Anda, keluarga, atau dokter dapat memantau dashboard dan mengambil tindakan preventif lebih awal.',
  },
]

const NAV_LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
  { href: '#tentang', label: 'Tentang' },
  { href: '#tim', label: 'Tim' },
]

function BrandMark() {
  return (
    <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden="true">
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
  )
}

export default function LandingPage() {
  const { user } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <div className="landing-nav__brand">
            <BrandMark />
            <span>Glykos</span>
          </div>

          <nav className="landing-nav__links">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="landing-nav__actions">
            {user ? (
              <LinkButton to="/dashboard" variant="primary">
                Buka Dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/login" variant="outline">
                  Masuk
                </LinkButton>
                <LinkButton to="/register" variant="primary">
                  Daftar Gratis
                </LinkButton>
              </>
            )}
          </div>

          <button
            type="button"
            className="landing-nav__menu-btn"
            onClick={() => setNavOpen(true)}
            aria-label="Buka menu navigasi"
          >
            <IconMenu size={22} />
          </button>
        </div>

        {navOpen && (
          <div className="landing-nav__mobile">
            <div className="landing-nav__mobile-header">
              <div className="landing-nav__brand">
                <BrandMark />
                <span>Glykos</span>
              </div>
              <button
                type="button"
                className="landing-nav__mobile-close"
                onClick={() => setNavOpen(false)}
                aria-label="Tutup menu"
              >
                <IconX size={22} />
              </button>
            </div>

            <nav className="landing-nav__mobile-links" onClick={() => setNavOpen(false)}>
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="landing-nav__mobile-actions">
              {user ? (
                <LinkButton to="/dashboard" variant="primary">
                  Buka Dashboard
                </LinkButton>
              ) : (
                <>
                  <LinkButton to="/login" variant="outline">
                    Masuk
                  </LinkButton>
                  <LinkButton to="/register" variant="primary">
                    Daftar Gratis
                  </LinkButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="hero">
          <div className="hero__content">
            <span className="hero__badge">Wearable Health-Tech</span>
            <h1 className="hero__title">
              Sepatu Pintar Pendeteksi Dini{' '}
              <span className="hero__title-accent">Risiko Ulkus Diabetik</span>
            </h1>
            <p className="hero__subtitle">
              Glykos adalah insole pintar yang memantau tekanan, suhu, kelembapan, dan
              aktivitas kaki secara real-time — membantu penderita diabetes dengan
              neuropati mendeteksi tanda awal luka sebelum menjadi masalah serius.
            </p>
            <div className="hero__actions">
              <LinkButton to="/register" variant="primary" className="hero__cta">
                Daftar Sekarang
              </LinkButton>
              <a href="#cara-kerja" {...variantProps('outline', false, 'hero__cta')}>
                Lihat Cara Kerja
              </a>
            </div>
            <div className="hero__sensors">
              {SENSORS.map((sensor) => (
                <div key={sensor.code} className={`hero__sensor hero__sensor--${sensor.accent}`}>
                  <span className="hero__sensor-code">{sensor.code}</span>
                  <span className="hero__sensor-label">{sensor.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero__visual">
            <InsoleIllustration />
          </div>
        </section>

        <section className="problem" id="tentang">
          <div className="problem__intro">
            <h2>Mengapa Kaki Diabetes Butuh Perhatian Ekstra?</h2>
            <p>
              Banyak penderita diabetes mengalami <strong>neuropati</strong> — mati rasa
              pada saraf kaki — sehingga tidak menyadari tekanan berlebih atau peradangan
              dini yang berisiko menjadi ulkus diabetik. Glykos hadir sebagai
              &ldquo;indera pengganti&rdquo; yang bekerja diam-diam di dalam sepatu.
            </p>
          </div>
          <div className="problem__grid">
            <div className="problem__card problem__card--rose">
              <h3>Sulit Disadari Sejak Dini</h3>
              <p>
                Neuropati membuat tanda-tanda awal luka — tekanan berlebih, panas, dan
                lembap — sulit dirasakan langsung oleh penderita.
              </p>
            </div>
            <div className="problem__card problem__card--danger">
              <h3>Berisiko Menjadi Luka Kronis</h3>
              <p>
                Tanpa deteksi dini, cedera kecil dapat berkembang menjadi luka yang sulit
                sembuh dan berisiko komplikasi lebih lanjut.
              </p>
            </div>
            <div className="problem__card problem__card--green">
              <h3>Perlu Pemantauan Berkelanjutan</h3>
              <p>
                Pemantauan rutin membantu pasien, keluarga, dan dokter mengambil tindakan
                preventif sebelum kondisi memburuk.
              </p>
            </div>
          </div>
        </section>

        <section className="features" id="fitur">
          <div className="section-heading">
            <h2>Semua yang Dibutuhkan untuk Memantau Kaki</h2>
            <p>Empat sensor, satu dashboard, dipantau kapan saja.</p>
          </div>
          <div className="features__grid">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`feature-card feature-card--${feature.accent}`}
              >
                <span className={`feature-card__icon feature-card__icon--${feature.accent}`}>
                  <feature.icon size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="how-it-works" id="cara-kerja">
          <div className="section-heading">
            <h2>Cara Kerja Glykos</h2>
            <p>Tiga langkah sederhana menuju kaki yang lebih terpantau.</p>
          </div>
          <div className="how-it-works__grid">
            {STEPS.map((item) => (
              <div key={item.step} className="step-card">
                <span className={`step-card__number step-card__number--${item.accent}`}>
                  {item.step}
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="team" id="tim">
          <div className="section-heading">
            <h2>Tim di Balik Glykos</h2>
            <p>Tim inti yang membangun Glykos dari riset hingga produk.</p>
          </div>
          <div className="team__grid">
            {TEAM.map((member) => (
              <div key={member.name} className={`team-card team-card--${member.accent}`}>
                <div className={`team-card__avatar team-card__avatar--${member.accent}`}>
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} />
                  ) : (
                    <span>{initials(member.name)}</span>
                  )}
                </div>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-banner">
          <h2>Mulai Pantau Kesehatan Kaki Anda Hari Ini</h2>
          <p>Gratis untuk mendaftar — hubungkan perangkat Glykos Anda dalam hitungan menit.</p>
          <LinkButton to="/register" variant="primary" className="cta-banner__btn">
            Daftar Sekarang
          </LinkButton>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Glykos · ESP32 DevKit V1 · FSR 402 · NTC · SHT30 · MPU6050</p>
        <p className="landing-footer__disclaimer">
          Glykos adalah alat bantu pemantauan, bukan pengganti diagnosis atau perawatan
          medis profesional.
        </p>
      </footer>
    </div>
  )
}
