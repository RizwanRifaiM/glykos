// src/three/sensorModule.js
// Modul sensor Glykos sebagai objek three.js — kotak bodi, jahitan, tombol,
// port, dan LED. Dipakai DUA scene: menempel di dinding sepatu pada hero,
// dan sebagai lapisan ketiga pada tampilan urai di section "Cara Kerja".
//
// Dipisahkan ke sini setelah scene kedua muncul: bentuk perangkatnya harus
// sama di kedua tempat, dan warna LED-nya sudah pernah salah sekali karena
// dianggap sekadar hiasan (lihat catatan warna di bawah).

// Warna modul sensor, sesuai perangkat aslinya yang memang ungu. Sempat
// diganti ke sage merek karena ungu bertabrakan dengan palet halaman —
// dikembalikan setelah dipastikan ini warna produk sungguhan. Ketepatan
// terhadap barang fisik menang atas keselarasan palet: pengunjung yang nanti
// memegang perangkatnya harus mengenalinya dari halaman ini.
//
// Nilai diambil dari berkas sumber sepatu_3d_bersih.html.
export const MODULE_COLORS = {
  body: 0x9b6bff,
  seam: 0x7a4fd4,
  button: 0xd9dbdf,
  port: 0x2a2a30,
  led: 0x2b6fff,
}

// Kecerahan dasar LED dan simpangan denyutnya. Denyut ini bukan hiasan
// semata: LED biru menyala adalah tanda perangkat sedang mengirim data lewat
// BLE, dan itu persis yang dijelaskan halaman ini.
export const LED_BASE_INTENSITY = 1.35
export const LED_PULSE_AMPLITUDE = 1.15

// `dims` memakai satuan lokal model sepatu, jadi angka yang sama menghasilkan
// modul seukuran di kedua scene selama sepatunya diskalakan sama.
export function createSensorModule(THREE, disposer, dims) {
  const { len, bh, bw } = dims

  const group = new THREE.Group()

  // Satu BoxGeometry untuk empat bagian, dibedakan lewat scale masing-masing
  // mesh. Empat geometry terpisah berukuran tepat akan lebih "benar" secara
  // semantik, tapi ini empat kali unggahan buffer ke GPU untuk bentuk yang
  // identik.
  const boxGeo = disposer.track(new THREE.BoxGeometry(1, 1, 1))
  const ledGeo = disposer.track(new THREE.SphereGeometry(1, 20, 20))

  const mk = (geometry, color, extra) => {
    const material = disposer.track(new THREE.MeshStandardMaterial({ color, ...extra }))
    return new THREE.Mesh(geometry, material)
  }

  const body = mk(boxGeo, MODULE_COLORS.body, { roughness: 0.38, metalness: 0.12 })
  const seam = mk(boxGeo, MODULE_COLORS.seam, { roughness: 0.5 })
  const button = mk(boxGeo, MODULE_COLORS.button, { roughness: 0.32, metalness: 0.4 })
  const port = mk(boxGeo, MODULE_COLORS.port, { roughness: 0.45, metalness: 0.5 })
  const led = mk(ledGeo, MODULE_COLORS.led, {
    emissive: MODULE_COLORS.led,
    emissiveIntensity: LED_BASE_INTENSITY,
    roughness: 0.25,
  })

  group.add(body, seam, button, port, led)

  body.scale.set(len, bh, bw)
  seam.scale.set(len * 1.004, 0.018, bw * 1.004)
  seam.position.set(0, bh * 0.17, 0)
  button.scale.set(len * 0.15, bh * 0.14, 0.05)
  button.position.set(-len * 0.26, bh * 0.17, bw / 2)
  port.scale.set(len * 0.18, bh * 0.11, 0.035)
  port.position.set(len * 0.28, bh * 0.15, bw / 2)
  led.scale.setScalar(bh * 0.085)
  led.position.set(0.02, bh * 0.17, bw / 2 - 0.01)

  return { group, led }
}

// Denyut LED. Diekspor terpisah supaya kedua scene berdenyut dengan irama
// yang sama — dua irama berbeda untuk perangkat yang sama di satu halaman
// terbaca sebagai dua produk berbeda.
export function pulseLed(led, elapsedSec) {
  const wave = (Math.sin(elapsedSec * 2.4) + 1) / 2
  led.material.emissiveIntensity = LED_BASE_INTENSITY + wave * LED_PULSE_AMPLITUDE
}
