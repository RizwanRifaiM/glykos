// src/three/holo.js
// Dua hal yang membuat scene 3D landing page terbaca sebagai ALAT UKUR, bukan
// sekadar benda berputar: halo cahaya pada titik sensor, dan cincin yang
// menyapu model dari tumit ke ujung seperti pembacaan yang sedang berjalan.
//
// Dulu berkas ini juga berisi kerangka wireframe dan medan partikel. Keduanya
// DIBUANG: keduanya lahir untuk panggung gelap bergaya HUD, dan di atas
// halaman krem yang hangat kerangka itu membuat sepatunya terbaca setengah
// jadi sementara partikelnya terbaca sebagai kotoran pada gambar.
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
