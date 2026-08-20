import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import lingui from 'eslint-plugin-lingui'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/locales']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // Penjaga bilingual. INI alasan utama Lingui dipilih (lihat lingui.config.js):
  // `no-unlocalized-strings` menandai teks JSX, atribut JSX, template literal,
  // dan argumen string ke fungsi yang belum dibungkus `t`/`<Trans>`/`msg`.
  //
  // Tanpa rule ini, satu-satunya cara mengetahui ada teks yang terlewat adalah
  // membuka halamannya dalam bahasa Inggris dan menyadari sebagian kalimat
  // masih Indonesia — ketahuan setelah rilis, satu per satu. Dengan rule ini,
  // teks yang terlewat menggagalkan `npm run lint`.
  // PETA DESKRIPTOR TIDAK BOLEH KELUAR DARI utils/
  //
  // `no-unlocalized-strings` di bawah menandai teks LITERAL yang belum
  // dibungkus. Ia TIDAK menandai kesalahan sebaliknya: deskriptor pesan
  // (`msg`…`` -> objek {id, message}) yang dirender langsung sebagai anak React.
  //
  // Kesalahan itu sudah pernah terjadi sekali, di SensorFootMap.jsx, dan
  // bentuknya paling buruk: berkasnya LULUS lint, lulus uji, lulus build — lalu
  // di produksi melempar React error #31 dan memutihkan halaman. Lebih buruk
  // lagi, di build produksi Lingui membuang `message` dari deskriptor, jadi
  // pesan galatnya hanya menyebut "object with keys {id}" tanpa petunjuk asalnya.
  //
  // Aturan ini menutup jalurnya di hulu: peta deskriptor hanya boleh disentuh
  // lapisan util, yang menyediakan resolver (`locationLabel`, `fatigueLabel`,
  // `trendLevelLabel`). Komponen selalu menerima TEKS, tidak pernah objek.
  {
    files: ['src/components/**/*.{js,jsx}', 'src/pages/**/*.{js,jsx}', 'src/hooks/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../constants/thresholds',
              importNames: ['LOCATION_LABELS'],
              message:
                'LOCATION_LABELS berisi deskriptor pesan, bukan teks — merendernya langsung menghasilkan React error #31. Pakai locationLabel(i18n, key) dari utils/alertMessages.js.',
            },
            {
              name: '../constants/fatigue',
              importNames: ['FATIGUE_LABELS'],
              message:
                'FATIGUE_LABELS berisi deskriptor pesan, bukan teks. Pakai fatigueLabel(i18n, level) dari utils/alertMessages.js.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['**/*.test.js'],
    extends: [lingui.configs['flat/recommended']],
    rules: {
      'lingui/no-unlocalized-strings': [
        'error',
        {
          ignore: [
            // Satu token tanpa spasi yang tidak dimulai huruf kapital: nama
            // kelas CSS, kunci objek, unit, nama field Firestore, path, dan
            // status internal ('idle', 'connected', 'metatarsal').
            //
            // Ditulis `[^ ]` alih-alih `\\S` dengan sengaja: pola ini hidup di
            // dalam string literal JS, jadi `\\S` ciut jadi `S` dan polanya
            // berhenti cocok TANPA satu pun pesan error — kegagalan sunyi yang
            // sudah sempat terjadi sekali di sini. Bentuk tanpa backslash
            // tidak punya jebakan itu.
            '^(?![A-Z])[^ ]+$',
            // Angka, satuan, dan tanda baca — sama di kedua bahasa.
            '^[0-9 .,:%°+-]*$',
            // Perintah path SVG: satu huruf kapital tunggal (M, L, C, Z).
            '^[A-Z]$',
            // Akronim teknis yang sama di kedua bahasa: CSV, PDF, BLE, NTC,
            // FSR, RH. Menerjemahkannya bukan cuma tidak perlu — nama format
            // berkas yang "diterjemahkan" justru menyesatkan.
            '^[A-Z]{2,5}$',
            // Daftar nama kelas CSS gaya BEM, termasuk yang berisi beberapa
            // kelas sekaligus ("hero-pulse hero-pulse--delay1"). Syarat minimal
            // ada `-` atau `__` di dalam tiap token yang membedakannya dari
            // kalimat biasa — prosa tidak memakai tanda hubung di tengah kata.
            //
            // Setiap token WAJIB memuat `-` atau `_`. Itu yang memisahkannya
            // dari prosa: "rata-rata tekanan" tidak cocok karena "tekanan"
            // tidak bertanda hubung, sementara
            // "exploded-viewer__label exploded-viewer__label--shoe" cocok.
            '^([a-z][a-z0-9]*([-_]+[a-z0-9]+)+)( [a-z][a-z0-9]*([-_]+[a-z0-9]+)+)*$',
            // Nilai CSS transform yang dirakit di three/sceneKit.js.
            '^translate',
            // Nilai CSS berukuran: rootMargin IntersectionObserver
            // ("0px 0px -8% 0px") dan kurva easing.
            '^-?[0-9.]+(px|%|em|rem|vh|vw|s|ms)?( -?[0-9.]+(px|%|em|rem|vh|vw|s|ms)?)*$',
            '^cubic-bezier\\(',
            '^(kPa|°C|%|% RH|RH|mV|Hz|g|px|rem|—|·)$',
            // Kode error Firebase (auth/…), kunci tanggal, UUID, warna hex.
            '^auth/',
            '^#[0-9a-fA-F]{3,8}$',
            '^[0-9a-f]{8}-[0-9a-f]{4}-',
            // Nama locale & format tanggal.
            '^(id|en|id-ID|en-US|ltr|rtl)$',
            // Nama perangkat BLE menurut kontrak firmware, dan nama produk.
            // Keduanya identitas, bukan teks yang diterjemahkan — mengubahnya
            // di sisi Inggris akan membuat filter pemilih perangkat berhenti
            // cocok dengan firmware.
            '^(glykos device|glykos-device|Glykos( Device)?)$',
          ],
          ignoreNames: [
            // Atribut & properti non-teks.
            'className', 'class', 'id', 'key', 'type', 'name', 'role', 'src',
            'href', 'to', 'htmlFor', 'autoComplete', 'inputMode', 'pattern',
            'tag', 'lang', 'dir', 'rel', 'target', 'referrerPolicy', 'method',
            'width', 'height', 'viewBox', 'fill', 'stroke', 'strokeWidth',
            'strokeLinecap', 'strokeLinejoin', 'xmlns', 'd', 'points', 'cx',
            'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'rx', 'transform',
            'preserveAspectRatio', 'style', 'data-testid',
            // Kunci internal: dipakai sebagai identitas, bukan ditampilkan.
            'metric', 'status', 'level', 'foot', 'deviceId', 'sessionId',
            'unit', 'color', 'range', 'mode', 'scope', 'purpose', 'sizes',
          ],
          ignoreFunctions: [
            // Diagnostik pengembang — tidak pernah dilihat pengguna.
            'console.*',
            // API browser & DOM.
            'document.*', 'window.*', 'navigator.*', 'localStorage.*',
            'sessionStorage.*', 'caches.*', 'JSON.*', 'Object.*', 'Number.*',
            'Math.*', 'String', 'Boolean', 'Array.*', '*.addEventListener',
            '*.removeEventListener', '*.setAttribute', '*.getAttribute',
            '*.querySelector', '*.matchMedia', '*.classList.*', '*.getContext',
            '*.startsWith', '*.endsWith', '*.includes', '*.split', '*.join',
            '*.replace', '*.padStart', '*.toFixed', '*.setProperty',
            // Firestore & Firebase: argumennya nama koleksi/field, bukan teks.
            'doc', 'collection', 'query', 'where', 'orderBy', 'limit',
            'getItem', 'setItem', 'removeItem',
            // Formatter tanggal/angka: locale-nya sudah ikut i18n (utils/locale.js).
            '*.toLocaleDateString', '*.toLocaleTimeString', '*.toLocaleString',
            // three.js & WebGL: nama uniform, atribut geometry, jenis material.
            '*.getObjectByName', '*.setAttribute', '*.traverse',
          ],
        },
      ],
    },
  },
])
