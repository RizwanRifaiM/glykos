// src/three/renderQuality.js
// Tiga hal yang memisahkan render "WebGL mentah" dari render kelas produk:
// tone mapping, environment map, dan bloom. Ketiganya standar di situs produk
// yang memakai 3D, dan ketiganya absen di versi sebelumnya.
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

// ---- 3. Bloom -------------------------------------------------------------
// Pendar sungguhan: piksel yang lebih terang dari ambang disebar ke
// sekitarnya. Versi sebelumnya memakai sprite gradien sebagai tiruan — itu
// menempel pada satu titik dan tidak tahu apa-apa tentang kecerahan
// sesungguhnya, jadi LED, titik sensor, dan garis pindai semuanya "bercahaya"
// dengan cara yang persis sama tanpa memandang seberapa terang aslinya.
//
// EffectComposer menggantikan renderer.render(): pemanggilnya harus memanggil
// composer.render() dan meneruskan perubahan ukuran ke sini.
export function createBloomComposer(THREE, kit, renderer, scene, camera, options = {}) {
  const { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = kit
  const {
    strength = 0.62,
    radius = 0.45,
    // Ambang tinggi dengan sengaja: hanya sumber cahaya sungguhan (LED, titik
    // sensor, garis pindai) yang boleh berpendar. Ambang rendah membuat
    // seluruh badan sepatu ikut bersinar dan gambarnya berkabut.
    threshold = 0.72,
  } = options

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), strength, radius, threshold)
  composer.addPass(bloom)

  // OutputPass yang menerapkan tone mapping dan konversi ruang warna di ujung
  // rantai. Tanpa pass ini hasilnya keluar dalam ruang linear dan tampak pucat
  // — gejala yang mudah salah didiagnosis sebagai "bloom-nya terlalu kuat".
  composer.addPass(new OutputPass())

  return {
    composer,
    bloom,
    setSize(width, height) {
      composer.setSize(width, height)
      bloom.setSize(width, height)
    },
    render() {
      composer.render()
    },
    dispose() {
      composer.dispose()
      bloom.dispose()
    },
  }
}

// ---- 4. Bayangan kontak ---------------------------------------------------
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
