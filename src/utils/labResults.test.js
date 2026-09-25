import { describe, expect, it } from 'vitest'
import {
  newLabEntries,
  profileFormFromDoc,
  profilePayload,
  summariseLabHistory,
} from './labResults'

const EMPTY = { hba1c: '', hba1cDate: '', ldl: '', ldlDate: '', neuropathy: '' }
const NOW = new Date(2026, 8, 24).getTime()
const ts = (ms) => ({ toMillis: () => ms })

describe('profileFormFromDoc & profilePayload', () => {
  it('angka tersimpan sebagai angka, kosong sebagai null', () => {
    const payload = profilePayload({ ...EMPTY, hba1c: '8.4', ldl: '' })
    expect(payload.hba1c).toBe(8.4)
    expect(payload.ldl).toBeNull()
  })

  it('profil lama bernilai string (termasuk koma) ikut jadi angka', () => {
    expect(profilePayload({ ...EMPTY, hba1c: '7,2' }).hba1c).toBe(7.2)
  })

  it('null dari Firestore jadi isian kosong, angka jadi teks', () => {
    const form = profileFormFromDoc({ hba1c: 8.4, ldl: null }, EMPTY)
    expect(form.hba1c).toBe('8.4')
    expect(form.ldl).toBe('')
    expect(form.neuropathy).toBe('')
  })
})

describe('newLabEntries', () => {
  const payload = { hba1c: 8.4, hba1cDate: '2026-06-10', ldl: 130, ldlDate: '2026-06-10' }

  it('mencatat hasil lab baru beserta satuannya', () => {
    expect(newLabEntries({}, payload, NOW)).toEqual([
      { type: 'hba1c', value: 8.4, unit: '%', testedAt: '2026-06-10' },
      { type: 'ldl', value: 130, unit: 'mg/dL', testedAt: '2026-06-10' },
    ])
  })

  it('menyimpan ulang tanpa mengubah hasil lab tidak menambah catatan', () => {
    // Profil lama menyimpan string — tetap dianggap sama.
    const saved = { hba1c: '8.4', hba1cDate: '2026-06-10', ldl: 130, ldlDate: '2026-06-10' }
    expect(newLabEntries(saved, payload, NOW)).toEqual([])
  })

  it('koreksi angka pada tanggal yang sama menambah catatan baru', () => {
    const saved = { ...payload, hba1c: 84 }
    expect(newLabEntries(saved, payload, NOW).map((e) => e.type)).toEqual(['hba1c'])
  })

  it('tidak mencatat nilai di luar rentang, tanpa tanggal, atau bertanggal masa depan', () => {
    expect(newLabEntries({}, { hba1c: 72, hba1cDate: '2026-06-10' }, NOW)).toEqual([])
    expect(newLabEntries({}, { hba1c: 8.4, hba1cDate: '' }, NOW)).toEqual([])
    expect(newLabEntries({}, { hba1c: 8.4, hba1cDate: '2027-01-01' }, NOW)).toEqual([])
  })
})

describe('summariseLabHistory', () => {
  it('mengurutkan terbaru dulu dan menghitung perubahan dari pemeriksaan sebelumnya', () => {
    const result = summariseLabHistory([
      { id: 'a', type: 'hba1c', value: 9.1, testedAt: '2026-01-15', createdAt: ts(1) },
      { id: 'b', type: 'hba1c', value: 8.4, testedAt: '2026-06-10', createdAt: ts(2) },
      { id: 'c', type: 'ldl', value: 130, testedAt: '2026-06-10', createdAt: ts(3) },
    ])
    expect(result.hba1c.map((row) => [row.testedAt, row.value, row.change])).toEqual([
      ['2026-06-10', 8.4, -0.7],
      ['2026-01-15', 9.1, null],
    ])
    expect(result.ldl).toHaveLength(1)
    expect(result.ldl[0].unit).toBe('mg/dL')
  })

  it('koreksi pada tanggal yang sama: yang terbaru ditampilkan dan ditandai', () => {
    const result = summariseLabHistory([
      { id: 'salah', type: 'hba1c', value: 84, testedAt: '2026-06-10', createdAt: ts(1) },
      { id: 'benar', type: 'hba1c', value: 8.4, testedAt: '2026-06-10', createdAt: ts(2) },
    ])
    expect(result.hba1c).toHaveLength(1)
    expect(result.hba1c[0]).toMatchObject({ id: 'benar', value: 8.4, corrected: true })
  })

  it('tulisan yang belum dikonfirmasi server dianggap paling baru', () => {
    const result = summariseLabHistory([
      { id: 'lama', type: 'ldl', value: 150, testedAt: '2026-06-10', createdAt: ts(1) },
      { id: 'baru', type: 'ldl', value: 115, testedAt: '2026-06-10', createdAt: null },
    ])
    expect(result.ldl[0].id).toBe('baru')
  })

  it('riwayat kosong menghasilkan daftar kosong untuk tiap jenis', () => {
    expect(summariseLabHistory([])).toEqual({ hba1c: [], ldl: [] })
  })
})
