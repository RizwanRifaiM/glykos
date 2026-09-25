// src/utils/labResults.js
// Hasil laboratorium (HbA1c, LDL): dari formulir Profil ke Firestore, dan dari
// riwayatnya ke tampilan. Fungsi murni, diuji di labResults.test.js.
//
// DUA TEMPAT PENYIMPANAN, DUA PERAN
//   users/{uid}             nilai TERAKHIR — dibaca utils/riskProfile.js untuk
//                           tingkat pemantauan. Ditimpa setiap simpan.
//   users/{uid}/labs/{id}   RIWAYAT — satu dokumen per hasil pemeriksaan,
//                           append-only. Ditampilkan di halaman Riwayat.
//
// Keduanya ditulis dalam SATU batch (ProfilePage.jsx): profil yang tersimpan
// tanpa riwayatnya, atau sebaliknya, tidak pernah terjadi.
//
// Rentang & format di sini harus sama dengan yang diperiksa firestore.rules —
// aturan itu menolak apa pun di luarnya, dan batch-nya gagal seluruhnya.
import { HBA1C_RANGE, LDL_RANGE, parseLabDate } from './riskProfile'

// `unit` ikut tersimpan di setiap catatan, walau sekarang hanya ada satu
// satuan per jenis: catatan medis harus bisa dibaca tanpa mengandalkan asumsi
// kode yang berlaku saat membacanya. Kalau kelak mmol/L didukung, catatan lama
// tetap jelas satuannya.
export const LAB_TYPES = {
  hba1c: { valueField: 'hba1c', dateField: 'hba1cDate', unit: '%', range: HBA1C_RANGE },
  ldl: { valueField: 'ldl', dateField: 'ldlDate', unit: 'mg/dL', range: LDL_RANGE },
}

// Field profil yang nilainya ANGKA di Firestore. Kolom <input> memberi string;
// yang disimpan angka (atau null untuk kosong), supaya firestore.rules bisa
// memeriksa rentangnya. Profil lama yang menyimpan "7.2" sebagai string tetap
// terbaca — riskProfile.js mem-parse keduanya — dan berubah jadi angka begitu
// disimpan ulang.
const NUMERIC_FIELDS = ['hba1c', 'ldl']

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(String(value).replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

// Dokumen Firestore → isian formulir. `null` jadi '' karena <input value={null}>
// membuat React menganggap kolomnya tidak terkendali.
export function profileFormFromDoc(data, emptyProfile) {
  const form = { ...emptyProfile, ...data }
  Object.keys(emptyProfile).forEach((key) => {
    if (form[key] === null || form[key] === undefined) form[key] = ''
    else if (NUMERIC_FIELDS.includes(key)) form[key] = String(form[key])
  })
  return form
}

// Isian formulir → dokumen profil yang disimpan.
export function profilePayload(form) {
  const payload = { ...form }
  NUMERIC_FIELDS.forEach((key) => {
    payload[key] = toNumberOrNull(form[key])
  })
  return payload
}

// Hasil lab dari payload yang layak masuk riwayat: nilai dalam rentang,
// tanggal sah & tidak di masa depan, dan BERBEDA dari yang sudah tersimpan
// (nilai atau tanggalnya). Menyimpan profil tanpa mengubah hasil lab — mis.
// hanya mengganti kontak darurat — tidak menambah catatan apa pun.
//
// Nilai yang sama dengan tanggal yang sama tapi pernah disimpan dengan angka
// lain (koreksi salah ketik) MEMANG menambah catatan baru. Riwayatnya
// append-only; koreksi tampil sebagai catatan yang lebih baru untuk tanggal
// pemeriksaan yang sama — lihat summariseLabHistory.
export function newLabEntries(saved, payload, now = Date.now()) {
  const entries = []
  Object.entries(LAB_TYPES).forEach(([type, meta]) => {
    const value = toNumberOrNull(payload?.[meta.valueField])
    const testedAt = payload?.[meta.dateField]
    if (value === null || value < meta.range.min || value > meta.range.max) return

    const date = parseLabDate(testedAt)
    if (!date || date.getTime() > now) return

    const savedValue = toNumberOrNull(saved?.[meta.valueField])
    if (savedValue === value && saved?.[meta.dateField] === testedAt) return

    entries.push({ type, value, unit: meta.unit, testedAt })
  })
  return entries
}

function createdMs(entry) {
  const raw = entry?.createdAt
  if (raw && typeof raw.toMillis === 'function') return raw.toMillis()
  if (typeof raw === 'number') return raw
  // Tulisan yang baru saja dibuat: serverTimestamp belum kembali dari server,
  // jadi dianggap yang paling baru.
  return Number.POSITIVE_INFINITY
}

// Riwayat mentah → satu daftar per jenis, terbaru dulu:
//   { id, value, unit, testedAt, corrected, change }
//
//   corrected — ada catatan LEBIH LAMA untuk tanggal pemeriksaan yang sama
//               (salah ketik yang diperbaiki). Yang ditampilkan versi terbaru;
//               versi lamanya tetap ada di Firestore, tidak pernah dihapus.
//   change    — selisih terhadap pemeriksaan SEBELUMNYA (null untuk yang
//               pertama). Arah naik/turun lebih berguna daripada angkanya
//               sendiri: HbA1c 8,0 yang turun dari 9,1 dan yang naik dari 7,0
//               adalah cerita yang sangat berbeda.
export function summariseLabHistory(entries) {
  const result = {}
  Object.keys(LAB_TYPES).forEach((type) => {
    const byDate = new Map()
    ;(entries ?? [])
      .filter((entry) => entry?.type === type && parseLabDate(entry.testedAt))
      .forEach((entry) => {
        const current = byDate.get(entry.testedAt)
        if (!current) {
          byDate.set(entry.testedAt, { entry, count: 1 })
          return
        }
        current.count += 1
        if (createdMs(entry) > createdMs(current.entry)) current.entry = entry
      })

    const rows = [...byDate.values()]
      .map(({ entry, count }) => ({
        id: entry.id,
        value: Number(entry.value),
        unit: entry.unit ?? LAB_TYPES[type].unit,
        testedAt: entry.testedAt,
        corrected: count > 1,
      }))
      .sort((a, b) => (a.testedAt < b.testedAt ? 1 : a.testedAt > b.testedAt ? -1 : 0))

    rows.forEach((row, index) => {
      const previous = rows[index + 1]
      row.change = previous ? Math.round((row.value - previous.value) * 10) / 10 : null
    })

    result[type] = rows
  })
  return result
}
