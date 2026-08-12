import { describe, expect, it } from 'vitest'
import { formatRelativeTime, toDateKey } from './formatTime'

describe('toDateKey', () => {
  it('memakai tanggal LOKAL, bukan UTC', () => {
    // Kunci ini mencocokkan entri Firestore dengan baris tanggal yang dilihat
    // pengguna. toISOString() berbasis UTC, sehingga tengah malam di UTC+7
    // akan tercatat sebagai hari sebelumnya.
    const tengahMalamLokal = new Date(2026, 7, 13, 0, 30)
    expect(toDateKey(tengahMalamLokal)).toBe('2026-08-13')

    const malamLokal = new Date(2026, 7, 13, 23, 45)
    expect(toDateKey(malamLokal)).toBe('2026-08-13')
  })

  it('memberi angka dua digit pada bulan dan tanggal', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('mengembalikan null untuk tanggal tidak valid', () => {
    expect(toDateKey('bukan tanggal')).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  const now = new Date(2026, 7, 13, 12, 0, 0).getTime()

  it('menyebut jeda di bawah satu menit sebagai baru saja', () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe('baru saja')
  })

  it('menghitung menit, jam, dan hari', () => {
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5 menit lalu')
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3 jam lalu')
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe('2 hari lalu')
  })

  it('tahan terhadap nilai yang tidak ada', () => {
    expect(formatRelativeTime(null, now)).toBe('baru saja')
  })
})
