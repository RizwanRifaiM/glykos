// src/three/loadThree.js
// Satu-satunya pintu masuk ke three.js untuk seluruh landing page.
//
// Kenapa lewat modul bersama, bukan import() langsung di tiap komponen:
// halaman ini sekarang punya DUA scene (hero & urai perangkat). Dengan
// import() terpisah, keduanya tetap berbagi satu chunk hasil build — tapi
// TIDAK berbagi satu promise, jadi scene kedua ikut menunggu resolusi modul
// lagi, dan yang lebih mahal: `sepatu.glb` diambil serta di-parse DUA KALI.
// Di sini modul dan modelnya di-cache sebagai promise, sehingga scene yang
// muncul belakangan langsung memakai hasil scene pertama.
//
// Konsekuensi caching yang HARUS dipatuhi pemakainya: geometry & material
// hasil `cloneShoe()` DIBAGI dengan model asli di cache. Membuangnya lewat
// dispose() akan mengosongkan model untuk scene lain yang masih hidup — lihat
// createDisposer() di sceneKit.js, yang sengaja hanya membuang benda yang
// dibuat sendiri oleh scene bersangkutan.

let modulesPromise = null

export function loadThreeModules() {
  if (!modulesPromise) {
    const pending = Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    ]).then(([THREE, { GLTFLoader }, { MeshoptDecoder }]) => ({
      THREE,
      GLTFLoader,
      MeshoptDecoder,
    }))

    // Kegagalan TIDAK ikut di-cache. Penyebab tersering di sini adalah
    // jaringan yang putus sesaat; kalau promise gagalnya disimpan, scene
    // berikutnya ikut gagal selamanya tanpa pernah mencoba lagi.
    pending.catch(() => {
      if (modulesPromise === pending) modulesPromise = null
    })

    modulesPromise = pending
  }
  return modulesPromise
}

let shoePromise = null

// Model asli. JANGAN ditambahkan ke scene mana pun dan jangan diubah —
// ini cetakan yang di-clone. Pemakai memanggil cloneShoe().
function loadShoeSource() {
  if (!shoePromise) {
    const pending = loadThreeModules().then(({ GLTFLoader, MeshoptDecoder }) =>
      new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .loadAsync(import.meta.env.BASE_URL + 'sepatu.glb')
        .then((gltf) => gltf.scene),
    )

    pending.catch(() => {
      if (shoePromise === pending) shoePromise = null
    })

    shoePromise = pending
  }
  return shoePromise
}

// Salinan siap pakai. `clone(true)` menyalin susunan objeknya tapi TETAP
// memakai geometry & material yang sama — itu justru yang diinginkan (satu
// unggahan ke GPU untuk dua scene), asalkan tidak ada yang membuangnya.
export async function cloneShoe() {
  const source = await loadShoeSource()
  return source.clone(true)
}

// Kit kualitas render: environment map + rantai postprocessing.
//
// Dipisahkan dari loadThreeModules() dengan sengaja. Hiasan modul melayang di
// banner CTA tidak memakai keduanya, dan menggabungkannya ke satu promise akan
// membuat scene itu menunggu modul yang tidak pernah dipakainya. Chunk hasil
// build-nya sama, jadi yang dihemat waktu tunggu — bukan unduhan.
let renderKitPromise = null

export function loadRenderKit() {
  if (!renderKitPromise) {
    const pending = Promise.all([
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/OutputPass.js'),
    ]).then(
      ([
        { RoomEnvironment },
        { EffectComposer },
        { RenderPass },
        { UnrealBloomPass },
        { OutputPass },
      ]) => ({ RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, OutputPass }),
    )

    pending.catch(() => {
      if (renderKitPromise === pending) renderKitPromise = null
    })

    renderKitPromise = pending
  }
  return renderKitPromise
}
