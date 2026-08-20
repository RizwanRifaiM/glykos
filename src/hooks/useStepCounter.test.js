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

describe('waktu aktif', () => {
  let session

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 13, 8, 0, 0))
    session = new StepCounterSession()
    session.update(readingAt(1.0), true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Perilaku LAMA yang sengaja dihapus: activeMinutes adalah (sekarang − mulai
  // sesi), yaitu lama perangkat TERSAMBUNG. Delapan jam duduk di meja dengan
  // sepatu terpasang menghasilkan "Waktu Aktif 480 menit" pada kartu yang
  // seluruh gunanya menggambarkan beban yang diterima kaki.
  it('tidak menumpuk waktu selama tidak ada langkah', () => {
    // Perangkat tersambung dan mengirim terus, tapi kakinya diam.
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(1000)
      session.update(readingAt(1.0), true)
    }
    expect(session.getSnapshot().activeMinutes).toBe(0)
  })

  it('menumpuk waktu selama langkah masih terdeteksi', () => {
    walk(session, 30) // 30 langkah x 800 ms = 24 detik berjalan
    const activeMinutes = session.getSnapshot().activeMinutes
    expect(activeMinutes).toBeGreaterThan(0.2)
    expect(activeMinutes).toBeLessThan(0.6)
  })

  it('berhenti menumpuk setelah berhenti berjalan', () => {
    walk(session, 10)
    const setelahJalan = session.getSnapshot().activeMinutes

    // Diam lima menit, perangkat tetap mengirim.
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(5000)
      session.update(readingAt(1.0), true)
    }

    // Hanya sisa ambang ACTIVE_GAP_MS setelah langkah terakhir yang ikut,
    // bukan lima menit diamnya.
    const setelahDiam = session.getSnapshot().activeMinutes
    expect(setelahDiam - setelahJalan).toBeLessThan(0.3)
  })

  // Halaman yang dibekukan (layar mati, pindah aplikasi) menghasilkan satu
  // selisih raksasa saat hidup lagi. Tanpa jepitan, satu sampel bisa menambah
  // berjam-jam aktivitas yang tidak pernah terjadi.
  it('menjepit lompatan waktu setelah halaman dibekukan', () => {
    walk(session, 5)
    const sebelum = session.getSnapshot().activeMinutes

    vi.advanceTimersByTime(3 * 60 * 60 * 1000) // tiga jam membeku
    session.update(readingAt(1.3), true)

    const sesudah = session.getSnapshot().activeMinutes
    expect(sesudah - sebelum).toBeLessThan(0.3)
  })
})

