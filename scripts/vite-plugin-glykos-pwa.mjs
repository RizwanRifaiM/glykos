// scripts/vite-plugin-glykos-pwa.mjs
// Menstempel public/sw.js dengan identitas build dan daftar precache-nya.
//
// KENAPA PLUGIN SENDIRI, BUKAN vite-plugin-pwa/Workbox
// Yang dibutuhkan service worker ini dari tahap build hanya DUA hal: sebuah
// nilai yang berubah tiap rilis (untuk menamai cache), dan daftar berkas shell
// yang namanya ber-hash (untuk di-precache). Workbox membawa itu plus generator
// service worker penuh — dan generator itu akan menggantikan sw.js yang ditulis
// tangan berikut seluruh alasan di dalamnya, terutama jalur notifikasi yang
// justru menjadi alasan utama service worker-nya ada. Menukar berkas yang
// terbaca dengan berkas hasil generate bukan pertukaran yang menguntungkan
// untuk dua nilai.
//
// Yang TIDAK dilakukan plugin ini, dengan sengaja: revisi per berkas untuk aset
// tak-ber-hash. Vite sudah menaruh hash di nama tiap berkas /assets/, jadi
// URL-nya sendiri sudah menjadi revisinya.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BUILD_ID_LINE = /^const BUILD_ID = '.*'$/m
const PRECACHE_LINE = /^const PRECACHE_URLS = \[[^\]]*\]$/m

// Aset yang selalu ikut precache meski tidak dirujuk dari graf modul: shell
// HTML dan lambang yang dipakai layar pemuatan. Tanpa brand-mark.png, pembukaan
// pertama saat offline menampilkan kerangka tanpa logo.
const EXTRA_PRECACHE = ['/index.html', '/brand-mark.png']

export default function glykosPwa() {
  let outDir = 'dist'
  let precache = []

  return {
    name: 'glykos-pwa',
    // `apply: 'build'` — di dev tidak ada bundle, dan service worker-nya memang
    // tidak didaftarkan (lihat utils/registerServiceWorker.js).
    apply: 'build',

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },

    // Daftar shell hanya bisa dibaca dari metadata bundle…
    generateBundle(_options, bundle) {
      precache = [...new Set([...EXTRA_PRECACHE, ...shellUrls(bundle)])].sort()
    },

    // …tapi sw.js sendiri TIDAK ada di bundle itu. Berkas di public/ disalin apa
    // adanya oleh Vite, di luar graf modul, jadi satu-satunya saat ia bisa
    // disentuh adalah setelah seluruh keluaran ditulis ke disk.
    closeBundle() {
      const swPath = resolve(outDir, 'sw.js')

      let source
      try {
        source = readFileSync(swPath, 'utf8')
      } catch {
        // Diam-diam melewatinya akan menghasilkan deploy dengan service worker
        // yang tidak pernah membersihkan cache — gejalanya baru muncul
        // berhari-hari kemudian sebagai "aplikasinya tidak mau update".
        this.error(
          'glykos-pwa: dist/sw.js tidak ada setelah build. Service worker harus tersaji di /sw.js supaya scope-nya mencakup seluruh situs.',
        )
        return
      }

      if (!BUILD_ID_LINE.test(source) || !PRECACHE_LINE.test(source)) {
        this.error(
          'glykos-pwa: pola `const BUILD_ID = ...` / `const PRECACHE_URLS = [...]` tidak ditemukan di public/sw.js. Kedua baris itu adalah kontrak antara berkas ini dan service worker — kalau namanya diubah, ubah juga pola di sini.',
        )
        return
      }

      // BUILD_ID diturunkan dari ISI shell, bukan dari waktu build. Build ulang
      // tanpa perubahan kode menghasilkan ID yang sama, jadi klien yang sudah
      // punya versi itu tidak diminta memuat ulang tanpa alasan.
      const buildId = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)

      writeFileSync(
        swPath,
        source
          .replace(BUILD_ID_LINE, `const BUILD_ID = '${buildId}'`)
          .replace(PRECACHE_LINE, `const PRECACHE_URLS = ${JSON.stringify(precache)}`),
        'utf8',
      )

      this.info(`glykos-pwa: sw.js distempel build ${buildId}, ${precache.length} berkas precache`)
    },
  }
}

// Berkas yang dibutuhkan untuk PEMUATAN PERTAMA — bukan seluruh keluaran build.
//
// Precache "semuanya" (perilaku bawaan Workbox) berarti mengunduh three.js,
// loader glTF, dan seluruh halaman dashboard sebelum pengguna menyentuh apa
// pun: sekitar 2 MB pada koneksi yang mungkin sedang seluler. Yang benar-benar
// menentukan aplikasinya bisa dibuka saat offline hanyalah chunk entry beserta
// impor STATIS-nya, CSS-nya, dan fontnya. Sisanya di-cache saat benar-benar
// diminta (lihat cacheFirst di sw.js).
function shellUrls(bundle) {
  const urls = []
  const seen = new Set()

  const entry = Object.values(bundle).find((chunk) => chunk.type === 'chunk' && chunk.isEntry)
  if (!entry) return urls

  const walk = (fileName) => {
    if (seen.has(fileName)) return
    seen.add(fileName)

    const chunk = bundle[fileName]
    if (!chunk || chunk.type !== 'chunk') return

    urls.push(`/${fileName}`)
    for (const css of chunk.viteMetadata?.importedCss ?? []) urls.push(`/${css}`)
    // `imports` = impor statis saja. `dynamicImports` sengaja TIDAK diikuti:
    // itulah pemisah antara shell dan sisa aplikasi.
    for (const imported of chunk.imports ?? []) walk(imported)
  }

  walk(entry.fileName)

  for (const [fileName, chunk] of Object.entries(bundle)) {
    // Font ikut karena teks yang menunggu font pada pembukaan offline pertama
    // berkedip dari font sistem ke Geist — dan subset latin-nya kecil.
    if (chunk.type === 'asset' && fileName.endsWith('.woff2')) urls.push(`/${fileName}`)

    // KATALOG BAHASA WAJIB IKUT, meski dimuat lewat impor dinamis.
    //
    // main.jsx me-`await initI18n()` SEBELUM render pertama (alasannya ada di
    // sana: tanpa itu antarmuka berkedip dari bahasa sumber ke bahasa pilihan).
    // Konsekuensinya, katalog yang gagal diambil bukan sekadar teks yang salah
    // bahasa — tidak ada satu pun yang dirender. Kalau ia tidak ikut precache,
    // pembukaan PERTAMA saat offline berakhir sebagai layar putih, persis
    // keadaan yang seharusnya diperbaiki oleh service worker.
    //
    // Kedua bahasa disertakan, bukan hanya yang sedang aktif: build tidak tahu
    // bahasa apa yang akan dipilih pengguna, dan keduanya hanya puluhan kB.
    if (chunk.type === 'chunk' && chunk.moduleIds?.some(isLocaleCatalog)) {
      urls.push(`/${fileName}`)
    }
  }

  return urls
}

// Rolldown melaporkan module id memakai pemisah path milik OS, jadi di Windows
// isinya backslash. Dinormalkan dulu supaya pencocokannya tidak diam-diam
// meleset di satu platform saja — kegagalan yang bentuknya "offline bekerja di
// mesin saya".
function isLocaleCatalog(moduleId) {
  return moduleId.split('\\').join('/').includes('/src/locales/')
}
