import { describe, expect, it } from 'vitest'
import { buildSensorContext } from './sensorContext'

const reading = (overrides = {}) => ({
  pressure: { peak: 236.7, location: 'metatarsal', points: {} },
  temperatureObj: { highest: 32.8, delta: 2.7, location: 'metatarsal', points: {} },
  humidity: 72.5,
  activity: { steps: 4218, activeMinutes: 96 },
  ...overrides,
})

const day = (date, overrides = {}) => ({
  date,
  label: date,
  pressure: 210,
  temperature: 31.5,
  temperatureDelta: 2.4,
  humidity: 62,
  steps: 3000,
  ...overrides,
})

describe('buildSensorContext', () => {
  it('mengembalikan string kosong tanpa data, bukan ringkasan karangan', () => {
    expect(buildSensorContext({ data: null })).toBe('')
  })

  it('menyertakan angka pembacaan beserta ambangnya', () => {
    const context = buildSensorContext({ data: reading(), isLive: true })
    expect(context).toContain('236.7 kPa')
    expect(context).toContain('Metatarsal')
    expect(context).toContain('32.8 °C')
    expect(context).toContain('2.7 °C')
    expect(context).toContain('72.5 % RH')
    expect(context).toContain('4218 langkah')
    // Ambang harus ikut, kalau tidak model hanya punya angka tanpa acuan.
    expect(context).toContain('200')
    expect(context).toContain('2.2')
  })

  it('melewati metrik yang sensornya belum mengirim', () => {
    // Nol berarti "belum ada pembacaan" — sama seperti guard di alertRules.js.
    // Mengirimkannya sebagai "0 °C" akan membuat model menjelaskan angka palsu.
    const context = buildSensorContext({
      data: reading({
        temperatureObj: { highest: 0, delta: 0, location: null, points: {} },
        humidity: 0,
      }),
    })
    expect(context).not.toContain('Suhu kulit')
    expect(context).not.toContain('Kelembapan dalam sepatu')
    expect(context).toContain('Tekanan puncak')
  })

  it('merangkum riwayat harian dan mengabaikan hari tanpa catatan', () => {
    const history = [
      day('2026-08-09'),
      day('2026-08-10', { temperature: 0, pressure: 0, humidity: 0, steps: 0 }),
      day('2026-08-11'),
    ]
    const context = buildSensorContext({ data: reading(), history })
    expect(context).toContain('2 hari tercatat')
    expect(context).toContain('2 dari 2 hari di atas ambang')
  })

  it('menyebut pola selisih suhu yang sedang berjalan', () => {
    const context = buildSensorContext({
      data: reading(),
      trend: { level: 'danger', streakDays: 3, maxDelta: 2.9, days: [] },
    })
    expect(context).toContain('3 hari')
    expect(context).toContain('Perlu Tindakan')
  })

  it('menandai mode demo supaya angka contoh tidak diakui sebagai kondisi nyata', () => {
    const context = buildSensorContext({ data: reading(), demoMode: true })
    expect(context).toContain('DATA CONTOH')
  })

  it('tidak pernah menyertakan identitas atau isi profil medis', () => {
    // Kunci Gemini ikut ter-bundle di klien, jadi batas ini yang menahan data
    // paling sensitif agar tidak ikut keluar. Lihat sensorContext.js.
    const context = buildSensorContext({
      data: {
        ...reading(),
        deviceId: 'glykos-device-01',
        device: { id: 'glykos-device-01', name: 'Insole Budi' },
      },
      history: [day('2026-08-11')],
    })
    expect(context).not.toContain('glykos-device-01')
    expect(context).not.toContain('Budi')
    expect(context.toLowerCase()).not.toContain('hba1c')
  })
})
