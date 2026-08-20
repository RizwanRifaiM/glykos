import { t } from '@lingui/core/macro'
import { locationLabel } from './alertMessages'
import { formatDateTime, formatNumber } from './locale'

// LAPORAN IKUT BAHASA ANTARMUKA
// Berkas ini menghasilkan dokumen yang KELUAR dari aplikasi: CSV yang dibuka di
// Excel dan halaman cetak yang bisa dibawa ke dokter. Justru di situ bahasa
// paling penting — dokumen yang dicetak seorang pengguna berbahasa Inggris
// untuk ditunjukkan ke tenaga kesehatan tidak boleh berkepala "Laporan
// Monitoring Kaki Diabetes".
//
// `i18n` dioper dari komponen pemanggil (ProfilePage/HistoryPage), sesuai
// konvensi di utils/locale.js.

// Nilai apa pun yang masuk ke HTML laporan di-escape dulu. Isinya memang data
// milik pengguna sendiri (nama perangkat, nama area, label tanggal), tapi
// menempelkan string mentah ke markup lewat template literal adalah kebiasaan
// yang cepat berubah jadi lubang begitu ada satu field yang bisa diisi bebas —
// dan profil pasien sudah punya beberapa.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Satu sel CSV: dikutip bila mengandung pemisah/kutip/baris baru, dan diberi
// awalan kutip tunggal bila diawali karakter yang ditafsirkan Excel/Sheets
// sebagai rumus (=, +, -, @). Sebelumnya baris disusun dengan join(',') polos,
// sehingga satu koma di dalam nilai sudah cukup menggeser seluruh kolom.
function csvCell(value) {
  const text = String(value ?? '')
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

// Ringkasan angka yang sama dipakai CSV maupun halaman cetak. Sebelumnya
// dihitung dua kali dengan kode yang identik di kedua fungsi — termasuk
// fallback `'Metatarsal'` yang di-hardcode dua kali.
function summarize(i18n, data) {
  const peakPressure =
    typeof data?.pressure === 'object'
      ? data.pressure.peak
      : Math.max(
          data?.pressure1 ?? 0,
          data?.pressure2 ?? 0,
          data?.pressure3 ?? 0,
          Number(data?.pressure || 0),
        )

  const highestTemp =
    typeof data?.temperature === 'object'
      ? data.temperature.highest
      : Number(data?.temperature || 0)

  // Nama area lewat locationLabel(), bukan string 'Metatarsal' langsung: itu
  // satu-satunya tempat nama area diterjemahkan, jadi laporan menyebut area
  // dengan istilah yang sama persis seperti yang dilihat pengguna di kartu
  // sensor.
  const fallbackArea = locationLabel(i18n, 'metatarsal')

  return {
    peakPressure,
    highestTemp,
    pressureLocation:
      typeof data?.pressure === 'object'
        ? (locationLabel(i18n, data.pressure.location) ?? fallbackArea)
        : fallbackArea,
    tempLocation:
      typeof data?.temperature === 'object'
        ? (locationLabel(i18n, data.temperature.location) ?? fallbackArea)
        : fallbackArea,
    humidity: Number(data?.humidity || 0),
    steps: data?.activity?.steps ?? 0,
    wearMins: data?.activity?.wearMinutes ?? 0,
    deviceName: data?.device?.name ?? data?.deviceId ?? 'glykos-device',
  }
}

export function exportToCsv(i18n, data, history = [], filename = 'glykos-report') {
  const s = summarize(i18n, data)

  const rows = [
    [t(i18n)`Glykos — Laporan Monitoring Kaki Diabetes`],
    [t(i18n)`Diekspor`, formatDateTime(new Date(), i18n.locale)],
    [t(i18n)`Perangkat`, s.deviceName],
    [],
    [t(i18n)`Parameter Saat Ini`],
    [t(i18n)`Tekanan Puncak (kPa)`, s.peakPressure],
    [t(i18n)`Lokasi Tekanan`, s.pressureLocation],
    [t(i18n)`Suhu Tertinggi (°C)`, s.highestTemp],
    [t(i18n)`Lokasi Suhu`, s.tempLocation],
    [t(i18n)`Kelembapan (%RH)`, s.humidity],
    [t(i18n)`Langkah`, s.steps],
    [t(i18n)`Waktu Pemakaian (menit)`, s.wearMins],
    [],
    [t(i18n)`Histori`],
    [
      t(i18n)`Tanggal`,
      t(i18n)`Tekanan (kPa)`,
      t(i18n)`Suhu (°C)`,
      t(i18n)`Selisih Suhu (°C)`,
      t(i18n)`Kelembapan (%RH)`,
      t(i18n)`Langkah`,
    ],
    // Angka pada baris histori DIBIARKAN mentah (titik desimal, tanpa pemisah
    // ribuan). Ini kolom yang akan dihitung ulang di Excel/Sheets, dan angka
    // yang sudah diformat menurut bahasa ("2,7") terbaca sebagai teks di
    // spreadsheet berlokal Inggris — atau lebih buruk, sebagai 27. Yang
    // diterjemahkan adalah judul kolomnya, bukan isinya.
    ...history.map((row) => [
      row.date || row.tanggal,
      row.pressure,
      row.temperature,
      row.temperatureDelta ?? 0,
      row.humidity,
      row.steps ?? 0,
    ]),
  ]

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToPdf(i18n, data, history = []) {
  const s = summarize(i18n, data)

  // Judul & label disiapkan sebagai variabel dulu, bukan dipanggil di dalam
  // template: `${t(i18n)\`…\`}` di tengah markup membuat pesan sulit dilacak
  // dan melanggar lingui/no-expression-in-message.
  const title = t(i18n)`Glykos — Laporan Monitoring`
  const docTitle = t(i18n)`Laporan Glykos`
  const labelPeak = t(i18n)`Tekanan Puncak`
  const labelTemp = t(i18n)`Suhu Tertinggi`
  const labelHumidity = t(i18n)`Kelembapan`
  const labelHistory = t(i18n)`Histori`
  const thDate = t(i18n)`Tanggal`
  const thPressure = t(i18n)`Tekanan`
  const thTemp = t(i18n)`Suhu`
  const thDelta = t(i18n)`Selisih Suhu`
  const thHumidity = t(i18n)`Kelembapan`
  const thSteps = t(i18n)`Langkah`
  const exportedAt = formatDateTime(new Date(), i18n.locale)

  // Template di bawah adalah MARKUP, bukan teks — seluruh kata yang dibaca
  // manusia sudah disiapkan sebagai variabel terjemahan di atas. Menandainya
  // untuk diterjemahkan berarti menyerahkan tag HTML dan CSS ke penerjemah,
  // yang justru cara paling mudah merusak halamannya.
  // eslint-disable-next-line lingui/no-unlocalized-strings
  const html = `
<!DOCTYPE html>
<html lang="${escapeHtml(i18n.locale)}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(docTitle)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #446a45; padding: 32px; }
    h1 { color: #446a45; margin-bottom: 4px; }
    .subtitle { color: #81a283; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #86a788; padding: 8px 12px; text-align: left; }
    th { background: #446a45; color: #fefdeb; }
    tr:nth-child(even) { background: #fefdeb; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
    .metric { background: #86a78833; padding: 16px; border-radius: 8px; border-left: 4px solid #81a283; }
    .metric strong { display: block; font-size: 24px; color: #446a45; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="subtitle">${escapeHtml(s.deviceName)} · ${escapeHtml(exportedAt)}</p>
  <div class="metrics">
    <div class="metric"><span>${escapeHtml(labelPeak)}</span><strong>${escapeHtml(s.peakPressure)} kPa</strong><small>${escapeHtml(s.pressureLocation)}</small></div>
    <div class="metric"><span>${escapeHtml(labelTemp)}</span><strong>${escapeHtml(s.highestTemp)}°C</strong><small>${escapeHtml(s.tempLocation)}</small></div>
    <div class="metric"><span>${escapeHtml(labelHumidity)}</span><strong>${escapeHtml(s.humidity)}% RH</strong></div>
  </div>
  <h2>${escapeHtml(labelHistory)}</h2>
  <table>
    <thead><tr><th>${escapeHtml(thDate)}</th><th>${escapeHtml(thPressure)}</th><th>${escapeHtml(thTemp)}</th><th>${escapeHtml(thDelta)}</th><th>${escapeHtml(thHumidity)}</th><th>${escapeHtml(thSteps)}</th></tr></thead>
    <tbody>
      ${history
        .map((row) => {
          // Baris tabel: markup + angka, tanpa satu pun kata. Lihat catatan di
          // atas.
          // eslint-disable-next-line lingui/no-unlocalized-strings
          return `<tr><td>${escapeHtml(row.label || row.date)}</td><td>${escapeHtml(row.pressure)} kPa</td><td>${escapeHtml(row.temperature)}°C</td><td>${escapeHtml(row.temperatureDelta ?? 0)}°C</td><td>${escapeHtml(row.humidity)}%</td><td>${escapeHtml(formatNumber(row.steps ?? 0, { locale: i18n.locale }))}</td></tr>`
        })
        .join('')}
    </tbody>
  </table>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}
