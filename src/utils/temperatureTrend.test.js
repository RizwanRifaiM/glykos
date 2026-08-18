import { describe, expect, it } from 'vitest'
import { describeTemperatureTrend, evaluateTemperatureTrend } from './temperatureTrend'

// Satu hari riwayat. `temperature` > 0 menandai hari itu TERCATAT — nol berarti
// perangkat tidak dipakai, lihat isRecorded() di temperatureTrend.js.
const day = (date, temperatureDelta, temperature = 31) => ({
  date,
  label: date,
  temperature,
  temperatureDelta,
})

const kosong = (date) => day(date, 0, 0)

describe('evaluateTemperatureTrend', () => {
  it('menganggap riwayat kosong sebagai aman, bukan peringatan', () => {
    const trend = evaluateTemperatureTrend([kosong('2026-08-10'), kosong('2026-08-11')])
    expect(trend.level).toBe('safe')
    expect(trend.streakDays).toBe(0)
  })

  it('satu hari di atas ambang baru berstatus perhatian, belum tindakan', () => {
    const trend = evaluateTemperatureTrend([day('2026-08-10', 0.8), day('2026-08-11', 2.6)])
    expect(trend.level).toBe('warning')
    expect(trend.streakDays).toBe(1)
  })

  it('dua hari berturut-turut di atas ambang menaikkan ke perlu tindakan', () => {
    const trend = evaluateTemperatureTrend([
      day('2026-08-09', 0.9),
      day('2026-08-10', 2.4),
      day('2026-08-11', 2.9),
    ])
    expect(trend.level).toBe('danger')
    expect(trend.streakDays).toBe(2)
    expect(trend.maxDelta).toBe(2.9)
  })

  it('hari di bawah ambang memutus rangkaian', () => {
    const trend = evaluateTemperatureTrend([
      day('2026-08-09', 2.8),
      day('2026-08-10', 1.1),
      day('2026-08-11', 2.5),
    ])
    expect(trend.streakDays).toBe(1)
    expect(trend.level).toBe('warning')
  })

  it('celah hari tak terpantau memutus rangkaian, bukan menjembataninya', () => {
    // Senin dan Rabu sama-sama di atas ambang, Selasa tidak dipakai sama
    // sekali. Tanpa pembacaan Selasa tidak ada dasar menyebutnya bertahan dua
    // hari berturut-turut — klaim itu justru yang memicu saran offloading.
    const trend = evaluateTemperatureTrend([
      day('2026-08-09', 2.7),
      kosong('2026-08-10'),
      day('2026-08-11', 2.6),
    ])
    expect(trend.streakDays).toBe(1)
    expect(trend.level).toBe('warning')
  })

  it('hari terakhir yang belum terpakai tidak menghapus rangkaian sebelumnya', () => {
    // Perangkat belum dipakai hari ini. Belum dipakai bukan berarti membaik,
    // jadi rangkaian dua hari kemarin harus tetap terbaca.
    const trend = evaluateTemperatureTrend([
      day('2026-08-09', 2.4),
      day('2026-08-10', 2.8),
      kosong('2026-08-11'),
    ])
    expect(trend.streakDays).toBe(2)
    expect(trend.level).toBe('danger')
  })

  it('ambang dan jumlah hari bisa diatur lewat opsi', () => {
    const history = [day('2026-08-09', 3.1), day('2026-08-10', 3.4), day('2026-08-11', 3.2)]
    expect(evaluateTemperatureTrend(history, { sustainedDays: 4 }).level).toBe('warning')
    expect(evaluateTemperatureTrend(history, { threshold: 5 }).streakDays).toBe(0)
  })
})

describe('describeTemperatureTrend', () => {
  it('menyebut jumlah hari saat rangkaian sudah perlu tindakan', () => {
    const trend = evaluateTemperatureTrend([day('2026-08-10', 2.4), day('2026-08-11', 2.9)])
    expect(describeTemperatureTrend(trend)).toContain('2 hari berturut-turut')
  })

  it('tidak mengarang peringatan saat kondisinya normal', () => {
    expect(describeTemperatureTrend(evaluateTemperatureTrend([]))).toContain('batas normal')
  })
})
