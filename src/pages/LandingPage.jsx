import { useEffect, useMemo, useRef, useState } from 'react'
import { LinkButton } from '../components/Button'
import { variantProps } from '../components/button-variants'
import { useAuth } from '../contexts/auth-context'
import InsoleIllustration from '../components/InsoleIllustration'
import ShoeViewer from '../components/ShoeViewer'
import DeviceExplodedViewer from '../components/DeviceExplodedViewer'
import FloatingModuleViewer from '../components/FloatingModuleViewer'
import { DEMO_PRESSURE_POINTS } from '../three/sensorPoints'
import { COLORS } from '../constants/theme'
import {
  IconGauge,
  IconThermometer,
  IconDroplet,
  IconActivity,
  IconLayoutDashboard,
  IconFileText,
  IconBluetooth,
  IconMenu,
  IconX,
} from '../components/icons'
import { useTilt } from '../hooks/useTilt'
import './Landing.css'

const FEATURES = [
  {
    icon: IconGauge,
    accent: 'rose',
    title: 'Pemantauan Tekanan Plantar',
    desc: 'Sensor pada titik tumit, metatarsal & jari kaki mendeteksi tekanan berlebih yang berisiko memicu luka.',
  },
  {
    icon: IconThermometer,
    accent: 'green',
    title: 'Deteksi Selisih Suhu Kaki',
    desc: 'Selisih suhu antar area adalah salah satu prediktor dini peradangan sebelum luka terlihat kasat mata.',
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

// Ambang yang benar-benar dipakai aplikasi — lihat src/constants/thresholds.js.
// Disurfaced di landing page karena inilah dasar yang bisa diperiksa, bukan
// klaim efektivitas yang tidak bisa dibuktikan.
const THRESHOLDS = [
  {
    icon: IconThermometer,
    value: '2,2',
    unit: '°C',
    title: 'Selisih suhu antar area',
    desc: 'Selisih suhu di atas ambang ini dikenal dalam literatur kaki diabetik sebagai penanda pre-ulkus — sering muncul sebelum luka terlihat.',
  },
  {
    icon: IconGauge,
    value: '250',
    unit: 'kPa',
    title: 'Batas tekanan plantar',
    desc: 'Di bawah 200 kPa ditandai aman, 200–250 kPa perlu perhatian, di atas 250 kPa ditandai sebagai risiko ulkus pada dashboard.',
  },
  {
    icon: IconDroplet,
    value: '70',
    unit: '% RH',
    title: 'Batas kelembapan sepatu',
    desc: 'Kelembapan di atas ambang ini meningkatkan risiko maserasi kulit dan infeksi jamur pada kaki yang sudah rentan.',
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
    title: 'Pakai Sepatu Glykos',
    desc: 'Pakai seperti sepatu biasa — insole bersensor sudah terpasang di dalamnya, tidak ada yang perlu dirakit sendiri.',
  },
  {
    step: '02',
    title: 'Sensor Merekam Kondisi Kaki',
    desc: 'Tekanan, suhu, kelembapan & aktivitas terekam otomatis dan dikirim ke ponsel lewat Bluetooth.',
  },
  {
    step: '03',
    title: 'Pantau & Tindak Lanjuti',
    desc: 'Anda, keluarga, atau dokter dapat memantau dashboard dan mengambil tindakan preventif lebih awal.',
  },
]

// Ritme bento untuk .features__grid pada grid 6 kolom: 4+2, 2+4, 3+3.
// Jumlahnya 18 = tepat tiga baris penuh untuk enam kartu.
const FEATURE_SPAN = [4, 2, 2, 4, 3, 3]

const HERO_STATS = [
  { icon: IconGauge, value: '4', label: 'Jenis sensor' },
  { icon: IconActivity, value: '3', label: 'Titik tekanan' },
  { icon: IconBluetooth, value: 'Real-time', label: 'Kirim via Bluetooth' },
]

const NAV_LINKS = [
  { href: '#tentang', label: 'Mengapa Glykos' },
  { href: '#dasar', label: 'Dasar Pemantauan' },
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
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

// Reveal saat scroll. Kelas penyembunyi baru dipasang setelah observer siap
// (lewat .reveal-ready di <html>), jadi kalau JS gagal atau pengguna memilih
// reduced-motion, konten tetap tampil penuh — bukan blank.
function useScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || typeof IntersectionObserver === 'undefined') return

    const root = document.documentElement
    root.classList.add('reveal-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      root.classList.remove('reveal-ready')
    }
  }, [])
}

