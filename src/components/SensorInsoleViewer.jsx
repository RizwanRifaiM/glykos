import { useEffect, useRef, useState } from 'react'
import { loadRenderKit, loadThreeModules } from '../three/loadThree'
import {
  createDisposer,
  createLabelLayer,
  createRenderer,
  createScrollTracker,
  prefersReducedMotion,
  trackSize,
  trackVisibility,
  webglAvailable,
} from '../three/sceneKit'
import { createGlowSprite, createGlowTexture } from '../three/holo'
import { createInsoleGeometry, INSOLE_COLOR, INSOLE_DEPTH } from '../three/insoleShape'
import { applyEnvironment, applyToneMapping, createContactShadow } from '../three/renderQuality'
import { createHotspot, pressureColor, pulseHotspot, SENSOR_ALONG } from '../three/sensorPoints'
import { getPressureLabel, getPressureStatus } from '../constants/thresholds'
import { bob, damp, easeOutBack, staggerProgress, viewportProgress } from '../utils/sceneMath'

// Insole ambang: pelat telapak yang berputar pelan dengan TIGA titik pada tiga
// status berbeda — aman, perlu perhatian, risiko ulkus.
//
// Ini satu-satunya scene di halaman yang sengaja memperagakan kondisi
// BERMASALAH, dan itu memang isi section-nya: pembaca sedang diberi tahu
// bagaimana angka diterjemahkan jadi status. Scene lain tetap memakai
// DEMO_PRESSURE_POINTS yang seluruhnya aman, supaya halaman pemasaran tidak
// tanpa alasan memperagakan perangkat yang sedang menyalakan peringatan.
//
// Angkanya bukan karangan: ketiganya dijalankan lewat getPressureStatus() yang
// sama dengan dashboard, jadi kalau ambangnya di constants/thresholds.js
// berubah, warna dan label di sini ikut berubah — tidak ada daftar kedua yang
// harus diingat orang untuk disamakan.
const SAMPLES = [
  { area: 'heel', kpa: 150 },
  { area: 'metatarsal', kpa: 225 },
  { area: 'toe', kpa: 300 },
]

// Kemiringan pelat, radian. Datar sempurna terbaca sebagai denah; dimiringkan
// sedikit membuatnya terbaca sebagai benda. Turun dari 0,62: pada sudut itu
// pelatnya terlalu memipih dan bentuk telapaknya hilang jadi gumpalan.
const BASE_TILT = 0.4

// Skala pelat terhadap bingkai. Kurvanya sepanjang 2 satuan, dan pada jarak
// kamera di bawah itu berarti tepat sepenuh bingkai — tumitnya terpotong pada
// sebagian putaran. Angka ini yang memberi ruang napas di keempat sisi.
const INSOLE_SCALE = 0.82

// Laju putar, radian per detik.
const AUTO_SPIN = 0.34

// Seberapa jauh kemiringannya berubah mengikuti gulir. Kecil dengan sengaja —
// yang dibaca orang di sini angka pada kartunya, dan pelat yang bergoyang
// besar mengikuti gulir menarik perhatian keluar dari sana.
const SCROLL_TILT = 0.22

const BOB_AMPLITUDE = 0.05
const BOB_SPEED = 0.8

const SMOOTHING = 0.0006

// Kemunculan bertahap dari tumit ke jari kaki — urutan yang sama dengan
// pembacaan sensornya.
const STAGGER = { offset: 0.35, delay: 0.2, duration: 0.5 }

