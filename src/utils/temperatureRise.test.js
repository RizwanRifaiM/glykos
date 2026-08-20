import { describe, expect, it } from 'vitest'
import { evaluateTemperatureRise, riseLevel } from './temperatureRise'

const BASELINE = { metatarsal: 31.2, heel: 30.9, lateral: 31.1 }

describe('riseLevel', () => {
  it('memakai skala tiga tingkat', () => {
    expect(riseLevel(0.9)).toBe('safe')
    expect(riseLevel(1.0)).toBe('warning')
    expect(riseLevel(2.1)).toBe('warning')
    expect(riseLevel(2.2)).toBe('danger')
  })

  it('memperlakukan nilai tak terhingga sebagai aman', () => {
    expect(riseLevel(NaN)).toBe('safe')
    expect(riseLevel(undefined)).toBe('safe')
  })
})

describe('evaluateTemperatureRise', () => {
  it('aman saat tidak ada titik yang naik berarti', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 31.4,
      heel: 31.1,
      lateral: 31.3,
    })
    expect(result.level).toBe('safe')
    expect(result.risenCount).toBe(0)
    expect(result.systemic).toBe(false)
  })

  // INTI ATURAN INI, bagian pertama: panas yang merata itu sistemik — ruangan
  // panas, baru berjalan, demam — bukan peradangan. Menandainya merah hanya
  // melatih pengguna mengabaikan peringatan.
  it('AMAN saat ketiga titik naik bersama, meski jauh melewati ambang', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 34.2, // +3,0
      heel: 33.8, // +2,9
      lateral: 34.2, // +3,1
    })
    expect(result.maxRise).toBeGreaterThan(2.2)
    expect(result.risenCount).toBe(3)
    expect(result.areaCount).toBe(3)
    expect(result.systemic).toBe(true)
    expect(result.level).toBe('safe')
  })

  // Bagian kedua: satu titik memanas sementara yang lain tetap adalah pola
  // peradangan lokal, dan itulah yang mendahului ulkus.
  it('WASPADA saat hanya satu titik yang naik', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 33.6, // +2,4
      heel: 31.1, // +0,2
      lateral: 31.3, // +0,2
    })
    expect(result.level).toBe('danger')
    expect(result.risenCount).toBe(1)
    expect(result.risenAreas).toEqual(['metatarsal'])
    expect(result.systemic).toBe(false)
  })

  it('WASPADA saat dua dari tiga titik naik', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 33.6, // +2,4
      heel: 33.4, // +2,5
      lateral: 31.3, // +0,2
    })
    expect(result.level).toBe('danger')
    expect(result.risenCount).toBe(2)
    expect(result.systemic).toBe(false)
  })

  // "Semua titik naik" saja tidak cukup untuk disebut sistemik. Yang menandakan
  // peradangan adalah SELISIH antar kenaikan, bukan sekadar kenaikannya.
  it('tidak menganggap sistemik bila satu titik naik jauh lebih tinggi', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 34.2, // +3,0
      heel: 32.1, // +1,2
      lateral: 32.2, // +1,1
    })
    expect(result.risenCount).toBe(3)
    expect(result.riseSpread).toBeGreaterThanOrEqual(1.0)
    expect(result.systemic).toBe(false)
    expect(result.level).toBe('danger')
  })

  it('memberi status perhatian pada kenaikan menengah yang terpusat', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 32.6, // +1,4
      heel: 31.0, // +0,1
      lateral: 31.2, // +0,1
    })
    expect(result.level).toBe('warning')
    expect(result.risenCount).toBe(1)
  })

  // Dengan satu sensor tidak ada yang bisa dibandingkan. Dalam keraguan,
  // penilaiannya tidak diturunkan — salah menganggap aman lebih mahal.
  it('tidak menurunkan status saat hanya satu titik terukur', () => {
    const result = evaluateTemperatureRise({ metatarsal: 31.2 }, { metatarsal: 34.0 })
    expect(result.areaCount).toBe(1)
    expect(result.systemic).toBe(false)
    expect(result.level).toBe('danger')
  })

  it('melewati area yang sensornya mati di tengah sesi', () => {
    // `lateral` hilang dari pembacaan sekarang — tidak boleh menghasilkan
    // "kenaikan" dari nilai yang tidak pernah ada.
    const result = evaluateTemperatureRise(BASELINE, { metatarsal: 31.4, heel: 31.0 })
    expect(result.areaCount).toBe(2)
    expect(result.rises.lateral).toBeUndefined()
  })

  it('kosong tanpa baseline', () => {
    expect(evaluateTemperatureRise(null, { metatarsal: 33 }).hasBaseline).toBe(false)
    expect(evaluateTemperatureRise({}, {}).level).toBe('safe')
  })

  it('menghitung penurunan suhu sebagai kenaikan negatif, bukan sebagai risiko', () => {
    const result = evaluateTemperatureRise(BASELINE, {
      metatarsal: 29.0,
      heel: 29.1,
      lateral: 29.2,
    })
    expect(result.maxRise).toBeLessThan(0)
    expect(result.level).toBe('safe')
    expect(result.risenCount).toBe(0)
  })
})
