// src/utils/locale.js
// Format tanggal & angka menurut bahasa yang sedang aktif.
//
// KENAPA ADA BERKAS INI
// Sebelumnya `'id-ID'` di-hardcode di 18 tempat (toLocaleTimeString,
// toLocaleDateString, toLocaleString). Semuanya ikut bahasa Indonesia meski
// antarmukanya Inggris — dan bedanya bukan kosmetik: Indonesia memakai KOMA
// desimal ("2,2 °C") sementara Inggris memakai titik ("2.2 °C"), dan urutan
// tanggalnya pun berbeda. Angka sensor yang salah baca desimalnya adalah
// masalah nyata di aplikasi pemantauan.
//
// KONVENSI i18n DI PROYEK INI (dipakai konsisten di seluruh src/)
//   - Teks di JSX              -> <Trans>…</Trans>
//   - String di dalam komponen -> const { t } = useLingui()
//   - Peta label di constants/ -> msg`…` (deskriptor), diselesaikan pemanggil
//                                 dengan i18n._(deskriptor)
//   - Util murni                -> macro `t`/`plural` biasa (instance global)
//
// SATU ATURAN YANG TIDAK BOLEH DILANGGAR: komponen yang menampilkan teks hasil
// util WAJIB memanggil useLingui() (atau memuat <Trans> di dalamnya).
//
// Alasannya bukan gaya penulisan. Macro `t`/`plural` di util membaca instance
// i18n global, jadi hasilnya benar segera setelah bahasa berganti — TAPI React
// tidak tahu harus render ulang. useLingui() berlangganan konteks
// I18nProvider, dan itulah yang memicu render ulang. Tanpa langganan itu,
// teksnya membeku di bahasa lama sampai ada penyebab render lain — dan React
// Compiler yang aktif di proyek ini justru memperbesar peluang tidak ada
// penyebab lain. Gejalanya persis "sebagian teks tidak ikut berganti", yang
// seluruh penyiapan ini dibuat untuk mencegahnya.
//
// `plural`/`select` tidak menerima instance i18n eksplisit (hanya `t` yang
// bisa), jadi menyeragamkan semua util ke instance global lebih baik daripada
// dua pola berbeda yang harus diingat mana yang mana.
import { i18n } from '@lingui/core'
import { DEFAULT_LOCALE, INTL_LOCALES } from '../i18n'

// Tag BCP-47 untuk Intl. Boleh dioper eksplisit (util murni & pengujian);
// tanpa argumen ia mengikuti locale aktif.
export function intlLocale(locale) {
  return INTL_LOCALES[locale ?? i18n.locale] ?? INTL_LOCALES[DEFAULT_LOCALE]
}

export function formatNumber(value, { locale, ...options } = {}) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '–'
  return new Intl.NumberFormat(intlLocale(locale), options).format(num)
}

// Angka pembacaan sensor: satu desimal, pemisah sesuai bahasa.
//
// Menggantikan `toFixed(1)` yang SELALU memakai titik. Di antarmuka Indonesia
// itu tampil "2.2 °C" padahal seluruh teks di sekitarnya menulis "2,2 °C" —
// dua gaya desimal pada satu layar, di angka yang justru jadi dasar keputusan.
export function formatDecimal(value, digits = 1, locale) {
  return formatNumber(value, {
    locale,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function toDate(value) {
  if (value instanceof Date) return value
  if (value && typeof value.toDate === 'function') return value.toDate()
  if (typeof value === 'number') {
    // Timestamp detik (Firestore/ESP32) vs milidetik — batas 10^10 memisahkan
    // keduanya sampai tahun 2286.
    return new Date(value < 10000000000 ? value * 1000 : value)
  }
  if (typeof value === 'string') return new Date(value)
  return null
}

function formatWith(value, options, locale) {
  const date = toDate(value)
  if (!date || Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(intlLocale(locale), options).format(date)
  } catch {
    return null
  }
}

export function formatTimeOfDay(value, locale) {
  return formatWith(value, { hour: '2-digit', minute: '2-digit', second: '2-digit' }, locale)
}

export function formatShortDate(value, locale) {
  return formatWith(value, { day: 'numeric', month: 'short' }, locale)
}

export function formatDateTime(value, locale) {
  return formatWith(value, { dateStyle: 'medium', timeStyle: 'short' }, locale)
}

export function formatLongDate(value, locale) {
  return formatWith(value, { weekday: 'long', day: 'numeric', month: 'long' }, locale)
}
