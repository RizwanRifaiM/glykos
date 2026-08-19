// src/three/insoleShape.js
// Bentuk insole sebagai kurva bezier, dipakai DUA scene: tampilan urai di
// section "Cara Kerja" dan insole ambang di section "Dasar Pemantauan".
//
// Dipisahkan ke sini begitu scene kedua memerlukannya. Menyalin kurvanya
// berarti dua telapak yang harus tetap sama bentuknya selamanya — dan telapak
// yang bentuknya sedikit berbeda di dua tempat pada satu halaman terbaca
// sebagai dua produk, bukan dua sudut pandang.
//
// Modelnya prosedural, bukan berkas .glb, karena berkasnya memang tidak ada:
// yang dibutuhkan cuma pelat telapak, dan itu cukup diperoleh dari satu kurva
// yang diekstrusi — tanpa aset baru yang harus diunduh.
//
// Koordinat "ruang bentuk": x memanjang kaki (+1 tumit, -1 ujung jari),
// y melintang, z ketebalan. Pemakainya memutar grupnya -90° pada sumbu X
// supaya z menjadi arah atas — dengan begitu sensor di dalamnya bisa ditaruh
// memakai koordinat yang sama seperti kurvanya, tanpa konversi di tiap titik.
export function buildInsoleShape(THREE) {
  const shape = new THREE.Shape()
  shape.moveTo(-0.98, 0.02)
  // Tepi lateral — melebar di forefoot, tempat metatarsal menanggung beban.
  shape.bezierCurveTo(-1.02, 0.24, -0.88, 0.36, -0.62, 0.37)
  shape.bezierCurveTo(-0.34, 0.38, -0.06, 0.34, 0.2, 0.3)
  shape.bezierCurveTo(0.48, 0.26, 0.74, 0.3, 0.88, 0.2)
  // Tumit membulat.
  shape.bezierCurveTo(1.02, 0.08, 1.02, -0.08, 0.88, -0.2)
  // Tepi medial — lengkung kaki menjorok ke dalam. Tanpa cekungan ini
  // bentuknya terbaca sebagai sol oval, bukan telapak.
  shape.bezierCurveTo(0.74, -0.3, 0.52, -0.24, 0.26, -0.16)
  shape.bezierCurveTo(0.0, -0.08, -0.28, -0.22, -0.6, -0.3)
  shape.bezierCurveTo(-0.84, -0.36, -1.02, -0.2, -0.98, 0.02)
  return shape
}

export const INSOLE_DEPTH = 0.07

// Warna insole: sage merek. Dipakai kedua scene supaya pelat yang sama tidak
// muncul dengan dua warna berbeda di satu halaman.
export const INSOLE_COLOR = 0x86a788

// Geometry insole siap pakai. Parameter ekstrusinya dikunci di sini — bevel
// tipis membuat tepinya menangkap cahaya, dan tanpa itu pelatnya terbaca
// sebagai potongan kertas.
export function createInsoleGeometry(THREE, disposer) {
  return disposer.track(
    new THREE.ExtrudeGeometry(buildInsoleShape(THREE), {
      depth: INSOLE_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.025,
      bevelSegments: 3,
      curveSegments: 18,
    }),
  )
}
