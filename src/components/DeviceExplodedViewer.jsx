import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui as useLinguiMacro } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { cloneShoe, loadRenderKit, loadThreeModules } from '../three/loadThree'
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
import { createSensorModule, pulseLed } from '../three/sensorModule'
import { createGlowSprite, createGlowTexture } from '../three/holo'
import { createInsoleGeometry, INSOLE_COLOR, INSOLE_DEPTH } from '../three/insoleShape'
import { applyEnvironment, applyToneMapping, createContactShadow } from '../three/renderQuality'
import {
  createHotspot,
  DEMO_PRESSURE_POINTS,
  SENSOR_ALONG,
  SENSOR_ORDER,
  pressureColor,
  pulseHotspot,
} from '../three/sensorPoints'
import {
  bob,
  damp,
  easeOutBack,
  explodeAmount,
  staggerProgress,
  viewportProgress,
} from '../utils/sceneMath'

// Tampilan urai: sepatu, insole, dan modul sensor terpisah mengikuti gulir.
//
// Produk Glykos adalah SATU sepatu utuh — badan sepatunya, insole bersensor di
// dalamnya, dan modul sensor di sisi luar; pengguna tidak memasang apa pun ke
// sepatunya sendiri. Itu hubungan RUANG antar tiga bagian, hal yang mahal
// dijelaskan dengan kalimat dan langsung terbaca begitu ketiganya dipisahkan
// di depan mata.
//
// Scene ini memakai chunk three.js yang SAMA dengan hero (lihat loadThree.js),
// jadi biaya tambahannya hanya geometry di bawah, bukan ~180 kB pustakanya
// lagi. Modelnya pun salinan dari cache yang sama — tidak ada unduhan kedua.

// Seberapa jauh tiap lapisan bergerak saat terurai penuh, dalam kelipatan
// tinggi sepatu. Sepatu naik lebih jauh daripada modul turun supaya ruang
// kosong di antaranya jatuh di sekitar insole — benda yang paling ingin
// dilihat orang di sini.
const SHOE_RISE = 1.15
const MODULE_DROP = 0.95
const MODULE_SLIDE = 0.5

// Lapisan tidak hanya bergeser lurus — ia ikut memiring saat memisah, arah
// berlawanan antara yang naik dan yang turun. Perpindahan tanpa perubahan
// sudut terbaca seperti gambar yang digeser; dengan kemiringan, terbaca
// seperti benda yang benar-benar diangkat keluar dari tempatnya.
const SHOE_TILT = 0.16
const MODULE_TILT = -0.22
const MODULE_TURN = 0.55

// Laju putar susunan, radian per detik. Dinaikkan dari 0,22 — pada nilai itu
// satu putaran makan hampir 29 detik, jauh lebih lama daripada waktu siapa pun
// memandangi satu section.
const AUTO_SPIN = 0.5

// Ayunan mengambang tiap lapisan, dalam kelipatan tinggi sepatu. Fasenya
// dibuat berbeda supaya ketiganya tidak naik-turun serempak seperti satu
// benda kaku.
const BOB_AMPLITUDE = 0.022
const BOB_SPEED = 0.85

// Kemunculan titik sensor diukur memakai JARAK URAI, bukan waktu: sensor baru
// masuk akal diperlihatkan setelah insole-nya benar-benar terbuka, dan itu
// dikendalikan gulir — bukan jam.
const HOTSPOT_STAGGER = { offset: 0.2, delay: 0.12, duration: 0.32 }

// Kamera mundur seiring lapisan memisah. Tanpa ini bingkai harus dipatok
// selebar susunan yang sudah terurai sejak awal, dan keadaan tersusun —
// yang dilihat pertama kali — jadi tampak kecil di tengah ruang kosong.
const CAMERA_PULLBACK = 0.78

// Sepatu dibuat tembus pandang supaya insole di dalamnya terlihat saat
// keadaan masih tersusun; begitu terurai, ia dipadatkan lagi karena tidak ada
// lagi yang perlu ditembus.
//
// Kembali ke nilai yang dipilih untuk latar krem setelah panggung gelapnya
// dibuang. Sempat dinaikkan ke 0,3 / 0,7 karena di atas latar gelap sepatu
// setipis itu praktis lenyap; di atas krem, nilai setinggi itu justru
// menutupi insole yang seharusnya terlihat menembusnya.
const SHOE_OPACITY_PACKED = 0.22
const SHOE_OPACITY_APART = 0.62

