import { describe, expect, it } from 'vitest'
import {
  NOTIFY_DANGER_MIN_GAP_MS,
  NOTIFY_MIN_GAP_MS,
  notificationTag,
  shouldDeliverNotification,
} from './notifications'

// Tag bukan label kosmetik: di shade notifikasi HP, dua notifikasi bertag SAMA
// saling menimpa dan yang kedua default-nya senyap. Jadi nilai yang dihasilkan
// fungsi ini yang menentukan sebuah peringatan sampai atau hilang.
describe('notificationTag', () => {
  it('memberi tag berbeda untuk metrik berbeda', () => {
    // Inti perbaikannya. Sebelumnya semua peringatan memakai satu tag, jadi
    // peringatan suhu menimpa peringatan tekanan yang belum dibaca.
    const metrik = ['pressure', 'temperature', 'humidity', 'fatigue', 'temperatureTrend']
    const tags = metrik.map(notificationTag)
    expect(new Set(tags).size).toBe(metrik.length)
  })

  it('memberi tag sama untuk metrik yang sama', () => {
    // Sisi lain yang sama pentingnya: eskalasi ulang pada metrik yang sama HARUS
    // menimpa, bukan menumpuk — yang perlu dilihat kondisi terbarunya.
    expect(notificationTag('pressure')).toBe(notificationTag('pressure'))
  })

  it('selalu menghasilkan tag tidak kosong', () => {
    // Tag kosong berarti notifikasi MENUMPUK tanpa batas di shade — satu sesi
    // pemakaian bisa meninggalkan puluhan entri yang harus dihapus satu per satu.
    for (const metric of [undefined, null, '', 'pressure']) {
      expect(notificationTag(metric)).toBeTruthy()
    }
  })

  it('menyertakan awalan nama aplikasi', () => {
    // Tag dibagi seluruh origin. Awalan ini yang memisahkannya dari notifikasi
    // milik halaman lain pada origin yang sama.
    expect(notificationTag('pressure')).toContain('glykos')
    expect(notificationTag(undefined)).toContain('glykos')
  })
})

// Jeda global lintas metrik. Terlalu longgar, Chrome Android menandai situsnya
// sebagai spam dan bisa mencabut izin notifikasi. Terlalu ketat, kondisi yang
// sudah melewati ambang tinggi tertahan setengah jam.
describe('shouldDeliverNotification', () => {
  const now = 1_700_000_000_000
  const menit = (n) => n * 60 * 1000

  it('mengirim notifikasi pertama', () => {
    expect(shouldDeliverNotification(null, 1, now)).toBe(true)
  })

  it('menahan Perlu Perhatian selama 30 menit sejak notifikasi terakhir', () => {
    const last = { at: now, priority: 2 }
    expect(shouldDeliverNotification(last, 1, now + NOTIFY_MIN_GAP_MS - 1)).toBe(false)
    expect(shouldDeliverNotification(last, 1, now + NOTIFY_MIN_GAP_MS)).toBe(true)
  })

  it('Risiko tidak menunggu 30 menit', () => {
    const last = { at: now, priority: 1 }
    expect(shouldDeliverNotification(last, 2, now + menit(6))).toBe(true)
    // Juga sesudah Risiko lain — mis. suhu melampaui ambang setelah tekanan.
    expect(shouldDeliverNotification({ at: now, priority: 2 }, 2, now + menit(6))).toBe(true)
  })

  it('tetap memberi jeda pendek antar notifikasi Risiko', () => {
    const last = { at: now, priority: 2 }
    expect(shouldDeliverNotification(last, 2, now + NOTIFY_DANGER_MIN_GAP_MS - 1)).toBe(false)
    expect(shouldDeliverNotification(last, 2, now + NOTIFY_DANGER_MIN_GAP_MS)).toBe(true)
  })
})
