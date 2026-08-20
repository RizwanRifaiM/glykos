import { describe, expect, it } from 'vitest'
import {
  averageHumidity,
  emptyRollup,
  mergeDailyRollup,
  totalWearMinutes,
  totalSteps,
} from './dailyRollup'

const sample = (overrides = {}) => ({
  tanggal: '2026-08-13',
  pressurePeak: 100,
  temperature: 31,
  temperatureDelta: 1,
  humidity: 50,
  steps: 0,
  sessionId: 'sesi-a',
  ...overrides,
})

describe('mergeDailyRollup', () => {
  it('menyimpan nilai puncak, bukan nilai terakhir', () => {
    let rollup = mergeDailyRollup(emptyRollup('2026-08-13'), sample({ pressurePeak: 240 }))
    rollup = mergeDailyRollup(rollup, sample({ pressurePeak: 90 }))
    expect(rollup.pressureMax).toBe(240)
  })

  it('merata-ratakan kelembapan dan mengabaikan pembacaan nol', () => {
    // 0% RH di dalam sepatu mustahil — itu berarti sensor tidak mengirim, dan
    // tidak boleh menarik rata-rata ke bawah.
    let rollup = mergeDailyRollup(emptyRollup('2026-08-13'), sample({ humidity: 60 }))
    rollup = mergeDailyRollup(rollup, sample({ humidity: 0 }))
    rollup = mergeDailyRollup(rollup, sample({ humidity: 40 }))
    expect(rollup.humidityCount).toBe(2)
    expect(averageHumidity(rollup)).toBe(50)
  })

  it('tidak menghitung ganda langkah kumulatif dari satu sesi', () => {
    // Tiap sampel membawa total sejak sesi dimulai, jadi 100 -> 250 -> 400
    // adalah 400 langkah, bukan 750.
    let rollup = emptyRollup('2026-08-13')
    for (const steps of [100, 250, 400]) {
      rollup = mergeDailyRollup(rollup, sample({ steps }))
    }
    expect(totalSteps(rollup)).toBe(400)
  })

  it('menjumlahkan langkah antar sesi pada hari yang sama', () => {
    let rollup = mergeDailyRollup(emptyRollup('2026-08-13'), sample({ steps: 400 }))
    rollup = mergeDailyRollup(rollup, sample({ steps: 150, sessionId: 'sesi-b' }))
    rollup = mergeDailyRollup(rollup, sample({ steps: 320, sessionId: 'sesi-b' }))
    expect(totalSteps(rollup)).toBe(720)
  })

  it('memulai rangkuman baru saat tanggal berganti', () => {
    const kemarin = mergeDailyRollup(emptyRollup('2026-08-12'), sample({ tanggal: '2026-08-12', pressurePeak: 280 }))
    const hariIni = mergeDailyRollup(kemarin, sample({ pressurePeak: 120 }))
    expect(hariIni.tanggal).toBe('2026-08-13')
    expect(hariIni.pressureMax).toBe(120)
  })

  it('tahan terhadap rangkuman kosong atau tidak ada', () => {
    const rollup = mergeDailyRollup(undefined, sample({ pressurePeak: 130 }))
    expect(rollup.pressureMax).toBe(130)
    expect(averageHumidity(emptyRollup('2026-08-13'))).toBe(0)
  })
})

describe('lama pemakaian per sesi', () => {
  // Pola yang sama dengan langkah, dan karena alasan yang sama: tiap sampel
  // membawa durasi KUMULATIF sejak sesinya dimulai. Menjumlahkan tiap sampel
  // akan melipatgandakannya.
  it('mengambil nilai terbesar tiap sesi, lalu menjumlahkan antar sesi', () => {
    let rollup = emptyRollup('2026-08-21')
    const sample = (sessionId, wearMinutes) => ({
      tanggal: '2026-08-21',
      wearMinutes,
      sessionId,
    })

    rollup = mergeDailyRollup(rollup, sample('pagi', 12))
    rollup = mergeDailyRollup(rollup, sample('pagi', 34))
    rollup = mergeDailyRollup(rollup, sample('sore', 21))

    expect(totalWearMinutes(rollup)).toBe(55)
  })

  it('mengabaikan nol — belum terukur, bukan nol menit', () => {
    let rollup = emptyRollup('2026-08-21')
    rollup = mergeDailyRollup(rollup, { tanggal: '2026-08-21', wearMinutes: 0, sessionId: 'a' })
    expect(totalWearMinutes(rollup)).toBe(0)
    expect(rollup.wearMinutesBySession).toEqual({})
  })
})

