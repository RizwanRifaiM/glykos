// src/three/holo.js
// Lapisan "holografik" untuk scene 3D landing page: halo cahaya, kerangka
// wireframe, garis pindai, dan partikel data.
//
// Semuanya bertema satu hal — perangkat ini MEMINDAI kaki. Itu sebabnya
// bentuk yang dipilih di sini bukan kilau dekoratif sembarangan melainkan
// bahasa alat ukur: kerangka yang muncul-hilang seperti pembacaan yang
// menyegarkan diri, dan bidang cahaya yang menyapu dari tumit ke ujung.
//
// Seperti sceneKit.js, modul three.js DITERIMA sebagai argumen — tidak
// diimpor — supaya file ini tidak menarik three.js ke chunk yang memuatnya.

// Tekstur halo: satu gradien radial putih yang memudar ke transparan.
// Dipakai ulang oleh sprite halo maupun partikel; warnanya diatur lewat
// `color` pada material, bukan lewat tekstur, jadi satu tekstur cukup untuk
// semua warna.
//
// 128 px sudah lebih dari cukup — hasilnya selalu kabur, jadi resolusi yang
// lebih tinggi hanya menambah memori tanpa menambah apa pun yang terlihat.
export function createGlowTexture(THREE, disposer) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  // Inti yang padat lalu turun cepat: gradien linear biasa menghasilkan bola
  // kabur rata yang terbaca seperti noda, bukan cahaya.
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.75)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return disposer.track(texture)
}

// Halo di sekitar sebuah titik cahaya.
//
// AdditiveBlending sengaja TIDAK dipakai. Blending itu menambahkan warna ke
// apa pun di belakangnya — bagus di atas latar gelap, tapi panggung hero
// berlatar terang, dan di sana penambahan hanya mendorong segalanya ke putih.
// Hasilnya bukan cahaya melainkan kabut pucat. Blending normal dengan warna
// pekat justru terbaca sebagai pendar.
export function createGlowSprite(THREE, disposer, texture, color, size) {
  const material = disposer.track(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
  const sprite = new THREE.Sprite(material)
  sprite.scale.setScalar(size)
  return sprite
}

// Kerangka wireframe yang ditumpangkan pada mesh yang sudah ada.
//
// Geometry-nya DIPAKAI BERSAMA dengan mesh aslinya — tidak disalin. Untuk
// model yang datang dari cache (lihat loadThree.js) itu artinya nol tambahan
// memori GPU: yang baru hanya satu material. Karena itu pula geometry-nya
// TIDAK didaftarkan ke disposer; yang dibuang cuma materialnya.
//
// PENTING: panggil SETELAH semua raycast selesai. Kerangka ini menjadi anak
// dari mesh aslinya, dan `intersectObjects(..., true)` menelusuri anak — tanpa
// penjagaan, penempatan modul dan titik sensor akan mengenai kerangka ini
// alih-alih permukaan sepatu. Penjagaannya ada di baris `raycast` di bawah,
// tapi urutannya tetap jangan dibalik.
export function addWireframeOverlay(THREE, disposer, meshes, color) {
  const material = disposer.track(
    new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )

  meshes.forEach((mesh) => {
    const wire = new THREE.Mesh(mesh.geometry, material)
    // Tidak pernah ikut raycast, apa pun urutan pemanggilannya.
    wire.raycast = () => {}
    // Digambar setelah permukaan padatnya, kalau tidak garis-garisnya
    // tenggelam di dalam permukaan yang menutupinya.
    wire.renderOrder = 3
    mesh.add(wire)
  })

  return material
}

// Bidang cahaya yang menyapu naik-turun menembus model.
//
// Cincin, bukan cakram: cakram penuh menutupi sepatu setiap kali melintas.
// Cincin hanya menandai ketinggian sapuan, dan itu justru yang dibaca orang
// sebagai "sedang dipindai".
export function createScanRing(THREE, disposer, radius, color) {
  const geometry = disposer.track(new THREE.RingGeometry(radius * 0.62, radius * 1.02, 64))
  const material = disposer.track(
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      // Cincin ini memang harus terlihat menembus sepatu — itu inti gagasan
      // "memindai". Tanpa ini ia hilang begitu masuk ke dalam badan sepatu,
      // dan yang tersisa cuma cincin yang berkedip di udara.
      depthTest: false,
    }),
  )
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 4
  return mesh
}

// Sapuan disimpan sebagai fungsi murni supaya perilakunya jelas terbaca:
// posisi 0..1 dari bawah ke atas, dan kecerahan yang meredup di kedua ujung
// supaya cincinnya tidak muncul dan lenyap mendadak.
export function scanSweep(elapsedSec, periodSec = 4.5) {
  const t = (elapsedSec % periodSec) / periodSec
  // Sinus setengah gelombang: nol di kedua ujung, puncak di tengah.
  return { position: t, intensity: Math.sin(t * Math.PI) }
}

// Butir data yang melayang di sekitar model. Bukan bintang, bukan salju —
// sebarannya dibuat pada cangkang bola berongga supaya tidak ada yang
// menumpuk tepat di tengah tempat sepatunya berada.
export function createParticleField(THREE, disposer, texture, count, radius, color) {
  const positions = new Float32Array(count * 3)
  const drift = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Arah acak yang merata pada permukaan bola. Mengacak ketiga sumbu secara
    // terpisah akan memusatkan titik di sudut-sudut kubus.
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = radius * (0.75 + Math.random() * 0.6)

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.55
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    drift[i] = Math.random() * Math.PI * 2
  }

  const geometry = disposer.track(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = disposer.track(
    new THREE.PointsMaterial({
      map: texture,
      color,
      size: radius * 0.055,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  )

  const points = new THREE.Points(geometry, material)
  const baseY = Float32Array.from({ length: count }, (_, i) => positions[i * 3 + 1])

  return {
    points,
    // Hanya sumbu Y yang digerakkan, dan hanya sedikit. Partikel yang melayang
    // ke segala arah menarik perhatian ke dirinya sendiri; yang dibutuhkan di
    // sini cuma isyarat bahwa udaranya "hidup".
    update(elapsedSec) {
      const attr = geometry.getAttribute('position')
      for (let i = 0; i < count; i++) {
        attr.array[i * 3 + 1] = baseY[i] + Math.sin(elapsedSec * 0.35 + drift[i]) * radius * 0.05
      }
      attr.needsUpdate = true
      points.rotation.y = elapsedSec * 0.03
    },
  }
}
