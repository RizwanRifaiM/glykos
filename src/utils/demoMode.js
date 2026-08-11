// Mode demo mengisi dashboard dengan data contoh (src/constants/demoData.js)
// supaya tampilan grafik & kartu bisa ditinjau tanpa perangkat BLE.
//
// Sengaja HANYA lewat query string, bukan tombol di UI atau localStorage:
// mode ini harus selalu terlihat pada URL, tidak lengket antar sesi, dan
// tidak mungkin aktif tanpa disengaja. Selalu dipasangkan dengan
// DemoModeBanner supaya angka contoh tidak bisa disalahartikan sebagai
// pembacaan sensor nyata.
export function isDemoMode() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('demo') === '1'
}
