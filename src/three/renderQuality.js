// src/three/renderQuality.js
// Yang memisahkan render "WebGL mentah" dari render kelas produk: tone
// mapping, environment map, dan bayangan kontak.
//
// Bloom pernah ada di sini dan sudah DIBUANG. Rantai postprocessing merender
// ke render target lalu menyalinnya kembali, dan alpha tidak selamat melewati
// itu — jadi kanvasnya wajib buram, dan kanvas buram di halaman krem berarti
// pelat berwarna sendiri yang menabrak tata warna halaman. Yang memang perlu
// berpendar (titik sensor) sekarang memakai sprite halo di three/holo.js.
//
// Modul three.js DITERIMA sebagai argumen, tidak diimpor — lihat catatan yang
// sama di sceneKit.js.

// ---- 1. Tone mapping ------------------------------------------------------
// Tanpa ini, renderer memotong nilai warna di atas 1 secara mendadak: sorotan
// pada permukaan mengilap berubah jadi bidang putih rata tanpa bentuk, dan
// seluruh gambar terbaca datar seperti tangkapan layar aplikasi 3D, bukan
// seperti foto produk. ACES memampatkan rentang terangnya secara bertahap,
// jadi sorotan tetap punya gradasi.
//
// Exposure sedikit di atas 1: ACES cenderung menggelapkan nada tengah, dan
// tanpa kompensasi ini seluruh scene terlihat kusam setelah dinyalakan.
export function applyToneMapping(THREE, renderer, exposure = 1.15) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = exposure
}

// ---- 2. Environment map ---------------------------------------------------
// MeshStandardMaterial menghitung pantulan dari `scene.environment`. Tanpa itu
// tidak ada yang bisa dipantulkan, jadi material logam terbaca abu-abu mati
// dan yang mengilap terbaca seperti plastik. RoomEnvironment adalah studio
// prosedural bawaan three — tidak ada berkas HDR yang perlu diunduh.
//
// PMREMGenerator mengolahnya sekali menjadi peta yang siap dipakai; hasilnya
// render target yang HARUS dibuang bersama scene-nya, sementara generator dan
// scene sumbernya bisa dibuang segera setelah dipakai.
export function applyEnvironment(THREE, RoomEnvironment, renderer, scene, disposer) {
  const generator = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()

  // 0.04 = sedikit blur. Nol menghasilkan pantulan berisi bentuk kotak-kotak
  // ruangan yang terbaca sebagai artefak pada permukaan selengkung sepatu.
  const target = generator.fromScene(room, 0.04)
  scene.environment = target.texture

  disposer.track(target)
  room.dispose()
  generator.dispose()

  return target.texture
}

// ---- 3. Bayangan kontak ---------------------------------------------------
// Bukan bayangan sungguhan dari shadow map — hanya cakram gelap kabur di bawah
// benda. Itu cukup: yang membuat benda terlihat punya bobot adalah adanya
// sesuatu yang lebih gelap tepat di bawahnya, bukan ketepatan bentuknya.
// Shadow map untuk satu benda melayang jauh lebih mahal dan hasilnya nyaris
// tidak bisa dibedakan pada sudut pandang setetap ini.
export function createContactShadow(THREE, disposer, radius, opacity = 0.5) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)')
  gradient.addColorStop(0.45, 'rgba(0,0,0,0.35)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = disposer.track(new THREE.CanvasTexture(canvas))
  const geometry = disposer.track(new THREE.PlaneGeometry(radius * 2.6, radius * 1.7))
  const material = disposer.track(
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  )

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  // Digambar lebih dulu daripada apa pun: ia latar, dan tidak boleh menutupi
  // sesuatu yang berada di atasnya.
  mesh.renderOrder = -1
  return mesh
}
