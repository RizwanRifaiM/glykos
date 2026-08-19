import { useEffect, useRef, useState } from 'react'
import { loadThreeModules } from '../three/loadThree'
import {
  createDisposer,
  createRenderer,
  prefersReducedMotion,
  trackSize,
  trackVisibility,
  webglAvailable,
} from '../three/sceneKit'
import { createSensorModule, pulseLed } from '../three/sensorModule'
import { applyToneMapping } from '../three/renderQuality'
import { bob } from '../utils/sceneMath'

// Tiga modul sensor melayang, berputar pelan dengan laju berbeda-beda.
//
// Scene ini TIDAK memuat model apa pun. Modul sensornya seluruhnya geometry
// prosedural (lihat three/sensorModule.js), jadi biayanya hanya beberapa kotak
// — tidak ada .glb yang diunduh, tidak ada pustaka tambahan, karena three.js
// sudah termuat sejak hero. Itu sebabnya scene ketiga ini layak ada sama
// sekali: tanpa geometry prosedural, hiasan seperti ini tidak akan sepadan
// dengan biayanya.
//
// Perannya memang hiasan — ia menutup halaman dengan gerakan, bukan
// menerangkan sesuatu. Karena itu `aria-hidden` dan `pointer-events: none`:
// pembaca layar tidak kehilangan apa pun, dan tombol CTA di depannya tetap
// bisa diklik seperti tidak ada apa-apa di belakangnya.

// Posisi ditulis sebagai PECAHAN dari setengah bingkai yang terlihat, bukan
// koordinat dunia tetap. Dua alasan, keduanya terlihat di halaman jadi:
//
//   1. Dengan koordinat tetap, modul ketiga mendarat tepat di belakang judul
//      CTA pada lebar desktop — terbaca sebagai cacat render di tengah
//      kalimat, bukan sebagai hiasan.
//   2. Banner ini sangat lebar di desktop dan hampir bujur sangkar di ponsel.
//      Koordinat yang pas di satu ukuran melempar modulnya keluar bingkai di
//      ukuran lain, dan hiasannya hilang sama sekali.
//
// |fx| >= 0,68 menjaga ketiganya di sepertiga tepi kiri/kanan, tempat teks
// banner tidak pernah sampai. z tetap koordinat dunia: ia mengatur kedalaman,
// bukan penempatan pada bidang layar.
const MODULES = [
  { fx: -0.82, fy: 0.42, z: -1.4, scale: 0.9, spinY: 0.34, spinX: 0.19, phase: 0 },
  { fx: 0.86, fy: -0.34, z: -0.6, scale: 1.15, spinY: -0.26, spinX: 0.13, phase: 2.4 },
  { fx: -0.66, fy: -0.62, z: -2.6, scale: 0.62, spinY: 0.44, spinX: -0.22, phase: 4.1 },
]

const BOB_AMPLITUDE = 0.22
const BOB_SPEED = 0.6

export default function FloatingModuleViewer({ className = '' }) {
  const hostRef = useRef(null)
  const [state, setState] = useState('idle')

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof window === 'undefined') return
    // Murni hiasan: kalau WebGL tidak ada, tidak ada yang perlu digantikan.
    // Banner-nya sudah lengkap tanpa scene ini.
    if (!webglAvailable() || prefersReducedMotion()) return

    let disposed = false
    let cleanup = () => {}

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        io.disconnect()
        start()
      },
      { rootMargin: '200px' },
    )
    io.observe(host)

    async function start() {
      const disposer = createDisposer()
      let renderer = null

      try {
        const { THREE } = await loadThreeModules()
        if (disposed) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
        camera.position.set(0, 0, 7)
        // Kanvas tetap TRANSPARAN di sini (tanpa clearColor): scene ini duduk
        // di atas pelat banner CTA yang punya gradien sendiri, dan kanvas
        // buram akan menutupinya. Aman karena scene ini tidak memakai bloom —
        // rantai postprocessing itulah yang tidak akur dengan alpha.
        renderer = createRenderer(THREE, host)
        applyToneMapping(THREE, renderer)

        // Lebih terang daripada dua scene lain: latarnya di sini merah muda
        // pucat, bukan panel gelap, dan modul ungu di atasnya cepat terbaca
        // kusam kalau memakai pencahayaan yang sama.
        scene.add(new THREE.HemisphereLight(0xffffff, 0xd8b4c4, 1.1))
        const key = new THREE.DirectionalLight(0xffffff, 1.5)
        key.position.set(3, 5, 6)
        scene.add(key)

        // Setengah tinggi bidang yang terlihat pada z = 0, dari FOV vertikal
        // kamera. Setengah lebarnya tinggal dikalikan aspect — dihitung ulang
        // tiap kali kanvasnya berubah ukuran.
        const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z

        const items = MODULES.map((config) => {
          const { group, led } = createSensorModule(THREE, disposer, {
            len: 1.0,
            bh: 0.55,
            bw: 0.26,
          })
          // Setiap modul dibungkus grupnya sendiri: yang di dalam memegang
          // putaran, yang di luar memegang posisi & ayunan. Tanpa pemisahan
          // itu, ayunan vertikalnya ikut terputar dan berubah jadi goyangan
          // menyamping begitu sudutnya jauh dari nol.
          const holder = new THREE.Group()
          holder.position.z = config.z
          holder.scale.setScalar(config.scale)
          holder.add(group)
          scene.add(holder)
          return { config, holder, spinner: group, led }
        })

        // Penempatan ulang dijalankan lewat callback resize trackSize, bukan
        // di loop render: nilainya hanya berubah saat bingkainya berubah.
        const layout = () => {
          items.forEach(({ config, holder }) => {
            holder.position.x = config.fx * halfHeight * camera.aspect
            holder.position.y = config.fy * halfHeight
          })
        }

        const sizing = trackSize(host, renderer, camera, layout)
        const visibility = trackVisibility(host)

        let raf = 0
        let last = performance.now()
        let elapsed = 0

        const tick = (now) => {
          raf = requestAnimationFrame(tick)
          const delta = Math.min((now - last) / 1000, 0.1)
          last = now
          if (!visibility.state.visible) return
          elapsed += delta

          items.forEach(({ config, holder, spinner, led }) => {
            spinner.rotation.y += config.spinY * delta
            spinner.rotation.x += config.spinX * delta
            holder.position.y =
              config.fy * halfHeight + bob(elapsed, BOB_AMPLITUDE, BOB_SPEED, config.phase)
            // Fase ikut digeser supaya ketiga LED tidak berdenyut serempak —
            // tiga lampu sefase terbaca sebagai satu lampu yang dicerminkan.
            pulseLed(led, elapsed + config.phase)
          })

          renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(tick)
        setState('ready')

        cleanup = () => {
          cancelAnimationFrame(raf)
          sizing.stop()
          visibility.stop()
          disposer.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch {
        disposer.dispose()
        if (renderer) {
          renderer.dispose()
          renderer.domElement.remove()
        }
        // Diam-diam saja. Ini hiasan — kegagalannya tidak boleh memunculkan
        // pesan apa pun kepada pengguna.
      }
    }

    return () => {
      disposed = true
      io.disconnect()
      cleanup()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className={`floating-modules floating-modules--${state} ${className}`.trim()}
      aria-hidden="true"
    />
  )
}
