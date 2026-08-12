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

export function exportToCsv(data, history = [], filename = 'glykos-report') {
  const peakPressure =
    typeof data?.pressure === 'object'
      ? data.pressure.peak
      : Math.max(data?.pressure1 ?? 0, data?.pressure2 ?? 0, data?.pressure3 ?? 0, Number(data?.pressure || 0))

  const pressureLocation =
    typeof data?.pressure === 'object'
      ? data.pressure.location
      : 'Metatarsal'

  const highestTemp =
    typeof data?.temperature === 'object'
      ? data.temperature.highest
      : Number(data?.temperature || 0)

  const tempLocation =
    typeof data?.temperature === 'object'
      ? data.temperature.location
      : 'Metatarsal'

  const humidity = Number(data?.humidity || 0)
  const steps = data?.activity?.steps ?? 0
  const activeMins = data?.activity?.activeMinutes ?? 0

  const rows = [
    ['Glykos — Laporan Monitoring Kaki Diabetes'],
    ['Diekspor', new Date().toLocaleString('id-ID')],
    ['Perangkat', data?.device?.name ?? data?.deviceId ?? 'glykos-device'],
    [],
    ['Parameter Saat Ini'],
    ['Tekanan Puncak (kPa)', peakPressure],
    ['Lokasi Tekanan', pressureLocation],
    ['Suhu Tertinggi (°C)', highestTemp],
    ['Lokasi Suhu', tempLocation],
    ['Kelembapan (%RH)', humidity],
    ['Langkah', steps],
    ['Waktu Aktif (menit)', activeMins],
    [],
    ['Histori'],
    ['Tanggal', 'Tekanan (kPa)', 'Suhu (°C)', 'Kelembapan (%RH)', 'Langkah'],
    ...history.map((row) => [
      row.date || row.tanggal,
      row.pressure,
      row.temperature,
      row.humidity,
      row.steps ?? 0,
    ]),
  ]

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToPdf(data, history = []) {
  const peakPressure =
    typeof data?.pressure === 'object'
      ? data.pressure.peak
      : Math.max(data?.pressure1 ?? 0, data?.pressure2 ?? 0, data?.pressure3 ?? 0, Number(data?.pressure || 0))

  const pressureLocation =
    typeof data?.pressure === 'object'
      ? data.pressure.location
      : 'Metatarsal'

  const highestTemp =
    typeof data?.temperature === 'object'
      ? data.temperature.highest
      : Number(data?.temperature || 0)

  const tempLocation =
    typeof data?.temperature === 'object'
      ? data.temperature.location
      : 'Metatarsal'

  const humidity = Number(data?.humidity || 0)

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Glykos Report</title>
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
  <h1>Glykos — Laporan Monitoring</h1>
  <p class="subtitle">${escapeHtml(data?.device?.name ?? data?.deviceId ?? 'glykos-device')} · ${escapeHtml(new Date().toLocaleString('id-ID'))}</p>
  <div class="metrics">
    <div class="metric"><span>Tekanan Puncak</span><strong>${escapeHtml(peakPressure)} kPa</strong><small>${escapeHtml(pressureLocation)}</small></div>
    <div class="metric"><span>Suhu Tertinggi</span><strong>${escapeHtml(highestTemp)}°C</strong><small>${escapeHtml(tempLocation)}</small></div>
    <div class="metric"><span>Kelembapan</span><strong>${escapeHtml(humidity)}% RH</strong></div>
  </div>
  <h2>Histori</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>Tekanan</th><th>Suhu</th><th>Kelembapan</th><th>Langkah</th></tr></thead>
    <tbody>
      ${history
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.label || row.date)}</td><td>${escapeHtml(row.pressure)} kPa</td><td>${escapeHtml(row.temperature)}°C</td><td>${escapeHtml(row.humidity)}%</td><td>${escapeHtml((row.steps ?? 0).toLocaleString('id-ID'))}</td></tr>`,
        )
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

