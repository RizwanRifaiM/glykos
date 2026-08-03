const MESSAGES = {
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
  'auth/user-not-found': 'Email atau kata sandi salah.',
  'auth/wrong-password': 'Email atau kata sandi salah.',
  'auth/invalid-credential': 'Email atau kata sandi salah.',
  'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk.',
  'auth/weak-password': 'Kata sandi minimal 6 karakter.',
  'auth/popup-closed-by-user': 'Login dengan Google dibatalkan.',
  'auth/popup-blocked': 'Popup login diblokir oleh browser. Izinkan popup lalu coba lagi.',
  'auth/cancelled-popup-request': 'Login dengan Google dibatalkan.',
  'auth/network-request-failed': 'Gagal terhubung ke jaringan. Coba lagi.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
}

export function getAuthErrorMessage(error) {
  return MESSAGES[error?.code] || 'Terjadi kesalahan. Silakan coba lagi.'
}
