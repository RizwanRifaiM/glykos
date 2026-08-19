import { useEffect, useRef, useState } from 'react'
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
import {
  createHotspot,
  DEMO_PRESSURE_POINTS,
  SENSOR_ALONG,
  SENSOR_ORDER,
  pulseHotspot,
  sensorLabelHtml,
} from '../three/sensorPoints'
import {
  addWireframeOverlay,
  createGlowTexture,
  createParticleField,
  createScanRing,
  scanSweep,
} from '../three/holo'
import {
  applyEnvironment,
  applyToneMapping,
  createBloomComposer,
  createContactShadow,
} from '../three/renderQuality'
import {
  bob,
  damp,
  easeOutBack,
  facingOpacity,
  staggerProgress,
  viewportProgress,
} from '../utils/sceneMath'

// Batas kemiringan vertikal, radian. Tanpa batas, seretan panjang ke atas
// akan membalik sepatu sampai terlihat dari bawah dengan pencahayaan yang
// dirancang untuk sudut atas — hasilnya siluet gelap tanpa bentuk. ~34°
// cukup untuk memperlihatkan sol dan bagian atas, tanpa pernah terbalik.
const MAX_PITCH = 0.6

// Hasil kalibrasi terhadap mesh sepatu ini — dipertahankan apa adanya dari
// berkas sumber. pos/hgt = posisi modul sepanjang & setinggi sepatu,
// len/bh/bw = dimensi kotaknya, gap = jarak ke dinding, side = sisi mana.
const CFG = { pos: 0.3, hgt: 0.55, len: 1.0, bh: 0.55, bw: 0.26, gap: -0.02, side: 1 }

// Tinggi tiap titik sensor pada dinding sepatu. Posisi memanjangnya datang
// dari SENSOR_ALONG (dipakai bersama tampilan urai); yang khas hero hanyalah
// ketinggian ini.
//
// Jauh lebih rendah daripada modul (CFG.hgt = 0,55) dengan sengaja: sensor
// tekanan berada di dalam sol, jadi tempatnya memang di garis bawah sepatu.
// Itu juga yang menjaga keduanya tidak pernah saling menimpa di layar.
const SENSOR_HEIGHT = { heel: 0.15, metatarsal: 0.13, toe: 0.12 }

// Seberapa jauh kamera & kemiringan bergerak mengikuti gulir.
const SCROLL_PITCH = 0.4
const SCROLL_DOLLY = 0.28
const SCROLL_RISE = 0.5

// Laju putar otomatis, RADIAN PER DETIK — bukan per frame. Versi sebelumnya
// menambah sudut tetap tiap frame, jadi layar 120 Hz memutar sepatu dua kali
// lebih cepat daripada 60 Hz. Nilainya juga dinaikkan jauh: 0,0022 rad/frame
// dulu berarti satu putaran penuh hampir satu menit — terlalu lambat untuk
// terbaca sebagai gerakan sama sekali.
const AUTO_SPIN = 0.45

// Bagian laju putar yang TERSISA setelah satu detik saat seretan dilepas.
// Makin besar makin panjang luncurannya sebelum kembali ke laju dasar.
const SPIN_SETTLE = 0.05

const DRAG_SENSITIVITY = 0.008

// Ayunan mengambang. Sepatu yang hanya berputar pada satu sumbu terbaca
// seperti benda di atas meja putar; naik-turun sedikit membuatnya terbaca
// melayang. Simpangannya relatif terhadap ukuran model, jadi tetap sepadan
// kalau modelnya diganti.
const BOB_AMPLITUDE = 0.03
const BOB_ROLL = 0.045
const BOB_SPEED = 0.9

// Kemunculan titik sensor: menunggu animasi masuk modelnya selesai, lalu
// muncul satu per satu.
const HOTSPOT_STAGGER = { offset: INTRO_SEC * 0.7, delay: 0.22, duration: 0.55 }

// Bagian jarak yang TERSISA setelah satu detik. Makin kecil makin cepat
// mengejar; 0,0005 kira-kira setara "sampai dalam ~0,3 detik".
const SCROLL_SMOOTHING = 0.0005