// Menandai tautan nav sesuai bagian yang sedang dibaca.
function useActiveSection() {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const sections = NAV_LINKS.map(({ href }) => document.getElementById(href.slice(1))).filter(
      Boolean,
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return active
}

export default function LandingPage() {
  const { user } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const activeSection = useActiveSection()
  useScrollReveal()

  // Tilt kartu. Objek opsinya di-memo karena ia masuk daftar dependensi
  // effect di useTilt — literal baru tiap render akan memasang ulang tilt
  // pada setiap render.
  const cardsRef = useRef(null)
  const tiltOptions = useMemo(
    () => ({
      max: 6,
      speed: 700,
      perspective: 1100,
      scale: 1.015,
      glare: true,
      'max-glare': 0.12,
      gyroscope: false,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    }),
    [],
  )
  useTilt(cardsRef, '[data-tilt-card]', tiltOptions)

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  const authButtons = user ? (
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
  )

  return (
    <div className="landing">
      <a className="skip-link" href="#konten">
        Lompat ke konten utama
      </a>

      <header className="landing-nav">
        <div className="landing-nav__inner">
          <a className="landing-nav__brand" href="#top">
            <BrandMark />
            <span>Glykos</span>
          </a>

          <nav className="landing-nav__links" aria-label="Navigasi halaman">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={activeSection === link.href.slice(1) ? 'is-active' : ''}
                aria-current={activeSection === link.href.slice(1) ? 'true' : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="landing-nav__actions">{authButtons}</div>

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

            <div className="landing-nav__mobile-actions">{authButtons}</div>
          </div>
        )}
      </header>

      <main id="konten" ref={cardsRef}>
        <section className="hero" id="top">
          <div className="hero__content">
            <span className="hero__badge">Wearable Health-Tech</span>
            <h1 className="hero__title">
              Sepatu Pintar Pendeteksi Dini{' '}
              <span className="hero__title-accent">Risiko Ulkus Diabetik</span>
            </h1>
            <p className="hero__subtitle">
              Glykos adalah sepatu pintar yang memantau tekanan, suhu, kelembapan, dan
              aktivitas kaki secara real-time — membantu penderita diabetes dengan
              neuropati mendeteksi tanda awal luka sebelum menjadi masalah serius.
            </p>
            <div className="hero__actions">
              <LinkButton to="/register" variant="primary" className="hero__cta">
                Daftar Gratis
              </LinkButton>
              <a href="#cara-kerja" {...variantProps('outline', false, 'hero__cta')}>
                Lihat Cara Kerja
              </a>
            </div>

          </div>

          {/* Lapisan cahaya & cincin tetap CSS murni sehingga langsung
              tergambar tanpa menunggu apa pun — hero tidak pernah kosong
              selama three.js dan modelnya diunduh. Kemiringan mengikuti
              pointer DIHAPUS di sini: modelnya sendiri sudah bisa diputar
              dengan seretan, dan dua mekanisme rotasi pada satu objek
              membuat keduanya terasa salah. */}
          <div className="hero__visual">
            <div className="hero__stage">
              <span className="hero__layer hero__layer--glow" aria-hidden="true" />
              <span className="hero__layer hero__layer--ring" aria-hidden="true" />
              <div className="hero__layer hero__layer--art">
                <ShoeViewer
                  fallback={<InsoleIllustration pressurePoints={DEMO_PRESSURE_POINTS} />}
                />
              </div>
            </div>
            {/* aria-hidden: ini petunjuk gestur untuk pengguna pointer/sentuh.
                Pembaca layar tidak bisa memutar model apa pun, dan viewer-nya
                sudah punya aria-label yang menjelaskan isinya. */}
            <p className="hero__visual-hint" aria-hidden="true">
              Seret ke samping &amp; ke atas untuk memutar
            </p>
          </div>
        </section>

        {/* Dulu berada DI DALAM hero sebagai elemen teks kelima. Hero yang
            memuat lencana, judul, subjudul, tombol, DAN strip angka membuat
            mata tidak tahu harus mendarat di mana. Sekarang jadi pita tipis
            tersendiri: perannya tetap sama, tapi tidak lagi berebut dengan
            judul. */}
        <section className="spec-strip" aria-label="Spesifikasi ringkas">
          <dl className="spec-strip__list">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="spec-strip__item">
                <span className="spec-strip__icon" aria-hidden="true">
                  <stat.icon size={18} />
                </span>
                <div>
                  <dt>{stat.value}</dt>
                  <dd>{stat.label}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Keluarga layout: split lengket. Judulnya menempel di kiri sementara
            ketiga poin bergulir melewatinya, jadi pembaca selalu tahu poin ini
            menjawab pertanyaan apa. Sebelumnya section ini judul-di-atas-grid,
            sama persis dengan tiga section lain di halaman yang sama. */}
        <section className="problem" id="tentang" data-reveal>
          <div className="section-heading problem__heading">
            <h2>Mengapa Kaki Diabetes Butuh Perhatian Ekstra?</h2>
            <p>
              Banyak penderita diabetes mengalami <strong>neuropati</strong> — mati rasa pada
              saraf kaki — sehingga tidak menyadari tekanan berlebih atau peradangan dini yang
              berisiko menjadi ulkus diabetik. Glykos hadir sebagai &ldquo;indera
              pengganti&rdquo; yang bekerja diam-diam di dalam sepatu.
            </p>
          </div>

          <ol className="problem__list">
            <li className="problem__card problem__card--rose">
              <h3>Sulit Disadari Sejak Dini</h3>
              <p>
                Neuropati membuat tanda-tanda awal luka — tekanan berlebih, panas, dan lembap
                — sulit dirasakan langsung oleh penderita.
              </p>
            </li>
            <li className="problem__card problem__card--danger">
              <h3>Berisiko Menjadi Luka Kronis</h3>
              <p>
                Tanpa deteksi dini, cedera kecil dapat berkembang menjadi luka yang sulit
                sembuh dan berisiko komplikasi lebih lanjut.
              </p>
            </li>
            <li className="problem__card problem__card--green">
              <h3>Perlu Pemantauan Berkelanjutan</h3>
              <p>
                Pemantauan rutin membantu pasien, keluarga, dan dokter mengambil tindakan
                preventif sebelum kondisi memburuk.
              </p>
            </li>
          </ol>
        </section>

        <section className="science" id="dasar">
          <div className="science__inner" data-reveal>
            <div className="section-heading section-heading--invert">
              <span className="section-eyebrow">Dasar Pemantauan</span>
              <h2>Ambang yang Dipakai Glykos</h2>
              <p>
                Setiap status &ldquo;aman&rdquo;, &ldquo;perhatian&rdquo;, dan
                &ldquo;risiko&rdquo; pada dashboard dihitung dari ambang berikut — bukan
                penilaian samar, sehingga bisa Anda periksa dan diskusikan dengan dokter.
              </p>
            </div>

            <div className="science__grid">
              {THRESHOLDS.map((item) => (
                <article key={item.title} className="science__card">
                  <span className="science__icon" aria-hidden="true">
                    <item.icon size={22} />
                  </span>
                  <p className="science__value">
                    {item.value}
                    <span>{item.unit}</span>
                  </p>
                  <h3>{item.title}</h3>
                  <p className="science__desc">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Keluarga layout: bento. Enam kartu berukuran identik membaca sebagai
            daftar; enam kartu berukuran berbeda membaca sebagai komposisi.
            FEATURE_SPAN memberi ritme 4-2 / 2-4 / 3-3 pada grid 6 kolom —
            enam sel untuk enam kartu, tanpa sel kosong menggantung. */}
        <section className="features" id="fitur" data-reveal>
          <div className="section-heading">
            <h2>Semua yang Dibutuhkan untuk Memantau Kaki</h2>
            <p>Empat jenis sensor, satu dashboard, dipantau kapan saja.</p>
          </div>

          <div className="features__grid">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                data-tilt-card
                style={{ '--span': FEATURE_SPAN[index] }}
                className={`feature-card feature-card--${feature.accent}`}
              >
                <span className={`feature-card__icon feature-card__icon--${feature.accent}`}>
                  <feature.icon size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="how-it-works" id="cara-kerja" data-reveal>
          <div className="section-heading">
            <h2>Tiga Langkah Menuju Kaki yang Terpantau</h2>
            <p>Dari memakai sepatunya sampai membaca hasilnya di dashboard.</p>
          </div>

          {/* Tampilan urai menggantikan ilustrasi insole yang sebelumnya di
              sini. Yang perlu dijelaskan section ini adalah hubungan RUANG
              antara tiga bagian satu produk — badan sepatu, insole bersensor di
              dalamnya, dan modul sensor di sisi luar —
              dan itu justru yang paling mahal dijelaskan dengan gambar diam
              maupun kalimat.

              Ilustrasi insole tidak dibuang: ia jadi penggantinya saat WebGL
              tidak tersedia, jadi penjelasan yang dibawanya (tiga titik sensor
              beserta angkanya) tetap sampai. Scene ini memakai chunk three.js
              yang sama dengan hero, jadi tidak ada pustaka kedua yang diunduh. */}
          <div className="exploded-showcase" data-reveal>
            <DeviceExplodedViewer
              fallback={<InsoleIllustration pressurePoints={DEMO_PRESSURE_POINTS} />}
            />
            <p className="exploded-showcase__hint">
              Gulir untuk memisahkan ketiga bagiannya: badan sepatu, insole bersensor
              dengan tiga titik tekanan, dan modul sensor di sisi luar.
            </p>
          </div>

          <ol className="steps">
            {STEPS.map((item) => (
              <li key={item.step} className="step">
                <span className="step__marker" aria-hidden="true">
                  {item.step}
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="team" id="tim" data-reveal>
          <div className="section-heading">
            <h2>Tim di Balik Glykos</h2>
            <p>Tim inti yang membangun Glykos dari riset hingga produk.</p>
          </div>

          <div className="team__grid">
            {TEAM.map((member) => (
              <article
                key={member.name}
                data-tilt-card
                className={`team-card team-card--${member.accent}`}
              >
                <div className={`team-card__avatar team-card__avatar--${member.accent}`}>
                  {member.photo ? (
                    // alt sengaja kosong: nama orangnya sudah ada di <h3>
                    // tepat di bawah, jadi mengisinya berarti pembaca layar
                    // mengumumkan nama yang sama dua kali.
                    // width/height eksplisit mencegah kartu melompat saat
                    // foto selesai dimuat; lazy karena section tim ada jauh
                    // di bawah lipatan.
                    <img
                      src={member.photo}
                      alt=""
                      width="96"
                      height="96"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span aria-hidden="true">{initials(member.name)}</span>
                  )}
                </div>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-banner" data-reveal>
          <div className="cta-banner__inner">
            {/* Modul sensor melayang di belakang teks. Murni hiasan — tidak
                memuat model apa pun, hanya kotak prosedural yang sudah dipakai
                dua scene lain, jadi tambahannya nyaris tanpa biaya. Diletakkan
                sebagai lapisan absolut supaya tidak bisa menggeser tata letak
                banner sedikit pun kalau nanti ukurannya diubah. */}
            <FloatingModuleViewer />
            <h2>Mulai Pantau Kesehatan Kaki Anda Hari Ini</h2>
            <p>
              Gratis untuk mendaftar — hubungkan perangkat Glykos Anda dalam hitungan menit.
            </p>
            <LinkButton to="/register" variant="primary" className="cta-banner__btn">
              Daftar Gratis
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__top">
          <div className="landing-footer__brand">
            <div className="landing-nav__brand">
              <BrandMark />
              <span>Glykos</span>
            </div>
            <p>
              Sepatu pintar pemantau tekanan, suhu, dan kelembapan kaki untuk membantu deteksi
              dini risiko ulkus diabetik.
            </p>
          </div>

          <nav className="landing-footer__nav" aria-label="Navigasi footer">
            <div>
              <h3>Produk</h3>
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
            <div>
              <h3>Akun</h3>
              <a href="/login">Masuk</a>
              <a href="/register">Daftar Gratis</a>
              <a href="/dashboard">Dashboard</a>
            </div>
          </nav>
        </div>

        <p className="landing-footer__disclaimer">
          <strong>Catatan penting:</strong> Glykos adalah alat bantu pemantauan, bukan alat
          diagnosis medis. Data yang ditampilkan tidak menggantikan pemeriksaan, diagnosis,
          atau saran tenaga kesehatan profesional. Segera hubungi dokter jika Anda menemukan
          luka, perubahan warna, atau nyeri pada kaki.
        </p>

        <div className="landing-footer__bottom">
          <p>© {new Date().getFullYear()} Glykos</p>
          <p className="landing-footer__tech">Sepatu pintar untuk pemantauan kaki diabetes</p>
        </div>
      </footer>
    </div>
  )
}
