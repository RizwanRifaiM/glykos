import { plural, t } from '@lingui/core/macro'
import { formatTimeOfDay } from './locale'

// Kunci tanggal "YYYY-MM-DD" menurut waktu LOKAL.
//
// Jangan pakai toISOString().slice(0,10) untuk ini: ISO selalu UTC, sehingga
// tengah malam waktu lokal di UTC+7 berubah jadi pukul 17.00 hari SEBELUMNYA
// dan kuncinya meleset satu hari. Kunci ini dipakai untuk mencocokkan entri
// Firestore dengan baris tanggal di halaman Riwayat, jadi harus sama persis
// dengan tanggal yang dilihat pengguna.
//
// Kunci ini SENGAJA tidak ikut bahasa: ia identitas dokumen Firestore, bukan
// teks yang dibaca pengguna. Yang diterjemahkan adalah labelnya (lihat
// utils/locale.js) — mengubah format kuncinya berarti memutus hubungan dengan
// seluruh data yang sudah tersimpan.
export function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Jam "HH:MM:SS" 24 jam menurut waktu LOKAL — untuk DISIMPAN, bukan
// ditampilkan.
//
// Field `waktu` ikut tertulis ke Firestore (useFirestoreSync.pickSnapshot),
// jadi ia data, bukan presentasi. Sebelumnya diisi
// `toLocaleTimeString('id-ID')`, yang berarti dua hal buruk sekaligus:
// bahasa antarmuka ikut menentukan isi basis data, dan nilainya bahkan tidak
// cocok dengan contoh pada kontrak JSON yang didokumentasikan di
// useSensorData.js ("15:30:00") karena format Indonesia memakai TITIK sebagai
// pemisah jam ("15.30.00").
//
// Yang ditampilkan ke pengguna tetap ikut bahasa — lewat formatLastUpdate()
// di bawah, yang membaca `updatedAt` (timestamp sungguhan), bukan field ini.
export function toTimeKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return null
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// "3 menit lalu" / "2 jam lalu" — dipakai penanda data basi, di mana yang
// penting bukan jam persisnya melainkan sudah berapa lama tidak diperbarui.
//
// Bentuk plural ditulis lengkap meski bahasa Indonesia tidak membedakannya
// ("1 menit lalu" = "5 menit lalu"). Yang membutuhkannya sisi Inggris —
// "1 minute ago" vs "5 minutes ago" — dan penerjemah hanya bisa mengisi bentuk
// plural kalau strukturnya sudah ada di pesan aslinya. Menuliskannya belakangan
// berarti mengubah msgid dan kehilangan terjemahan yang sudah ada.
export function formatRelativeTime(timestampMs, now = Date.now()) {
  if (!Number.isFinite(timestampMs)) return t`baru saja`

  const seconds = Math.max(0, Math.round((now - timestampMs) / 1000))
  if (seconds < 60) return t`baru saja`

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return plural(minutes, { one: '# menit lalu', other: '# menit lalu' })

  const hours = Math.round(minutes / 60)
  if (hours < 24) return plural(hours, { one: '# jam lalu', other: '# jam lalu' })

  const days = Math.round(hours / 24)
  return plural(days, { one: '# hari lalu', other: '# hari lalu' })
}

// Jam pembacaan terakhir. Formatnya ikut bahasa aktif (lihat utils/locale.js);
// penanda kosongnya tetap netral karena tanda hubung sama di kedua bahasa.
export function formatLastUpdate(timestamp) {
  if (!timestamp) return '--:--:--'
  return formatTimeOfDay(timestamp) ?? '--:--:--'
}
