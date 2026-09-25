// Penggabungan catatan peringatan untuk halaman Peringatan.
//
// Koleksi `alerts` di Firestore append-only: setiap kali satu metrik lewat
// jedanya (utils/alertRules.js) dan masih di atas ambang, catatan baru
// ditambahkan. Ditampilkan satu per satu, tekanan yang bertahan di atas ambang
// sepanjang sore menjadi deretan baris yang isinya nyaris sama — halamannya
// terasa terus-menerus memperingatkan, dan peringatan yang BERBEDA tenggelam
// di antaranya.
//
// Jadi yang ditampilkan adalah KEJADIAN: semua catatan dengan metrik dan status
// yang sama pada hari yang sama digabung menjadi satu baris, dengan jumlah dan
// rentang jamnya. Catatan aslinya tidak diubah atau dihapus — tetap bisa
// dibuka satu per satu dari baris kejadiannya.
//
// Fungsi murni, tanpa React atau Firestore, supaya aturan penggabungannya bisa
// diuji langsung.
import { toDateKey } from './formatTime'

export function alertDate(ts) {
  if (!ts) return null
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
  return isNaN(date.getTime()) ? null : date
}

function dayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// `alerts` diharapkan urut dari yang TERBARU (seperti hasil query useAlerts).
// Hasilnya ikut urutan itu: tiap kejadian menempati posisi catatan terbarunya.
//
// Catatan lama tanpa `metric` (format sebelum data terstruktur) digabung
// berdasarkan `label`-nya; yang tidak punya keduanya berdiri sendiri, karena
// tidak ada dasar untuk menyatakannya kejadian yang sama.
export function groupAlertEvents(alerts) {
  const events = []
  const byKey = new Map()

  for (const alert of alerts) {
    const date = alertDate(alert.createdAt)
    const identity = alert.metric ?? alert.label ?? null
    const key =
      date && identity ? `${dayStart(date)}|${identity}|${alert.status}` : `single|${alert.id}`

    const existing = byKey.get(key)
    if (existing) {
      existing.items.push(alert)
      existing.count += 1
      if (date) existing.firstAt = date
      continue
    }

    const event = {
      id: alert.id,
      status: alert.status,
      // Catatan TERBARU yang mewakili kejadiannya — pesan dan lokasinya yang
      // ditampilkan, karena itulah kondisi paling akhir yang diketahui.
      latest: alert,
      items: [alert],
      count: 1,
      firstAt: date,
      lastAt: date,
    }
    byKey.set(key, event)
    events.push(event)
  }

  return events
}

// Jumlah KEJADIAN pada satu hari (`dayKey` berformat toDateKey, mis.
// '2026-09-25') — angka di ikon Peringatan pada menu.
//
// Sebelumnya angka itu jumlah seluruh catatan yang dimuat (hingga 200), jadi
// badge-nya praktis tidak pernah turun dan terus terlihat seperti peringatan
// baru. Yang berguna di menu adalah: ada berapa hal yang terjadi HARI INI.
export function countEventsOnDay(alerts, dayKey) {
  return groupAlertEvents(alerts).filter((event) => toDateKey(event.lastAt) === dayKey).length
}
