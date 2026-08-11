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
