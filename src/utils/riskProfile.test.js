import { describe, expect, it } from 'vitest'
import {
  assessRiskProfile,
  HBA1C_VALID_DAYS,
  LDL_VALID_DAYS,
  parseLabDate,
  readLab,
  riskSnapshot,
  HBA1C_RANGE,
} from './riskProfile'

// "Hari ini" yang tetap, supaya umur hasil lab tidak bergantung pada kapan
// pengujian dijalankan.
const NOW = new Date(2026, 8, 24).getTime() // 24 Sep 2026
const recent = '2026-08-01'
const tier = (profile) => assessRiskProfile(profile, NOW).tier

describe('parseLabDate', () => {
  it('membaca tanggal sebagai tengah malam LOKAL', () => {
    const date = parseLabDate('2026-06-10')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 5, 10, 0,
    ])
  })

  it('menolak tanggal yang tidak ada alih-alih menggulungnya', () => {
    expect(parseLabDate('2026-02-31')).toBeNull()
    expect(parseLabDate('10/06/2026')).toBeNull()
    expect(parseLabDate('')).toBeNull()
  })
})

describe('readLab', () => {
  const read = (value, date) => readLab(value, date, HBA1C_RANGE, HBA1C_VALID_DAYS, NOW)

  it('membedakan kosong, salah ketik, tanpa tanggal, kedaluwarsa, dan berlaku', () => {
    expect(read('', recent).status).toBe('missing')
    expect(read('72', recent).status).toBe('invalid') // salah ketik dari 7,2
    expect(read('7.2', '').status).toBe('noDate')
    expect(read('7.2', '2027-01-01').status).toBe('noDate') // tanggal di masa depan
    expect(read('7.2', '2025-12-01').status).toBe('stale')
    expect(read('7.2', recent)).toMatchObject({ status: 'valid', value: 7.2 })
  })

  it('menerima koma desimal dari profil yang tersimpan sebelum ada validasi', () => {
    expect(read('8,4', recent)).toMatchObject({ status: 'valid', value: 8.4 })
  })
})

describe('assessRiskProfile — tingkat', () => {
  it('profil kosong adalah Standar, dengan pengingat untuk kedua hasil lab', () => {
    const result = assessRiskProfile({}, NOW)
    expect(result.tier).toBe('standard')
    expect(result.factors).toEqual([])
    expect(result.reminders.map((r) => [r.code, r.status])).toEqual([
      ['hba1c', 'missing'],
      ['ldl', 'missing'],
    ])
  })

  it('HbA1c terkontrol dan LDL dalam target tetap Standar', () => {
    expect(tier({ hba1c: '6.8', hba1cDate: recent, ldl: '90', ldlDate: recent })).toBe('standard')
  })

  it('satu faktor pemberat menaikkan ke Meningkat', () => {
    expect(tier({ hba1c: '8.0', hba1cDate: recent })).toBe('elevated')
    expect(tier({ ldl: '100', ldlDate: recent })).toBe('elevated')
    expect(tier({ neuropathy: 'yes' })).toBe('elevated')
  })

  it('dua faktor pemberat menaikkan ke Tinggi', () => {
    expect(tier({ hba1c: '8.4', hba1cDate: recent, ldl: '130', ldlDate: recent })).toBe('high')
    expect(tier({ hba1c: '8.4', hba1cDate: recent, neuropathy: 'yes' })).toBe('high')
  })

  it('HbA1c ≥ 10 % langsung Tinggi', () => {
    expect(tier({ hba1c: '10.2', hba1cDate: recent })).toBe('high')
  })

  it('riwayat ulkus langsung Tinggi — faktor terkuat, tidak butuh data lab', () => {
    expect(tier({ ulcerHistory: 'yes' })).toBe('high')
  })

  it('"tidak" dan "tidak tahu" tidak menaikkan tingkat', () => {
    expect(tier({ ulcerHistory: 'no', neuropathy: 'unknown' })).toBe('standard')
  })
})

describe('assessRiskProfile — arah gagal selalu ke Standar', () => {
  it('HbA1c tinggi yang KEDALUWARSA tidak dipakai', () => {
    const result = assessRiskProfile({ hba1c: '11', hba1cDate: '2025-06-01' }, NOW)
    expect(result.tier).toBe('standard')
    expect(result.reminders[0]).toMatchObject({ code: 'hba1c', status: 'stale' })
  })

  it('LDL berlaku setahun, bukan enam bulan', () => {
    const tenMonthsAgo = '2025-11-24'
    const result = assessRiskProfile({ ldl: '140', ldlDate: tenMonthsAgo }, NOW)
    expect(result.tier).toBe('elevated')
    expect(LDL_VALID_DAYS).toBeGreaterThan(HBA1C_VALID_DAYS)
  })

  it('nilai tanpa tanggal tidak dipakai, dan pengguna diminta melengkapinya', () => {
    const result = assessRiskProfile({ hba1c: '9.5' }, NOW)
    expect(result.tier).toBe('standard')
    expect(result.reminders[0]).toMatchObject({ code: 'hba1c', status: 'noDate' })
  })

  it('salah ketik tidak pernah menaikkan maupun menurunkan tingkat', () => {
    expect(tier({ hba1c: '72', hba1cDate: recent })).toBe('standard')
    expect(tier({ hba1c: '72', hba1cDate: recent, ulcerHistory: 'yes' })).toBe('high')
  })

  it('data lab yang kedaluwarsa tidak menghapus riwayat ulkus', () => {
    expect(tier({ hba1c: '6', hba1cDate: '2024-01-01', ulcerHistory: 'yes' })).toBe('high')
  })
})

describe('riskSnapshot', () => {
  it('menyimpan tingkat & faktor beserta angkanya, tanpa pengingat', () => {
    const result = assessRiskProfile({ hba1c: '8.4', hba1cDate: recent }, NOW)
    expect(riskSnapshot(result)).toEqual({
      tier: 'elevated',
      factors: [{ code: 'hba1c', value: 8.4, date: recent }],
    })
  })

  it('tanpa penilaian jatuh ke Standar', () => {
    expect(riskSnapshot(null)).toEqual({ tier: 'standard', factors: [] })
  })
})