const SMOOTHING = 0.0008

// `fallback` mengikuti pola ShoeViewer: tanpa WebGL, section ini tidak boleh
// kehilangan penjelasannya. Pemanggil mengirim ilustrasi insole — gambar yang
// melabeli ketiga titik sensor beserta angkanya, jadi isi yang tersampaikan
// tetap sama meski bentuk penyampaiannya berbeda.
export default function DeviceExplodedViewer({ className = '', fallback = null }) {
  const hostRef = useRef(null)
  // Dua bentuk useLingui dipakai di sini dengan sengaja:
  //   - `i18n` (dari '@lingui/react') untuk t(i18n) di DALAM effect, tempat
  //     label 3D dirakit;
  //   - `t` (dari '@lingui/react/macro') untuk atribut aria di JSX.
  const { i18n } = useLingui()
  const { t: tMacro } = useLinguiMacro()
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
      // Lihat catatan yang sama di ShoeViewer.jsx: keduanya dipegang di luar
      // `try` supaya scene yang gagal di tengah jalan tidak meninggalkan
      // kanvas mati beserta konteks WebGL-nya.
      const disposer = createDisposer()
      let renderer = null
      let labels = null

      try {
        const [{ THREE }, kit, shoe] = await Promise.all([
          loadThreeModules(),
          loadRenderKit(),
          cloneShoe(),
        ])
        if (disposed) return

        const reduced = prefersReducedMotion()

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 200)
        // Kanvas transparan — lihat catatan yang sama di ShoeViewer.jsx.
        renderer = createRenderer(THREE, host)
        applyToneMapping(THREE, renderer, 1.02)
        applyEnvironment(THREE, kit.RoomEnvironment, renderer, scene, disposer)

        // Pencahayaan disamakan dengan hero, termasuk nilainya. Dua scene
        // berisi perangkat yang sama di satu halaman: warna yang berbeda di
        // antara keduanya akan terbaca sebagai dua produk, bukan dua sudut
        // pandang.
        scene.add(new THREE.HemisphereLight(0xfffdf3, 0xe6ded0, 0.85))
        const key = new THREE.DirectionalLight(0xffffff, 1.45)
        key.position.set(4, 7, 5)
        const fill = new THREE.DirectionalLight(0xe8f1e6, 0.45)
        fill.position.set(-5, 3, -3)
        const rim = new THREE.DirectionalLight(0xffffff, 0.4)
        rim.position.set(-3, 1, -6)
        scene.add(key, fill, rim)

        const spin = new THREE.Group()
        scene.add(spin)

        // ---- Lapisan 1: sepatu ---------------------------------------------
        const shoeLayer = new THREE.Group()
        spin.add(shoeLayer)

        const initialBox = new THREE.Box3().setFromObject(shoe)
        const center = initialBox.getCenter(new THREE.Vector3())
        const size = initialBox.getSize(new THREE.Vector3())
        shoe.position.sub(center)
        shoeLayer.add(shoe)

        // Material sepatu WAJIB di-clone di sini. Aslinya dibagi dengan hero
        // lewat cache di loadThree.js — mengubah opacity-nya langsung akan
        // membuat sepatu di hero ikut tembus pandang, dan membuangnya nanti
        // akan mengosongkan model untuk kedua scene sekaligus.
        const shoeMaterials = []
        shoe.traverse((object) => {
          if (!object.isMesh) return
          const prepare = (material) => {
            const clone = disposer.track(material.clone())
            clone.transparent = true
            clone.opacity = SHOE_OPACITY_PACKED
            // Tanpa ini sepatu menutupi insole di dalamnya pada depth buffer
            // meski warnanya tembus pandang — yang terlihat cuma cangkang
            // berisi kekosongan.
            clone.depthWrite = false
            shoeMaterials.push(clone)
            return clone
          }
          object.material = Array.isArray(object.material)
            ? object.material.map(prepare)
            : prepare(object.material)
          // Digambar terakhir supaya pengurutan tembus pandangnya benar
          // terhadap insole dan modul yang buram.
          object.renderOrder = 2
        })

        const box = new THREE.Box3().setFromObject(shoe)
        const shoeLength = box.max.x - box.min.x

        // ---- Lapisan 2: insole + tiga sensor tekanan -----------------------
        const insoleLayer = new THREE.Group()
        insoleLayer.rotation.x = -Math.PI / 2
        insoleLayer.scale.setScalar((shoeLength * 0.86) / 2)
        insoleLayer.position.y = box.min.y + size.y * 0.12

        const insoleGeo = createInsoleGeometry(THREE, disposer)
        const insoleMat = disposer.track(
          new THREE.MeshStandardMaterial({ color: INSOLE_COLOR, roughness: 0.72, metalness: 0.04 }),
        )
        insoleLayer.add(new THREE.Mesh(insoleGeo, insoleMat))

        // Tiga titik sensor, memakai pembuat dan angka yang sama dengan hero.
        // Posisi memanjangnya juga dari SENSOR_ALONG — titik yang sama harus
        // mendarat di tempat yang sama pada dua gambar di halaman ini.
        const glowTexture = createGlowTexture(THREE, disposer)
        const lateralOffset = { heel: 0.0, metatarsal: 0.1, toe: 0.16 }
        const hotspots = SENSOR_ORDER.map((area) => {
          const kpa = DEMO_PRESSURE_POINTS[area]
          const hotspot = createHotspot(THREE, disposer, kpa, 0.12)
          hotspot.group.position.set(
            1 - 2 * SENSOR_ALONG[area],
            lateralOffset[area],
            INSOLE_DEPTH + 0.045,
          )
          // Halo sprite, sama seperti hero — pengganti bloom yang dibuang.
          const halo = createGlowSprite(THREE, disposer, glowTexture, pressureColor(kpa), 0.52)
          halo.material.opacity = 0.4
          hotspot.group.add(halo)
          insoleLayer.add(hotspot.group)
          return hotspot
        })

        // Grup pembungkus supaya insole bisa diayun tanpa mengganggu
        // rotation.x = -90° yang sudah memegang orientasi datarnya.
        const insoleFloat = new THREE.Group()
        spin.add(insoleFloat)
        insoleFloat.add(insoleLayer)

        // ---- Lapisan 3: modul sensor ---------------------------------------
        const moduleLayer = new THREE.Group()
        spin.add(moduleLayer)

        const { group: mod, led } = createSensorModule(THREE, disposer, {
          len: 1.0,
          bh: 0.55,
          bw: 0.26,
        })
        // Posisi terpasangnya diperkirakan dari kotak batas, bukan diraycast
        // seperti di hero. Di sini modulnya menjauh dari sepatu hampir
        // seketika, jadi menempel rata pada lengkung dinding tidak pernah
        // sempat terlihat — dan raycast-nya jadi biaya tanpa hasil.
        mod.position.set(box.max.x - 0.3 * shoeLength, box.min.y + 0.55, size.z * 0.5)
        moduleLayer.add(mod)

        // ---- Label ----------------------------------------------------------
        labels = createLabelLayer(THREE, host, 'exploded-viewer__labels')
        // Kelas penanda per lapisan bukan hiasan: ketiga jangkar ini berada
        // pada sumbu vertikal yang SAMA, jadi tanpa geseran masing-masing,
        // label insole dan label modul saling menimpa persis di jarak urai
        // yang paling sering dilihat orang. Geserannya ditulis di CSS (lihat
        // .exploded-viewer__label--shoe/--insole/--module di Landing.css)
        // karena satuannya piksel layar, bukan satuan scene.
        const layerLabels = [
          labels.add(
            shoeLayer,
            t(i18n)`Badan sepatu`,
            'exploded-viewer__label exploded-viewer__label--shoe',
          ),
          // Label insole memuat <i> sebagai baris kedua. Tag-nya IKUT di dalam
          // pesan, bukan ditempel dari luar: penerjemah perlu bisa memindahkan
          // mana bagian yang jadi baris utama dan mana keterangannya.
          labels.add(
            insoleLayer,
            t(i18n)`Insole bersensor<i>3 titik tekanan</i>`,
            'exploded-viewer__label exploded-viewer__label--lead exploded-viewer__label--insole',
          ),
          labels.add(
            moduleLayer,
            t(i18n)`Modul sensor &amp; Bluetooth`,
            'exploded-viewer__label exploded-viewer__label--module',
          ),
        ]

        const radius = Math.max(size.x, size.y, size.z)
        const baseCamera = new THREE.Vector3(radius * 0.55, radius * 0.5, radius * 1.55)
        const lookAt = new THREE.Vector3(0, 0, 0)

        const contactShadow = createContactShadow(THREE, disposer, radius * 0.55, 0.32)
        contactShadow.position.y = box.min.y - size.y * 0.5
        scene.add(contactShadow)

        const sizing = trackSize(host, renderer, camera)
        const visibility = trackVisibility(host)
        const scroll = createScrollTracker(host)

        // Reduced-motion: susunannya ditampilkan langsung dalam keadaan
        // TERURAI, diam. Yang ditolak pengguna adalah gerakannya, bukan
        // informasinya — menyajikan tumpukan yang tidak pernah terbuka justru
        // menyembunyikan seluruh isi section ini darinya.
        let explode = reduced ? 1 : 0
        let raf = 0
        let last = performance.now()
        let elapsed = 0

        const applyLayout = (elapsedSec = 0) => {
          const span = size.y
          // Ayunan hanya berlaku sebesar jarak uraiannya: saat masih tersusun
          // ketiganya adalah satu benda, dan lapisan yang mengayun sendiri-
          // sendiri di dalam satu sepatu justru terlihat seperti kerusakan.
          const float = (phase) => bob(elapsedSec, span * BOB_AMPLITUDE, BOB_SPEED, phase) * explode

          shoeLayer.position.y = explode * span * SHOE_RISE + float(0)
          shoeLayer.rotation.z = explode * SHOE_TILT

          insoleFloat.position.y = float(2.1)

          moduleLayer.position.y = -explode * span * MODULE_DROP + float(4.2)
          moduleLayer.position.z = explode * size.z * MODULE_SLIDE
          moduleLayer.rotation.z = explode * MODULE_TILT
          moduleLayer.rotation.y = explode * MODULE_TURN

          hotspots.forEach((hotspot, index) => {
            hotspot.group.scale.setScalar(
              easeOutBack(staggerProgress(explode, index, HOTSPOT_STAGGER)),
            )
          })

          const opacity =
            SHOE_OPACITY_PACKED + (SHOE_OPACITY_APART - SHOE_OPACITY_PACKED) * explode
          shoeMaterials.forEach((material) => {
            material.opacity = opacity
          })

          camera.position.copy(baseCamera).multiplyScalar(1 + CAMERA_PULLBACK * explode)
          camera.lookAt(lookAt)

          // Label baru berarti setelah lapisannya benar-benar terpisah. Saat
          // masih tersusun, ketiganya menumpuk di satu titik dan yang terbaca
          // hanyalah tiga baris teks yang saling menimpa.
          layerLabels.forEach((label) => {
            label.opacity = explode
          })
        }

        applyLayout()

        const tick = (now) => {
          raf = requestAnimationFrame(tick)
          const delta = Math.min((now - last) / 1000, 0.1)
          last = now
          if (!visibility.state.visible) return
          elapsed += delta

          if (!reduced) {
            explode = damp(explode, explodeAmount(scroll.read(viewportProgress)), SMOOTHING, delta)
            spin.rotation.y += AUTO_SPIN * delta
            pulseLed(led, elapsed)
            hotspots.forEach((hotspot) => pulseHotspot(hotspot, elapsed))
            applyLayout(elapsed)
          }

          renderer.render(scene, camera)
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
          // Hanya milik scene ini — material sepatu di sini memang clone,
          // jadi aman dibuang; geometry-nya tidak pernah didaftarkan.
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
    // `i18n.locale` ikut jadi dependensi: label 3D dirakit di dalam effect ini,
    // jadi satu-satunya cara membuatnya ikut berganti bahasa adalah menyusun
    // ulang scene-nya. Mahal — tapi hanya terjadi saat pengguna menekan pemilih
    // bahasa, dan alternatifnya adalah label yang membeku di bahasa lama di
    // tengah halaman yang sudah berganti seluruhnya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.locale])

  return (
    <div
      ref={hostRef}
      className={`exploded-viewer exploded-viewer--${state} ${className}`.trim()}
      role="img"
      aria-label={tMacro`Tampilan terurai sepatu Glykos: badan sepatu di lapisan atas, insole bersensor berisi tiga titik tekanan di tengah, dan modul sensor Bluetooth di lapisan bawah`}
    >
      {(state === 'unsupported' || state === 'failed') &&
        (fallback ?? (
          <p className="exploded-viewer__note">
            <Trans>
              Sepatu Glykos terdiri dari tiga bagian: badan sepatunya, insole bersensor berisi tiga
              titik tekanan, dan modul sensor Bluetooth di sisi luar.
            </Trans>
          </p>
        ))}
    </div>
  )
}
