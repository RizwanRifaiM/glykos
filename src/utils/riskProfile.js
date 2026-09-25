// src/utils/riskProfile.js
// Tingkat risiko pasien dari data yang diisi MANUAL di halaman Profil —
// HbA1c, LDL, riwayat ulkus, neuropati. Fungsi murni, diuji di
// riskProfile.test.js.
//
// APA YANG DIUBAH TINGKAT INI, DAN APA YANG TIDAK
// Tingkat risiko hanya menentukan SEBERAPA CEPAT pengguna diingatkan (kapan
// notifikasi berbunyi, berapa lama jeda antar peringatan — lihat alertPolicy
// di utils/alertRules.js). Ia TIDAK menyentuh angka ambang sensor.
//
// Alasannya ada di sumber ambang itu sendiri. Tekanan 200 kPa diturunkan dari
// penelitian pada pasien yang PERNAH ulkus dan neuropati; selisih suhu 2,2 °C
// direkomendasikan IWGDF 2023 untuk risiko sedang–tinggi. Keduanya sudah angka
// untuk kelompok berisiko — memperketatnya lagi tidak punya dasar penelitian,
// dan ambang karangan hanya menghasilkan peringatan palsu yang melatih
// pengguna mengabaikan peringatan sungguhan.
//
// ARAH GAGALNYA SELALU KE "STANDAR"
// Data manual hanya boleh MEMPERKETAT pemantauan, tidak pernah melonggarkan.
// Nilai yang kosong, di luar rentang wajar, tanpa tanggal, atau kedaluwarsa
// tidak dipakai sama sekali — tingkatnya jatuh ke Standar (perilaku yang
// berlaku untuk semua orang), dan pengguna diberi pengingat untuk
// memperbaruinya. Salah ketik tidak boleh membuat kaki siapa pun terlihat
// lebih aman dari yang sebenarnya.
//
// DASAR ANGKANYA
// - HbA1c ≥ 8 %: risiko ulkus kaki ~2× dibanding 6–7 % (UK Biobank, 23.434
//   pasien, ~13 tahun); ≥ 10 %: ~4,5×. HbA1c ≥ 8 % juga muncul sebagai
//   prediktor independen di studi kohort lain.
// - LDL ≥ 100 mg/dL: di atas target PERKENI 2021 untuk penderita diabetes;
//   terkait penyakit arteri perifer dan amputasi.
// - Riwayat ulkus/amputasi: IWGDF kategori 3 — risiko kambuh sampai 40 %
//   dalam setahun setelah sembuh. Faktor terkuat, jadi berdiri sendiri.
// - Neuropati (hilangnya sensasi pelindung): pilar utama stratifikasi IWGDF.
//
// HbA1c & LDL adalah PENANDA risiko, bukan pengukur kondisi kaki — itulah
// kenapa satu di antaranya hanya menaikkan ke Meningkat, dan butuh dua faktor
// (atau HbA1c yang sangat tinggi) untuk mencapai Tinggi.

export const RISK_TIERS = ['standard', 'elevated', 'high']

export const HBA1C_ELEVATED = 8
export const HBA1C_HIGH = 10
export const LDL_ELEVATED = 100

// Rentang wajar. Di luar ini hampir pasti salah ketik (HbA1c "72" dari 7,2;
// LDL dalam mmol/L yang diketik ke kolom mg/dL) — nilainya tidak dipakai.
export const HBA1C_RANGE = { min: 4, max: 20 }
export const LDL_RANGE = { min: 20, max: 400 }

// Masa berlaku hasil lab. HbA1c menggambarkan ~3 bulan terakhir; ADA 2026
// menyarankan pemeriksaan tiap 3 bulan bila belum mencapai target dan minimal
// dua kali setahun bila sudah — jadi 6 bulan adalah batas paling longgar.
// LDL lazimnya diperiksa setahun sekali.
export const HBA1C_VALID_DAYS = 183
export const LDL_VALID_DAYS = 365

const DAY_MS = 24 * 60 * 60 * 1000

