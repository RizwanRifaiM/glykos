import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WearTimeSession } from './useWearTime'

describe('WearTimeSession', () => {
  let session

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 21, 8, 0, 0))
    session = new WearTimeSession()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('nol sebelum sesi dimulai', () => {
    expect(session.getSnapshot()).toBe(0)
    session.tick()
    expect(session.getSnapshot()).toBe(0)
  })

  it('menumpuk sejak sesi dimulai', () => {
    session.start()
    vi.advanceTimersByTime(5 * 60 * 1000)
    session.tick()
    expect(session.getSnapshot()).toBeCloseTo(5, 5)
  })

  // INI yang membedakannya dari perhitungan lama di StepCounterSession: di sana
  // angkanya jatuh ke nol begitu tidak ada data akselerometer, padahal lama
  // perangkat terhubung tidak ada hubungannya dengan sensor gerak. Di sini
  // tidak ada satu pun masukan sensor yang bisa mengosongkannya.
  it('tidak peduli sensor apa pun — hanya jam berjalan', () => {
    session.start()
    vi.advanceTimersByTime(30 * 60 * 1000)
    session.tick()
    expect(session.getSnapshot()).toBeCloseTo(30, 5)
  })

  it('kembali ke nol saat sesi berakhir', () => {
    session.start()
    vi.advanceTimersByTime(10 * 60 * 1000)
    session.tick()
    expect(session.getSnapshot()).toBeGreaterThan(9)

    // Yang sudah berlalu tersimpan ke rangkuman harian oleh penulisan penutup
    // di useFirestoreSync.js; kartunya menampilkan total harian, bukan angka
    // sesi ini. Jadi mengosongkannya di sini aman.
    session.stop()
    expect(session.getSnapshot()).toBe(0)

    session.tick()
    expect(session.getSnapshot()).toBe(0)
  })

  it('menghitung ulang dari nol pada sesi berikutnya', () => {
    session.start()
    vi.advanceTimersByTime(20 * 60 * 1000)
    session.tick()
    session.stop()

    session.start()
    vi.advanceTimersByTime(3 * 60 * 1000)
    session.tick()
    expect(session.getSnapshot()).toBeCloseTo(3, 5)
  })

  it('tidak pernah negatif meski jam sistem mundur', () => {
    session.start()
    vi.setSystemTime(new Date(2026, 7, 21, 7, 55, 0)) // jam mundur 5 menit
    session.tick()
    expect(session.getSnapshot()).toBe(0)
  })

  it('memberi tahu pelanggan hanya saat nilainya berubah', () => {
    const listener = vi.fn()
    session.subscribe(listener)

    session.start()
    expect(listener).toHaveBeenCalledTimes(0) // start dari 0 ke 0: tidak berubah

    vi.advanceTimersByTime(60 * 1000)
    session.tick()
    expect(listener).toHaveBeenCalledTimes(1)

    session.tick() // waktu tidak bergerak
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