export default function SensorInsoleViewer({ className = '' }) {
  const hostRef = useRef(null)
  const [state, setState] = useState(() =>
    typeof window !== 'undefined' && webglAvailable() ? 'idle' : 'unsupported',
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof window === 'undefined') return
    if (!webglAvailable()) return

    let disposed = false
    let cleanup = () => {}

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        io.disconnect()
        setState('loading')
        start()
      },
      { rootMargin: '300px' },
    )
    io.observe(host)

    async function start() {
      const disposer = createDisposer()
      let renderer = null
      let labels = null

      try {
        const [{ THREE }, kit] = await Promise.all([loadThreeModules(), loadRenderKit()])
        if (disposed) return

        const reduced = prefersReducedMotion()

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100)
        renderer = createRenderer(THREE, host)
        applyToneMapping(THREE, renderer, 1.02)
        applyEnvironment(THREE, kit.RoomEnvironment, renderer, scene, disposer)

        // Pencahayaan disamakan dengan scene lain di halaman ini. Perangkat
        // yang sama di bawah cahaya berbeda terbaca sebagai perangkat berbeda.
        scene.add(new THREE.HemisphereLight(0xfffdf3, 0xe6ded0, 0.85))
        const key = new THREE.DirectionalLight(0xffffff, 1.45)
        key.position.set(4, 7, 5)
        const fill = new THREE.DirectionalLight(0xe8f1e6, 0.45)
        fill.position.set(-5, 3, -3)
        // Cahaya serong rendah: tanpa ini pelat sage yang dilihat hampir dari
        // atas menerima cahaya yang nyaris rata di seluruh permukaannya, dan
        // hasilnya siluet pucat tanpa bentuk.
        const raking = new THREE.DirectionalLight(0xffffff, 0.55)
        raking.position.set(-2, 1.2, 4)
        scene.add(key, fill, raking)

        // Dua grup bersarang: yang luar memegang kemiringan & ayunan, yang
        // dalam memegang putaran. Menumpuk keduanya pada satu objek membuat
        // kemiringannya perlahan berubah jadi gulingan begitu sudut putarnya
        // jauh dari nol.
        const tiltGroup = new THREE.Group()
        const spinGroup = new THREE.Group()
        tiltGroup.add(spinGroup)
        scene.add(tiltGroup)

        const insole = new THREE.Group()
        insole.rotation.x = -Math.PI / 2
        spinGroup.add(insole)

        const geometry = createInsoleGeometry(THREE, disposer)
        const material = disposer.track(
          new THREE.MeshStandardMaterial({
            color: INSOLE_COLOR,
            roughness: 0.72,
            metalness: 0.04,
          }),
        )
        insole.add(new THREE.Mesh(geometry, material))
        insole.scale.setScalar(INSOLE_SCALE)

        labels = createLabelLayer(THREE, host, 'insole-viewer__labels')
        const glowTexture = createGlowTexture(THREE, disposer)

        // Geseran melintang: ketiga titik tidak berbaris lurus di tengah
        // telapak — metatarsal dan jari kaki duduk lebih ke tepi lateral,
        // sama seperti penempatannya di tampilan urai.
        const lateral = { heel: 0.0, metatarsal: 0.1, toe: 0.16 }

        const hotspots = SAMPLES.map(({ area, kpa }) => {
          const hotspot = createHotspot(THREE, disposer, kpa, 0.11)
          hotspot.group.position.set(
            1 - 2 * SENSOR_ALONG[area],
            lateral[area],
            INSOLE_DEPTH + 0.04,
          )

          const halo = createGlowSprite(THREE, disposer, glowTexture, pressureColor(kpa), 0.46)
          halo.material.opacity = 0.4
          hotspot.group.add(halo)

          hotspot.group.scale.setScalar(reduced ? 1 : 0)
          hotspot.appear = reduced ? 1 : 0
          insole.add(hotspot.group)

          const status = getPressureStatus(kpa)
          hotspot.label = labels.add(
            hotspot.group,
            `<b>${kpa}</b> kPa<i>${getPressureLabel(status)}</i>`,
            `insole-viewer__label insole-viewer__label--${status}`,
          )
          return hotspot
        })

        const contactShadow = createContactShadow(THREE, disposer, 1.15, 0.26)
        contactShadow.position.y = -0.35
        scene.add(contactShadow)

        camera.position.set(0, 2.5, 3.5)
        camera.lookAt(0, 0, 0)

        const sizing = trackSize(host, renderer, camera)
        const visibility = trackVisibility(host)
        const scroll = createScrollTracker(host)

        let scrollTilt = 0
        let raf = 0
        let last = performance.now()
        let elapsed = 0

        tiltGroup.rotation.x = BASE_TILT

        const tick = (now) => {
          raf = requestAnimationFrame(tick)
          const delta = Math.min((now - last) / 1000, 0.1)
          last = now
          if (!visibility.state.visible) return
          elapsed += delta

          if (!reduced) {
            spinGroup.rotation.y += AUTO_SPIN * delta

            // viewportProgress = 0 saat section baru muncul di bawah layar,
            // 1 saat sudah lewat di atasnya. Dipusatkan ke -1..1 supaya
            // pelatnya mendongak saat didekati dan menunduk saat ditinggalkan.
            const centered = (scroll.read(viewportProgress) - 0.5) * 2
            scrollTilt = damp(scrollTilt, centered * SCROLL_TILT, SMOOTHING, delta)
            tiltGroup.rotation.x = BASE_TILT + scrollTilt
            tiltGroup.position.y = bob(elapsed, BOB_AMPLITUDE, BOB_SPEED)

            hotspots.forEach((hotspot, index) => {
              hotspot.appear = easeOutBack(staggerProgress(elapsed, index, STAGGER))
              hotspot.group.scale.setScalar(hotspot.appear)
              if (hotspot.appear > 0) pulseHotspot(hotspot, elapsed)
            })
          }

          renderer.render(scene, camera)

          // Label pada scene ini TIDAK dipudarkan menurut arah hadap: pelatnya
          // datar dan titiknya selalu menghadap ke atas, jadi ketiganya selalu
          // terlihat. Yang perlu dijaga hanya kemunculannya.
          hotspots.forEach((hotspot) => {
            hotspot.label.opacity = hotspot.appear
          })
          labels.update(camera, sizing.size)
        }
        raf = requestAnimationFrame(tick)

        setState('ready')

        cleanup = () => {
          cancelAnimationFrame(raf)
          sizing.stop()
          visibility.stop()
          scroll.stop()
          labels.dispose()
          disposer.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch {
        disposer.dispose()
        labels?.dispose()
        if (renderer) {
          renderer.dispose()
          renderer.domElement.remove()
        }
        if (!disposed) setState('failed')
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
      className={`insole-viewer insole-viewer--${state} ${className}`.trim()}
      role="img"
      aria-label="Insole Glykos dengan tiga titik tekanan pada tiga status berbeda: 150 kPa aman, 225 kPa perlu perhatian, dan 300 kPa risiko ulkus"
    />
  )
}
