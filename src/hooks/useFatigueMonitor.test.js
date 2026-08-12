import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FatigueSession } from './useFatigueMonitor'
import { SUSTAINED_GAP_GRACE_SEC } from '../constants/fatigue'

const MENIT = 60_000

// Distribusi awal: beban tersebar merata. `metatarsalPct` inilah yang dipantau
// pergeserannya sebagai indikator kelelahan.
const reading = ({ heel = 100, metatarsal = 100, toe = 100, peak = 220, temp = 31 } = {}) => ({
  pressure: { peak, points: { heel, metatarsal, toe } },
  temperatureObj: { highest: temp },
})

// Perangkat mengirim paket tiap ~300 ms; streak beban dinilai dari jarak antar
// SAMPEL, bukan dari satu pembacaan di awal dan satu di akhir. Helper ini
// meniru aliran itu dengan laju yang lebih jarang tapi masih jauh di bawah
// masa tenggang SUSTAINED_GAP_GRACE_SEC.
function sustain(session, minutes, reading_, { stepMs = 30_000 } = {}) {
  const ticks = Math.round((minutes * MENIT) / stepMs)
  for (let i = 0; i < ticks; i++) {
    vi.advanceTimersByTime(stepMs)
    session.update(reading_, true, 0)
  }
}

describe('FatigueSession', () => {
  let session

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 13, 8, 0, 0))
    session = new FatigueSession()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dimulai dari status aman', () => {
    session.update(reading(), true, 0)
    expect(session.getSnapshot().level).toBe('safe')
  })

  it('mencatat beban berkelanjutan tanpa langsung menaikkan status', () => {
    // Skornya berbobot: satu faktor pada tingkat peringatan bernilai 1 poin,
    // sedangkan `warning` butuh 2. Jadi 20 menit beban tinggi SAJA belum cukup
    // — ini disengaja supaya satu indikator tunggal tidak memicu alarm.
    session.update(reading(), true, 0)
    sustain(session, 20, reading())

    const snapshot = session.getSnapshot()
    expect(snapshot.sustainedMinutes).toBeGreaterThanOrEqual(20)
    expect(snapshot.level).toBe('safe')
    expect(snapshot.reasons.join(' ')).toContain('berkelanjutan')
  })

  it('menaikkan status setelah beban tinggi sangat panjang', () => {
    // Lewat SUSTAINED_DANGER_MIN faktor ini sendirian bernilai 2 poin.
    session.update(reading(), true, 0)
    sustain(session, 35, reading())
    expect(session.getSnapshot().level).toBe('warning')
  })

  it('menggabungkan durasi dan langkah menjadi status tinggi', () => {
    session.update(reading(), true, 0)
    sustain(session, 35, reading())
    session.update(reading(), true, 1600)
    expect(session.getSnapshot().level).toBe('danger')
  })

  it('mengabaikan jeda singkat tanpa mereset streak beban', () => {
    session.update(reading(), true, 0)
    sustain(session, 20, reading())

    // Beban turun sebentar — masih di dalam masa tenggang — lalu naik lagi.
    vi.advanceTimersByTime((SUSTAINED_GAP_GRACE_SEC - 30) * 1000)
    session.update(reading({ peak: 100 }), true, 0)
    session.update(reading(), true, 0)

    expect(session.getSnapshot().sustainedMinutes).toBeGreaterThan(20)
  })

  it('mereset streak setelah jeda panjang', () => {
    session.update(reading(), true, 0)
    sustain(session, 20, reading())

    vi.advanceTimersByTime((SUSTAINED_GAP_GRACE_SEC + 30) * 1000)
    session.update(reading({ peak: 100 }), true, 0)

    expect(session.getSnapshot().sustainedMinutes).toBe(0)
  })

  it('mendeteksi pergeseran distribusi ke metatarsal', () => {
    session.update(reading(), true, 0)
    // Beban pindah ke metatarsal: 33% -> 60%.
    session.update(reading({ heel: 60, metatarsal: 180, toe: 60 }), true, 0)
    const snapshot = session.getSnapshot()
    expect(snapshot.distributionShiftPct).toBeGreaterThan(15)
    expect(snapshot.reasons.join(' ')).toContain('metatarsal')
  })

  it('kosong saat perangkat tidak live', () => {
    session.update(reading(), true, 0)
    session.update(reading(), false, 0)
    expect(session.getSnapshot().sessionActive).toBe(false)
    expect(session.getSnapshot().level).toBe('safe')
  })

  it('memulai baseline baru pada sesi berikutnya', () => {
    session.update(reading(), true, 0)
    vi.advanceTimersByTime(40 * MENIT)
    session.update(reading(), true, 2000)
    expect(session.getSnapshot().level).toBe('danger')

    session.update(reading(), false, 0) // terputus
    session.update(reading(), true, 0) // sesi baru
    expect(session.getSnapshot().level).toBe('safe')
  })
})
