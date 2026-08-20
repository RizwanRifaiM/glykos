import { describe, expect, it } from 'vitest'
import { i18n, setupI18n } from '@lingui/core'
import { messages as enMessages } from '../locales/en/messages.po'
import { describeAlert, describeStoredAlert, isStructuredAlert } from './alertMessages'
import { evaluateMetrics } from './alertRules'

// Instance TERPISAH berlocale Inggris, memakai KATALOG SUNGGUHAN yang dikirim
// ke pengguna.
//
// Katalog buatan tangan tidak bisa dipakai di sini: id pesan Lingui adalah hash
// yang dihasilkan dari teks sumbernya ("Tekanan" → "Hz3qTo"), bukan teks itu
// sendiri, jadi katalog yang dikunci oleh teks Indonesia tidak akan pernah
// cocok — dan pengujiannya lulus/gagal karena alasan yang salah. Mengimpor
// `.po`-nya langsung (ditransformasi @lingui/vite-plugin, yang juga aktif di
// vitest) sekaligus membuat pengujian ini menjaga hal yang sebenarnya penting:
// katalog yang BENAR-BENAR dikirim itu bekerja.
//
// Karena itu assertion di bawah memeriksa PERBEDAAN antar bahasa dan hal-hal
// yang tidak bergantung pilihan kata (pemisah desimal, kalimat mana yang
// dipilih), bukan kata Inggris tertentu — supaya menghaluskan terjemahan nanti
// tidak menjatuhkan pengujian.
const en = setupI18n({ locale: 'en', messages: { en: enMessages } })

describe('describeAlert', () => {
  it('merakit kalimat dari angka, bukan menyimpannya', () => {
    const item = {
      metric: 'pressure',
      status: 'danger',
      location: 'heel',
      values: { peak: 265 },
    }

    const view = describeAlert(i18n, item)
    expect(view.label).toBe('Tekanan')
    expect(view.location).toBe('Tumit')
    expect(view.message).toContain('265')
    expect(view.message).toContain('Risiko Ulkus')
  })

  // INI alasan seluruh perubahan strukturnya ada. Satu catatan yang sama —
  // tanpa disentuh, tanpa ditulis ulang ke Firestore — harus bisa dibaca dalam
  // bahasa apa pun. Sebelumnya kalimatnya ikut tersimpan, jadi peringatan yang
  // dicatat bulan lalu selamanya berbahasa Indonesia.
  it('menampilkan catatan yang SAMA dalam bahasa berbeda', () => {
    const item = {
      metric: 'pressure',
      status: 'danger',
      location: 'heel',
      values: { peak: 265 },
    }

    const id = describeAlert(i18n, item)
    const inggris = describeAlert(en, item)

    expect(id.label).toBe('Tekanan')
    // Yang diperiksa: catatan yang SAMA menghasilkan teks yang BERBEDA. Kata
    // Inggrisnya sendiri tidak dipatok supaya penghalusan terjemahan tidak
    // menjatuhkan pengujian ini.
    expect(inggris.label).not.toBe(id.label)
    expect(inggris.location).not.toBe(id.location)
    expect(inggris.message).not.toBe(id.message)
    // Angkanya harus tetap sama — yang berubah bahasanya, bukan datanya.
    expect(inggris.message).toContain('265')
  })

  it('memakai kalimat pre-ulkus hanya saat SELISIHNYA yang memicu', () => {
    const bySpread = {
      metric: 'temperature',
      status: 'warning',
      location: 'heel',
      values: { highest: 32, delta: 2.4, deltaExceeded: true },
    }
    const byPeak = {
      metric: 'temperature',
      status: 'warning',
      location: 'heel',
      values: { highest: 34.5, delta: 0.4, deltaExceeded: false },
    }

    expect(describeAlert(i18n, bySpread).message).toContain('pre-ulkus')
    expect(describeAlert(i18n, byPeak).message).not.toContain('pre-ulkus')
  })

  it('memakai pemisah desimal sesuai bahasa', () => {
    const item = {
      metric: 'temperature',
      status: 'warning',
      location: 'heel',
      values: { highest: 32.8, delta: 2.7, deltaExceeded: true },
    }

    // Indonesia memakai koma, Inggris memakai titik. Angka sensor yang salah
    // baca desimalnya bukan soal kosmetik di aplikasi pemantauan.
    expect(describeAlert(i18n, item).value).toContain('32,8')
    expect(describeAlert(en, item).value).toContain('32.8')
  })

  it('bekerja langsung dari keluaran evaluateMetrics', () => {
    // Menjaga kedua modul tetap sepasang: evaluateMetrics menghasilkan bentuk
    // yang describeAlert bisa baca, tanpa lapisan penyesuai di antaranya.
    const items = evaluateMetrics({
      pressure: { peak: 210, location: 'metatarsal', points: {} },
      temperatureObj: { highest: 31, delta: 0.5, location: 'metatarsal', points: {} },
      humidity: 55,
    })

    items.forEach((item) => {
      const view = describeAlert(i18n, item)
      expect(view.label).toBeTruthy()
      expect(view.message).toBeTruthy()
    })
  })
})

describe('describeStoredAlert', () => {
  it('mengenali catatan terstruktur dari kehadiran `values`', () => {
    expect(isStructuredAlert({ metric: 'pressure', values: { peak: 1 } })).toBe(true)
    expect(isStructuredAlert({ metric: 'pressure', message: 'Tekanan puncak 265 kPa' })).toBe(false)
  })

  // Catatan yang ditulis SEBELUM peringatan berbentuk terstruktur menyimpan
  // kalimat Indonesia jadi. Catatan itu tidak diubah — memodifikasi catatan
  // medis demi kenyamanan terjemahan bukan hal yang dilakukan — jadi harus
  // tetap terbaca apa adanya, dan ditandai sebagai warisan.
  it('menampilkan catatan lama apa adanya, tanpa mengubah datanya', () => {
    const legacy = {
      metric: 'pressure',
      status: 'danger',
      label: 'Tekanan',
      value: '265 kPa',
      location: 'metatarsal',
      message: 'Tekanan puncak 265 kPa (Risiko Ulkus)',
    }

    const view = describeStoredAlert(en, legacy)
    expect(view.legacy).toBe(true)
    // Sengaja TIDAK diterjemahkan: teks ini datang dari basis data, bukan dari
    // katalog. Menerjemahkannya berarti menebak-nebak isi catatan medis.
    expect(view.message).toBe('Tekanan puncak 265 kPa (Risiko Ulkus)')
    expect(view.label).toBe('Tekanan')
  })

  it('menerjemahkan catatan baru meski dibaca lewat jalur yang sama', () => {
    const view = describeStoredAlert(en, {
      metric: 'pressure',
      status: 'danger',
      location: 'heel',
      values: { peak: 265 },
    })
    expect(view.legacy).toBeUndefined()
    // Diterjemahkan (berbeda dari bahasa sumber), bukan dikembalikan apa adanya.
    expect(view.label).not.toBe('Tekanan')
  })

  it('tidak meledak pada catatan tanpa metrik yang dikenal', () => {
    const view = describeStoredAlert(i18n, { metric: 'metrikMasaDepan', status: 'warning' })
    // Metrik tak dikenal ditampilkan apa adanya — lebih baik daripada baris
    // kosong pada halaman peringatan.
    expect(view.label).toBe('metrikMasaDepan')
    expect(view.message).toBeNull()
  })
})
