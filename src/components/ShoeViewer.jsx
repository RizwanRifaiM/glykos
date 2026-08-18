import { useEffect, useRef, useState } from 'react'

// Warna modul sensor, sesuai perangkat aslinya yang memang ungu. Sempat
// saya ganti ke sage merek karena ungu bertabrakan dengan palet halaman —
// dikembalikan setelah dipastikan ini warna produk sungguhan. Ketepatan
// terhadap barang fisik menang atas keselarasan palet: pengunjung yang
// nanti memegang perangkatnya harus mengenalinya dari halaman ini.
//
// Nilai diambil dari berkas sumber sepatu_3d_bersih.html.
const MODULE_COLORS = {
  body: 0x9b6bff,
  seam: 0x7a4fd4,
  button: 0xd9dbdf,
  port: 0x2a2a30,
  led: 0x2b6fff,
}

// Batas kemiringan vertikal, radian. Tanpa batas, seretan panjang ke atas
// akan membalik sepatu sampai terlihat dari bawah dengan pencahayaan yang
// dirancang untuk sudut atas — hasilnya siluet gelap tanpa bentuk. ~34°
// cukup untuk memperlihatkan sol dan bagian atas, tanpa pernah terbalik.
const MAX_PITCH = 0.6

// Hasil kalibrasi terhadap mesh sepatu ini — dipertahankan apa adanya dari
// berkas sumber. pos/hgt = posisi modul sepanjang & setinggi sepatu,
// len/bh/bw = dimensi kotaknya, gap = jarak ke dinding, side = sisi mana.
const CFG = { pos: 0.3, hgt: 0.55, len: 1.0, bh: 0.55, bw: 0.26, gap: -0.02, side: 1 }

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

