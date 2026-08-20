import { msg } from '@lingui/core/macro'

// Pesan kegagalan masuk/daftar, dipetakan dari kode error Firebase.
//
// Deskriptor `msg`, bukan string: pesan ini disimpan sebagai state komponen
// (`setError(...)`) dan bisa masih tampil di layar saat pengguna mengganti
// bahasa. Kalau yang disimpan sudah berupa string, kalimatnya tertinggal di
// bahasa lama sementara seluruh formulir di sekitarnya sudah berganti.
// Deskriptor yang diselesaikan pada saat render tidak punya masalah itu.
//
// Kode 'auth/user-not-found' dan 'auth/wrong-password' sengaja memakai kalimat
// yang SAMA: memberi tahu bahwa emailnya terdaftar tapi kata sandinya salah
// adalah kebocoran informasi akun. Kesamaan itu harus dipertahankan
// penerjemah — karena itu keduanya ditulis utuh di sini, bukan dirujuk silang.
const MESSAGES = {
  'auth/invalid-email': msg`Format email tidak valid.`,
  'auth/user-disabled': msg`Akun ini telah dinonaktifkan.`,
  'auth/user-not-found': msg`Email atau kata sandi salah.`,
  'auth/wrong-password': msg`Email atau kata sandi salah.`,
  'auth/invalid-credential': msg`Email atau kata sandi salah.`,
  'auth/email-already-in-use': msg`Email ini sudah terdaftar. Silakan masuk.`,
  'auth/weak-password': msg`Kata sandi minimal 6 karakter.`,
  'auth/popup-closed-by-user': msg`Login dengan Google dibatalkan.`,
  'auth/popup-blocked': msg`Popup login diblokir oleh browser. Izinkan popup lalu coba lagi.`,
  'auth/cancelled-popup-request': msg`Login dengan Google dibatalkan.`,
  'auth/network-request-failed': msg`Gagal terhubung ke jaringan. Coba lagi.`,
  'auth/too-many-requests': msg`Terlalu banyak percobaan. Coba lagi beberapa saat lagi.`,
}

const FALLBACK = msg`Terjadi kesalahan. Silakan coba lagi.`

// Mengembalikan DESKRIPTOR, diselesaikan pemanggil dengan i18n._().
export function getAuthErrorMsg(error) {
  return MESSAGES[error?.code] || FALLBACK
}
