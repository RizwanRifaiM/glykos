import { describe, expect, it } from 'vitest'
import { parseCsvLine } from './ble'

// Parser ini adalah satu-satunya penjaga antara firmware dan seluruh dashboard:
// apa pun yang lolos dari sini dipakai apa adanya sebagai pembacaan sensor.
describe('parseCsvLine', () => {
  it('menguraikan paket lengkap sesuai kontrak firmware', () => {
    const parsed = parseCsvLine(
      'F1:1234,F2:1180,F3:1502,P1:120.0,P2:80.0,P3:150.0,T1:29.4,T2:30.1,T3:28.9,RH:55.2,TA:28.0,AX:0.01,AY:0.02,AZ:0.98',
    )
    expect(parsed.P1).toBe(120)
    expect(parsed.T3).toBe(28.9)
    expect(parsed.AZ).toBe(0.98)
  })

  it('menerima paket dengan key yang tidak lengkap', () => {
    // Firmware hanya mengirim key sensor yang terdeteksi — RH/TA/AX/AY/AZ dan
    // T3 bisa tidak ada sama sekali.
    const parsed = parseCsvLine('P1:120.0,T1:29.4,T2:30.1')
    expect(parsed).toEqual({ P1: 120, T1: 29.4, T2: 30.1 })
  })

  it('menolak "nan" dari NTC yang lepas atau short', () => {
    // String(NAN,1) di Arduino menghasilkan literal "nan". Kalau lolos, angka
    // NaN akan sampai ke perhitungan delta suhu dan ke koordinat SVG.
    const parsed = parseCsvLine('T1:29.4,T2:nan,T3:28.9')
    expect(parsed).toEqual({ T1: 29.4, T3: 28.9 })
    expect('T2' in parsed).toBe(false)
  })

  it('mengabaikan pasangan rusak tanpa membuang sisanya', () => {
    const parsed = parseCsvLine('P1:120.0,RUSAK,P2:,:80,P3:150.0')
    expect(parsed).toEqual({ P1: 120, P3: 150 })
  })

  it('mengembalikan objek kosong untuk masukan kosong', () => {
    expect(parseCsvLine('')).toEqual({})
    expect(parseCsvLine(null)).toEqual({})
  })

  it('menerima nilai negatif dari akselerometer', () => {
    // AX/AY/AZ memang bisa negatif tergantung orientasi pemasangan.
    expect(parseCsvLine('AX:-0.42').AX).toBe(-0.42)
  })
})