// `fallback` = yang ditampilkan saat WebGL tidak tersedia atau model gagal
// dimuat. Karena komponen ini sekarang memegang visual utama hero, kotak
// kosong bukan pilihan: pemanggilnya mengirim ilustrasi insole sebagai
// pengganti, sehingga pengguna tanpa WebGL tetap melihat produknya.
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
      try {
        const [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/libs/meshopt_decoder.module.js'),
        ])
        if (disposed) return

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200)
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        host.appendChild(renderer.domElement)

        // Cahaya dihangatkan. Sumbernya memakai biru dingin (0xdfe8ff /
        // 0x9fc0ff) karena dirancang untuk latar hitam; di atas halaman krem,
        // cahaya sedingin itu membuat sepatunya tampak seperti potongan
        // gambar dari tempat lain.
        scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8ea48f, 1.0))
        const key = new THREE.DirectionalLight(0xffffff, 1.9)
        key.position.set(4, 7, 5)
        const fill = new THREE.DirectionalLight(0xdfeee0, 0.55)
        fill.position.set(-5, 3, -3)
        const rim = new THREE.DirectionalLight(0xffffff, 0.75)
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

        const modelUrl = import.meta.env.BASE_URL + 'sepatu.glb'
        const gltf = await new GLTFLoader()
          .setMeshoptDecoder(MeshoptDecoder)
          .loadAsync(modelUrl)
        if (disposed) return

        const shoe = gltf.scene
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
        // Penempatan modul di bawah memakai koordinat lokal, jadi memakai
        // kotak batas sebelum pergeseran akan menaruh modul jauh meleset.
        const box = new THREE.Box3().setFromObject(shoe)

        const mod = new THREE.Group()
        inner.add(mod)

        const boxGeo = new THREE.BoxGeometry(1, 1, 1)
        const ledGeo = new THREE.SphereGeometry(1, 20, 20)
        const mk = (geometry, color, extra) =>
          new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, ...extra }))

        const body = mk(boxGeo, MODULE_COLORS.body, { roughness: 0.38, metalness: 0.12 })
        const seam = mk(boxGeo, MODULE_COLORS.seam, { roughness: 0.5 })
        const button = mk(boxGeo, MODULE_COLORS.button, { roughness: 0.32, metalness: 0.4 })
        const port = mk(boxGeo, MODULE_COLORS.port, { roughness: 0.45, metalness: 0.5 })
        const led = mk(ledGeo, MODULE_COLORS.led, {
          emissive: MODULE_COLORS.led,
          emissiveIntensity: 1.6,
          roughness: 0.25,
        })
        mod.add(body, seam, button, port, led)

        // Modul ditempelkan RATA pada dinding sepatu lewat raycast, bukan
        // ditaruh di koordinat tetap: dinding sepatu melengkung, jadi posisi
        // tetap akan menembus badan sepatu di satu sudut dan melayang di
        // sudut lain. Tiga sampel dipakai untuk mendapat sumbu dan normal
        // permukaannya. Logika ini berasal dari berkas yang kamu kirim.
        const ray = new THREE.Raycaster()
        const sampleWall = (lx, ly, side) => {
          const start = inner.localToWorld(new THREE.Vector3(lx, ly, side * 6))
          ray.set(start, new THREE.Vector3(0, 0, -side))
          const hits = ray.intersectObjects(shoeMeshes, true)
          if (!hits.length) return null
          const hit = hits[0]
          const normal = hit.face.normal
            .clone()
            .applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))
            .normalize()
          if (normal.z * side < 0) normal.negate()
          return { point: inner.worldToLocal(hit.point.clone()), normal }
        }

        const { pos, hgt, len, bh, bw, gap, side } = CFG
        const heelX = box.max.x
        const shoeLength = heelX - box.min.x
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

        body.scale.set(len, bh, bw)
        seam.scale.set(len * 1.004, 0.018, bw * 1.004)
        seam.position.set(0, bh * 0.17, 0)
        button.scale.set(len * 0.15, bh * 0.14, 0.05)
        button.position.set(-len * 0.26, bh * 0.17, bw / 2)
        port.scale.set(len * 0.18, bh * 0.11, 0.035)
        port.position.set(len * 0.28, bh * 0.15, bw / 2)
        led.scale.setScalar(bh * 0.085)
        led.position.set(0.02, bh * 0.17, bw / 2 - 0.01)

        // Jarak kamera dikencangkan dari 1.05/0.55/1.50 supaya sepatu
        // mengisi bingkai. Batasnya ditentukan oleh sisi TERPANJANG model:
        // saat berputar, profil terpanjang itulah yang paling dekat ke tepi,
        // jadi menyisakan sedikit margin di sana mencegah ujung sepatu
        // terpotong pada sebagian putaran.
        const radius = Math.max(size.x, size.y, size.z)
        camera.position.set(radius * 0.85, radius * 0.42, radius * 1.18)
        camera.lookAt(0, 0, 0)

        const resize = () => {
          const width = host.clientWidth
          const height = host.clientHeight
          if (!width || !height) return
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }
        resize()
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)

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
        let velocity = 0

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
          outer.rotation.y += dx * 0.008
          pitchGroup.rotation.x = Math.max(
            -MAX_PITCH,
            Math.min(MAX_PITCH, pitchGroup.rotation.x + dy * 0.006),
          )
          velocity = dx * 0.008
        }
        const onPointerUp = (event) => {
          dragging = false
          host.releasePointerCapture?.(event.pointerId)
        }

        host.addEventListener('pointerdown', onPointerDown)
        host.addEventListener('pointermove', onPointerMove)
        host.addEventListener('pointerup', onPointerUp)
        host.addEventListener('pointercancel', onPointerUp)

        let visible = true
        const visibilityObserver = new IntersectionObserver(
          (entries) => {
            visible = entries.some((entry) => entry.isIntersecting)
          },
          { threshold: 0 },
        )
        visibilityObserver.observe(host)

        let raf = 0
        const tick = () => {
          raf = requestAnimationFrame(tick)
          // Berhenti menggambar saat di luar layar. Tanpa ini GPU tetap
          // merender 60 kali per detik untuk sesuatu yang tidak terlihat
          // selama pengguna membaca bagian lain halaman.
          if (!visible) return
          if (!dragging) {
            // Putaran otomatis dimatikan saat reduced-motion, tapi seret
            // manual tetap jalan: yang ditolak pengguna adalah gerakan yang
            // tidak ia minta, bukan kemampuan berinteraksi.
            if (reduced) {
              velocity = 0
            } else {
              velocity += (0.0022 - velocity) * 0.02
            }
            outer.rotation.y += velocity
          }
          renderer.render(scene, camera)
        }
        tick()

        setState('ready')

        cleanup = () => {
          cancelAnimationFrame(raf)
          resizeObserver.disconnect()
          visibilityObserver.disconnect()
          host.removeEventListener('pointerdown', onPointerDown)
          host.removeEventListener('pointermove', onPointerMove)
          host.removeEventListener('pointerup', onPointerUp)
          host.removeEventListener('pointercancel', onPointerUp)
          scene.traverse((object) => {
            if (!object.isMesh) return
            object.geometry?.dispose()
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            materials.forEach((material) => material?.dispose())
          })
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch {
        // Gagal memuat three.js atau modelnya bukan alasan untuk menampilkan
        // kotak kosong — status ini yang memunculkan teks penggantinya.
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
          : 'Model tiga dimensi sepatu dengan modul sensor Glykos terpasang di sisi luarnya'
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
