// Notifikasi peringatan.
//
// PENTING — kenapa jalurnya lewat service worker:
// versi sebelumnya memanggil `new Notification(...)` langsung dan membungkusnya
// dengan try/catch. Chrome di Android tidak mengizinkan konstruktor itu dan
// melempar TypeError, jadi catch tersebut menelan KEGAGALAN SESUNGGUHNYA:
// peringatan status `danger` tidak pernah muncul di HP — perangkat yang justru
// paling mungkin dipakai berdampingan dengan insole — tanpa jejak apa pun.
//
// registration.showNotification() adalah satu-satunya jalur yang bekerja di
// sana. Konstruktor lama tetap dipertahankan sebagai cadangan untuk desktop
// yang service worker-nya belum sempat aktif.
const ICON = '/icon.svg'

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  return isNotificationSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

async function swRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    // `ready` menunggu registrasi aktif, tapi menggantung selamanya kalau tidak
    // pernah ada yang mendaftar — jadi getRegistration() dulu sebagai penjaga.
    const existing = await navigator.serviceWorker.getRegistration()
    if (!existing) return null
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

// Mengembalikan true kalau notifikasinya benar-benar ditampilkan. Nilai baliknya
// dipakai untuk membedakan "tidak ditampilkan karena izin belum diberikan" dari
// "gagal", bukan sekadar dibuang seperti dulu.
export async function notify(title, body, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false

  const payload = {
    body,
    icon: ICON,
    badge: ICON,
    lang: 'id',
    // `tag` membuat peringatan sejenis saling menimpa alih-alih menumpuk di
    // shade notifikasi. Cocok di sini: yang penting kondisi TERBARU.
    tag: options.tag ?? 'glykos-alert',
    data: { url: options.url ?? '/dashboard/alerts' },
  }

  const registration = await swRegistration()
  if (registration?.showNotification) {
    try {
      await registration.showNotification(title, payload)
      return true
    } catch (err) {
      console.warn('Gagal menampilkan notifikasi lewat service worker:', err)
    }
  }

  try {
    new Notification(title, payload)
    return true
  } catch (err) {
    // Sampai di sini berarti kedua jalur tertutup. Dicatat, TIDAK didiamkan —
    // ini kegagalan menyampaikan peringatan, bukan sekadar pemanis yang hilang.
    console.warn('Notifikasi tidak dapat ditampilkan di browser ini:', err)
    return false
  }
}
