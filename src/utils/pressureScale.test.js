import { describe, expect, it } from 'vitest'
import { PRESSURE_FULL_SCALE_KPA, pressureDotRadius, pressurePulse } from './pressureScale'

describe('pressureDotRadius', () => {
  it('membesar seiring tekanan', () => {
    const ringan = pressureDotRadius(80)
    const sedang = pressureDotRadius(160)
    const berat = pressureDotRadius(260)
    expect(sedang).toBeGreaterThan(ringan)
    expect(berat).toBeGreaterThan(sedang)
  })

  it('menahan ukuran di atas skala penuh', () => {
    // Tanpa clamp, tekanan ekstrem membuat titiknya menelan siluet kaki.
    const penuh = pressureDotRadius(PRESSURE_FULL_SCALE_KPA)
    expect(pressureDotRadius(PRESSURE_FULL_SCALE_KPA * 3)).toBe(penuh)
  })

  it('tetap terlihat pada tekanan nol', () => {
    // 0 kPa berarti sensor belum mengirim — titiknya harus tetap ada sebagai
    // penanda posisi sensor, bukan menyusut sampai hilang.
    expect(pressureDotRadius(0)).toBeGreaterThan(0)
  })

  it('tahan terhadap nilai tidak valid', () => {
    expect(pressureDotRadius(NaN)).toBe(pressureDotRadius(0))
    expect(pressureDotRadius(undefined)).toBe(pressureDotRadius(0))
    expect(pressureDotRadius(-50)).toBe(pressureDotRadius(0))
  })
})

describe('pressurePulse', () => {
  it('berdenyut lebih besar dan lebih cepat saat tekanan tinggi', () => {
    const ringan = pressurePulse(40)
    const berat = pressurePulse(280)
    expect(berat.scale).toBeGreaterThan(ringan.scale)
    expect(berat.durationSec).toBeLessThan(ringan.durationSec)
  })

  it('selalu membesar, tidak pernah mengecil', () => {
    for (const kpa of [0, 100, 200, 400]) {
      expect(pressurePulse(kpa).scale).toBeGreaterThan(1)
      expect(pressurePulse(kpa).durationSec).toBeGreaterThan(0)
    }
  })
})
