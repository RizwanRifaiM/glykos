// Kunci tanggal "YYYY-MM-DD" menurut waktu LOKAL.
//
// Jangan pakai toISOString().slice(0,10) untuk ini: ISO selalu UTC, sehingga
// tengah malam waktu lokal di UTC+7 berubah jadi pukul 17.00 hari SEBELUMNYA
// dan kuncinya meleset satu hari. Kunci ini dipakai untuk mencocokkan entri
// Firestore dengan baris tanggal di halaman Riwayat, jadi harus sama persis
// dengan tanggal yang dilihat pengguna.
export function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// "3 menit lalu" / "2 jam lalu" — dipakai penanda data basi, di mana yang
// penting bukan jam persisnya melainkan sudah berapa lama tidak diperbarui.
export function formatRelativeTime(timestampMs, now = Date.now()) {
  if (!Number.isFinite(timestampMs)) return 'baru saja'
  const seconds = Math.max(0, Math.round((now - timestampMs) / 1000))
  if (seconds < 60) return 'baru saja'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  return `${days} hari lalu`
}

export function formatLastUpdate(timestamp) {
  if (!timestamp) return '--:--:--'

  try {
    let date
    if (timestamp instanceof Date) {
      date = timestamp
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    } else if (typeof timestamp === 'number') {
      date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp)
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      return '--:--:--'
    }

    if (isNaN(date.getTime())) return '--:--:--'

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '--:--:--'
  }
}