describe('kenaikan suhu terpusat', () => {
  const sample = (over) => ({ tanggal: '2026-08-21', sessionId: 'a', ...over })

  // Yang menentukan warna hari itu adalah kenaikan terbesar yang TIDAK merata.
  // Kenaikan merata sering justru lebih besar angkanya — ruangan panas bisa
  // menaikkan ketiga titik 3 °C sekaligus — tapi bukan itu yang perlu
  // diperhatikan.
  it('mengabaikan kenaikan merata saat menentukan kenaikan terpusat', () => {
    let rollup = emptyRollup('2026-08-21')
    rollup = mergeDailyRollup(
      rollup,
      sample({ temperatureRise: 3.1, temperatureSystemic: true, temperatureRisenAreas: 3, temperatureAreaCount: 3 }),
    )

    expect(rollup.temperatureRiseMax).toBe(3.1)
    expect(rollup.temperatureRiseFocal).toBe(0)
    expect(rollup.temperatureRisenAreas).toBe(0)
  })

  it('mencatat kenaikan terpusat beserta polanya', () => {
    let rollup = emptyRollup('2026-08-21')
    rollup = mergeDailyRollup(
      rollup,
      sample({ temperatureRise: 2.4, temperatureSystemic: false, temperatureRisenAreas: 1, temperatureAreaCount: 3 }),
    )

    expect(rollup.temperatureRiseFocal).toBe(2.4)
    expect(rollup.temperatureRisenAreas).toBe(1)
    expect(rollup.temperatureAreaCount).toBe(3)
  })

  // Ketiga angka harus bergerak BERSAMA. Kalau masing-masing diambil
  // maksimumnya sendiri-sendiri, baris riwayat bisa memasangkan kenaikan dari
  // satu pembacaan dengan jumlah titik dari pembacaan lain — kombinasi yang
  // tidak pernah benar-benar terjadi.
  it('memasangkan besar kenaikan dengan pola pada saat yang sama', () => {
    let rollup = emptyRollup('2026-08-21')
    rollup = mergeDailyRollup(
      rollup,
      sample({ temperatureRise: 2.8, temperatureRisenAreas: 2, temperatureAreaCount: 3 }),
    )
    // Kenaikan lebih KECIL tapi lebih terpusat: tidak boleh menggeser pasangan
    // yang tercatat, karena kenaikan terbesarnya masih yang sebelumnya.
    rollup = mergeDailyRollup(
      rollup,
      sample({ temperatureRise: 1.5, temperatureRisenAreas: 1, temperatureAreaCount: 3 }),
    )

    expect(rollup.temperatureRiseFocal).toBe(2.8)
    expect(rollup.temperatureRisenAreas).toBe(2)
  })

  it('memperbarui pasangannya saat ada kenaikan terpusat yang lebih besar', () => {
    let rollup = emptyRollup('2026-08-21')
    rollup = mergeDailyRollup(
      rollup,
      sample({ temperatureRise: 1.5, temperatureRisenAreas: 2, temperatureAreaCount: 3 }),
    )
    rollup = mergeDailyRollup(
      rollup,
      sample({ temperatureRise: 2.9, temperatureRisenAreas: 1, temperatureAreaCount: 3 }),
    )

    expect(rollup.temperatureRiseFocal).toBe(2.9)
    expect(rollup.temperatureRisenAreas).toBe(1)
  })
})
