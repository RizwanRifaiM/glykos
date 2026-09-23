import { describe, expect, it } from 'vitest'
import { notificationTag } from './notifications'

// Tag bukan label kosmetik: di shade notifikasi HP, dua notifikasi bertag SAMA
// saling menimpa dan yang kedua default-nya senyap. Jadi nilai yang dihasilkan
// fungsi ini yang menentukan sebuah peringatan sampai atau hilang.
describe('notificationTag', () => {
  it('memberi tag berbeda untuk metrik berbeda', () => {
    // Inti perbaikannya. Sebelumnya semua peringatan memakai satu tag, jadi
    // peringatan suhu menimpa peringatan tekanan yang belum dibaca.
    const metrik = ['pressure', 'temperature', 'humidity', 'fatigue', 'temperatureTrend']
    const tags = metrik.map(notificationTag)
    expect(new Set(tags).size).toBe(metrik.length)
  })

  it('memberi tag sama untuk metrik yang sama', () => {
    // Sisi lain yang sama pentingnya: eskalasi ulang pada metrik yang sama HARUS
    // menimpa, bukan menumpuk — yang perlu dilihat kondisi terbarunya.
    expect(notificationTag('pressure')).toBe(notificationTag('pressure'))
  })

  it('selalu menghasilkan tag tidak kosong', () => {
    // Tag kosong berarti notifikasi MENUMPUK tanpa batas di shade — satu sesi
    // pemakaian bisa meninggalkan puluhan entri yang harus dihapus satu per satu.
    for (const metric of [undefined, null, '', 'pressure']) {
      expect(notificationTag(metric)).toBeTruthy()
    }
  })

  it('menyertakan awalan nama aplikasi', () => {
    // Tag dibagi seluruh origin. Awalan ini yang memisahkannya dari notifikasi
    // milik halaman lain pada origin yang sama.
    expect(notificationTag('pressure')).toContain('glykos')
    expect(notificationTag(undefined)).toContain('glykos')
  })
})
