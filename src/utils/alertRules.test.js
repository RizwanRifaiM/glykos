import { describe, expect, it } from 'vitest'
import { ALERT_COOLDOWN_MS, decideAlert, evaluateMetrics } from './alertRules'

const reading = (overrides = {}) => ({
  pressure: { peak: 100, location: 'metatarsal', points: {} },
  temperatureObj: { highest: 31, delta: 0.5, location: 'metatarsal', points: {} },
  humidity: 50,
  ...overrides,
})

describe('evaluateMetrics', () => {
  it('menganggap dashboard kosong sebagai aman, bukan peringatan', () => {
    // Tanpa perangkat semua nilai 0. Suhu kaki 0 °C dan 0% RH mustahil, jadi
    // itu berarti "belum ada data" — kalau dinilai apa adanya, membuka
    // dashboard tanpa perangkat akan mencatat peringatan palsu ke Firestore.
    const kosong = evaluateMetrics(
      reading({
        pressure: { peak: 0, location: 'metatarsal', points: {} },
        temperatureObj: { highest: 0, delta: 0, location: 'metatarsal', points: {} },
        humidity: 0,
      }),
    )
    expect(kosong.every((item) => item.status === 'safe')).toBe(true)
  })

  it('menandai selisih suhu antar area sebagai prediktor pre-ulkus', () => {
    const items = evaluateMetrics(
      reading({ temperatureObj: { highest: 32, delta: 2.4, location: 'heel', points: {} } }),
    )
    const suhu = items.find((item) => item.metric === 'temperature')
    expect(suhu.status).toBe('warning')
    // evaluateMetrics tidak lagi menghasilkan kalimat — hanya angka & status.
    // `deltaExceeded` inilah yang membedakan "suhu tertingginya yang memicu"
    // dari "SELISIHNYA yang memicu", dan yang dipakai alertMessages.js untuk
    // memilih kalimat pre-ulkus. Kalimatnya sendiri diuji di
    // alertMessages.test.js.
    expect(suhu.values.deltaExceeded).toBe(true)
    expect(suhu.values.delta).toBe(2.4)
  })

  it('menaikkan status tekanan di atas ambang risiko ulkus', () => {
    const items = evaluateMetrics(reading({ pressure: { peak: 260, location: 'heel', points: {} } }))
    expect(items.find((item) => item.metric === 'pressure').status).toBe('danger')
  })
})

describe('decideAlert', () => {
  const now = 1_000_000

  it('mencatat transisi pertama ke warning', () => {
    const hasil = decideAlert(undefined, 'warning', now)
    expect(hasil.shouldLog).toBe(true)
    expect(hasil.entry.loggedAt).toBe(now)
  })

  it('tidak mencatat status yang bertahan', () => {
    const pertama = decideAlert(undefined, 'warning', now)
    expect(decideAlert(pertama.entry, 'warning', now + 60_000).shouldLog).toBe(false)
  })

  it('tidak pernah mencatat status aman', () => {
    expect(decideAlert({ status: 'danger' }, 'safe', now).shouldLog).toBe(false)
  })

  it('meredam nilai yang berosilasi di sekitar ambang', () => {
    // safe -> warning -> safe -> warning dalam hitungan detik: kejadian kedua
    // adalah metrik yang sama dengan status yang sama, jadi ditahan.
    const naik = decideAlert(undefined, 'warning', now)
    const turun = decideAlert(naik.entry, 'safe', now + 1_000)
    const naikLagi = decideAlert(turun.entry, 'warning', now + 2_000)
    expect(naikLagi.shouldLog).toBe(false)
  })

  it('mencatat lagi setelah cooldown lewat', () => {
    const naik = decideAlert(undefined, 'warning', now)
    const turun = decideAlert(naik.entry, 'safe', now + 1_000)
    const naikLagi = decideAlert(turun.entry, 'warning', now + ALERT_COOLDOWN_MS + 1)
    expect(naikLagi.shouldLog).toBe(true)
  })

  it('memuat ulang halaman saat status warning berjalan tidak mencatat ulang', () => {
    // Ini yang dulu bocor: state hanya di useRef, jadi tiap reload terlihat
    // seperti transisi baru dari safe.
    const tersimpan = decideAlert(undefined, 'warning', now).entry
    const setelahReload = decideAlert(tersimpan, 'warning', now + 5_000)
    expect(setelahReload.shouldLog).toBe(false)
  })

  it('hanya memberi notifikasi saat status naik ke danger', () => {
    const naik = decideAlert({ status: 'warning' }, 'danger', now)
    expect(naik.shouldNotify).toBe(true)
    const turun = decideAlert({ status: 'danger' }, 'warning', now)
    expect(turun.shouldNotify).toBe(false)
  })
})
