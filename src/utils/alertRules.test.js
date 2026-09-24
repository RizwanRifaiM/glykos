import { describe, expect, it } from 'vitest'
import {
  ALERT_COOLDOWN_MS,
  alertPolicy,
  decideAlert,
  evaluateMetrics,
  HIGH_RISK_COOLDOWN_MS,
} from './alertRules'

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

  it('hanya memberi notifikasi untuk danger, tidak untuk warning', () => {
    const naik = decideAlert({ status: 'warning' }, 'danger', now)
    expect(naik.shouldNotify).toBe(true)
    const turun = decideAlert({ status: 'danger' }, 'warning', now)
    expect(turun.shouldNotify).toBe(false)
  })
})

// Jeda peringatan: satu metrik tidak boleh membanjiri halaman Peringatan maupun
// HP. Ini blok yang menjaga perilaku yang diminta — "tiap berapa menit sekali,
// dan hanya kalau kondisinya belum berubah".
describe('decideAlert — jeda per metrik', () => {
  const now = 1_000_000
  const menit = (n) => n * 60 * 1000

  it('meredam osilasi ANTARA warning dan danger', () => {
    // INI BUG YANG DIPERBAIKI. Versi lama menjaga pasangan (metrik, status),
    // jadi urutan ini lolos seluruhnya: tidak ada dua status sama yang
    // berurutan, sehingga cooldown tidak pernah berlaku. Effect-nya berjalan
    // tiap paket BLE (~3 kali/detik), jadi nilai yang menggantung di ambang
    // mengirim notifikasi berkali-kali dalam satu menit.
    const a = decideAlert(undefined, 'warning', now)
    expect(a.shouldLog).toBe(true)

    // Naik ke danger memang kejadian baru yang lebih buruk — ini HARUS lolos.
    const b = decideAlert(a.entry, 'danger', now + 1_000)
    expect(b.shouldLog).toBe(true)
    expect(b.shouldNotify).toBe(true)

    // Turun lagi, lalu naik lagi, semuanya dalam hitungan detik: keduanya
    // ditahan. Pengguna sudah diberi tahu bahwa metrik ini mencapai danger.
    const c = decideAlert(b.entry, 'warning', now + 2_000)
    expect(c.shouldLog).toBe(false)
    const d = decideAlert(c.entry, 'danger', now + 3_000)
    expect(d.shouldLog).toBe(false)
    expect(d.shouldNotify).toBe(false)
  })

  it('mengulang peringatan DAN notifikasi saat danger bertahan melewati jeda', () => {
    // Yang diminta: kalau setelah jedanya kondisinya belum berubah, kirim lagi.
    // Sebelumnya ini tidak pernah terjadi — syarat notifikasi lama menuntut
    // status NAIK, sementara danger yang menetap tidak naik ke mana pun.
    const awal = decideAlert(undefined, 'danger', now)
    expect(awal.shouldNotify).toBe(true)

    const belumLewat = decideAlert(awal.entry, 'danger', now + menit(29))
    expect(belumLewat.shouldLog).toBe(false)

    const setelahJeda = decideAlert(awal.entry, 'danger', now + ALERT_COOLDOWN_MS)
    expect(setelahJeda.shouldLog).toBe(true)
    expect(setelahJeda.shouldNotify).toBe(true)
  })

  it('perburukan tidak menunggu jeda', () => {
    // warning yang menjadi danger dua menit kemudian adalah kejadian berbeda dan
    // lebih buruk. Menahannya sampai jeda habis berarti menahan justru
    // peringatan yang paling perlu didengar.
    const warning = decideAlert(undefined, 'warning', now)
    expect(warning.shouldNotify).toBe(false)

    const danger = decideAlert(warning.entry, 'danger', now + menit(2))
    expect(danger.shouldLog).toBe(true)
    expect(danger.shouldNotify).toBe(true)
  })

  it('pemulihan ke aman tidak mengosongkan jeda', () => {
    // Kaki yang kembali aman lalu melampaui ambang lagi adalah pola berjalan
    // yang normal. Kalau pemulihan mengosongkan jeda, orang yang tekanannya
    // naik-turun sepanjang jalan akan dibanjiri notifikasi.
    const danger = decideAlert(undefined, 'danger', now)
    const aman = decideAlert(danger.entry, 'safe', now + menit(5))
    expect(aman.shouldLog).toBe(false)
    // Jejak pencatatannya harus ikut terbawa, bukan hilang bersama status aman.
    expect(aman.entry.loggedAt).toBe(now)

    const dangerLagi = decideAlert(aman.entry, 'danger', now + menit(10))
    expect(dangerLagi.shouldLog).toBe(false)
  })

  it('jedanya 30 menit', () => {
    // Nilainya bagian dari perilaku yang disepakati, bukan detail bebas ubah:
    // sesi 2–3 jam berarti paling banyak 4–6 peringatan per metrik.
    expect(ALERT_COOLDOWN_MS).toBe(menit(30))
  })
})

describe('decideAlert — tingkat pemantauan pasien', () => {
  const now = 1_000_000
  const menit = (n) => n * 60 * 1000

  it('Standar hanya membunyikan notifikasi pada danger', () => {
    const hasil = decideAlert(undefined, 'warning', now, alertPolicy('standard'))
    expect(hasil.shouldLog).toBe(true)
    expect(hasil.shouldNotify).toBe(false)
  })

  it('Meningkat & Tinggi sudah berbunyi sejak warning', () => {
    for (const tier of ['elevated', 'high']) {
      const hasil = decideAlert(undefined, 'warning', now, alertPolicy(tier))
      expect(hasil.shouldNotify).toBe(true)
    }
  })

  it('Tinggi mengulang kondisi yang bertahan setelah 15 menit, bukan 30', () => {
    const policy = alertPolicy('high')
    const awal = decideAlert(undefined, 'warning', now, policy)
    expect(decideAlert(awal.entry, 'warning', now + menit(14), policy).shouldLog).toBe(false)
    const ulang = decideAlert(awal.entry, 'warning', now + HIGH_RISK_COOLDOWN_MS, policy)
    expect(ulang.shouldLog).toBe(true)
    expect(ulang.shouldNotify).toBe(true)
    expect(HIGH_RISK_COOLDOWN_MS).toBe(menit(15))
  })

  it('Meningkat tetap memakai jeda 30 menit', () => {
    expect(alertPolicy('elevated').cooldownMs).toBe(ALERT_COOLDOWN_MS)
  })

  it('tingkat yang tidak dikenal jatuh ke Standar', () => {
    expect(alertPolicy('entah')).toEqual(alertPolicy('standard'))
    expect(alertPolicy(undefined)).toEqual(alertPolicy('standard'))
  })

  it('tingkat risiko tidak pernah mengubah STATUS pembacaan', () => {
    // Yang disesuaikan hanya notifikasi & jeda. Angka ambang sensor tetap —
    // tekanan 190 kPa tetap aman untuk pasien mana pun.
    const items = evaluateMetrics(reading({ pressure: { peak: 190, location: 'heel', points: {} } }))
    expect(items.find((item) => item.metric === 'pressure').status).toBe('safe')
    const hasil = decideAlert(undefined, 'safe', now, alertPolicy('high'))
    expect(hasil.shouldLog).toBe(false)
    expect(hasil.shouldNotify).toBe(false)
  })
})
