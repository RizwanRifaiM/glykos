import { describe, expect, it } from 'vitest'
import { TemperatureBaselineSession } from './useTemperatureRise'
import { evaluateTemperatureRise } from '../utils/temperatureRise'

const feed = (session, points, times) => {
  for (let i = 0; i < times; i++) session.update(points)
}

describe('TemperatureBaselineSession', () => {
  it('belum punya acuan sebelum ada pembacaan', () => {
    const session = new TemperatureBaselineSession()
    expect(session.getSnapshot().baseline).toBeNull()
  })

  it('memakai acuan sejak sampel pertama', () => {
    // Menunggu sepuluh sampel berarti tiga detik pertama sesi tidak punya
    // penilaian sama sekali — dan itu tidak membuatnya lebih benar.
    const session = new TemperatureBaselineSession()
    session.update({ metatarsal: 31.2, heel: 30.8 })
    expect(session.getSnapshot().baseline).toEqual({ metatarsal: 31.2, heel: 30.8 })
  })

  it('merata-ratakan sampel awal untuk meredam derau NTC', () => {
    const session = new TemperatureBaselineSession()
    session.update({ metatarsal: 31.0 })
    session.update({ metatarsal: 31.4 })
    expect(session.getSnapshot().baseline.metatarsal).toBeCloseTo(31.2, 5)
  })

  // INI yang membuat aturannya bekerja sama sekali. Acuan yang ikut bergeser
  // mengikuti suhu terkini tidak akan pernah menunjukkan kenaikan apa pun —
  // kaki yang memanas pelan-pelan selama sejam akan terus terbaca "naik 0 °C".
  it('BERHENTI berubah setelah sampel awal, meski suhunya terus naik', () => {
    const session = new TemperatureBaselineSession()
    feed(session, { metatarsal: 31.0 }, 10)
    const acuan = session.getSnapshot().baseline.metatarsal

    feed(session, { metatarsal: 35.0 }, 50)
    expect(session.getSnapshot().baseline.metatarsal).toBeCloseTo(acuan, 5)

    // Dan kenaikannya memang terbaca penuh.
    const result = evaluateTemperatureRise(session.getSnapshot().baseline, { metatarsal: 35.0 })
    expect(result.maxRise).toBeCloseTo(4, 1)
  })

  it('mengabaikan pembacaan tanpa angka yang sah', () => {
    const session = new TemperatureBaselineSession()
    session.update({ metatarsal: NaN, heel: null })
    expect(session.getSnapshot().baseline).toBeNull()
    session.update(null)
    expect(session.getSnapshot().baseline).toBeNull()
  })

  it('membentuk acuan baru setelah direset', () => {
    // Sesi baru dimulai saat perangkat tersambung ulang: acuannya harus ikut
    // baru, kalau tidak kenaikan sesi kemarin ikut terhitung hari ini.
    const session = new TemperatureBaselineSession()
    feed(session, { metatarsal: 31.0 }, 10)
    session.reset()
    expect(session.getSnapshot().baseline).toBeNull()

    session.update({ metatarsal: 34.0 })
    expect(session.getSnapshot().baseline.metatarsal).toBe(34.0)
    expect(evaluateTemperatureRise(session.getSnapshot().baseline, { metatarsal: 34.0 }).maxRise).toBe(0)
  })
})
