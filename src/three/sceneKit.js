// src/three/sceneKit.js
// Perkakas bersama untuk scene 3D landing page: pemasangan renderer, ukuran,
// gerbang visibilitas, pembuangan sumber daya, label HTML, dan progres gulir.
//
// Semuanya lahir dari ShoeViewer. Begitu scene kedua muncul, menyalin ulang
// bagian-bagian ini berarti dua salinan aturan yang harus benar bersamaan —
// terutama pembuangan sumber daya, yang kalau meleset hanya terasa sebagai
// tab yang makin berat setelah beberapa kali bolak-balik halaman.
//
// Tidak ada `import ... from 'three'` di sini: modulnya DITERIMA sebagai
// argumen. Kalau diimpor, file ini ikut menarik three.js ke chunk yang
// mengimpornya, dan seluruh pemuatan malas di loadThree.js jadi sia-sia.

export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// `clearColor` null = kanvas transparan, latarnya diserahkan ke CSS di
// belakangnya. Diberi warna = kanvas buram.
//
// Yang memakai bloom HARUS buram. EffectComposer merender ke render target
// lalu menyalinnya kembali ke kanvas; alpha tidak selamat melewati rantai itu
// tanpa penanganan khusus di tiap pass, dan gejalanya berupa kotak hitam di
// tempat yang seharusnya tembus pandang. Sejak halaman ini bertema gelap,
// kanvas buram berwarna sama dengan latar halaman tidak terlihat bedanya —
// jadi jalan yang rumit itu tidak perlu ditempuh sama sekali.
export function createRenderer(THREE, host, { clearColor = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: clearColor === null })
  if (clearColor !== null) renderer.setClearColor(clearColor, 1)
  // Dibatasi 2: di atas itu jumlah piksel naik kuadratik sementara bedanya
  // sudah tidak terlihat, dan ponsel dengan DPR 3—4 justru yang paling tidak
  // sanggup membayarnya.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  return renderer
}

// Ukuran host diikuti lewat ResizeObserver, bukan event `resize` window:
// panggung ini bisa berubah lebar tanpa jendelanya berubah (menu mobile
// membuka, kolom teks di sebelahnya melipat).
//
// Nilai width/height disimpan supaya proyeksi label tidak perlu membaca
// clientWidth tiap frame — pembacaan itu memaksa browser menghitung ulang
// layout di tengah loop render.
// `onResize` dipakai rantai postprocessing: EffectComposer punya render target
// sendiri yang tidak ikut berubah saat renderer.setSize dipanggil, jadi ukuran
// barunya harus diteruskan — kalau tidak, gambarnya melar begitu jendela
// diubah ukurannya.
export function trackSize(host, renderer, camera, onResize) {
  const size = { width: 0, height: 0 }

  const apply = () => {
    const width = host.clientWidth
    const height = host.clientHeight
    if (!width || !height) return
    size.width = width
    size.height = height
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    onResize?.(width, height)
  }

  apply()
  const observer = new ResizeObserver(apply)
  observer.observe(host)

  return { size, stop: () => observer.disconnect() }
}

// Berhenti menggambar saat scene di luar layar. Tanpa ini GPU tetap merender
// 60 kali per detik untuk sesuatu yang tidak dilihat siapa pun — dan sekarang
// ada DUA scene di satu halaman, jadi tanpa gerbang ini keduanya berjalan
// bersamaan sepanjang waktu.
export function trackVisibility(host) {
  const state = { visible: true }
  const observer = new IntersectionObserver(
    (entries) => {
      state.visible = entries.some((entry) => entry.isIntersecting)
    },
    { threshold: 0 },
  )
  observer.observe(host)
  return { state, stop: () => observer.disconnect() }
}

// Pembuangan sumber daya yang EKSPLISIT, bukan scene.traverse().
//
// Dulu ShoeViewer menelusuri seluruh scene dan membuang setiap geometry dan
// material yang ditemuinya. Itu benar selama semua isinya dibuat sendiri.
// Sejak `sepatu.glb` di-cache dan di-clone (lihat loadThree.js), penelusuran
// yang sama akan membuang geometry model BERSAMA — scene lain yang masih
// hidup langsung kehilangan sepatunya, dan yang muncul berikutnya mendapat
// buffer kosong. Jadi: hanya yang didaftarkan yang dibuang.
export function createDisposer() {
  const items = []
  return {
    track(...resources) {
      resources.forEach((resource) => {
        if (resource?.dispose) items.push(resource)
      })
      return resources[0]
    },
    dispose() {
      items.forEach((item) => {
        try {
          item.dispose()
        } catch {
          // Sudah dibuang di tempat lain — tidak ada yang perlu diselamatkan.
        }
      })
      items.length = 0
    },
  }
}

// Label melayang di atas kanvas.
//
// Sengaja DOM biasa, bukan state React: posisinya berubah tiap frame, dan
// setState 60 kali per detik akan merender ulang seluruh pohon komponen untuk
// memindahkan tiga potong teks. Teksnya sendiri statis — hanya transform dan
// opacity yang berubah, dua properti yang bisa dianimasikan browser tanpa
// menghitung ulang layout.
export function createLabelLayer(THREE, host, className) {
  const layer = document.createElement('div')
  layer.className = className
  layer.setAttribute('aria-hidden', 'true')
  host.appendChild(layer)

  const scratch = new THREE.Vector3()
  const entries = []

  return {
    // `anchor` adalah objek three.js; posisi dunianya dibaca ulang tiap frame
    // supaya label ikut saat modelnya berputar atau terurai.
    add(anchor, html, itemClassName) {
      const el = document.createElement('span')
      el.className = itemClassName
      el.innerHTML = html
      el.style.opacity = '0'
      layer.appendChild(el)
      const entry = { anchor, el, opacity: 1 }
      entries.push(entry)
      return entry
    },

    // Dipanggil SETELAH renderer.render(): proyeksi memakai matriks kamera
    // yang baru diperbarui di sana.
    update(camera, size) {
      if (!size.width || !size.height) return
      entries.forEach((entry) => {
        entry.anchor.getWorldPosition(scratch)
        scratch.project(camera)
        // z > 1 berarti titiknya di belakang kamera; proyeksinya masih
        // menghasilkan angka, tapi angka yang tercermin ke sisi yang salah.
        const behind = scratch.z > 1
        const x = (scratch.x * 0.5 + 0.5) * size.width
        const y = (-scratch.y * 0.5 + 0.5) * size.height
        entry.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        entry.el.style.opacity = behind ? '0' : String(Math.round(entry.opacity * 100) / 100)
      })
    },

    dispose() {
      entries.length = 0
      layer.remove()
    },
  }
}

// Progres gulir elemen, dibaca PALING BANYAK sekali per frame.
//
// getBoundingClientRect() memaksa browser menyelesaikan layout yang tertunda.
// Memanggilnya di dalam handler scroll berarti sekali per event — bisa
// puluhan kali per frame pada trackpad. Handler di sini hanya menaikkan
// bendera; pembacaan sesungguhnya terjadi di loop render, dan hanya kalau
// benderanya naik.
export function createScrollTracker(host) {
  const state = { progress: 0 }
  let dirty = true

  const onScroll = () => {
    dirty = true
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })

  return {
    state,
    read(compute) {
      if (!dirty) return state.progress
      dirty = false
      state.progress = compute(host.getBoundingClientRect(), window.innerHeight)
      return state.progress
    },
    stop() {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    },
  }
}