// Nilai pilihan riwayat ulkus & neuropati yang TERSIMPAN. Tidak diterjemahkan
// — masuk ke Firestore, jadi mengubahnya memutus profil yang sudah tersimpan.
export const YES = 'yes'

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null
  // Kolom <input type="number"> sudah mengembalikan titik desimal, tapi nilai
  // yang tersimpan sebelum ada validasi bisa saja berkoma ("7,2").
  const num = Number(String(value).replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

// 'YYYY-MM-DD' (bentuk <input type="date">) → Date pada tengah malam LOKAL.
// `new Date('2026-06-10')` dibaca sebagai UTC, yang di zona negatif jatuh ke
// tanggal sebelumnya.
export function parseLabDate(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  // Menolak tanggal yang digulung Date (2026-02-31 → 3 Maret).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

// Status satu hasil lab:
//   missing  — belum diisi
//   invalid  — di luar rentang wajar
//   noDate   — ada nilai, tapi tanggal pemeriksaannya kosong/tidak sah/di masa depan
//   stale    — lebih tua dari masa berlakunya
//   valid    — dipakai
export function readLab(rawValue, rawDate, range, validDays, now) {
  const value = parseNumber(rawValue)
  if (value === null) return { status: 'missing' }
  if (value < range.min || value > range.max) return { status: 'invalid', value }

  const date = parseLabDate(rawDate)
  if (!date || date.getTime() > now) return { status: 'noDate', value }

  const ageDays = Math.floor((now - date.getTime()) / DAY_MS)
  if (ageDays > validDays) return { status: 'stale', value, date: rawDate, ageDays }

  return { status: 'valid', value, date: rawDate, ageDays }
}

// Penilaian lengkap:
//   tier       — 'standard' | 'elevated' | 'high'
//   factors    — yang membuat tingkatnya naik, berupa KODE + angka (tanpa
//                kalimat; dirakit alertMessages.js saat dibaca)
//   reminders  — hasil lab yang perlu dilengkapi/diperbarui
export function assessRiskProfile(profile, now = Date.now()) {
  const hba1c = readLab(profile?.hba1c, profile?.hba1cDate, HBA1C_RANGE, HBA1C_VALID_DAYS, now)
  const ldl = readLab(profile?.ldl, profile?.ldlDate, LDL_RANGE, LDL_VALID_DAYS, now)

  const ulcer = profile?.ulcerHistory === YES
  const neuropathy = profile?.neuropathy === YES
  const hba1cElevated = hba1c.status === 'valid' && hba1c.value >= HBA1C_ELEVATED
  const hba1cHigh = hba1c.status === 'valid' && hba1c.value >= HBA1C_HIGH
  const ldlElevated = ldl.status === 'valid' && ldl.value >= LDL_ELEVATED

  // Urutannya urutan bobot — faktor pertama yang disebut dalam kalimat
  // peringatan adalah yang paling menentukan.
  const factors = []
  if (ulcer) factors.push({ code: 'ulcerHistory' })
  if (neuropathy) factors.push({ code: 'neuropathy' })
  if (hba1cElevated) factors.push({ code: 'hba1c', value: hba1c.value, date: hba1c.date })
  if (ldlElevated) factors.push({ code: 'ldl', value: ldl.value, date: ldl.date })

  const aggravating = [neuropathy, hba1cElevated, ldlElevated].filter(Boolean).length
  const tier =
    ulcer || hba1cHigh || aggravating >= 2 ? 'high' : aggravating === 1 ? 'elevated' : 'standard'

  const reminders = []
  if (hba1c.status !== 'valid') reminders.push({ code: 'hba1c', ...hba1c })
  if (ldl.status !== 'valid') reminders.push({ code: 'ldl', ...ldl })

  return { tier, factors, reminders }
}

// Bentuk yang ikut TERSIMPAN di setiap catatan peringatan.
//
// Kalimat peringatan dirakit saat dibaca, jadi kalau tingkat risikonya tidak
// ikut tersimpan, peringatan bulan lalu akan dijelaskan dengan profil hari ini
// — "diperketat karena HbA1c 9 %" pada catatan yang ditulis saat HbA1c-nya
// masih 7 %. Catatan medis harus tetap mengatakan hal yang sama seperti saat
// dibuat.
export function riskSnapshot(assessment) {
  return { tier: assessment?.tier ?? 'standard', factors: assessment?.factors ?? [] }
}