// Durasi animasi masuk, detik. Skala & putaran awalnya dianimasikan di dalam
// scene, bukan lewat transform CSS pada kanvas: mengubah skala kanvas WebGL
// hanya membesarkan gambar yang sudah dirender, lengkap dengan piksel yang
// ikut kabur.
const INTRO_SEC = 0.9

// Warna lapisan holografik: --glykos-light-blue yang dicerahkan. Warna merek
// aslinya (#86a788) dipilih untuk teks di atas kertas krem dan terlalu redup
// untuk berperan sebagai cahaya; versi ini mempertahankan rona sage-nya tapi
// cukup terang untuk terbaca sebagai pendar di atas panggung gelap.
const HOLO_COLOR = 0xb6e3c4

// Harus sama persis dengan --bg pada .landing di Landing.css. Kanvasnya buram
// (lihat createRenderer), jadi selisih sekecil apa pun akan terlihat sebagai
// persegi yang sedikit beda warna di tengah halaman.
const SCENE_BG = 0x060d0a

// Pengali kecerahan untuk benda yang HARUS berpendar. Bloom bekerja dengan
// ambang: apa pun di bawahnya tidak berpendar sama sekali. Warna sage biasa
// nilainya jauh di bawah ambang, jadi tanpa dorongan ini titik sensor dan
// garis pindai hanya jadi bentuk berwarna — persis keadaan sebelum bloom ada.
// Nilai di atas 1 selamat sampai ke pass bloom karena EffectComposer memakai
// render target setengah-presisi float, bukan 8 bit per kanal.
const EMISSIVE_BOOST = 2.4

// Satu sapuan pindai penuh, detik. Cukup lambat untuk terbaca sebagai
// pengukuran, cukup sering untuk tidak terlewat oleh orang yang hanya
// memandang beberapa detik.
const SCAN_PERIOD = 4.6

// Kerangka wireframe tidak pernah hilang sama sekali — ada dasar tipis yang
// selalu terlihat, lalu menguat saat garis pindai melewatinya. Nol di antara
// sapuan membuat kemunculannya terasa seperti gangguan, bukan lapisan yang
// memang ada.
const WIRE_BASE_OPACITY = 0.05
const WIRE_SCAN_OPACITY = 0.17

const PARTICLE_COUNT = 90

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

