import { describe, expect, it } from 'vitest'
import { shouldUseDemoData } from './demoMode'

const loaded = (hasRealData) => ({ hasRealData, isLoaded: true })

describe('shouldUseDemoData', () => {
  it('menampilkan data contoh untuk pengguna yang belum punya data', () => {
    expect(shouldUseDemoData('auto', loaded(false))).toBe(true)
  })

  it('TIDAK PERNAH menimpa data nyata', () => {
    // Aturan terpenting di modul ini: begitu ada pembacaan sungguhan, angka
    // contoh harus mundur. Kalau tidak, dashboard pemantauan medis
    // menampilkan angka karangan sebagai kondisi kaki pengguna.
    expect(shouldUseDemoData('auto', loaded(true))).toBe(false)
  })

  it('menahan diri sebelum jawaban Firestore tiba', () => {
    // Belum tahu apakah pengguna punya data. Kedipan contoh -> nyata jauh
    // lebih menyesatkan daripada kosong -> contoh.
    expect(shouldUseDemoData('auto', { hasRealData: false, isLoaded: false })).toBe(false)
  })

  it('menghormati ?demo=0 walau tidak ada data sama sekali', () => {
    expect(shouldUseDemoData('off', loaded(false))).toBe(false)
  })

  it('menghormati ?demo=1 untuk meninjau tampilan', () => {
    expect(shouldUseDemoData('on', { hasRealData: true, isLoaded: true })).toBe(true)
  })
})
