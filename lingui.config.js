// Konfigurasi Lingui — bilingual Indonesia (sumber) & Inggris.
//
// KENAPA LINGUI, BUKAN i18next
// Masalah bilingual yang sebenarnya bukan "terjemahannya kurang tepat", tapi
// "ada teks yang tidak ikut berganti". Penyebabnya selalu sama: literal yang
// tidak pernah masuk katalog, jadi tidak ada yang bisa menukarnya. Lingui
// menutup jalur itu dengan dua alat yang saling melengkapi:
//
//   1. `lingui extract` MEMINDAI KODE dan menarik sendiri setiap pesan yang
//      dibungkus macro — tidak ada tahap "salin manual ke JSON", tahap yang
//      justru jadi tempat teks tercecer.
//   2. `eslint-plugin-lingui` (rule no-unlocalized-strings, lihat
//      eslint.config.js) MENGGAGALKAN LINT begitu ada literal baru yang belum
//      dibungkus — jadi teks yang terlewat berhenti jadi kemungkinan.
//
// Lapis ketiga ada di vite.config.js: `failOnMissing` menggagalkan BUILD kalau
// ada pesan yang sudah masuk katalog tapi belum punya terjemahan Inggris.
// Ketiganya menutup tiga cara teks bisa lolos: tidak dibungkus, tidak
// terekstrak, atau terekstrak tapi kosong.
//
// sourceLocale 'id': teks di dalam kode ditulis dalam bahasa Indonesia dan
// dipakai apa adanya sebagai msgid. Jadi bahasa Indonesia tidak pernah bisa
// "hilang" — yang perlu diisi hanya sisi Inggrisnya.
import { formatter } from '@lingui/format-po'

export default {
  locales: ['id', 'en'],
  sourceLocale: 'id',
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['<rootDir>/src'],
      exclude: ['**/*.test.js', '**/node_modules/**'],
    },
  ],
  // Format .po (gettext), bukan JSON. Alasannya penerjemah, bukan teknis:
  // .po menyimpan komentar konteks (`#.`) dan lokasi asal (`#:`) di sebelah
  // tiap pesan, jadi orang yang mengisi kolom Inggris bisa melihat pesan itu
  // muncul di mana. Untuk istilah klinis yang ambigu di luar konteksnya
  // ("Selisih" bisa difference/deviation/gap), keterangan itu yang menentukan
  // terjemahannya benar atau sekadar masuk akal.
  //
  // `lineNumbers: false`: nomor baris berubah setiap kali kode digeser, dan
  // itu membuat diff katalog penuh perubahan yang tidak berarti apa-apa.
  format: formatter({ lineNumbers: false }),
  // Urutkan berdasarkan asal berkas supaya diff katalognya bisa dibaca:
  // pesan yang baru muncul berkelompok bersama berkas asalnya, bukan
  // tersebar acak di seluruh file .po.
  orderBy: 'origin',
}
