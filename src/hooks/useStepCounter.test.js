import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StepCounterSession } from './useStepCounter'

const readingAt = (z) => ({ accel: { x: 0, y: 0, z } })

// Satu langkah = magnitude naik melewati ambang atas lalu turun melewati
// ambang bawah. Jeda antar sampel dibuat 400 ms — sedikit di atas refractory
// period 350 ms, dan mendekati laju notifikasi BLE firmware (~300 ms).
function walk(session, steps, { gapMs = 400 } = {}) {
  for (let i = 0; i < steps; i++) {
    vi.advanceTimersByTime(gapMs)
    session.update(readingAt(1.3), true)
    vi.advanceTimersByTime(gapMs)
    session.update(readingAt(0.7), true)
  }
}

describe('StepCounterSession', () => {
  let session

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 13, 8, 0, 0))
    session = new StepCounterSession()
    // Sampel pertama hanya menetapkan baseline gravitasi.
    session.update(readingAt(1.0), true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menghitung satu langkah per siklus naik-turun', () => {
    walk(session, 5)
    expect(session.getSnapshot().steps).toBe(5)
  })

  it('tidak menghitung getaran kecil di sekitar ambang', () => {
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(400)
      session.update(readingAt(1.05), true)
      vi.advanceTimersByTime(400)
      session.update(readingAt(0.95), true)
    }
    expect(session.getSnapshot().steps).toBe(0)
  })

  it('menerapkan jeda minimum antar langkah', () => {
    // Dua siklus rapat (100 ms) — hanya satu yang boleh dihitung.
    walk(session, 2, { gapMs: 100 })
    expect(session.getSnapshot().steps).toBe(1)
  })

  it('menyetel ulang hitungan saat sesi baru dimulai', () => {
    walk(session, 3)
    expect(session.getSnapshot().steps).toBe(3)

    session.update(readingAt(1.0), false) // perangkat terputus
    session.update(readingAt(1.0), true) // tersambung lagi = sesi baru
    walk(session, 1)
    expect(session.getSnapshot().steps).toBe(1)
  })

  it('mengosongkan hasil saat tidak ada data akselerometer', () => {
    walk(session, 3)
    session.update({ accel: { x: null, y: null, z: null } }, true)
    expect(session.getSnapshot()).toEqual({ steps: 0, activeMinutes: 0, sessionActive: false })
  })

  it('tetap netral terhadap orientasi pemasangan perangkat', () => {
    // Baseline gravitasi adaptif: insole yang terpasang miring punya magnitude
    // istirahat berbeda, tapi jumlah langkahnya harus sama.
    const miring = new StepCounterSession()
    miring.update(readingAt(0.6), true)
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(400)
      miring.update(readingAt(0.9), true)
      vi.advanceTimersByTime(400)
      miring.update(readingAt(0.3), true)
    }
    expect(miring.getSnapshot().steps).toBe(4)
  })
})
