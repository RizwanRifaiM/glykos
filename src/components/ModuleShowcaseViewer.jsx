import { useEffect, useRef, useState } from 'react'
import { loadRenderKit, loadThreeModules } from '../three/loadThree'
import {
  createDisposer,
  createRenderer,
  createScrollTracker,
  prefersReducedMotion,
  trackSize,
  trackVisibility,
  webglAvailable,
} from '../three/sceneKit'
import { createSensorModule, pulseLed } from '../three/sensorModule'
import { applyEnvironment, applyToneMapping, createContactShadow } from '../three/renderQuality'
import { bob, damp, viewportProgress } from '../utils/sceneMath'

// Modul sensor sebagai objek yang bisa diperiksa: berputar pelan pada sumbu
// tegak, sedikit mendongak-menunduk mengikuti gulir, LED-nya berdenyut.
//
// Berbeda dari hiasan melayang di banner CTA, scene ini punya tugas: section
// "Fitur" berbicara tentang apa yang direkam perangkat, dan inilah satu-
// satunya tempat di halaman yang memperlihatkan perangkatnya sendiri dari
// dekat — di hero ia sekecil kuku menempel di dinding sepatu.
//
// Geometry-nya prosedural (three/sensorModule.js), jadi biayanya beberapa
// kotak: tidak ada .glb yang diunduh, dan three.js sudah termuat sejak hero.

const AUTO_SPIN = 0.55
const SCROLL_PITCH = 0.5
const BOB_AMPLITUDE = 0.045
const BOB_SPEED = 0.85
const SMOOTHING = 0.0006

// Sudut istirahat: sedikit mendongak supaya sisi atas modulnya ikut terlihat,
// bukan cuma dinding depannya. Kotak yang dilihat tepat dari depan terbaca
// sebagai persegi panjang datar.
const BASE_PITCH = -0.34

export default function ModuleShowcaseViewer({ className = '' }) {
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

      try {
        const [{ THREE }, kit] = await Promise.all([loadThreeModules(), loadRenderKit()])
        if (disposed) return

        const reduced = prefersReducedMotion()

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100)
        renderer = createRenderer(THREE, host)
        applyToneMapping(THREE, renderer, 1.02)
        applyEnvironment(THREE, kit.RoomEnvironment, renderer, scene, disposer)

        scene.add(new THREE.HemisphereLight(0xfffdf3, 0xe6ded0, 0.9))
        const key = new THREE.DirectionalLight(0xffffff, 1.5)
        key.position.set(3, 6, 5)
        const fill = new THREE.DirectionalLight(0xe8f1e6, 0.5)
        fill.position.set(-4, 2, -3)
        scene.add(key, fill)

        const pitchGroup = new THREE.Group()
        const spinGroup = new THREE.Group()
        pitchGroup.add(spinGroup)
        scene.add(pitchGroup)

        const { group: mod, led } = createSensorModule(THREE, disposer, {
          len: 1.0,
          bh: 0.55,
          bw: 0.26,
        })
        spinGroup.add(mod)

        // Kecil dan tipis dengan sengaja: di dalam sel bento yang cuma
        // ~260 px, bayangan sebesar modulnya sendiri terbaca sebagai noda
        // kelabu, bukan sebagai alas.
        const contactShadow = createContactShadow(THREE, disposer, 0.5, 0.16)
        contactShadow.position.y = -0.58
        scene.add(contactShadow)

        camera.position.set(0, 0.55, 2.9)
        camera.lookAt(0, 0, 0)

        const sizing = trackSize(host, renderer, camera)
        const visibility = trackVisibility(host)
        const scroll = createScrollTracker(host)

        let pitch = 0
        let raf = 0
        let last = performance.now()
        let elapsed = 0

        pitchGroup.rotation.x = BASE_PITCH

        const tick = (now) => {
          raf = requestAnimationFrame(tick)
          const delta = Math.min((now - last) / 1000, 0.1)
          last = now
          if (!visibility.state.visible) return
          elapsed += delta

          if (!reduced) {
            spinGroup.rotation.y += AUTO_SPIN * delta
            const centered = (scroll.read(viewportProgress) - 0.5) * 2
            pitch = damp(pitch, centered * SCROLL_PITCH, SMOOTHING, delta)
            pitchGroup.rotation.x = BASE_PITCH + pitch
            pitchGroup.position.y = bob(elapsed, BOB_AMPLITUDE, BOB_SPEED)
            pulseLed(led, elapsed)
          }

          renderer.render(scene, camera)
        }
        raf = requestAnimationFrame(tick)

        setState('ready')

        cleanup = () => {
          cancelAnimationFrame(raf)
          sizing.stop()
          visibility.stop()
          scroll.stop()
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
      className={`module-viewer module-viewer--${state} ${className}`.trim()}
      role="img"
      aria-label="Modul sensor Bluetooth Glykos berputar pelan, dengan LED indikator pengiriman data"
    />
  )
}