// `fallback` = yang ditampilkan saat WebGL tidak tersedia atau model gagal
// dimuat. Karena komponen ini memegang visual utama hero, kotak kosong bukan
// pilihan: pemanggilnya mengirim ilustrasi insole sebagai pengganti, sehingga
// pengguna tanpa WebGL tetap melihat produknya.
export default function ShoeViewer({ className = '', fallback = null }) {
  const hostRef = useRef(null)
  // Dukungan WebGL diputuskan lewat inisialisasi malas useState, bukan lewat
  // setState di dalam effect. Ini fakta lingkungan yang sudah pasti sebelum
  // render pertama — memindahkannya ke effect berarti komponen dirender
  // sekali dengan status yang sudah diketahui salah, lalu dirender ulang.
  const [state, setState] = useState(() =>
    typeof window !== 'undefined' && webglAvailable() ? 'idle' : 'unsupported',
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof window === 'undefined') return
    // Statusnya sudah 'unsupported' dari inisialisasi di atas.
    if (!webglAvailable()) return

    // Three.js tidak membebaskan memori GPU sendiri saat komponennya dilepas.
    // Geometry, material, dan konteks WebGL-nya harus dibuang manual — kalau
    // tidak, tiap kali pengguna bolak-balik ke halaman ini satu konteks
    // bocor, sampai peramban mulai membuang konteks tertua secara paksa.
    let disposed = false
    let cleanup = () => {}

    // Modelnya 112 KB dan three.js jauh lebih besar lagi. Keduanya baru
    // diunduh saat bagian ini mendekati layar, bukan saat halaman dibuka —
    // pengunjung yang tidak pernah menggulir sampai sini tidak membayar
    // apa pun untuk fitur yang tidak dilihatnya.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        io.disconnect()
        setState('loading')
        start()
      },
      { rootMargin: '250px' },
    )
    io.observe(host)

    async function start() {
      // Dipegang di luar `try` supaya blok catch bisa membereskan scene yang
      // baru setengah jadi. Kanvasnya sudah menempel di DOM sejak
      // createRenderer, jadi kegagalan sesudah titik itu — raycast meleset,
      // geometry gagal dibentuk — akan meninggalkan kanvas kosong yang
      // menutupi gambar pengganti, dan satu konteks WebGL yang tidak pernah
      // dilepas.
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
        const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200)
        renderer = createRenderer(THREE, host, { clearColor: SCENE_BG })
        applyToneMapping(THREE, renderer)
        applyEnvironment(THREE, kit.RoomEnvironment, renderer, scene, disposer)

        // Cahaya dihangatkan. Sumbernya memakai biru dingin (0xdfe8ff /
        // 0x9fc0ff) karena dirancang untuk latar hitam; di atas halaman krem,
        // cahaya sedingin itu membuat sepatunya tampak seperti potongan
        // gambar dari tempat lain.
        // Intensitasnya diturunkan dari sebelumnya (1,0 / 1,9 / 0,55 / 0,75).
        // Environment map sekarang ikut menyumbang cahaya sekeliling; menahan
        // nilai lama di atasnya membuat sepatu terlalu terang dan menembus
        // ambang bloom, sehingga SELURUH badannya ikut berpendar — bukan hanya
        // titik cahayanya.
        scene.add(new THREE.HemisphereLight(0xdff0e4, 0x1a2b20, 0.5))
        const key = new THREE.DirectionalLight(0xffffff, 1.15)
        key.position.set(4, 7, 5)
        const fill = new THREE.DirectionalLight(0xbfe6cd, 0.35)
        fill.position.set(-5, 3, -3)
        // Cahaya tepi berwarna mint: pada latar gelap, garis terang di sisi
        // yang membelakangi cahaya utama itulah yang memisahkan siluet sepatu
        // dari latarnya.
        const rim = new THREE.DirectionalLight(HOLO_COLOR, 1.1)
        rim.position.set(-2, 2, -6)
        scene.add(key, fill, rim)

        // Tiga grup bersarang, bukan satu objek dengan rotasi X dan Y
        // sekaligus. Kalau keduanya dipasang pada objek yang sama, urutan
        // Euler membuat kemiringan vertikal perlahan berubah jadi putaran
        // miring begitu sudut horizontalnya jauh dari nol — sepatunya
        // terlihat seperti terguling, bukan didongakkan.
        //
        //   pitchGroup : dongak/tunduk (sumbu X), dipasang paling luar
        //   outer      : putaran horizontal (sumbu Y), yang berputar sendiri
        //   inner      : kerangka koordinat model, acuan raycast modul
        const pitchGroup = new THREE.Group()
        const outer = new THREE.Group()
        const inner = new THREE.Group()
        outer.add(inner)
        pitchGroup.add(outer)
        scene.add(pitchGroup)

        const shoeMeshes = []
        shoe.traverse((object) => {
          if (object.isMesh) shoeMeshes.push(object)
        })

        const initialBox = new THREE.Box3().setFromObject(shoe)
        const center = initialBox.getCenter(new THREE.Vector3())
        const size = initialBox.getSize(new THREE.Vector3())
        shoe.position.sub(center)
        inner.add(shoe)

        // Kotak batas dihitung ULANG setelah model digeser ke titik nol.
        // Penempatan modul & titik sensor di bawah memakai koordinat lokal,
        // jadi memakai kotak batas sebelum pergeseran akan menaruh keduanya
        // jauh meleset.
        const box = new THREE.Box3().setFromObject(shoe)

        const { pos, hgt, len, bh, bw, gap, side } = CFG
        const heelX = box.max.x
        const shoeLength = heelX - box.min.x

        // Modul & titik sensor ditempelkan RATA pada dinding sepatu lewat
        // raycast, bukan ditaruh di koordinat tetap: dinding sepatu
        // melengkung, jadi posisi tetap akan menembus badan sepatu di satu
        // sudut dan melayang di sudut lain.
        const ray = new THREE.Raycaster()
        const sampleWall = (lx, ly, wallSide) => {
          const start = inner.localToWorld(new THREE.Vector3(lx, ly, wallSide * 6))
          ray.set(start, new THREE.Vector3(0, 0, -wallSide))
          const hits = ray.intersectObjects(shoeMeshes, true)
          if (!hits.length) return null
          const hit = hits[0]
          const normal = hit.face.normal
            .clone()
            .applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))
            .normalize()
          if (normal.z * wallSide < 0) normal.negate()
          return { point: inner.worldToLocal(hit.point.clone()), normal }
        }

        const { group: mod, led } = createSensorModule(THREE, disposer, { len, bh, bw })
        inner.add(mod)

        const cx = heelX - pos * shoeLength
        const cy = box.min.y + hgt

        const front = sampleWall(cx + len * 0.38, cy, side)
        const back = sampleWall(cx - len * 0.38, cy, side)
        const mid = sampleWall(cx, cy, side)

        if (front && back && mid) {
          const axis = new THREE.Vector3().subVectors(front.point, back.point).normalize()
          const normal = new THREE.Vector3()
            .addVectors(front.normal, back.normal)
            .add(mid.normal)
            .normalize()
          const up = new THREE.Vector3().crossVectors(normal, axis).normalize()
          const right = new THREE.Vector3().crossVectors(up, normal).normalize()
          mod.position.copy(mid.point.clone().addScaledVector(normal, bw / 2 + gap))
          mod.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
        } else {
          // Kalau raycast meleset (misalnya modelnya nanti diganti), modul
          // tetap muncul di posisi perkiraan alih-alih hilang tanpa jejak.
          mod.position.set(cx, cy, side * 0.5)
        }

        // ---- Titik sensor tekanan ------------------------------------------
        // Inilah yang membuat model ini menerangkan sesuatu, bukan sekadar
        // berputar: tiga titik menyala persis di tempat sensornya berada,
        // berdenyut mengikuti besar tekanannya, dengan angka yang sama seperti
        // ilustrasi insole di section "Cara Kerja".
        labels = createLabelLayer(THREE, host, 'shoe-viewer__labels')
        const hotspots = []
        const discNormal = new THREE.Vector3(0, 0, 1)

        // Tekstur gradien tinggal dipakai partikel. Sprite halo pada titik
        // sensor dan LED SUDAH DIBUANG: itu tiruan pendar yang dibuat sebelum
        // ada bloom, dan menumpuk keduanya menghasilkan kabut ganda — halo
        // tiruan tidak tahu apa-apa tentang kecerahan sesungguhnya, jadi ia
        // menyala sama rata untuk benda terang maupun redup.
        const glowTexture = createGlowTexture(THREE, disposer)

        SENSOR_ORDER.forEach((area) => {
          const kpa = DEMO_PRESSURE_POINTS[area]
          const sample = sampleWall(
            heelX - SENSOR_ALONG[area] * shoeLength,
            box.min.y + SENSOR_HEIGHT[area],
            side,
          )
          // Satu titik yang meleset tidak boleh menjatuhkan dua lainnya —
          // model bisa saja diganti dengan mesh yang bentuknya sedikit beda.
          if (!sample) return

          const hotspot = createHotspot(THREE, disposer, kpa, shoeLength * 0.035)
          hotspot.group.position.copy(sample.point.clone().addScaledVector(sample.normal, 0.012))
          hotspot.group.quaternion.setFromUnitVectors(discNormal, sample.normal)
          // Mulai dari nol supaya bisa dimunculkan bertahap di loop render.
          // Saat reduced-motion tidak ada loop yang memunculkannya, jadi
          // ukurannya langsung penuh — kalau tidak, titiknya tidak pernah ada.
          hotspot.group.scale.setScalar(reduced ? 1 : 0)
          hotspot.appear = reduced ? 1 : 0
          // Didorong melewati ambang bloom supaya pendarnya datang dari pass
          // bloom, bukan dari sprite tempelan.
          hotspot.disc.material.color.multiplyScalar(EMISSIVE_BOOST)
          inner.add(hotspot.group)

          hotspot.label = labels.add(
            hotspot.group,
            sensorLabelHtml(area, kpa),
            'shoe-viewer__label',
          )
          hotspots.push(hotspot)
        })

        // Jarak kamera dikencangkan supaya sepatu mengisi bingkai. Batasnya
        // ditentukan oleh sisi TERPANJANG model: saat berputar, profil
        // terpanjang itulah yang paling dekat ke tepi, jadi menyisakan sedikit
        // margin di sana mencegah ujung sepatu terpotong pada sebagian putaran.
        const radius = Math.max(size.x, size.y, size.z)

        // ---- Lapisan holografik ---------------------------------------------
        // Ditambahkan SETELAH seluruh raycast di atas selesai — lihat catatan
        // urutan pada addWireframeOverlay di three/holo.js.
        const wireMaterial = addWireframeOverlay(THREE, disposer, shoeMeshes, HOLO_COLOR)

        // Cincin pindai dan partikel duduk di `scene`, BUKAN di dalam grup
        // yang berputar. Garis pindai yang ikut berputar bersama sepatu tidak
        // lagi terbaca sebagai alat yang mengukur benda — ia jadi bagian dari
        // bendanya sendiri.
        const scanRing = createScanRing(THREE, disposer, radius * 0.6, HOLO_COLOR)
        scanRing.material.color.multiplyScalar(EMISSIVE_BOOST)
        scene.add(scanRing)

        // Bayangan kontak memberi sepatu bobot. Tanpa ini benda melayang di
        // ruang hitam tanpa hubungan apa pun dengan bidang di bawahnya, dan
        // itu justru ciri render mentah yang ingin dihindari.
        const contactShadow = createContactShadow(THREE, disposer, radius * 0.5, 0.55)
        scene.add(contactShadow)

        const field = createParticleField(
          THREE,
          disposer,
          glowTexture,
          PARTICLE_COUNT,
          radius * 0.95,
          HOLO_COLOR,
        )
        scene.add(field.points)

        const shoeMinY = box.min.y
        const shoeHeight = box.max.y - box.min.y

        const baseCamera = new THREE.Vector3(radius * 0.85, radius * 0.42, radius * 1.18)
        camera.position.copy(baseCamera)
        camera.lookAt(0, 0, 0)

        const post = createBloomComposer(THREE, kit, renderer, scene, camera, {
          strength: 0.55,
          radius: 0.5,
          threshold: 0.72,
        })

        const sizing = trackSize(host, renderer, camera, post.setSize)
        const visibility = trackVisibility(host)
        const scroll = createScrollTracker(host)

        // Seret dua sumbu. Pointer Events, bukan mouse + touch terpisah,
        // supaya mouse, sentuh, dan pena tertangani lewat satu jalur.
        //
        // Di layar sentuh, `touch-action: pan-y` pada CSS-nya menghasilkan
        // penguncian arah secara cuma-cuma: kalau gerakan awal jari lebih
        // condong vertikal, peramban mengambil alih untuk menggulir halaman
        // dan mengirim pointercancel; kalau lebih condong horizontal,
        // peramban tidak menggulir dan semua pointermove sampai ke sini —
        // termasuk komponen vertikalnya. Jadi seretan menyamping tetap bisa
        // mendongakkan sepatu, sementara gulir halaman tidak pernah
        // terperangkap. Itu sebabnya nilainya TIDAK diubah ke `none`.
        let dragging = false
        let lastX = 0
        let lastY = 0

        // Kemiringan dari SERETAN disimpan terpisah dari kemiringan yang
        // datang dari gulir. Kalau keduanya menulis ke rotation.x yang sama,
        // gulir sedikit saja akan menghapus posisi yang baru saja diatur
        // pengguna dengan tangannya — dan itu terasa seperti kerusakan.
        let userPitch = 0
        let scrollPitch = 0
        let scrollCam = 0
        // Radian per detik. Diberi nilai awal laju dasar supaya sepatu sudah
        // bergerak sejak frame pertama, bukan diam lalu perlahan mulai.
        let spin = AUTO_SPIN

        const onPointerDown = (event) => {
          dragging = true
          lastX = event.clientX
          lastY = event.clientY
          host.setPointerCapture?.(event.pointerId)
        }
        const onPointerMove = (event) => {
          if (!dragging) return
          const dx = event.clientX - lastX
          const dy = event.clientY - lastY
          lastX = event.clientX
          lastY = event.clientY
          outer.rotation.y += dx * DRAG_SENSITIVITY
          userPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, userPitch + dy * 0.006))
          // Dikalikan 60 untuk mengubah "radian pada frame ini" menjadi
          // perkiraan radian per detik — itulah satuan yang dipakai luncuran
          // setelah jari dilepas.
          spin = dx * DRAG_SENSITIVITY * 60
        }
        const onPointerUp = (event) => {
          dragging = false
          host.releasePointerCapture?.(event.pointerId)
        }

        host.addEventListener('pointerdown', onPointerDown)
        host.addEventListener('pointermove', onPointerMove)
        host.addEventListener('pointerup', onPointerUp)
        host.addEventListener('pointercancel', onPointerUp)

        // Vektor kerja dialokasikan SEKALI. Membuat Vector3 baru tiap frame
        // berarti ratusan objek per detik yang seluruhnya jadi sampah — cukup
        // untuk memicu jeda pengumpulan sampah yang terlihat sebagai
        // tersendat, tepat pada animasi yang seharusnya mulus.
        const worldNormal = new THREE.Vector3()
        const worldPoint = new THREE.Vector3()
        const toCamera = new THREE.Vector3()

        let raf = 0
        let last = performance.now()
        let elapsed = 0

        const tick = (now) => {
          raf = requestAnimationFrame(tick)
          // Jeda dibatasi: tab yang lama tidak aktif akan mengirim delta
          // berukuran menit, dan itu melompatkan seluruh animasi sekaligus.
          const delta = Math.min((now - last) / 1000, 0.1)
          last = now
          // Berhenti menggambar saat di luar layar. Tanpa ini GPU tetap
          // merender 60 kali per detik untuk sesuatu yang tidak terlihat
          // selama pengguna membaca bagian lain halaman.
          if (!visibility.state.visible) return
          elapsed += delta

          // Animasi masuk: sepatu tumbuh ke ukuran penuh, sekali saja.
          const intro = reduced ? 1 : easeOutCubic(Math.min(elapsed / INTRO_SEC, 1))
          pitchGroup.scale.setScalar(0.86 + 0.14 * intro)

          if (!reduced) {
            const progress = scroll.read(viewportProgress)
            // Hero berada di puncak halaman, jadi saat dimuat progresnya sudah
            // sekitar 0,5. Yang menarik hanya paruh setelahnya — itulah gerak
            // "menyerahkan" sepatu ke pembaca saat ia menggulir turun.
            const target = Math.max(0, (progress - 0.5) * 2)
            scrollPitch = damp(scrollPitch, target * SCROLL_PITCH, SCROLL_SMOOTHING, delta)
            scrollCam = damp(scrollCam, target, SCROLL_SMOOTHING, delta)

            camera.position
              .copy(baseCamera)
              .multiplyScalar(1 + SCROLL_DOLLY * scrollCam)
              .setY(baseCamera.y + radius * SCROLL_RISE * scrollCam)
            camera.lookAt(0, 0, 0)

            // Mengambang: naik-turun pelan plus oleng kecil pada sumbu
            // berbeda. Dikalikan `intro` supaya ayunannya ikut tumbuh dari nol
            // dan tidak menyentak di frame pertama.
            pitchGroup.position.y = bob(elapsed, radius * BOB_AMPLITUDE, BOB_SPEED) * intro
            outer.rotation.z = bob(elapsed, BOB_ROLL, BOB_SPEED * 0.75, 1.1) * intro

            pulseLed(led, elapsed)

            // ---- Sapuan pindai ------------------------------------------
            // Cincinnya berada di ruang dunia sementara sepatunya diskalakan
            // dan diayun oleh pitchGroup, jadi ketinggiannya harus dihitung
            // lewat transform itu — kalau tidak, garis pindainya melayang di
            // tempat lain dan tidak pernah benar-benar menyentuh sepatunya.
            const sweep = scanSweep(elapsed, SCAN_PERIOD)
            const modelScale = pitchGroup.scale.x
            scanRing.position.y =
              pitchGroup.position.y + (shoeMinY + shoeHeight * sweep.position) * modelScale
            scanRing.scale.setScalar(modelScale)
            scanRing.material.opacity = sweep.intensity * 0.55 * intro

            // Kerangka menguat tepat saat garis pindai melintasinya — dua
            // isyarat untuk satu kejadian, jadi keduanya saling menjelaskan.
            wireMaterial.opacity =
              (WIRE_BASE_OPACITY + sweep.intensity * WIRE_SCAN_OPACITY) * intro

            field.update(elapsed)
            field.points.material.opacity = 0.45 * intro

            // Makin tinggi sepatu mengambang, makin lebar dan makin pudar
            // bayangannya — satu-satunya isyarat yang membuat ayunan terbaca
            // sebagai ketinggian, bukan sekadar geser ke atas.
            const lift = pitchGroup.position.y / (radius * BOB_AMPLITUDE || 1)
            contactShadow.position.y = shoeMinY * modelScale - radius * 0.03
            contactShadow.material.opacity = (0.5 - lift * 0.09) * intro
            contactShadow.scale.setScalar(1 + lift * 0.06)

            hotspots.forEach((hotspot, index) => {
              // Skala GRUP dipakai untuk kemunculan, skala CINCIN di dalamnya
              // dipakai untuk denyut — dua objek berbeda, jadi keduanya bisa
              // berjalan bersamaan tanpa saling menimpa.
              hotspot.appear = easeOutBack(staggerProgress(elapsed, index, HOTSPOT_STAGGER))
              hotspot.group.scale.setScalar(hotspot.appear)
              if (hotspot.appear > 0) pulseHotspot(hotspot, elapsed)
            })
          }

          pitchGroup.rotation.x = userPitch + scrollPitch * intro

          if (!dragging) {
            // Putaran otomatis dimatikan saat reduced-motion, tapi seret
            // manual tetap jalan: yang ditolak pengguna adalah gerakan yang
            // tidak ia minta, bukan kemampuan berinteraksi.
            //
            // Di luar itu, laju putar meluncur kembali ke laju dasar setelah
            // seretan dilepas — jadi sentakan jari melempar sepatu berputar
            // lebih cepat sesaat, bukan langsung terkunci ke kecepatan tetap.
            spin = reduced ? 0 : damp(spin, AUTO_SPIN, SPIN_SETTLE, delta)
            outer.rotation.y += spin * delta
          }

          // composer.render(), BUKAN renderer.render(): seluruh rantai
          // (render -> bloom -> tone mapping) berjalan di dalamnya.
          post.render()

          // Label diperbarui SETELAH render, saat matriks kamera sudah pasti
          // yang dipakai menggambar frame ini. Titik yang sedang berada di
          // sisi jauh sepatu dipudarkan — labelnya masih bisa diproyeksikan
          // ke layar, tapi yang terlihat di sana adalah punggung sepatu.
          hotspots.forEach((hotspot) => {
            hotspot.group.getWorldDirection(worldNormal)
            hotspot.group.getWorldPosition(worldPoint)
            toCamera.subVectors(camera.position, worldPoint).normalize()
            hotspot.label.opacity = facingOpacity(worldNormal.dot(toCamera)) * hotspot.appear
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
          post.dispose()
          host.removeEventListener('pointerdown', onPointerDown)
          host.removeEventListener('pointermove', onPointerMove)
          host.removeEventListener('pointerup', onPointerUp)
          host.removeEventListener('pointercancel', onPointerUp)
          // Hanya yang dibuat scene ini. Geometry & material sepatu DIBAGI
          // dengan scene lain lewat cache di loadThree.js — lihat catatan
          // pada createDisposer().
          disposer.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch {
        // Gagal memuat three.js atau modelnya bukan alasan untuk menampilkan
        // kotak kosong — status ini yang memunculkan gambar penggantinya.
        // Sisa scene yang terlanjur terbentuk dibereskan dulu, supaya yang
        // dilihat pengguna benar-benar gambar pengganti dan bukan kanvas mati
        // di atasnya.
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
      className={`shoe-viewer shoe-viewer--${state} ${className}`.trim()}
      role="img"
      aria-label={
        state === 'unsupported' || state === 'failed'
          ? 'Ilustrasi insole Glykos dengan titik sensor tekanan'
          : 'Model tiga dimensi sepatu pintar Glykos dengan modul sensor di sisi luarnya, disertai tiga titik sensor tekanan pada tumit, metatarsal, dan jari kaki'
      }
    >
      {(state === 'unsupported' || state === 'failed') &&
        (fallback ?? (
          <p className="shoe-viewer__note" aria-hidden="true">
            Pratinjau 3D tidak tersedia di peramban ini.
          </p>
        ))}
    </div>
  )
}
