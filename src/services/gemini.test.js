import { describe, expect, it } from 'vitest'
import { buildContents } from './gemini'

describe('buildContents', () => {
  it('menyertakan percakapan sebelumnya, bukan hanya pertanyaan terakhir', () => {
    // Tanpa ini, pertanyaan susulan seperti "kenapa begitu?" dikirim tanpa
    // rujukan apa pun meski tampilannya berupa percakapan.
    const contents = buildContents(
      [
        { role: 'user', content: 'Berapa tekanan yang aman?' },
        { role: 'assistant', content: 'Di bawah 200 kPa.' },
      ],
      'Kenapa begitu?',
    )

    expect(contents).toHaveLength(3)
    expect(contents[0].role).toBe('user')
    expect(contents[1].role).toBe('model')
    expect(contents[2].parts[0].text).toBe('Kenapa begitu?')
  })

  it('membuang sapaan pembuka asisten di awal', () => {
    // Sapaan itu teks statis di UI, bukan keluaran model, dan Gemini
    // mengharapkan giliran pertama berasal dari pengguna.
    const contents = buildContents(
      [{ role: 'assistant', content: 'Halo! Saya asisten Glykos.' }],
      'Apa itu ulkus diabetik?',
    )
    expect(contents).toHaveLength(1)
    expect(contents[0].role).toBe('user')
  })

  it('membatasi panjang riwayat yang dikirim', () => {
    const panjang = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `pesan ${i}`,
    }))
    // 12 pesan riwayat + 1 pertanyaan sekarang.
    expect(buildContents(panjang, 'terbaru').length).toBeLessThanOrEqual(13)
  })

  it('mengabaikan pesan kosong dan riwayat yang tidak ada', () => {
    expect(buildContents([{ role: 'user', content: '   ' }], 'halo')).toHaveLength(1)
    expect(buildContents(undefined, 'halo')).toHaveLength(1)
  })
})
