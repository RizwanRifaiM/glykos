// src/i18n.js
// Titik masuk tunggal untuk bahasa aktif.
//
// PILIHAN BAHASA disimpan di localStorage, bukan di URL atau di Firestore:
//   - URL (?lang=en) akan hilang setiap kali pengguna mengetik ulang alamatnya,
//     dan halaman ini dipasang ke home screen sebagai PWA — start_url tidak
//     membawa query apa pun.
//   - Firestore berarti bahasa baru bisa dipilih SETELAH login, padahal
//     halaman depan dan halaman masuk justru yang pertama dilihat.
// localStorage memenuhi keduanya: bertahan antar sesi, dan tersedia sebelum
// ada akun sama sekali.
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'

export const LOCALES = ['id', 'en']
export const DEFAULT_LOCALE = 'id'

// Nama bahasa ditulis dalam bahasanya sendiri (endonim), bukan diterjemahkan.
// "Indonesian/Bahasa Indonesia" tergantung bahasa antarmuka yang sedang aktif —
// dan itu justru menyulitkan orang yang perlu keluar dari bahasa yang tidak
// dimengertinya. Endonim selalu terbaca oleh penuturnya sendiri.
export const LOCALE_NAMES = {
  id: 'Bahasa Indonesia',
  // Endonim — sengaja TIDAK diterjemahkan, lihat alasannya di atas.
  // eslint-disable-next-line lingui/no-unlocalized-strings
  en: 'English',
}

// Padanan tag BCP-47 untuk Intl (tanggal & angka). Dipisah dari kode locale
// karena katalognya 'id'/'en' sementara Intl butuh wilayah supaya format
// tanggalnya benar.
export const INTL_LOCALES = {
  id: 'id-ID',
  en: 'en-US',
}

const STORAGE_KEY = 'glykos:locale'

export function isSupportedLocale(value) {
  return LOCALES.includes(value)
}

export function readStoredLocale() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isSupportedLocale(stored) ? stored : null
  } catch {
    // Mode privat / storage diblokir: pilihan bahasa tidak bertahan antar
    // sesi, tapi pergantian dalam sesi berjalan tetap bekerja.
    return null
  }
}

function storeLocale(locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Lihat catatan di readStoredLocale.
  }
}

// Urutan penentuan: pilihan tersimpan -> bahasa browser -> Indonesia.
//
// `navigator.languages` diperiksa berurutan supaya pengguna dengan preferensi
// ["en-GB", "id"] mendapat Inggris, bukan sekadar dicocokkan pada entri
// pertama lalu jatuh ke default.
export function detectLocale() {
  const stored = readStoredLocale()
  if (stored) return stored

  if (typeof navigator !== 'undefined') {
    const preferred = navigator.languages?.length
      ? navigator.languages
      : [navigator.language].filter(Boolean)

    for (const tag of preferred) {
      const base = String(tag).toLowerCase().split('-')[0]
      if (isSupportedLocale(base)) return base
    }
  }

  return DEFAULT_LOCALE
}

// Katalog dimuat DINAMIS supaya bahasa yang tidak dipakai tidak ikut terunduh.
// Bahasa Indonesia adalah sourceLocale (lihat lingui.config.js), jadi
// katalognya memetakan pesan ke dirinya sendiri — tetap dimuat lewat jalur yang
// sama supaya tidak ada dua perilaku berbeda yang harus diingat.
async function loadCatalog(locale) {
  const { messages } = await import(`./locales/${locale}/messages.po`)
  return messages
}

// Judul tab & deskripsi halaman — lewat katalog seperti teks lainnya.
//
// Ini bisa memakai deskriptor `msg` karena applyDocumentLocale() dipanggil
// SESUDAH i18n.loadAndActivate() (lihat activateLocale di bawah), jadi
// katalognya sudah aktif saat pesan ini diminta. Kalau urutan itu pernah
// ditukar, kedua teks ini akan diam-diam jatuh ke bahasa sumber — urutannya
// bagian dari kebenaran fungsi ini, bukan kebetulan.
const DOCUMENT_TITLE = msg`Glykos — Monitoring Kaki Diabetes`
const DOCUMENT_DESCRIPTION = msg`Glykos — dashboard pemantauan sepatu pintar untuk deteksi dini risiko ulkus diabetik.`

// Menyetel atribut lang pada <html>, judul tab, deskripsi, dan manifest PWA.
//
// `lang` bukan kosmetik: atribut ini yang dipakai pembaca layar untuk memilih
// pelafalan, dan browser untuk tanda hubung serta tanda kutip. Halaman
// berbahasa Inggris dengan lang="id" akan dibacakan dengan fonetik Indonesia.
//
// Judul dan deskripsi juga diperbarui karena keduanya di-hardcode di index.html
// dan tidak ikut React sama sekali — tanpa ini, tab browser dan hasil bagikan
// tautan tetap berbahasa Indonesia pada antarmuka Inggris.
function applyDocumentLocale(locale) {
  if (typeof document === 'undefined') return

  document.documentElement.lang = locale

  document.title = i18n._(DOCUMENT_TITLE)

  const description = document.querySelector('meta[name="description"]')
  if (description) description.setAttribute('content', i18n._(DOCUMENT_DESCRIPTION))

  // Manifest PWA adalah berkas STATIS — nama & deskripsi aplikasi yang tampil
  // saat dipasang ke home screen tidak bisa disetel dari React. Jadi disediakan
  // satu manifest per bahasa (public/manifest.{id,en}.webmanifest) dan yang
  // ditukar di sini adalah tautannya. Tanpa ini, pengguna berbahasa Inggris
  // memasang ikon bernama "Monitoring Kaki Diabetes" di layar utamanya.
  const manifest = document.querySelector('link[rel="manifest"]')
  if (manifest) manifest.setAttribute('href', `/manifest.${locale}.webmanifest`)
}

export async function activateLocale(locale, { persist = true } = {}) {
  const next = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE
  const messages = await loadCatalog(next)
  i18n.loadAndActivate({ locale: next, messages })
  applyDocumentLocale(next)
  if (persist) storeLocale(next)
  return next
}

// Dipanggil sekali sebelum render pertama (lihat main.jsx). Sengaja TIDAK
// mem-persist hasil deteksi: menyimpannya akan mengunci bahasa hasil terkaan
// browser sebagai "pilihan pengguna", sehingga orang yang ganti bahasa
// browser-nya tidak pernah lagi mendapat deteksi yang benar. Yang disimpan
// hanya pilihan yang benar-benar ditekan pengguna.
export async function initI18n() {
  return activateLocale(detectLocale(), { persist: false })
}

export { i18n }
