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

// BATAS FREKUENSI NOTIFIKASI — LINTAS SEMUA METRIK.
//
// Jeda di utils/alertRules.js berlaku PER METRIK. Itu cukup untuk satu metrik,
// tapi tidak untuk HP-nya: tekanan, suhu, kelembapan, kelelahan, dan sepatu
// terputus masing-masing boleh berbunyi, sehingga dalam satu jam HP bisa
// berbunyi berkali-kali. Chrome Android menilai situs yang terlalu sering
// mengirim notifikasi sebagai spam — memberi label peringatan, lalu bisa
// MENCABUT izinnya. Kalau itu terjadi, peringatan yang benar-benar penting pun
// tidak akan sampai lagi.
//
// Jadi di sini ada satu jeda untuk SEMUA notifikasi otomatis. Yang ditahan
// hanya bunyi di HP — peringatannya tetap tercatat di halaman Peringatan.
//
// PENGECUALIAN: status RISIKO (danger — ambang tinggi terlampaui) TIDAK
// menunggu jeda 30 menit. Kondisi yang sudah melewati ambang tinggi adalah
// alasan aplikasi ini ada; menahannya setengah jam demi menghindari label spam
// sama saja dengan tidak memberi tahu. Yang tersisa hanya jeda pendek
// NOTIFY_DANGER_MIN_GAP_MS antara dua notifikasi apa pun, supaya tekanan dan
// suhu yang melampaui ambang di detik yang sama tidak membunyikan HP beruntun.
// Pengulangan danger pada metrik yang SAMA tetap dibatasi jeda per metrik di
// utils/alertRules.js.
//
// Status Perlu Perhatian (warning) tetap ikut jeda 30 menit penuh.
export const NOTIFY_MIN_GAP_MS = 30 * 60 * 1000
export const NOTIFY_DANGER_MIN_GAP_MS = 5 * 60 * 1000

// Prioritas: 1 = perlu perhatian (warning), 2 = berisiko (danger).
export function shouldDeliverNotification(last, priority, now) {
  if (!last || typeof last.at !== 'number') return true
  const elapsed = now - last.at
  const gap = priority >= 2 ? NOTIFY_DANGER_MIN_GAP_MS : NOTIFY_MIN_GAP_MS
  return elapsed >= gap
}

// Disimpan di localStorage, bukan di memori: tanpa itu, memuat ulang halaman
// mengosongkan jeda dan HP langsung boleh berbunyi lagi.
const LAST_KEY = 'glykos:notify-last'

function loadLast() {
  try {
    const stored = window.localStorage.getItem(LAST_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveLast(value) {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(value))
  } catch {
    // Mode privat / storage penuh — jeda hanya berlaku sampai halaman dimuat ulang.
  }
}

let lastInMemory = null

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

  // `force` hanya untuk notifikasi yang DIMINTA pengguna (tombol uji di
  // Profil) — itu bukan notifikasi yang tak diminta, jadi tidak ikut dijeda
  // dan tidak memakai jatah jeda.
  //
  // Diperiksa dan dicatat SEBELUM await pertama: dua peringatan yang dipicu
  // pada pembacaan yang sama (tekanan dan suhu sekaligus) harus melihat jeda
  // yang sama, bukan sama-sama lolos.
  if (!options.force) {
    const now = Date.now()
    const priority = options.priority ?? 2
    const last = loadLast() ?? lastInMemory
    if (!shouldDeliverNotification(last, priority, now)) return false
    lastInMemory = { at: now, priority }
    saveLast(lastInMemory)
  }

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
    // `danger` kedua pada metrik yang sama (setelah jeda di
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
