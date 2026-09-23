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
import { i18n } from '@lingui/core'

const ICON = '/icon-192.png'

// Tag notifikasi untuk satu metrik.
//
// Diekspor dan dipisah sebagai fungsi murni karena nilainya PUNYA ARTI
// PERILAKU, bukan sekadar label: dua notifikasi bertag sama saling menimpa di
// shade notifikasi HP, dua yang berbeda berdiri sendiri. Itu layak diuji, dan
// mengujinya di sini tidak menuntut tiruan API Notification sama sekali.
//
// Tanpa metrik, jatuh ke tag umum — pemanggil lama yang belum menyebut
// metriknya tetap berperilaku seperti sebelumnya alih-alih kehilangan tag
// (tag kosong berarti notifikasi MENUMPUK tanpa batas).
export function notificationTag(metric) {
  return metric ? `glykos-${metric}` : 'glykos-alert'
}

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
    // Bahasa notifikasi mengikuti bahasa aktif, bukan 'id' tetap. Judul dan isi
    // notifikasi memang sudah diterjemahkan pemanggilnya (useAlerts.js), tapi
    // atribut ini yang dipakai OS untuk memilih pelafalan saat notifikasinya
    // dibacakan — dan sistem yang membacakan teks Inggris dengan fonetik
    // Indonesia praktis tidak bisa dimengerti.
    //
    // Dibaca dari instance global, bukan dioper: fungsi ini dipanggil dari
    // effect dan callback di luar pohon render, jadi tidak ada konteks React
    // yang bisa diandalkan di sini. Nilainya dibaca saat notifikasi dikirim,
    // yang memang saat yang benar.
    lang: i18n.locale ?? 'id',
    // `tag` membuat peringatan pada METRIK YANG SAMA saling menimpa alih-alih
    // menumpuk di shade notifikasi. Itu benar: yang perlu dilihat adalah kondisi
    // tekanan TERBARU, bukan seluruh riwayatnya sejak pagi.
    //
    // Tapi tag-nya harus PER METRIK, bukan satu untuk semua. Sebelumnya seluruh
    // peringatan memakai 'glykos-alert', jadi peringatan suhu MENIMPA peringatan
    // tekanan yang belum dibaca — padahal keduanya temuan berbeda, bukan
    // pembaruan dari yang satu ke yang lain. Pada aplikasi yang gunanya
    // memanggil perhatian ke satu titik di kaki, kehilangan temuan yang berbeda
    // lebih mahal daripada menumpuk dua notifikasi.
    tag: options.tag ?? notificationTag(options.metric),
    // WAJIB menyertai `tag`. Di Android, notifikasi yang menimpa notifikasi
    // ber-tag sama DEFAULT-NYA SENYAP: tidak ada suara, getar, maupun banner —
    // entri di shade hanya diperbarui diam-diam. Tanpa baris ini, peringatan
    // `danger` kedua pada metrik yang sama (setelah cooldown 10 menit di
    // utils/alertRules.js) sampai ke HP tanpa memberi tahu siapa pun, dan
    // `notify()` tetap mengembalikan true — jadi kegagalannya tidak terlihat
    // dari sisi mana pun.
    renotify: true,
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
