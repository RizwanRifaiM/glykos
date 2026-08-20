// src/three/sensorPoints.js
// Titik sensor tekanan sebagai objek three.js — cakram menyala plus cincin
// yang berdenyut, dipakai hero (menempel di dinding sepatu) dan tampilan urai
// (di atas insole).
//
// Angka contohnya SATU sumber dengan yang dipakai InsoleIllustration di
// halaman yang sama. Dua daftar angka terpisah untuk sensor yang sama pernah
// membuat hero dan section "Cara Kerja" memperagakan pembacaan yang berbeda
// pada perangkat yang sama.
import { getPressureStatus } from '../constants/thresholds'
import { locationLabel } from '../utils/alertMessages'
import { formatDecimal } from '../utils/locale'
import { pressurePulse } from '../utils/pressureScale'

// Nilai contoh, seluruhnya di rentang aman (<200 kPa menurut
// constants/thresholds.js) supaya halaman pemasaran tidak sekaligus
// memperagakan kondisi bermasalah.
export const DEMO_PRESSURE_POINTS = { toe: 84.2, metatarsal: 162.5, heel: 118.4 }

// Sepadan dengan --status-safe / --status-warning / --status-danger di
// index.css. Ditulis ulang sebagai angka karena WebGL tidak membaca variabel
// CSS; kalau salah satunya berubah di sana, ubah juga di sini.
const STATUS_COLORS = {
  safe: 0x3f7a43,
  warning: 0x9c6510,
  danger: 0x6e1936,
}

export function pressureColor(kpa) {
  return STATUS_COLORS[getPressureStatus(kpa)] ?? STATUS_COLORS.safe
}

// Letak ketiga sensor sepanjang telapak, diukur dari TUMIT sebagai 0 dan
// ujung jari sebagai 1. Dipakai hero (untuk menembakkan raycast ke dinding
// sepatu) dan tampilan urai (untuk menaruh sensor di atas insole) — satu
// angka, supaya titik yang sama tidak mendarat di tempat berbeda pada dua
// gambar yang bersebelahan di halaman yang sama.
export const SENSOR_ALONG = { heel: 0.14, metatarsal: 0.64, toe: 0.88 }

// Urutan dari ujung jari ke tumit — sama dengan urutan sensor pada insole,
// jadi penempatannya di scene tinggal mengikuti indeks.
export const SENSOR_ORDER = ['toe', 'metatarsal', 'heel']

// Label melayang di atas titik sensor pada scene 3D.
//
// `i18n` dioper dari komponen yang membuat scene-nya (ShoeViewer,
// DeviceExplodedViewer). Label ini hidup di dalam elemen HTML yang ditempel di
// atas kanvas, jadi ia teks antarmuka biasa — bukan bagian dari WebGL — dan
// harus ikut bahasa seperti label lainnya.
//
// Angkanya lewat formatDecimal, bukan toFixed(1): titik desimal keras akan
// menulis "236.7 kPa" di sebelah kartu yang menulis "236,7 kPa".
export function sensorLabelHtml(i18n, area, kpa) {
  const value = formatDecimal(kpa)
  const label = escapeHtml(locationLabel(i18n, area))
  // Markup, bukan teks — kata satu-satunya di dalamnya sudah diterjemahkan.
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return `<b>${escapeHtml(value)}</b> kPa<i>${label}</i>`
}

// Nama area berasal dari konstanta kita sendiri, jadi tidak ada masukan bebas
// di sini — tapi label ini ditempel ke DOM lewat innerHTML, dan satu-satunya
// cara memastikan itu tetap aman ketika sumbernya berubah adalah tidak pernah
// mengandalkan asal-usulnya.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// `radius` dalam satuan lokal scene pemanggil — hero dan tampilan urai
// memakai skala model yang berbeda.
export function createHotspot(THREE, disposer, kpa, radius) {
  const color = pressureColor(kpa)
  const group = new THREE.Group()

  // MeshBasicMaterial, bukan Standard: titik ini harus terbaca sebagai
  // lampu indikator, bukan permukaan yang ikut gelap saat berputar menjauhi
  // sumber cahaya.
  const discGeo = disposer.track(new THREE.CircleGeometry(radius, 28))
  const discMat = disposer.track(
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  )
  const disc = new THREE.Mesh(discGeo, discMat)

  const ringGeo = disposer.track(new THREE.RingGeometry(radius * 1.25, radius * 1.55, 36))
  const ringMat = disposer.track(
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      // Cincin duduk sangat rapat di atas permukaan sepatu. Tanpa ini,
      // ketidakpastian depth buffer di jarak itu membuat sebagian busurnya
      // berkedip hilang-timbul saat model berputar.
      depthWrite: false,
    }),
  )
  const ring = new THREE.Mesh(ringGeo, ringMat)

  group.add(disc, ring)

  return { group, disc, ring, pulse: pressurePulse(kpa) }
}

// Denyut "bernapas": makin tinggi tekanan, makin besar simpangan dan makin
// cepat iramanya. Aturannya diambil dari utils/pressureScale.js — sama persis
// dengan yang menggerakkan titik sensor di dashboard, jadi titik bertekanan
// tinggi berperilaku sama di kedua tempat.
export function pulseHotspot(hotspot, elapsedSec) {
  const { pulse, ring } = hotspot
  const phase = (elapsedSec / pulse.durationSec) % 1
  const scale = 1 + (pulse.scale - 1) * phase
  ring.scale.setScalar(scale)
  ring.material.opacity = 0.55 * (1 - phase)
}
