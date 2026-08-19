import { describe, expect, it } from 'vitest'
import {
  bob,
  clamp01,
  damp,
  easeOutBack,
  explodeAmount,
  facingOpacity,
  lerp,
  staggerProgress,
  viewportProgress,
} from './sceneMath'

const rect = (top, height) => ({ top, height })

describe('clamp01', () => {
  it('menahan nilai di luar rentang', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(0.42)).toBe(0.42)
    expect(clamp01(9)).toBe(1)
  })

  it('mengembalikan 0 untuk nilai yang bukan angka', () => {
    expect(clamp01(NaN)).toBe(0)
    expect(clamp01(undefined)).toBe(0)
  })
})

describe('lerp', () => {
  it('menginterpolasi kedua ujungnya', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(2, 4, 0.5)).toBe(3)
  })
})

describe('damp', () => {
  it('mendekati target tanpa pernah melewatinya', () => {
    const next = damp(0, 10, 0.001, 1 / 60)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(10)
  })

  // Alasan utama fungsi ini ada: dua frame di 120 Hz harus menempuh jarak yang
  // sama dengan satu frame di 60 Hz. Dengan lerp berfaktor tetap, layar cepat
  // mengejar target dua kali lebih cepat.
  it('menempuh jarak yang sama untuk durasi yang sama di frame rate berbeda', () => {
    const slow = damp(0, 10, 0.001, 1 / 60)
    let fast = damp(0, 10, 0.001, 1 / 120)
    fast = damp(fast, 10, 0.001, 1 / 120)
    expect(fast).toBeCloseTo(slow, 10)
  })

  it('tidak bergerak saat delta tidak masuk akal', () => {
    expect(damp(3, 10, 0.001, 0)).toBe(3)
    expect(damp(3, 10, 0.001, NaN)).toBe(3)
  })
})

describe('viewportProgress', () => {
  it('0 tepat sebelum elemen masuk dari bawah', () => {
    expect(viewportProgress(rect(800, 400), 800)).toBe(0)
  })

  it('1 tepat setelah elemen keluar lewat atas', () => {
    expect(viewportProgress(rect(-400, 400), 800)).toBe(1)
  })

  it('0,5 saat pusat elemen di tengah layar', () => {
    expect(viewportProgress(rect(200, 400), 800)).toBeCloseTo(0.5, 10)
  })

  // Elemen yang lebih tinggi dari viewport tetap harus memakai seluruh
  // rentang; inilah alasan perhitungannya berbasis pusat, bukan tepi.
  it('mencapai kedua ujung untuk elemen lebih tinggi dari viewport', () => {
    expect(viewportProgress(rect(800, 2000), 800)).toBe(0)
    expect(viewportProgress(rect(-2000, 2000), 800)).toBe(1)
  })

  it('aman saat rect atau tinggi viewport tidak tersedia', () => {
    expect(viewportProgress(null, 800)).toBe(0)
    expect(viewportProgress(rect(0, 100), 0)).toBe(0)
  })
})

describe('facingOpacity', () => {
  it('menyembunyikan titik yang membelakangi kamera', () => {
    expect(facingOpacity(-1)).toBe(0)
    expect(facingOpacity(0)).toBe(0)
  })

  it('menampilkan penuh titik yang jelas menghadap kamera', () => {
    expect(facingOpacity(1)).toBe(1)
    expect(facingOpacity(0.4)).toBe(1)
  })

  it('memudar bertahap di antara kedua ambang', () => {
    const mid = facingOpacity(0.24)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(facingOpacity(0.3)).toBeGreaterThan(mid)
  })

  it('mengembalikan 0 untuk nilai yang bukan angka', () => {
    expect(facingOpacity(NaN)).toBe(0)
  })
})

describe('explodeAmount', () => {
  it('diam sebelum rentang efektif dimulai', () => {
    expect(explodeAmount(0)).toBe(0)
    expect(explodeAmount(0.2)).toBe(0)
  })

  it('terurai penuh setelah rentang efektif selesai', () => {
    expect(explodeAmount(0.68)).toBe(1)
    expect(explodeAmount(1)).toBe(1)
  })

  it('naik secara monoton di dalam rentangnya', () => {
    const samples = [0.25, 0.35, 0.45, 0.55, 0.65].map((p) => explodeAmount(p))
    samples.forEach((value, index) => {
      if (index === 0) return
      expect(value).toBeGreaterThan(samples[index - 1])
    })
  })

  // Easing-nya melambat di kedua ujung, jadi tepat di tengah nilainya 0,5.
  it('berada di tengah saat progres di tengah rentang', () => {
    expect(explodeAmount(0.44)).toBeCloseTo(0.5, 6)
  })
})

describe('easeOutBack', () => {
  it('mulai di 0 dan berakhir di 1', () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 10)
    expect(easeOutBack(1)).toBeCloseTo(1, 10)
  })

  // Inti fungsi ini: nilainya harus MELEWATI 1 di tengah jalan. Tanpa lewatan
  // itu ia cuma easeOut biasa dan titik sensornya kembali terasa "di-set".
  it('menembus 1 sebelum kembali', () => {
    const samples = [0.6, 0.7, 0.8, 0.9].map((t) => easeOutBack(t))
    expect(Math.max(...samples)).toBeGreaterThan(1)
  })

  it('menahan masukan di luar rentang 0..1', () => {
    expect(easeOutBack(-5)).toBeCloseTo(0, 10)
    expect(easeOutBack(9)).toBeCloseTo(1, 10)
  })
})

describe('staggerProgress', () => {
  const opts = { offset: 1, delay: 0.2, duration: 0.5 }

  it('menahan elemen di 0 sebelum gilirannya tiba', () => {
    expect(staggerProgress(0.5, 0, opts)).toBe(0)
    expect(staggerProgress(1.1, 2, opts)).toBe(0)
  })

  it('memberi urutan: elemen awal selalu lebih maju', () => {
    const at = 1.5
    expect(staggerProgress(at, 0, opts)).toBeGreaterThan(staggerProgress(at, 1, opts))
    expect(staggerProgress(at, 1, opts)).toBeGreaterThan(staggerProgress(at, 2, opts))
  })

  it('semua elemen mencapai 1 pada akhirnya', () => {
    ;[0, 1, 2].forEach((index) => {
      expect(staggerProgress(99, index, opts)).toBe(1)
    })
  })

  it('langsung selesai kalau durasinya nol', () => {
    expect(staggerProgress(0, 5, { ...opts, duration: 0 })).toBe(1)
  })
})

describe('bob', () => {
  it('tidak pernah melampaui amplitudonya', () => {
    for (let t = 0; t < 40; t += 0.13) {
      expect(Math.abs(bob(t, 2))).toBeLessThanOrEqual(2.0000001)
    }
  })

  it('menghasilkan nilai berbeda pada waktu berbeda', () => {
    expect(bob(0, 1)).not.toBeCloseTo(bob(1.4, 1), 3)
  })

  // Fase dipakai untuk membuat lapisan-lapisan mengayun tidak serempak.
  it('fase menggeser gelombangnya', () => {
    expect(bob(2, 1, 1, 0)).not.toBeCloseTo(bob(2, 1, 1, 1.6), 3)
  })
})
