import { describe, expect, it } from 'vitest'
import { shouldUseDemoData } from './demoMode'

describe('shouldUseDemoData', () => {
  it('menyala hanya bila diminta eksplisit lewat ?demo=1', () => {
    expect(shouldUseDemoData('on')).toBe(true)
  })

  it('mati pada segala keadaan lain', () => {
    expect(shouldUseDemoData('off')).toBe(false)
    expect(shouldUseDemoData(undefined)).toBe(false)
  })

  // Penjaga terhadap perilaku yang sengaja DIHAPUS.
  //
  // Dulu ada mode 'auto' yang menyalakan data contoh sendiri saat pengguna
  // belum punya data, tanpa spanduk penanda apa pun. Di aplikasi yang seluruh
  // gunanya membaca kondisi kaki, angka karangan yang tidak bisa dibedakan dari
  // pembacaan sensor adalah kegagalan yang serius — dan itu memang sempat
  // membingungkan saat dipakai.
  //
  // Pengujian ini ada supaya kemudahan "dashboard tidak terlihat kosong" tidak
  // menyelinap masuk lagi tanpa disadari.
  it('TIDAK pernah menyala sendiri hanya karena pengguna belum punya data', () => {
    expect(shouldUseDemoData('auto')).toBe(false)
    // Bahkan kalau nanti ada yang mengoper konteks seperti dulu, jawabannya
    // tetap sama: keputusan mode demo murni milik pengguna lewat URL.
    expect(shouldUseDemoData('auto', { hasRealData: false, isLoaded: true })).toBe(false)
  })
})
