import { describe, expect, it } from 'vitest'
import { resolveReadingSource, todayActivity } from './dailyReading'
import { msUntilNextMidnight } from '../hooks/useDayKey'

const TODAY = '2026-08-21'
const KEMARIN = '2026-08-20'

describe('resolveReadingSource', () => {
  it('memakai pembacaan BLE selama perangkat mengirim', () => {
    expect(
      resolveReadingSource({ todayKey: TODAY, bleActive: true, bleDate: TODAY }),
    ).toBe('ble')
  })

  // Inti perubahan ini: putusnya koneksi TIDAK menghapus angka dari layar.
  // Tekanan 240 kPa yang terbaca pagi tadi tetap terjadi meski Bluetooth-nya
  // sudah dilepas.
  it('tetap memakai pembacaan BLE terakhir setelah perangkat terputus', () => {
    expect(
      resolveReadingSource({ todayKey: TODAY, bleActive: false, bleDate: TODAY }),
    ).toBe('ble')
  })

  it('jatuh ke dokumen Firestore setelah halaman dimuat ulang', () => {
    // Pembacaan di memori hilang saat reload; dokumen live yang menggantikannya.
    expect(
      resolveReadingSource({
        todayKey: TODAY,
        bleActive: false,
        bleDate: null,
        firestoreHasData: true,
        firestoreDate: TODAY,
      }),
    ).toBe('firestore')
  })

  // Reset pukul 00:00. Bukan koneksi yang mengakhiri masa berlaku pembacaan,
  // melainkan pergantian hari.
  it('mengabaikan pembacaan kemarin, dari sumber mana pun', () => {
    expect(
      resolveReadingSource({
        todayKey: TODAY,
        bleActive: false,
        bleDate: KEMARIN,
        firestoreHasData: true,
        firestoreDate: KEMARIN,
      }),
    ).toBe('none')
  })

  it('tetap live saat perangkat mengirim melewati tengah malam', () => {
    // Sesi yang berjalan melewati tengah malam: paket berikutnya sudah
    // bertanggal hari baru, dan `bleActive` menang tanpa syarat tanggal supaya
    // dashboard tidak berkedip kosong tepat pada pukul 00:00.
    expect(
      resolveReadingSource({ todayKey: TODAY, bleActive: true, bleDate: KEMARIN }),
    ).toBe('ble')
  })

  it('kosong saat pengguna belum pernah punya data', () => {
    expect(resolveReadingSource({ todayKey: TODAY })).toBe('none')
  })
})

describe('todayActivity', () => {
  it('menjumlahkan seluruh sesi hari ini, bukan hanya sesi berjalan', () => {
    // 3.000 langkah dari sesi pagi sudah masuk rangkuman; sesi sore ini baru
    // 200 langkah dan belum satu pun tersinkron.
    const activity = todayActivity({
      rollupSteps: 3000,
      sessionSteps: 200,
      syncedSteps: 0,
    })
    expect(activity.steps).toBe(3200)
  })

  it('tidak menghitung ganda langkah yang sudah tersinkron', () => {
    // Rangkuman sudah memuat 150 langkah dari sesi ini; sesi berjalan kini 200.
    // Yang boleh ditambahkan hanya 50 sisanya.
    const activity = todayActivity({
      rollupSteps: 3150,
      sessionSteps: 200,
      syncedSteps: 150,
    })
    expect(activity.steps).toBe(3200)
  })

  it('tidak pernah turun di bawah angka rangkuman', () => {
    // Awal sesi baru: `syncedSteps` masih membawa sisa sesi sebelumnya sampai
    // sinkronisasi pertama selesai. Tanpa jepitan, totalnya berkedip turun.
    const activity = todayActivity({
      rollupSteps: 3000,
      sessionSteps: 5,
      syncedSteps: 3000,
    })
    expect(activity.steps).toBe(3000)
  })

  it('memakai menit aktif terbesar antara rangkuman dan sesi berjalan', () => {
    expect(todayActivity({ rollupSteps: 100, rollupActiveMinutes: 40, sessionActiveMinutes: 12 }))
      .toMatchObject({ activeMinutes: 40 })
    expect(todayActivity({ rollupSteps: 100, rollupActiveMinutes: 5, sessionActiveMinutes: 12.6 }))
      .toMatchObject({ activeMinutes: 13 })
  })

  it('mengembalikan null saat belum ada apa pun hari ini', () => {
    // Nol yang ditampilkan sebagai angka terbaca seperti hasil pengukuran,
    // padahal artinya "belum diukur".
    expect(todayActivity({})).toBeNull()
    expect(todayActivity({ rollupSteps: 0, sessionSteps: 0 })).toBeNull()
  })

  it('tahan terhadap nilai yang tidak masuk akal', () => {
    expect(todayActivity({ rollupSteps: -5, sessionSteps: -10 })).toBeNull()
    expect(todayActivity({ rollupSteps: NaN, sessionSteps: 30, syncedSteps: NaN }).steps).toBe(30)
  })
})

describe('msUntilNextMidnight', () => {
  it('menghitung sisa waktu sampai tengah malam berikutnya', () => {
    const jam23Lewat50 = new Date(2026, 7, 21, 23, 50, 0, 0)
    expect(msUntilNextMidnight(jam23Lewat50)).toBe(10 * 60 * 1000)
  })

  it('memberi satu hari penuh tepat pada tengah malam', () => {
    const tengahMalam = new Date(2026, 7, 21, 0, 0, 0, 0)
    expect(msUntilNextMidnight(tengahMalam)).toBe(24 * 60 * 60 * 1000)
  })

  it('tidak pernah mengembalikan nol', () => {
    // Timer yang dijadwalkan dengan 0 menembak berulang dalam satu tick.
    const sedetikSebelum = new Date(2026, 7, 21, 23, 59, 59, 999)
    expect(msUntilNextMidnight(sedetikSebelum)).toBeGreaterThan(0)
  })
})
